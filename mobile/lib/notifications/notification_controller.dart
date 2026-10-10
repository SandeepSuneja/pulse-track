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
    notifyListeners();
    try {
      await prefs.load();
      if (!prefs.enabled) {
        await LocalNotifications.instance.cancelAll();
        return;
      }
      final granted = await LocalNotifications.instance.requestPermissions();
      if (!granted && !kIsWeb) {
        return;
      }

      final location =
          await LocalNotifications.instance.resolveLocation(profileTimezone);

      final results = await Future.wait<Object>([
        api.listGoals(),
        api.listTasks(),
        api.listActivities(
          startDate: _daysAgoIso(60),
          endDate: isoToday(),
        ),
      ]);

      await NotificationScheduler.reschedule(
        prefs: prefs,
        location: location,
        goals: results[0] as List<GoalItem>,
        tasks: results[1] as List<TaskItem>,
        recentActivities: results[2] as List<ActivityItem>,
      );
    } catch (e) {
      if (kDebugMode) {
        debugPrint('Notification sync failed: $e');
      }
    } finally {
      _syncing = false;
      notifyListeners();
    }
  }

  Future<void> onSignedOut() async {
    await LocalNotifications.instance.cancelAll();
  }

  static String _daysAgoIso(int days) {
    final d = DateTime.now().subtract(Duration(days: days));
    final y = d.year.toString().padLeft(4, '0');
    final m = d.month.toString().padLeft(2, '0');
    final day = d.day.toString().padLeft(2, '0');
    return '$y-$m-$day';
  }
}
