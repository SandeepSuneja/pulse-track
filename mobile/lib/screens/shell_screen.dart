import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../notifications/notification_controller.dart';
import '../notifications/sync_notifications.dart';
import '../services/auth_service.dart';
import '../theme/pulse_palette.dart';
import '../theme/theme_controller.dart';

class ShellScreen extends StatefulWidget {
  const ShellScreen({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  static const _destinations = [
    NavigationDestination(
      icon: Icon(Icons.view_kanban_outlined),
      selectedIcon: Icon(Icons.view_kanban),
      label: 'Board',
    ),
    NavigationDestination(
      icon: Icon(Icons.dashboard_outlined),
      selectedIcon: Icon(Icons.dashboard),
      label: 'Dashboard',
    ),
    NavigationDestination(
      icon: Icon(Icons.list_alt_outlined),
      selectedIcon: Icon(Icons.list_alt),
      label: 'Activities',
    ),
    NavigationDestination(
      icon: Icon(Icons.track_changes_outlined),
      selectedIcon: Icon(Icons.track_changes),
      label: 'Goals',
    ),
    NavigationDestination(
      icon: Icon(Icons.show_chart_outlined),
      selectedIcon: Icon(Icons.show_chart),
      label: 'Analytics',
    ),
    NavigationDestination(
      icon: Icon(Icons.person_outline),
      selectedIcon: Icon(Icons.person),
      label: 'Profile',
    ),
  ];

  @override
  State<ShellScreen> createState() => _ShellScreenState();
}

class _ShellScreenState extends State<ShellScreen> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _syncNotifications();
      _consumePendingRoute();
    });
    context.read<NotificationController>().addListener(_onNotificationController);
  }

  @override
  void dispose() {
    context.read<NotificationController>().removeListener(_onNotificationController);
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  void _onNotificationController() {
    _consumePendingRoute();
  }

  void _consumePendingRoute() {
    if (!mounted) return;
    final route = context.read<NotificationController>().takePendingRoute();
    if (route != null && route.isNotEmpty) {
      context.go(route);
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _syncNotifications();
    }
  }

  Future<void> _syncNotifications() async {
    if (!mounted) return;
    if (!context.read<AuthService>().isSignedIn) return;
    await syncLocalNotifications(context);
  }

  @override
  Widget build(BuildContext context) {
    context.watch<ThemeController>();
    final p = context.pulse;
    return Scaffold(
      body: widget.navigationShell,
      bottomNavigationBar: Material(
        color: p.surface,
        child: Container(
          decoration: BoxDecoration(
            border: Border(top: BorderSide(color: p.line)),
          ),
          child: NavigationBar(
            selectedIndex: widget.navigationShell.currentIndex,
            destinations: ShellScreen._destinations,
            onDestinationSelected: widget.navigationShell.goBranch,
          ),
        ),
      ),
    );
  }
}
