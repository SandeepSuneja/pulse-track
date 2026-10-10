import 'package:shared_preferences/shared_preferences.dart';

/// User toggles for locally scheduled reminders (device-only).
class NotificationPrefs {
  static const _prefix = 'notify_';

  bool enabled = true;
  bool goalDeadlines = true;
  bool goalPace = true;
  bool taskOverdue = true;
  bool taskStartDates = true;
  bool taskStuckInProgress = true;
  bool dailyLogReminder = true;
  bool weeklySummary = true;
  bool sleepReminder = false;

  int quietHoursStart = 22; // 22:00 inclusive
  int quietHoursEnd = 8; // 08:00 exclusive end of quiet window
  int dailyLogHour = 18;
  int dailyLogMinute = 0;
  int stuckInProgressDays = 3;

  Future<void> load() async {
    final p = await SharedPreferences.getInstance();
    enabled = p.getBool('${_prefix}enabled') ?? true;
    goalDeadlines = p.getBool('${_prefix}goal_deadlines') ?? true;
    goalPace = p.getBool('${_prefix}goal_pace') ?? true;
    taskOverdue = p.getBool('${_prefix}task_overdue') ?? true;
    taskStartDates = p.getBool('${_prefix}task_start') ?? true;
    taskStuckInProgress = p.getBool('${_prefix}task_stuck') ?? true;
    dailyLogReminder = p.getBool('${_prefix}daily_log') ?? true;
    weeklySummary = p.getBool('${_prefix}weekly_summary') ?? true;
    sleepReminder = p.getBool('${_prefix}sleep') ?? false;
    quietHoursStart = p.getInt('${_prefix}quiet_start') ?? 22;
    quietHoursEnd = p.getInt('${_prefix}quiet_end') ?? 8;
    dailyLogHour = p.getInt('${_prefix}daily_log_hour') ?? 18;
    dailyLogMinute = p.getInt('${_prefix}daily_log_min') ?? 0;
    stuckInProgressDays = p.getInt('${_prefix}stuck_days') ?? 3;
  }

  Future<void> save() async {
    final p = await SharedPreferences.getInstance();
    await p.setBool('${_prefix}enabled', enabled);
    await p.setBool('${_prefix}goal_deadlines', goalDeadlines);
    await p.setBool('${_prefix}goal_pace', goalPace);
    await p.setBool('${_prefix}task_overdue', taskOverdue);
    await p.setBool('${_prefix}task_start', taskStartDates);
    await p.setBool('${_prefix}task_stuck', taskStuckInProgress);
    await p.setBool('${_prefix}daily_log', dailyLogReminder);
    await p.setBool('${_prefix}weekly_summary', weeklySummary);
    await p.setBool('${_prefix}sleep', sleepReminder);
    await p.setInt('${_prefix}quiet_start', quietHoursStart);
    await p.setInt('${_prefix}quiet_end', quietHoursEnd);
    await p.setInt('${_prefix}daily_log_hour', dailyLogHour);
    await p.setInt('${_prefix}daily_log_min', dailyLogMinute);
    await p.setInt('${_prefix}stuck_days', stuckInProgressDays);
  }
}
