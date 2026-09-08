import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../theme/pulse_palette.dart';
import '../theme/theme_controller.dart';

class ShellScreen extends StatelessWidget {
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
  Widget build(BuildContext context) {
    // Rebuild shell (and current branch) when appearance changes.
    context.watch<ThemeController>();
    final p = context.pulse;
    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: Material(
        color: p.surface,
        child: Container(
          decoration: BoxDecoration(
            border: Border(top: BorderSide(color: p.line)),
          ),
          child: NavigationBar(
            selectedIndex: navigationShell.currentIndex,
            destinations: _destinations,
            onDestinationSelected: navigationShell.goBranch,
          ),
        ),
      ),
    );
  }
}
