import 'package:flutter/widgets.dart';
import 'package:provider/provider.dart';

import '../services/auth_service.dart';
import 'notification_controller.dart';

Future<void> syncLocalNotifications(BuildContext context) async {
  final auth = context.read<AuthService>();
  if (!auth.isSignedIn) return;
  final notifications = context.read<NotificationController>();
  await notifications.syncFromApi(
    api: auth.api,
    profileTimezone: auth.profile?.timezone,
  );
}
