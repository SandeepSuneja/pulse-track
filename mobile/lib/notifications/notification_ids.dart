/// Stable notification id ranges (must fit platform int limits).
abstract final class NotificationIds {
  static int goalDayBefore(int goalId) => 100000 + goalId;
  static int goalDueDay(int goalId) => 110000 + goalId;
  static int goalMissed(int goalId) => 120000 + goalId;
  static int goalPace(int goalId) => 130000 + goalId;

  static int taskOverdue(int taskId, int slot) => 200000 + taskId * 10 + slot;
  static int taskStart(int taskId) => 210000 + taskId;
  static int taskStuck(int taskId) => 220000 + taskId;

  static const int dailyLog = 300000;
  static const int weeklySummary = 400000;
  static const int sleepReminder = 500000;
}
