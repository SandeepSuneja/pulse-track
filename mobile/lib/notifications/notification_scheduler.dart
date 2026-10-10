import 'package:timezone/timezone.dart' as tz;

import '../models/models.dart';
import '../widgets/common.dart';
import 'local_notifications.dart';
import 'notification_ids.dart';
import 'notification_prefs.dart';

class NotificationScheduler {
  NotificationScheduler._();

  static Future<void> reschedule({
    required NotificationPrefs prefs,
    required tz.Location location,
    required List<GoalItem> goals,
    required List<TaskItem> tasks,
    required List<ActivityItem> recentActivities,
  }) async {
    final local = LocalNotifications.instance;
    await local.cancelAll();

    if (!prefs.enabled) return;

    final now = tz.TZDateTime.now(location);
    final today = DateTime(now.year, now.month, now.day);
    final todayIso = isoToday();

    final inProgress =
        tasks.where((t) => t.status == 'in_progress').toList();
    final loggedToday = recentActivities
        .where((a) => a.activityDate == todayIso)
        .fold<int>(0, (s, a) => s + a.durationMinutes);

    final lastActivityByTask = <int, DateTime>{};
    for (final a in recentActivities) {
      final tid = a.taskId;
      if (tid == null) continue;
      final d = DateTime.tryParse(a.activityDate);
      if (d == null) continue;
      final prev = lastActivityByTask[tid];
      if (prev == null || d.isAfter(prev)) {
        lastActivityByTask[tid] = d;
      }
    }

    var scheduled = 0;
    const maxOneShot = 48;

    Future<void> addOneShot({
      required int id,
      required String title,
      required String body,
      required tz.TZDateTime when,
      required String channel,
      String route = '/goals',
    }) async {
      if (scheduled >= maxOneShot) return;
      final adjusted = _respectQuietHours(when, prefs);
      await local.scheduleZoned(
        id: id,
        title: title,
        body: body,
        when: adjusted,
        androidChannelId: channel,
        route: route,
      );
      scheduled++;
    }

    if (prefs.goalDeadlines) {
      for (final g in goals) {
        if (g.status != 'active' || !g.isDeadline) continue;
        final end = _parseDate(g.endDate);
        if (end == null) continue;

        final dayBefore = end.subtract(const Duration(days: 1));
        await addOneShot(
          id: NotificationIds.goalDayBefore(g.id),
          title: 'Goal due tomorrow',
          body: '${g.title} is due on ${g.endDate}.',
          when: _atLocalTime(location, dayBefore, 9, 0),
          channel: 'goals',
          route: '/goals',
        );

        await addOneShot(
          id: NotificationIds.goalDueDay(g.id),
          title: 'Goal due today',
          body: '${g.title} is due today.',
          when: _atLocalTime(location, end, 9, 0),
          channel: 'goals',
          route: '/goals',
        );

        final after = end.add(const Duration(days: 1));
        await addOneShot(
          id: NotificationIds.goalMissed(g.id),
          title: 'Goal past due date',
          body:
              '${g.title} was due ${g.endDate}. Open Goals to update or mark complete.',
          when: _atLocalTime(location, after, 9, 0),
          channel: 'goals',
          route: '/goals',
        );
      }
    }

    if (prefs.goalPace) {
      for (final g in goals) {
        if (g.status != 'active' || g.isDeadline) continue;
        final target = g.targetMinutes;
        if (target == null || target < 1) continue;

        final logged = g.loggedMinutes;
        final paceWhen = _nextPaceCheck(location, g.period, now);
        if (paceWhen == null) continue;

        final targetLabel = formatDuration(target);
        final loggedLabel = formatDuration(logged);
        await addOneShot(
          id: NotificationIds.goalPace(g.id),
          title: 'Goal check-in',
          body:
              '$loggedLabel logged toward "${g.title}" (${g.period} target $targetLabel).',
          when: paceWhen,
          channel: 'goals',
          route: '/goals',
        );
      }
    }

    if (prefs.taskOverdue) {
      var overdueCount = 0;
      for (final t in tasks) {
        if (overdueCount >= 8) break;
        if (!isOverdue(t.dueDate, t.status)) continue;
        overdueCount++;
        for (var slot = 0; slot < 3; slot++) {
          final day = today.add(Duration(days: slot + 1));
          await addOneShot(
            id: NotificationIds.taskOverdue(t.id, slot),
            title: 'Overdue task',
            body: '${t.ticketId} · ${t.title} is past its due date.',
            when: _atLocalTime(location, day, 9, 0),
            channel: 'tasks',
            route: '/board',
          );
        }
      }
    }

    if (prefs.taskStartDates) {
      for (final t in tasks) {
        if (t.status == 'completed') continue;
        final start = _parseDate(t.startDate);
        if (start == null) continue;
        if (start.isBefore(today)) continue;
        if (start.difference(today).inDays > 14) continue;
        await addOneShot(
          id: NotificationIds.taskStart(t.id),
          title: start == today ? 'Task starts today' : 'Task starting soon',
          body: start == today
              ? '${t.ticketId} · ${t.title} starts today.'
              : '${t.ticketId} · ${t.title} starts on ${t.startDate}.',
          when: _atLocalTime(
            location,
            start,
            9,
            0,
          ),
          channel: 'tasks',
          route: '/board',
        );
      }
    }

    if (prefs.taskStuckInProgress) {
      final threshold = prefs.stuckInProgressDays;
      for (final t in inProgress) {
        final last = lastActivityByTask[t.id];
        if (last != null) {
          final daysSince = today.difference(last).inDays;
          if (daysSince < threshold) continue;
        } else if (threshold > 0) {
          // No recent activity in window — still nudge once.
        }
        await addOneShot(
          id: NotificationIds.taskStuck(t.id),
          title: 'Log time on a task',
          body:
              'No recent activity on ${t.ticketId} · ${t.title}. Add a log when you can.',
          when: _atLocalTime(location, today.add(const Duration(days: 1)), 9, 0),
          channel: 'tasks',
          route: '/activities',
        );
      }
    }

    if (prefs.dailyLogReminder && inProgress.isNotEmpty) {
      if (loggedToday < 1) {
        await local.scheduleDaily(
          id: NotificationIds.dailyLog,
          title: 'Log your work',
          body:
              'You have ${inProgress.length} in-progress task${inProgress.length == 1 ? '' : 's'}. Log time in Activities.',
          location: location,
          hour: prefs.dailyLogHour,
          minute: prefs.dailyLogMinute,
          androidChannelId: 'reminders',
          route: '/activities',
        );
      }
    }

    if (prefs.weeklySummary) {
      await local.scheduleWeekly(
        id: NotificationIds.weeklySummary,
        title: 'Your week in Pulse Track',
        body:
            'Open the dashboard for goal progress and time logged this week.',
        location: location,
        weekday: DateTime.sunday,
        hour: 10,
        minute: 0,
        androidChannelId: 'summary',
        route: '/dashboard',
      );
    }

    if (prefs.sleepReminder) {
      final hasSleep = inProgress.any((t) => t.category == 'sleep');
      if (hasSleep) {
        await local.scheduleDaily(
          id: NotificationIds.sleepReminder,
          title: 'Sleep log',
          body: 'Log last night\'s sleep in Activities when you\'re ready.',
          location: location,
          hour: 8,
          minute: 30,
          androidChannelId: 'reminders',
          route: '/activities',
        );
      }
    }
  }

