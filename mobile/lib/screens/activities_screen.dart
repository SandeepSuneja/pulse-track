import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../constants/categories.dart';
import '../constants/sleep.dart';
import '../models/models.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../theme/pulse_palette.dart';
import '../theme/theme_rebuild.dart';
import '../widgets/common.dart';

class ActivitiesScreen extends StatefulWidget {
  const ActivitiesScreen({super.key});

  @override
  State<ActivitiesScreen> createState() => _ActivitiesScreenState();
}

class _ActivitiesData {
  const _ActivitiesData({required this.items, required this.inProgressTasks});

  final List<ActivityItem> items;
  final List<TaskItem> inProgressTasks;
}

class _ActivitiesScreenState extends State<ActivitiesScreen> {
  late Future<_ActivitiesData> _future;
  final _searchCtrl = TextEditingController();
  String _search = '';
  String _category = '';
  String _date = '';

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<_ActivitiesData> _load() async {
    final api = context.read<AuthService>().api;
    final results = await Future.wait([
      api.listActivities(),
      api.listTasks(status: 'in_progress'),
    ]);
    return _ActivitiesData(
      items: results[0] as List<ActivityItem>,
      inProgressTasks: results[1] as List<TaskItem>,
    );
  }

  Future<void> _refresh() async {
    final next = _load();
    setState(() => _future = next);
    await next;
  }

  bool get _filtersActive =>
      _search.isNotEmpty || _category.isNotEmpty || _date.isNotEmpty;

  List<ActivityItem> _filter(List<ActivityItem> items) {
    final search = _search.trim().toLowerCase();
    return items.where((item) {
      if (_category.isNotEmpty && item.category != _category) return false;
      if (_date.isNotEmpty && item.activityDate != _date) return false;
      if (search.isNotEmpty) {
        final haystack =
            '${item.title} ${item.notes} PT-${item.taskId ?? ''} ${item.sleepQuality ?? ''}'
                .toLowerCase();
        if (!haystack.contains(search)) return false;
      }
      return true;
    }).toList();
  }

