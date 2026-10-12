import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../constants/categories.dart';
import '../models/models.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../theme/pulse_palette.dart';
import '../theme/theme_rebuild.dart';
import '../notifications/sync_notifications.dart';
import '../widgets/brand.dart';
import '../widgets/common.dart';

class _GoalProgressSection extends StatelessWidget {
  const _GoalProgressSection({
    required this.completionPct,
    required this.accent,
    required this.status,
    required this.trackColor,
  });

  final int completionPct;
  final Color accent;
  final String status;
  final Color trackColor;

  Color get _fillColor {
    if (status == 'completed') return const Color(0xFF34D399);
    if (status == 'failed') return const Color(0xFFFB7185);
    return accent;
  }

  @override
  Widget build(BuildContext context) {
    final pct = completionPct.clamp(0, 100);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Task completion',
              style: TextStyle(color: AppTheme.muted, fontSize: 12),
            ),
            Text(
              '$pct%',
              style: TextStyle(
                color: accent,
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: LinearProgressIndicator(
            value: pct / 100,
            minHeight: 8,
            color: _fillColor,
            backgroundColor: trackColor,
          ),
        ),
      ],
    );
  }
}

class GoalsScreen extends StatefulWidget {
  const GoalsScreen({super.key});

  @override
  State<GoalsScreen> createState() => _GoalsScreenState();
}

class _GoalsData {
  const _GoalsData({
    required this.goals,
    required this.tasks,
  });

  final List<GoalItem> goals;
  final List<TaskItem> tasks;
}

class _GoalsScreenState extends State<GoalsScreen> {
  late Future<_GoalsData> _future;
  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<_GoalsData> _load() async {
    final api = context.read<AuthService>().api;
    final results = await Future.wait([
      api.listGoals(),
      api.listTasks(),
    ]);
    return _GoalsData(
      goals: results[0] as List<GoalItem>,
      tasks: results[1] as List<TaskItem>,
    );
  }

  Future<void> _refresh() async {
    final next = _load();
    setState(() => _future = next);
    await next;
    if (mounted) await syncLocalNotifications(context);
  }

