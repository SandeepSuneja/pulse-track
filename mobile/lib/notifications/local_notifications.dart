import 'dart:convert';
import 'dart:io';

import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_timezone/flutter_timezone.dart';
import 'package:timezone/data/latest_all.dart' as tz_data;
import 'package:timezone/timezone.dart' as tz;

typedef NotificationTapHandler = void Function(String route);

class LocalNotifications {
  LocalNotifications._();

  static final LocalNotifications instance = LocalNotifications._();

  final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();

  bool _initialized = false;
  NotificationTapHandler? _onTap;

  Future<void> initialize({NotificationTapHandler? onTap}) async {
    if (_initialized) return;
    _onTap = onTap;
    tz_data.initializeTimeZones();

    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const ios = DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: false,
    );
    await _plugin.initialize(
      const InitializationSettings(android: android, iOS: ios),
      onDidReceiveNotificationResponse: (response) {
        final payload = response.payload;
        if (payload == null || payload.isEmpty) return;
        try {
          final map = jsonDecode(payload) as Map<String, dynamic>;
          final route = map['route'] as String?;
          if (route != null && route.isNotEmpty) {
            _onTap?.call(route);
          }
        } catch (_) {}
      },
    );

    if (Platform.isAndroid) {
      await _createAndroidChannels();
    }
    _initialized = true;
  }

  Future<void> _createAndroidChannels() async {
    final android = _plugin.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    if (android == null) return;
    for (final ch in [
      ('goals', 'Goals', 'Goal deadlines and progress'),
      ('tasks', 'Tasks', 'Task due dates and reminders'),
      ('reminders', 'Reminders', 'Daily log and habit nudges'),
      ('summary', 'Summary', 'Weekly recap'),
    ]) {
      await android.createNotificationChannel(
        AndroidNotificationChannel(
          ch.$1,
          ch.$2,
          description: ch.$3,
          importance: Importance.defaultImportance,
        ),
      );
    }
  }

  Future<bool> requestPermissions() async {
    if (Platform.isIOS) {
      final ios = _plugin.resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin>();
      final granted = await ios?.requestPermissions(
        alert: true,
        badge: true,
        sound: true,
      );
      return granted ?? false;
    }
    if (Platform.isAndroid) {
      final android = _plugin.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();
      final granted = await android?.requestNotificationsPermission();
      return granted ?? true;
    }
    return true;
  }

  Future<tz.Location> resolveLocation(String? profileTimezone) async {
    final candidates = <String>[];
    if (profileTimezone != null && profileTimezone.trim().isNotEmpty) {
      candidates.add(profileTimezone.trim());
    }
    try {
      final local = await FlutterTimezone.getLocalTimezone();
      candidates.add(local);
    } catch (_) {}
    candidates.add('UTC');
    for (final name in candidates) {
      try {
        return tz.getLocation(name);
      } catch (_) {}
    }
    return tz.UTC;
  }

  Future<void> cancelAll() async {
    await _plugin.cancelAll();
  }

  Future<void> scheduleZoned({
    required int id,
    required String title,
    required String body,
    required tz.TZDateTime when,
    required String androidChannelId,
    String route = '/board',
    Map<String, dynamic>? extra,
  }) async {
    if (when.isBefore(tz.TZDateTime.now(when.location))) return;

    final payload = jsonEncode({
      'route': route,
      ...?extra,
    });

    final androidDetails = AndroidNotificationDetails(
      androidChannelId,
      androidChannelId,
      channelDescription: null,
      importance: Importance.defaultImportance,
      priority: Priority.defaultPriority,
    );
    const iosDetails = DarwinNotificationDetails();

    await _plugin.zonedSchedule(
      id,
      title,
      body,
      when,
      NotificationDetails(
        android: androidDetails,
        iOS: iosDetails,
      ),
      androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
      payload: payload,
    );
  }

  Future<void> scheduleDaily({
    required int id,
    required String title,
    required String body,
    required tz.Location location,
    required int hour,
    required int minute,
    required String androidChannelId,
    String route = '/activities',
  }) async {
    var when = _nextDaily(location, hour, minute);
    when = _bumpIfPast(when);

    final payload = jsonEncode({'route': route});

    await _plugin.zonedSchedule(
      id,
      title,
      body,
      when,
      NotificationDetails(
        android: AndroidNotificationDetails(
          androidChannelId,
          androidChannelId,
          importance: Importance.defaultImportance,
        ),
        iOS: const DarwinNotificationDetails(),
      ),
      androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
      matchDateTimeComponents: DateTimeComponents.time,
      payload: payload,
    );
  }

  Future<void> scheduleWeekly({
    required int id,
    required String title,
    required String body,
    required tz.Location location,
    required int weekday, // 1=Mon … 7=Sun
    required int hour,
    required int minute,
    required String androidChannelId,
    String route = '/dashboard',
  }) async {
    var when = _nextWeekday(location, weekday, hour, minute);
    when = _bumpIfPast(when);

    final payload = jsonEncode({'route': route});

    await _plugin.zonedSchedule(
      id,
      title,
      body,
      when,
      NotificationDetails(
        android: AndroidNotificationDetails(
          androidChannelId,
          androidChannelId,
          importance: Importance.defaultImportance,
        ),
        iOS: const DarwinNotificationDetails(),
      ),
      androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
      matchDateTimeComponents: DateTimeComponents.dayOfWeekAndTime,
      payload: payload,
    );
  }

  tz.TZDateTime _nextDaily(tz.Location location, int hour, int minute) {
    final now = tz.TZDateTime.now(location);
    var scheduled = tz.TZDateTime(
      location,
      now.year,
      now.month,
      now.day,
      hour,
      minute,
    );
    if (!scheduled.isAfter(now)) {
      scheduled = scheduled.add(const Duration(days: 1));
    }
    return scheduled;
  }

  tz.TZDateTime _nextWeekday(
    tz.Location location,
    int weekday,
    int hour,
    int minute,
  ) {
    final now = tz.TZDateTime.now(location);
    var scheduled = tz.TZDateTime(
      location,
      now.year,
      now.month,
      now.day,
      hour,
      minute,
    );
    while (scheduled.weekday != weekday || !scheduled.isAfter(now)) {
      scheduled = scheduled.add(const Duration(days: 1));
    }
    return scheduled;
  }

  tz.TZDateTime _bumpIfPast(tz.TZDateTime when) {
    final now = tz.TZDateTime.now(when.location);
    if (when.isAfter(now)) return when;
    return when.add(const Duration(days: 1));
  }
}
