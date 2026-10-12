import 'package:flutter/foundation.dart';

import '../models/models.dart';
import '../services/api_client.dart';
import '../widgets/common.dart';
import 'local_notifications.dart';
import 'notification_prefs.dart';
import 'notification_scheduler.dart';

class NotificationController extends ChangeNotifier {
  final NotificationPrefs prefs = NotificationPrefs();
  bool _syncing = false;
  String? lastSyncError;
  int lastPendingCount = 0;
  DateTime? lastSyncAt;

  bool get syncing => _syncing;

  Future<void> load() async {
    await prefs.load();
    await LocalNotifications.instance.initialize(
      onTap: (route) {
        pendingRoute = route;
        notifyListeners();
      },
    );
  }

  /// Set by notification tap; ShellScreen consumes and navigates.
  String? pendingRoute;

  String? takePendingRoute() {
    final r = pendingRoute;
    pendingRoute = null;
    return r;
  }

  Future<void> updatePrefs(Future<void> Function(NotificationPrefs) edit) async {
    await edit(prefs);
    await prefs.save();
    notifyListeners();
  }

  Future<void> syncFromApi({
    required ApiClient api,
    String? profileTimezone,
  }) async {
    if (_syncing) return;
    _syncing = true;
    lastSyncError = null;
    notifyListeners();
    try {
      await prefs.load();
      if (!prefs.enabled) {
        await LocalNotifications.instance.cancelAll();
        lastPendingCount = 0;
        return;
      }

      final granted = await LocalNotifications.instance.requestPermissions();
      if (!granted) {
        lastSyncError =
            'Notification permission is off. Enable Pulse Track in system Settings → Notifications.';
        return;
      }

      final location =
          await LocalNotifications.instance.resolveLocation(profileTimezone);

      var goals = <GoalItem>[];
      var tasks = <TaskItem>[];
      var recentActivities = <ActivityItem>[];
      final errors = <String>[];

      try {
        goals = await api.listGoals();
      } catch (e) {
        errors.add('goals: $e');
      }
      try {
        tasks = await api.listTasks();
      } catch (e) {
        errors.add('tasks: $e');
      }
      try {
        recentActivities = await api.listActivities(
          startDate: _daysAgoIso(60),
          endDate: isoToday(),
        );
      } catch (e) {
        errors.add('activities: $e');
      }

      if (errors.isNotEmpty &&
          goals.isEmpty &&
          tasks.isEmpty &&
          recentActivities.isEmpty) {
        lastSyncError =
            'Could not load data to schedule reminders (${errors.first}). Check network and API.';
        return;
      }
      if (errors.isNotEmpty && kDebugMode) {
        debugPrint('Notification sync partial errors: ${errors.join('; ')}');
      }

      await NotificationScheduler.reschedule(
        prefs: prefs,
        location: location,
        goals: goals,
        tasks: tasks,
        recentActivities: recentActivities,
      );

      lastPendingCount = await LocalNotifications.instance.pendingCount();
      lastSyncAt = DateTime.now();
      if (lastPendingCount == 0 && prefs.enabled) {
        lastSyncError =
            'No reminders were scheduled yet (no matching due dates / in-progress tasks, or all times are in the past). Use “Test notification” below.';
      }
    } catch (e, st) {
      lastSyncError = e.toString();
      if (kDebugMode) {
        debugPrint('Notification sync failed: $e\n$st');
      }
    } finally {
      _syncing = false;
      notifyListeners();
    }
  }

  Future<void> showTestNotification() async {
    lastSyncError = null;
    final granted = await LocalNotifications.instance.requestPermissions();
    if (!granted) {
      lastSyncError = 'Notification permission denied.';
      notifyListeners();
      return;
    }
    await LocalNotifications.instance.showTest();
    notifyListeners();
  }

  Future<void> scheduleTestInTwoMinutes({String? profileTimezone}) async {
    lastSyncError = null;
    final granted = await LocalNotifications.instance.requestPermissions();
    if (!granted) {
      lastSyncError = 'Notification permission denied.';
      notifyListeners();
      return;
    }
    final location =
        await LocalNotifications.instance.resolveLocation(profileTimezone);
    await LocalNotifications.instance.scheduleSoonTest(location: location);
    lastPendingCount = await LocalNotifications.instance.pendingCount();
    lastSyncAt = DateTime.now();
    notifyListeners();
  }

  Future<void> onSignedOut() async {
    await LocalNotifications.instance.cancelAll();
    lastPendingCount = 0;
    lastSyncError = null;
    lastSyncAt = null;
  }

  static String _daysAgoIso(int days) {
    final d = DateTime.now().subtract(Duration(days: days));
    final y = d.year.toString().padLeft(4, '0');
    final m = d.month.toString().padLeft(2, '0');
    final day = d.day.toString().padLeft(2, '0');
    return '$y-$m-$day';
  }
}
