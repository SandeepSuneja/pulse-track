import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../constants/categories.dart';
import '../models/models.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../theme/pulse_palette.dart';
import '../theme/theme_rebuild.dart';
import '../widgets/brand.dart';
import '../widgets/common.dart';

class GoalsScreen extends StatefulWidget {
  const GoalsScreen({super.key});

  @override
  State<GoalsScreen> createState() => _GoalsScreenState();
}

class _GoalsData {
  const _GoalsData({
    required this.goals,
    required this.tasks,
    required this.activities,
    required this.weekProgress,
  });

  final List<GoalItem> goals;
  final List<TaskItem> tasks;
  final List<ActivityItem> activities;
  final Map<int, GoalProgress> weekProgress;
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
      api.listActivities(),
      api.analytics(period: 'week'),
    ]);
    final summary = results[3] as AnalyticsSummary;
    final map = <int, GoalProgress>{
      for (final g in summary.goalProgress) g.goalId: g,
    };
    return _GoalsData(
      goals: results[0] as List<GoalItem>,
      tasks: results[1] as List<TaskItem>,
      activities: results[2] as List<ActivityItem>,
      weekProgress: map,
    );
  }

  Future<void> _refresh() async {
    final next = _load();
    setState(() => _future = next);
    await next;
  }

  ({int actual, int target, double pct}) _progressFor(
    GoalItem goal,
    Map<int, GoalProgress> weekById,
    List<ActivityItem> activities,
  ) {
    final linked = goal.taskIds.toSet();
    if (goal.isDeadline) {
      final start = goal.startDate ?? '1970-01-01';
      final end = goal.endDate ?? '9999-12-31';
      final actual = activities
          .where((a) {
            if (a.activityDate.compareTo(start) < 0 ||
                a.activityDate.compareTo(end) > 0) {
              return false;
            }
            if (linked.isNotEmpty) return linked.contains(a.taskId);
            return a.category == goal.category;
          })
          .fold<int>(0, (sum, a) => sum + a.durationMinutes);
      return (actual: actual, target: 0, pct: 0);
    }
    final fromAnalytics = weekById[goal.id];
    if (fromAnalytics != null) {
      return (
        actual: fromAnalytics.actualMinutes,
        target: fromAnalytics.targetMinutes,
        pct: fromAnalytics.completionPct,
      );
    }
    return (actual: 0, target: goal.targetMinutes ?? 0, pct: 0);
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return 'Active';
    }
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
    if (goal != null && (goal.status == 'completed' || goal.status == 'failed')) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${_statusLabel(goal.status)} goals cannot be edited.')),
      );
      return;
    }

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
    final selectedTaskIds = {...?goal?.taskIds};
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
                        selectedTaskIds.removeWhere(
                          (id) => !allTasks.any((t) => t.id == id && t.category == category),
                        );
                      }),
                      decoration: const InputDecoration(labelText: 'Category'),
                    ),
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
                    const Text('Link tasks', style: TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 4),
                    if (selectable.isEmpty)
                      Text(
                        'No tasks in this category.',
                        style: TextStyle(color: AppTheme.muted),
                      )
                    else
                      ...selectable.map(
                        (t) => CheckboxListTile(
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                          value: selectedTaskIds.contains(t.id),
                          onChanged: (v) => setLocal(() {
                            if (v == true) {
                              selectedTaskIds.add(t.id);
                            } else {
                              selectedTaskIds.remove(t.id);
                            }
                          }),
                          title: Text('${t.ticketId} · ${t.title}'),
                          subtitle: Text(taskStatuses[t.status] ?? t.status),
                        ),
                      ),
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
      'task_ids': selectedTaskIds.toList(),
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
        title: const BrandedAppBarTitle('Goals'),
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
                final progress =
                    _progressFor(g, data.weekProgress, data.activities);
                final linkedTitles = g.tasks.isNotEmpty
                    ? g.tasks.map((t) => t.title).join(', ')
                    : g.taskIds
                        .map((id) {
                          final t = data.tasks.where((x) => x.id == id);
                          return t.isEmpty ? 'PT-$id' : t.first.title;
                        })
                        .join(', ');
                final metaBits = <String>[
                  _statusLabel(g.status),
                  if (g.isDeadline)
                    'due ${g.endDate ?? '—'}'
                  else if (g.targetMinutes != null)
                    '${formatDuration(g.targetMinutes!)} / ${g.period}',
                  if (g.startDate != null && g.startDate!.isNotEmpty)
                    'starts ${g.startDate}',
                ];
                final isActive = g.status == 'active';
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
                    side: BorderSide(color: p.line),
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
                                      child: Text(
                                        g.title,
                                        style: TextStyle(
                                          fontWeight: FontWeight.w700,
                                          fontSize: 16,
                                          color: p.text,
                                        ),
                                      ),
                                    ),
                                    CategoryChip(
                                      label: cat.label,
                                      fg: cat.fg,
                                      bg: cat.bg,
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  metaBits.join(' · '),
                                  style: TextStyle(
                                    color: p.muted,
                                    fontSize: 12,
                                  ),
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
                                if (progress.target > 0) ...[
                                  LinearProgressIndicator(
                                    value: (progress.pct / 100).clamp(0, 1),
                                    color: cat.fg,
                                    backgroundColor: p.line,
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '${formatDuration(progress.actual)} / ${formatDuration(progress.target)}'
                                    ' · ${progress.pct.round()}%',
                                    style: TextStyle(
                                      color: p.muted,
                                      fontSize: 12,
                                    ),
                                  ),
                                ] else ...[
                                  Text(
                                    'Logged ${formatDuration(progress.actual)}',
                                    style: TextStyle(
                                      color: p.muted,
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                                const SizedBox(height: 12),
                                if (isActive)
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
                                if (isActive) const SizedBox(height: 4),
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