  static DateTime? _parseDate(String? iso) {
    if (iso == null || iso.isEmpty) return null;
    return DateTime.tryParse(iso);
  }

  static tz.TZDateTime _atLocalTime(
    tz.Location location,
    DateTime date,
    int hour,
    int minute,
  ) {
    return tz.TZDateTime(
      location,
      date.year,
      date.month,
      date.day,
      hour,
      minute,
    );
  }

  static tz.TZDateTime _respectQuietHours(
    tz.TZDateTime when,
    NotificationPrefs prefs,
  ) {
    var t = when;
    for (var i = 0; i < 48; i++) {
      if (!_inQuietHours(t, prefs)) return t;
      t = t.add(const Duration(hours: 1));
    }
    return when;
  }

  static bool _inQuietHours(tz.TZDateTime t, NotificationPrefs prefs) {
    final h = t.hour;
    final start = prefs.quietHoursStart;
    final end = prefs.quietHoursEnd;
    if (start == end) return false;
    if (start < end) {
      return h >= start && h < end;
    }
    return h >= start || h < end;
  }

  static tz.TZDateTime? _nextPaceCheck(
    tz.Location location,
    String period,
    tz.TZDateTime now,
  ) {
    final today = DateTime(now.year, now.month, now.day);
    switch (period) {
      case 'daily':
        return _atLocalTime(
          location,
          today.add(const Duration(days: 1)),
          20,
          0,
        );
      case 'weekly':
        // Next Wednesday 10:00
        var d = today;
        while (d.weekday != DateTime.wednesday) {
          d = d.add(const Duration(days: 1));
        }
        var when = _atLocalTime(location, d, 10, 0);
        if (!when.isAfter(now)) {
          when = when.add(const Duration(days: 7));
        }
        return when;
      case 'monthly':
        var when = _atLocalTime(location, DateTime(today.year, today.month, 15),
            10, 0);
        if (!when.isAfter(now)) {
          final nextMonth = today.month == 12
              ? DateTime(today.year + 1, 1, 15)
              : DateTime(today.year, today.month + 1, 15);
          when = _atLocalTime(location, nextMonth, 10, 0);
        }
        return when;
      default:
        return null;
    }
  }
}
