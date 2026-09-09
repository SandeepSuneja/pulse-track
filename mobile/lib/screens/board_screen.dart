import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../constants/categories.dart';
import '../models/models.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../theme/pulse_palette.dart';
import '../theme/theme_rebuild.dart';
import '../widgets/common.dart';

class BoardScreen extends StatefulWidget {
  const BoardScreen({super.key});

  @override
  State<BoardScreen> createState() => _BoardScreenState();
}

class _BoardData {
  const _BoardData({required this.tasks, required this.goals});

  final List<TaskItem> tasks;
  final List<GoalItem> goals;
}

class _BoardScreenState extends State<BoardScreen> {
  late Future<_BoardData> _future;
  var _statusFilter = 'in_progress';

  static const _statusOrder = ['todo', 'in_progress', 'completed'];

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<_BoardData> _load() async {
    final api = context.read<AuthService>().api;
    final results = await Future.wait([
      api.listTasks(),
      api.listGoals(),
    ]);
    return _BoardData(
      tasks: results[0] as List<TaskItem>,
      goals: results[1] as List<GoalItem>,
    );
  }

  Future<void> _refresh() async {
    final next = _load();
    setState(() => _future = next);
    await next;
  }

  Future<void> _deleteTask(TaskItem task) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete task?'),
        content: Text('Delete ${task.ticketId} · ${task.title}?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete')),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      await context.read<AuthService>().api.deleteTask(task.id);
      await _refresh();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  Future<void> _openForm({
    TaskItem? task,
    String initialStatus = 'todo',
    required List<GoalItem> goals,
  }) async {
    final api = context.read<AuthService>().api;
    final isEdit = task != null;
    final titleCtrl = TextEditingController(text: task?.title ?? '');
    final notesCtrl = TextEditingController(text: task?.notes ?? '');
    var category = task?.category ?? 'work';
    var status = task?.status ?? initialStatus;
    var startDate = task?.startDate ?? '';
    var dueDate = task?.dueDate ?? '';
    int? goalId = task?.goalId;
    var activities = <ActivityItem>[];
    var activitiesLoading = isEdit;
    var activitiesFetchStarted = false;

    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.surface,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setLocal) {
            if (isEdit && activitiesLoading && !activitiesFetchStarted) {
              activitiesFetchStarted = true;
              api.listActivities(taskId: task.id).then((logs) {
                if (!context.mounted) return;
                setLocal(() {
                  activities = logs;
                  activitiesLoading = false;
                });
              }).catchError((_) {
                if (!context.mounted) return;
                setLocal(() => activitiesLoading = false);
              });
            }
            final activeGoals = goals
                .where((g) => (g.status == 'active') && g.category == category)
                .toList();
            final goalItems = <DropdownMenuItem<int?>>[
              const DropdownMenuItem<int?>(value: null, child: Text('No goal')),
              ...activeGoals.map(
                (g) => DropdownMenuItem<int?>(
                  value: g.id,
                  child: Text(g.title, overflow: TextOverflow.ellipsis),
                ),
              ),
            ];
            if (goalId != null && !goalItems.any((i) => i.value == goalId)) {
              final orphan = goals.where((g) => g.id == goalId).toList();
              if (orphan.isNotEmpty) {
                goalItems.add(
                  DropdownMenuItem<int?>(
                    value: orphan.first.id,
                    child: Text(
                      '${orphan.first.title} (other)',
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                );
              }
            }
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
                      isEdit ? 'Edit ${task.ticketId}' : 'New task',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: titleCtrl,
                      decoration: const InputDecoration(labelText: 'Title'),
                      autofocus: !isEdit,
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: category,
                      items: categories
                          .map((c) => DropdownMenuItem(value: c.id, child: Text(c.label)))
                          .toList(),
                      onChanged: (v) => setLocal(() {
                        category = v ?? category;
                        if (goalId != null &&
                            !goals.any((g) => g.id == goalId && g.category == category)) {
                          goalId = null;
                        }
                      }),
                      decoration: const InputDecoration(labelText: 'Category'),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: status,
                      items: taskStatuses.entries
                          .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value)))
                          .toList(),
                      onChanged: (v) => setLocal(() => status = v ?? status),
                      decoration: const InputDecoration(labelText: 'Status'),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () async {
                              final picked = await pickIsoDate(context, initial: startDate);
                              if (picked != null) setLocal(() => startDate = picked);
                            },
                            icon: const Icon(Icons.event_outlined, size: 18),
                            label: Text(startDate.isEmpty ? 'Start date' : startDate),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () async {
                              final picked = await pickIsoDate(context, initial: dueDate);
                              if (picked != null) setLocal(() => dueDate = picked);
                            },
                            icon: const Icon(Icons.event, size: 18),
                            label: Text(dueDate.isEmpty ? 'Due date' : dueDate),
                          ),
                        ),
                      ],
                    ),
                    if (startDate.isNotEmpty || dueDate.isNotEmpty)
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton(
                          onPressed: () => setLocal(() {
                            startDate = '';
                            dueDate = '';
                          }),
                          child: const Text('Clear dates'),
                        ),
                      ),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<int?>(
                      initialValue: goalId,
                      items: goalItems,
                      onChanged: (v) => setLocal(() => goalId = v),
                      decoration: const InputDecoration(labelText: 'Goal'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: notesCtrl,
                      maxLines: 3,
                      decoration: const InputDecoration(labelText: 'Notes'),
                    ),
                    if (isEdit) ...[
                      const SizedBox(height: 16),
                      const Text('Activities', style: TextStyle(fontWeight: FontWeight.w700)),
                      const SizedBox(height: 8),
                      if (activitiesLoading)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 12),
                          child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
                        )
                      else if (activities.isEmpty)
                        Text('No logs yet.', style: TextStyle(color: AppTheme.muted))
                      else
                        ...activities.map(
                          (a) => ListTile(
                            dense: true,
                            contentPadding: EdgeInsets.zero,
                            title: Text(a.activityDate),
                            subtitle: a.notes.isEmpty ? null : Text(a.notes, maxLines: 1),
                            trailing: Text(formatDuration(a.durationMinutes)),
                          ),
                        ),
                    ],
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: () {
                        if (titleCtrl.text.trim().isEmpty) return;
                        Navigator.pop(context, true);
                      },
                      child: Text(isEdit ? 'Save' : 'Create'),
                    ),
                    if (isEdit) ...[
                      const SizedBox(height: 8),
                      TextButton(
                        onPressed: () async {
                          Navigator.pop(context, false);
                          await _deleteTask(task);
                        },
                        child: const Text('Delete task', style: TextStyle(color: Colors.redAccent)),
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

    if (saved != true || !mounted) return;
    final body = <String, dynamic>{
      'title': titleCtrl.text.trim(),
      'category': category,
      'status': status,
      'notes': notesCtrl.text.trim(),
      'start_date': startDate.isEmpty ? null : startDate,
      'due_date': dueDate.isEmpty ? null : dueDate,
      'goal_id': goalId,
    };
    try {
      if (isEdit) {
        await api.updateTask(task.id, body);
      } else {
        await api.createTask(body);
      }
      await _refresh();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  Future<void> _createTask(List<GoalItem> goals) async {
    await _openForm(
      initialStatus: _statusFilter == 'completed' ? 'todo' : _statusFilter,
      goals: goals,
    );
  }

  @override
  Widget build(BuildContext context) {
    context.watchAppearance();
    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        title: Text(
          'Board',
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
                    await _createTask(data.goals);
                  } catch (_) {
                    messenger.showSnackBar(
                      const SnackBar(content: Text('Could not load board. Pull to refresh.')),
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
      body: FutureBuilder<_BoardData>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const LoadingView();
          }
          if (snap.hasError) {
            return ErrorView(message: snap.error.toString(), onRetry: _refresh);
          }
          final data = snap.data!;
          final tasks = data.tasks;
          final counts = {
            for (final key in _statusOrder)
              key: tasks.where((t) => t.status == key).length,
          };
          final filtered = tasks.where((t) => t.status == _statusFilter).toList();

          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: AppTheme.softPrimary,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.line),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Icons.info_outline, size: 20, color: AppTheme.primary),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Only In Progress tasks can be logged in Activities',
                              style: TextStyle(
                                color: AppTheme.text,
                                fontSize: 13,
                                height: 1.35,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          for (final key in _statusOrder) ...[
                            _StatusPill(
                              label: taskStatuses[key] ?? key,
                              count: counts[key] ?? 0,
                              selected: _statusFilter == key,
                              onTap: () => setState(() => _statusFilter = key),
                            ),
                            const SizedBox(width: 10),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: _refresh,
                  child: filtered.isEmpty
                      ? ListView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          children: [
                            const SizedBox(height: 80),
                            Center(
                              child: Text(
                                'No tasks here',
                                style: TextStyle(color: AppTheme.muted),
                              ),
                            ),
                          ],
                        )
                      : ListView.separated(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                          itemCount: filtered.length,
                          separatorBuilder: (context, index) => const SizedBox(height: 10),
                          itemBuilder: (context, index) {
                            final task = filtered[index];
                            return _TaskCard(
                              task: task,
                              onTap: () => _openForm(task: task, goals: data.goals),
                            );
                          },
                        ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({
    required this.label,
    required this.count,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final int count;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.pulse;
    return Material(
      color: p.panel,
      shape: StadiumBorder(
        side: BorderSide(
          color: selected ? p.primary : p.line,
          width: selected ? 1.5 : 1,
        ),
      ),
      child: InkWell(
        onTap: onTap,
        customBorder: const StadiumBorder(),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 8, 10, 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: TextStyle(
                  color: selected ? p.primary : p.muted,
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
              const SizedBox(width: 8),
              Container(
                height: 22,
                padding: const EdgeInsets.symmetric(horizontal: 7),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: selected ? p.primary : p.chipBg,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  '$count',
                  style: TextStyle(
                    color: selected ? p.onPrimary : p.muted,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TaskCard extends StatelessWidget {
  const _TaskCard({required this.task, required this.onTap});

  final TaskItem task;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cat = categoryOf(task.category);
    final overdue = isOverdue(task.dueDate, task.status);
    final hasGoal = task.goalTitle != null && task.goalTitle!.isNotEmpty;
    final activityLabel = task.activityCount == 0 && task.loggedMinutes == 0
        ? 'No activities yet'
        : '${task.activityCount} activit${task.activityCount == 1 ? 'y' : 'ies'}'
            '${task.loggedMinutes > 0 ? ' · ${formatDuration(task.loggedMinutes)}' : ''}';

    final p = context.pulse;
    return Material(
      color: p.panel,
      elevation: 0,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: p.line),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(width: 4, color: cat.fg),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(14, 14, 16, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          Text(
                            task.ticketId,
                            style: TextStyle(
                              color: p.muted,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const Spacer(),
                          CategoryChip(label: cat.label, fg: cat.fg, bg: cat.bg),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(
                        task.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 16,
                          height: 1.25,
                          color: p.text,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Divider(height: 1, color: p.line),
                      const SizedBox(height: 12),
                      if (task.dueDate != null && task.dueDate!.isNotEmpty)
                        _MetaRow(
                          icon: Icons.calendar_today_outlined,
                          text: 'Due ${formatShortDate(task.dueDate)}',
                          color: overdue ? const Color(0xFFE11D48) : p.muted,
                        )
                      else
                        _MetaRow(
                          icon: Icons.calendar_today_outlined,
                          text: 'No due date',
                          color: p.muted,
                        ),
                      const SizedBox(height: 8),
                      _MetaRow(
                        icon: Icons.schedule_outlined,
                        text: activityLabel,
                        color: p.muted,
                      ),
                      if (hasGoal) ...[
                        const SizedBox(height: 8),
                        _MetaRow(
                          icon: Icons.circle,
                          iconSize: 8,
                          text: task.goalTitle!,
                          color: p.primary,
                          bold: true,
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MetaRow extends StatelessWidget {
  const _MetaRow({
    required this.icon,
    required this.text,
    required this.color,
    this.iconSize = 15,
    this.bold = false,
  });

  final IconData icon;
  final String text;
  final Color color;
  final double iconSize;
  final bool bold;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: iconSize, color: color),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: color,
              fontSize: 13,
              fontWeight: bold ? FontWeight.w600 : FontWeight.w500,
            ),
          ),
        ),
      ],
    );
  }
}