  Future<void> _delete(ActivityItem item) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete activity?'),
        content: Text('Delete log from ${item.activityDate}?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete')),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      await context.read<AuthService>().api.deleteActivity(item.id);
      await _refresh();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  Future<void> _openForm({
    ActivityItem? item,
    required List<TaskItem> inProgressTasks,
  }) async {
    final api = context.read<AuthService>().api;
    final isEdit = item != null;

    if (!isEdit && inProgressTasks.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Move a Board task to In Progress first.')),
      );
      return;
    }

    TaskItem? selectedTask = inProgressTasks.isEmpty
        ? null
        : inProgressTasks.firstWhere(
            (t) => t.id == item?.taskId,
            orElse: () => inProgressTasks.first,
          );
    if (!isEdit && selectedTask == null && inProgressTasks.isNotEmpty) {
      selectedTask = inProgressTasks.first;
    }

    final editingCategory = item?.category ?? selectedTask?.category ?? '';
    final dateCtrl = TextEditingController(text: item?.activityDate ?? isoToday());
    final hoursCtrl = TextEditingController(
      text: '${(item?.durationMinutes ?? 60) ~/ 60}',
    );
    final minutesCtrl = TextEditingController(
      text: '${(item?.durationMinutes ?? 0) % 60}',
    );
    final notesCtrl = TextEditingController(text: item?.notes ?? '');
    var sleepStart = toTimeInputValue(item?.sleepStartTime);
    if (sleepStart.isEmpty) sleepStart = '23:00';
    var sleepEnd = toTimeInputValue(item?.sleepEndTime);
    if (sleepEnd.isEmpty) sleepEnd = '06:30';
    final sleepStartCtrl = TextEditingController(text: sleepStart);
    final sleepEndCtrl = TextEditingController(text: sleepEnd);
    String? formError;

    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.surface,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setLocal) {
            final formCategory =
                isEdit ? editingCategory : (selectedTask?.category ?? '');
            final isSleep = formCategory == 'sleep';
            final sleepMins = isSleep
                ? sleepDurationMinutes(sleepStartCtrl.text, sleepEndCtrl.text)
                : null;
            final sleepQ = isSleep
                ? classifySleepQuality(sleepStartCtrl.text, sleepEndCtrl.text)
                : null;

            return Padding(
              padding: EdgeInsets.only(
                left: 16,
                right: 16,
                top: 16,
                bottom: MediaQuery.viewInsetsOf(context).bottom + 16,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      isEdit ? 'Edit activity' : 'New activity',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                    ),
                    if (isEdit) ...[
                      const SizedBox(height: 4),
                      Text(
                        '${item.title}${item.taskId != null ? ' · PT-${item.taskId}' : ''}',
                        style: TextStyle(color: AppTheme.muted),
                      ),
                    ],
                    const SizedBox(height: 12),
                    if (!isEdit)
                      DropdownButtonFormField<TaskItem>(
                        initialValue: selectedTask,
                        items: inProgressTasks
                            .map(
                              (t) => DropdownMenuItem(
                                value: t,
                                child: Text('${t.ticketId} · ${t.title}'),
                              ),
                            )
                            .toList(),
                        onChanged: (v) => setLocal(() => selectedTask = v),
                        decoration: const InputDecoration(labelText: 'Task'),
                      ),
                    if (!isEdit) const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: () async {
                        final picked =
                            await pickIsoDate(context, initial: dateCtrl.text);
                        if (picked != null) {
                          setLocal(() => dateCtrl.text = picked);
                        }
                      },
                      icon: const Icon(Icons.event, size: 18),
                      label: Text('Date: ${dateCtrl.text}'),
                    ),
                    const SizedBox(height: 12),
                    if (isSleep) ...[
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () async {
                                final t = await pickTimeOfDay(
                                  context,
                                  initialHhmm: sleepStartCtrl.text,
                                );
                                if (t != null) {
                                  setLocal(
                                    () => sleepStartCtrl.text = formatTimeOfDay(t),
                                  );
                                }
                              },
                              child: Text('Start ${sleepStartCtrl.text}'),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () async {
                                final t = await pickTimeOfDay(
                                  context,
                                  initialHhmm: sleepEndCtrl.text,
                                );
                                if (t != null) {
                                  setLocal(
                                    () => sleepEndCtrl.text = formatTimeOfDay(t),
                                  );
                                }
                              },
                              child: Text('Wake ${sleepEndCtrl.text}'),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Text(
                            'Duration: ${sleepMins == null ? '—' : formatDuration(sleepMins)}',
                            style: TextStyle(color: AppTheme.muted),
                          ),
                          const SizedBox(width: 8),
                          SleepQualityChip(quality: sleepQ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        sleepQualityHint,
                        style: TextStyle(
                          color: AppTheme.muted,
                          fontSize: 12,
                          height: 1.35,
                        ),
                      ),
                    ] else ...[
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: hoursCtrl,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(labelText: 'Hours'),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextField(
                              controller: minutesCtrl,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(labelText: 'Minutes'),
                            ),
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 12),
                    TextField(
                      controller: notesCtrl,
                      maxLines: 2,
                      decoration: const InputDecoration(labelText: 'Notes'),
                    ),
                    if (formError != null) ...[
                      const SizedBox(height: 8),
                      Text(formError!, style: const TextStyle(color: Colors.redAccent)),
                    ],
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: () {
                        if (!isEdit && selectedTask == null) {
                          setLocal(
                            () => formError =
                                'Move a task to In Progress on the Board first.',
                          );
                          return;
                        }
                        if (isSleep) {
                          if (sleepStartCtrl.text.isEmpty || sleepEndCtrl.text.isEmpty) {
                            setLocal(
                              () => formError =
                                  'Enter sleep start time and wake-up time.',
                            );
                            return;
                          }
                          if (sleepStartCtrl.text == sleepEndCtrl.text) {
                            setLocal(
                              () => formError =
                                  'Wake-up time must differ from sleep start time.',
                            );
                            return;
                          }
                          if (sleepMins == null || sleepMins < 1) {
                            setLocal(
                              () => formError =
                                  'Could not calculate sleep duration from those times.',
                            );
                            return;
                          }
                        } else {
                          final hours = int.tryParse(hoursCtrl.text) ?? 0;
                          final minutes = int.tryParse(minutesCtrl.text) ?? 0;
                          final total = hours * 60 + minutes;
                          if (total < 1) {
                            setLocal(
                              () => formError =
                                  'Enter a duration of at least 1 minute.',
                            );
                            return;
                          }
                          if (total > 24 * 60) {
                            setLocal(
                              () => formError = 'Duration cannot exceed 24 hours.',
                            );
                            return;
                          }
                        }
                        Navigator.pop(context, true);
                      },
                      child: Text(isEdit ? 'Save' : 'Save log'),
                    ),
                    if (isEdit) ...[
                      const SizedBox(height: 8),
                      TextButton(
                        onPressed: () {
                          Navigator.pop(context, false);
                          _delete(item);
                        },
                        child: const Text(
                          'Delete',
                          style: TextStyle(color: Colors.redAccent),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            );
          },
        );
      },
    );

    if (ok != true || !mounted) return;

    final formCategory = isEdit ? editingCategory : (selectedTask?.category ?? '');
    final isSleep = formCategory == 'sleep';
    final body = <String, dynamic>{
      'activity_date': dateCtrl.text.trim(),
      'notes': notesCtrl.text.trim(),
    };
    if (isSleep) {
      final sleepMins =
          sleepDurationMinutes(sleepStartCtrl.text, sleepEndCtrl.text);
      body['sleep_start_time'] = sleepStartCtrl.text.trim();
      body['sleep_end_time'] = sleepEndCtrl.text.trim();
      body['duration_minutes'] = sleepMins;
    } else {
      final hours = int.tryParse(hoursCtrl.text) ?? 0;
      final minutes = int.tryParse(minutesCtrl.text) ?? 0;
      body['duration_minutes'] = hours * 60 + minutes;
    }

    try {
      if (isEdit) {
        await api.updateActivity(item.id, body);
      } else {
        body['task_id'] = selectedTask!.id;
        await api.createActivity(body);
      }
      await _refresh();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    context.watchAppearance();
    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        title: Text(
          'Activities',
          style: TextStyle(
            color: AppTheme.text,
            fontSize: 28,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.6,
          ),
        ),
        automaticallyImplyLeading: false,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Material(
              color: AppTheme.softPrimary,
              shape: const CircleBorder(),
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: () async {
                  final messenger = ScaffoldMessenger.of(context);
                  try {
                    final data = await _future;
                    if (!mounted) return;
                    await _openForm(inProgressTasks: data.inProgressTasks);
                  } catch (_) {
                    messenger.showSnackBar(
                      const SnackBar(
                        content: Text('Could not load activities. Pull to refresh.'),
                      ),
                    );
                  }
                },
                child: SizedBox(
                  width: 44,
                  height: 44,
                  child: Icon(Icons.add, color: AppTheme.primary),
                ),
              ),
            ),
          ),
        ],
      ),
      body: FutureBuilder<_ActivitiesData>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const LoadingView();
          }
          if (snap.hasError) {
            return ErrorView(message: snap.error.toString(), onRetry: _refresh);
          }
          final data = snap.data!;
          final filtered = _filter(data.items);
          final totalMins =
              filtered.fold<int>(0, (sum, a) => sum + a.durationMinutes);

          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
              children: [
                Text.rich(
                  TextSpan(
                    style: TextStyle(
                      color: AppTheme.muted,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                    children: [
                      const TextSpan(text: 'Logged '),
                      TextSpan(
                        text:
                            '${filtered.length} activit${filtered.length == 1 ? 'y' : 'ies'}',
                        style: TextStyle(
                          color: AppTheme.primary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      TextSpan(text: ' · ${formatDuration(totalMins)} total'),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      flex: 5,
                      child: TextField(
                        controller: _searchCtrl,
                        onChanged: (v) => setState(() => _search = v),
                        decoration: InputDecoration(
                          hintText: 'Search',
                          prefixIcon: const Icon(Icons.search, size: 20),
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 12,
                          ),
                          filled: true,
                          fillColor: AppTheme.panel,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: BorderSide(color: AppTheme.line),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: BorderSide(color: AppTheme.line),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      flex: 4,
                      child: PopupMenuButton<String>(
                        onSelected: (v) => setState(() => _category = v),
                        itemBuilder: (context) => [
                          const PopupMenuItem(value: '', child: Text('All categories')),
                          ...categories.map(
                            (c) => PopupMenuItem(value: c.id, child: Text(c.label)),
                          ),
                        ],
                        child: Container(
                          height: 48,
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            color: AppTheme.panel,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppTheme.line),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  _category.isEmpty
                                      ? 'Category'
                                      : categoryLabel(_category),
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    color: _category.isEmpty
                                        ? AppTheme.muted
                                        : AppTheme.text,
                                    fontWeight: FontWeight.w600,
                                    fontSize: 13,
                                  ),
                                ),
                              ),
                              Icon(Icons.expand_more, size: 20, color: AppTheme.muted),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Material(
                      color: AppTheme.panel,
                      shape: StadiumBorder(
                        side: BorderSide(
                          color: _date.isEmpty
                              ? AppTheme.line
                              : AppTheme.primary,
                        ),
                      ),
                      child: InkWell(
                        customBorder: const StadiumBorder(),
                        onTap: () async {
                          final picked = await pickIsoDate(
                            context,
                            initial: _date.isEmpty ? isoToday() : _date,
                          );
                          if (picked != null) setState(() => _date = picked);
                        },
                        onLongPress: _date.isEmpty
                            ? null
                            : () => setState(() => _date = ''),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 14,
                          ),
                          child: Text(
                            _date.isEmpty ? 'Date' : formatShortDate(_date),
                            style: TextStyle(
                              color: _date.isEmpty
                                  ? AppTheme.muted
                                  : AppTheme.primary,
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                if (_filtersActive)
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: () => setState(() {
                        _search = '';
                        _searchCtrl.clear();
                        _category = '';
                        _date = '';
                      }),
                      child: const Text('Clear filters'),
                    ),
                  )
                else
                  const SizedBox(height: 12),
                if (filtered.isEmpty)
                  Padding(
                    padding: EdgeInsets.only(top: 48),
                    child: Center(
                      child: Text(
                        'No activities yet.',
                        style: TextStyle(color: AppTheme.muted),
                      ),
                    ),
                  )
                else
                  ...filtered.map(
                    (item) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: _ActivityCard(
                        item: item,
                        onTap: () => _openForm(
                          item: item,
                          inProgressTasks: data.inProgressTasks,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _ActivityCard extends StatelessWidget {
  const _ActivityCard({required this.item, required this.onTap});

  final ActivityItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.pulse;
    final cat = categoryOf(item.category);
    final ticket = item.taskId != null ? 'PT-${item.taskId}' : '—';
    final notes = item.notes.trim().isNotEmpty
        ? item.notes.trim()
        : (item.category == 'sleep' &&
                item.sleepStartTime != null &&
                item.sleepEndTime != null)
            ? '${toTimeInputValue(item.sleepStartTime)} → ${toTimeInputValue(item.sleepEndTime)}'
                '${item.sleepQuality != null ? ' · ${sleepQualityLabel[item.sleepQuality] ?? item.sleepQuality}' : ''}'
            : '';

    return Material(
      color: p.panel,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: p.line),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    ticket,
                    style: TextStyle(
                      color: p.primary,
                      fontWeight: FontWeight.w700,
                      fontSize: 12,
                    ),
                  ),
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: 6),
                    child: Text('·', style: TextStyle(color: p.muted)),
                  ),
                  Text(
                    formatShortDate(item.activityDate),
                    style: TextStyle(
                      color: p.muted,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const Spacer(),
                  CategoryChip(label: cat.label, fg: cat.fg, bg: cat.bg),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                item.title.isEmpty ? 'Activity' : item.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 15,
                  color: p.text,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: notes.isEmpty
                        ? const SizedBox.shrink()
                        : Text(
                            notes,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: p.muted,
                              fontSize: 13,
                            ),
                          ),
                  ),
                  const SizedBox(width: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: p.line),
                    ),
                    child: Text(
                      formatDuration(item.durationMinutes),
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 12,
                        color: p.text,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