  Future<void> _complete(GoalItem goal) async {
    try {
      await context.read<AuthService>().api.updateGoal(goal.id, {
        'status': 'completed',
      });
      await _refresh();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  Future<void> _delete(GoalItem goal) async {
    if (goal.status != 'active') {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Completed and failed goals cannot be deleted.')),
      );
      return;
    }
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete goal?'),
        content: Text('Delete "${goal.title}"?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete')),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      await context.read<AuthService>().api.deleteGoal(goal.id);
      await _refresh();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  Future<void> _openForm({
    GoalItem? goal,
    required List<TaskItem> allTasks,
  }) async {
    final api = context.read<AuthService>().api;
    final isEdit = goal != null;
    final dueDateLocked = isEdit && goal.endDate != null && goal.endDate!.isNotEmpty;

    final titleCtrl = TextEditingController(text: goal?.title ?? '');
    var category = goal?.category ?? 'work';
    var mode = goal != null && goal.isDeadline ? 'due' : 'hours';
    var period = (goal != null && !goal.isDeadline) ? goal.period : 'weekly';
    final hoursCtrl = TextEditingController(
      text: () {
        if (goal?.targetMinutes == null) return '5';
        final hours = goal!.targetMinutes! / 60;
        return hours == hours.roundToDouble()
            ? '${hours.round()}'
            : hours.toStringAsFixed(1);
      }(),
    );
    var startDate = goal?.startDate ?? '';
    var endDate = goal?.endDate ?? '';
    int? linkedTaskId =
        (goal?.taskIds.isNotEmpty ?? false) ? goal!.taskIds.first : null;
    var goalStatus = goal?.status ?? 'active';
    var completionPct = goal?.completionPct ?? 0;
    String? formError;

    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.surface,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setLocal) {
            final selectable = allTasks
                .where((t) => t.category == category)
                .toList();
            return Padding(
              padding: EdgeInsets.only(
                left: 16,
                right: 16,
                top: 16,
                bottom: MediaQuery.viewInsetsOf(context).bottom + 16,
              ),
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      isEdit ? 'Edit goal' : 'New goal',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: titleCtrl,
                      decoration: const InputDecoration(labelText: 'Title'),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: category,
                      items: categories
                          .map((c) => DropdownMenuItem(value: c.id, child: Text(c.label)))
                          .toList(),
                      onChanged: (v) => setLocal(() {
                        category = v ?? category;
                        if (linkedTaskId != null &&
                            !allTasks.any(
                              (t) => t.id == linkedTaskId && t.category == category,
                            )) {
                          linkedTaskId = null;
                        }
                      }),
                      decoration: const InputDecoration(labelText: 'Category'),
                    ),
                    if (isEdit) ...[
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        initialValue: goalStatus,
                        items: const [
                          DropdownMenuItem(value: 'active', child: Text('Active')),
                          DropdownMenuItem(value: 'completed', child: Text('Completed')),
                          DropdownMenuItem(value: 'failed', child: Text('Failed')),
                        ],
                        onChanged: (v) => setLocal(() => goalStatus = v ?? goalStatus),
                        decoration: const InputDecoration(labelText: 'Status'),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Task completion: $completionPct%',
                        style: TextStyle(color: AppTheme.muted, fontSize: 13),
                      ),
                      Slider(
                        value: completionPct.clamp(0, 100).toDouble(),
                        min: 0,
                        max: 100,
                        divisions: 100,
                        label: '$completionPct%',
                        onChanged: (v) => setLocal(() => completionPct = v.round()),
                      ),
                    ],
                    const SizedBox(height: 12),
                    SegmentedButton<String>(
                      segments: const [
                        ButtonSegment(value: 'hours', label: Text('Hours')),
                        ButtonSegment(value: 'due', label: Text('Deadline')),
                      ],
                      selected: {mode},
                      onSelectionChanged: dueDateLocked && mode == 'due'
                          ? null
                          : (s) {
                              if (dueDateLocked && s.first == 'hours') return;
                              setLocal(() {
                                mode = s.first;
                                if (mode == 'hours' && !dueDateLocked) {
                                  endDate = '';
                                  if (period == 'deadline') period = 'weekly';
                                }
                              });
                            },
                    ),
                    const SizedBox(height: 12),
                    if (mode == 'hours') ...[
                      TextField(
                        controller: hoursCtrl,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: const InputDecoration(labelText: 'Target hours'),
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        initialValue: period == 'deadline' ? 'weekly' : period,
                        items: const [
                          DropdownMenuItem(value: 'daily', child: Text('Daily')),
                          DropdownMenuItem(value: 'weekly', child: Text('Weekly')),
                          DropdownMenuItem(value: 'monthly', child: Text('Monthly')),
                        ],
                        onChanged: (v) => setLocal(() => period = v ?? period),
                        decoration: const InputDecoration(labelText: 'Period'),
                      ),
                    ] else ...[
                      OutlinedButton.icon(
                        onPressed: dueDateLocked
                            ? null
                            : () async {
                                final picked =
                                    await pickIsoDate(context, initial: endDate);
                                if (picked != null) {
                                  setLocal(() => endDate = picked);
                                }
                              },
                        icon: const Icon(Icons.event, size: 18),
                        label: Text(
                          dueDateLocked
                              ? 'Due $endDate (locked)'
                              : (endDate.isEmpty ? 'Pick due date' : 'Due $endDate'),
                        ),
                      ),
                    ],
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: () async {
                        final picked =
                            await pickIsoDate(context, initial: startDate);
                        if (picked != null) setLocal(() => startDate = picked);
                      },
                      icon: const Icon(Icons.event_outlined, size: 18),
                      label: Text(startDate.isEmpty ? 'Start date (optional)' : 'Start $startDate'),
                    ),
                    const SizedBox(height: 12),
                    const Text('Link task', style: TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 4),
                    if (selectable.isEmpty)
                      Text(
                        'No tasks in this category.',
                        style: TextStyle(color: AppTheme.muted),
                      )
                    else ...[
                      RadioListTile<int?>(
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                        title: const Text('None'),
                        value: null,
                        groupValue: linkedTaskId,
                        onChanged: (v) => setLocal(() => linkedTaskId = v),
                      ),
                      ...selectable.map(
                        (t) => RadioListTile<int?>(
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                          value: t.id,
                          groupValue: linkedTaskId,
                          onChanged: (v) => setLocal(() => linkedTaskId = v),
                          title: Text('${t.ticketId} · ${t.title}'),
                          subtitle: Text(taskStatuses[t.status] ?? t.status),
                        ),
                      ),
                    ],
                    if (formError != null) ...[
                      const SizedBox(height: 8),
                      Text(formError!, style: const TextStyle(color: Colors.redAccent)),
                    ],
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: () {
                        if (titleCtrl.text.trim().isEmpty) {
                          setLocal(() => formError = 'Enter a title.');
                          return;
                        }
                        if (mode == 'hours') {
                          final hours = double.tryParse(hoursCtrl.text) ?? 0;
                          if (hours <= 0) {
                            setLocal(() => formError = 'Enter target hours.');
                            return;
                          }
                        } else if (endDate.isEmpty && !dueDateLocked) {
                          setLocal(() => formError = 'Pick a due date.');
                          return;
                        }
                        Navigator.pop(context, true);
                      },
                      child: Text(isEdit ? 'Save' : 'Create'),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );

    if (ok != true || !mounted) return;

    final payload = <String, dynamic>{
      'title': titleCtrl.text.trim(),
      'category': category,
      'start_date': startDate.isEmpty ? null : startDate,
      'task_ids': linkedTaskId != null ? [linkedTaskId] : <int>[],
    };
    if (mode == 'hours') {
      final hours = double.tryParse(hoursCtrl.text) ?? 0;
      payload['target_minutes'] = (hours * 60).round();
      payload['period'] = period == 'deadline' ? 'weekly' : period;
      if (!dueDateLocked) payload['end_date'] = null;
    } else {
      if (endDate.isNotEmpty) payload['end_date'] = endDate;
      payload['period'] = 'deadline';
      payload['target_minutes'] = null;
    }
    if (dueDateLocked) payload.remove('end_date');
    if (isEdit) {
      payload['status'] = goalStatus;
      payload['completion_pct'] = completionPct.clamp(0, 100);
    }

    try {
      if (isEdit) {
        await api.updateGoal(goal.id, payload);
      } else {
        await api.createGoal(payload);
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
      appBar: AppBar(
        title: const ScreenAppBarTitle('Goals'),
        automaticallyImplyLeading: false,
        actions: [
          IconButton(onPressed: _refresh, icon: const Icon(Icons.refresh)),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          final data = await _future;
          if (!mounted) return;
          await _openForm(allTasks: data.tasks);
        },
        child: const Icon(Icons.add),
      ),
      body: FutureBuilder<_GoalsData>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const LoadingView();
          }
          if (snap.hasError) {
            return ErrorView(message: snap.error.toString(), onRetry: _refresh);
          }
          final data = snap.data!;
          if (data.goals.isEmpty) {
            return Center(
              child: Text('No goals yet.', style: TextStyle(color: AppTheme.muted)),
            );
          }
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 88),
              itemCount: data.goals.length,
              separatorBuilder: (_, index) => const SizedBox(height: 8),
              itemBuilder: (context, i) {
                final g = data.goals[i];
                final cat = categoryOf(g.category);
                final p = context.pulse;
                final linkedTitles = g.tasks.isNotEmpty
                    ? g.tasks.map((t) => t.title).join(', ')
                    : g.taskIds
                        .map((id) {
                          final t = data.tasks.where((x) => x.id == id);
                          return t.isEmpty ? 'PT-$id' : t.first.title;
                        })
                        .join(', ');
                final metaBits = <String>[
                  '${formatDuration(g.loggedMinutes)} logged',
                  if (!g.isDeadline && g.targetMinutes != null)
                    '${formatDuration(g.targetMinutes!)} / ${g.period}',
                  if (g.startDate != null && g.startDate!.isNotEmpty)
                    'starts ${g.startDate}',
                ];
                final isActive = g.status == 'active';
                final isFailed = g.status == 'failed';
                final dueOverdue = isFailed ||
                    (g.isDeadline && isOverdue(g.endDate, g.status));
                final rowButtonStyle = OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(40),
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  textStyle: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                );
                return Material(
                  color: p.panel,
                  elevation: 0,
                  clipBehavior: Clip.antiAlias,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: BorderSide(
                      color: isFailed
                          ? p.danger.withValues(alpha: 0.35)
                          : p.line,
                    ),
                  ),
                  child: IntrinsicHeight(
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Container(width: 4, color: cat.fg),
                        Expanded(
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Wrap(
                                            crossAxisAlignment: WrapCrossAlignment.center,
                                            spacing: 8,
                                            runSpacing: 6,
                                            children: [
                                              Text(
                                                g.title,
                                                style: TextStyle(
                                                  fontWeight: FontWeight.w700,
                                                  fontSize: 16,
                                                  color: p.text,
                                                ),
                                              ),
                                              GoalStatusPill(status: g.status),
                                            ],
                                          ),
                                          const SizedBox(height: 6),
                                          Wrap(
                                            crossAxisAlignment: WrapCrossAlignment.center,
                                            spacing: 8,
                                            runSpacing: 6,
                                            children: [
                                              CategoryChip(
                                                label: cat.label,
                                                fg: cat.fg,
                                                bg: cat.bg,
                                              ),
                                              if (g.isDeadline &&
                                                  g.endDate != null &&
                                                  g.endDate!.isNotEmpty)
                                                GoalDueChip(
                                                  dueDate: g.endDate!,
                                                  overdue: dueOverdue,
                                                ),
                                              if (metaBits.isNotEmpty)
                                                Text(
                                                  metaBits.join(' · '),
                                                  style: TextStyle(
                                                    color: p.muted,
                                                    fontSize: 12,
                                                  ),
                                                ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                                if (linkedTitles.isNotEmpty) ...[
                                  const SizedBox(height: 6),
                                  Text(
                                    'Tasks: $linkedTitles',
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: p.text,
                                    ),
                                  ),
                                ],
                                const SizedBox(height: 10),
                                _GoalProgressSection(
                                  completionPct: g.completionPct,
                                  accent: cat.fg,
                                  status: g.status,
                                  trackColor: p.line,
                                ),
                                if (isFailed) ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    'Due date ${g.endDate ?? '—'} was missed — this goal failed.',
                                    style: TextStyle(
                                      color: p.danger,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                                if (isActive) ...[
                                  const SizedBox(height: 12),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: OutlinedButton(
                                          style: rowButtonStyle,
                                          onPressed: () => _openForm(
                                            goal: g,
                                            allTasks: data.tasks,
                                          ),
                                          child: const Text('Edit'),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: OutlinedButton(
                                          style: rowButtonStyle,
                                          onPressed: () => _complete(g),
                                          child: const Text('Complete'),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  SizedBox(
                                    width: double.infinity,
                                    child: TextButton(
                                      onPressed: () => _delete(g),
                                      child: const Text(
                                        'Delete',
                                        style: TextStyle(color: Colors.redAccent),
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
