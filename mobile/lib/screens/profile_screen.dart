import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../config/app_config.dart';
import '../notifications/notification_controller.dart';
import '../notifications/notification_prefs.dart';
import '../notifications/sync_notifications.dart';
import '../services/auth_service.dart';
import '../theme/pulse_palette.dart';
import '../theme/theme_controller.dart';
import '../widgets/brand.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _name = TextEditingController();
  final _timezone = TextEditingController();
  final _bio = TextEditingController();
  var _saving = false;
  String? _apiHealth;

  @override
  void initState() {
    super.initState();
    final profile = context.read<AuthService>().profile;
    _name.text = profile?.displayName ?? '';
    _timezone.text = profile?.timezone ?? 'Asia/Kolkata';
    _bio.text = profile?.bio ?? '';
    _checkHealth();
  }

  @override
  void dispose() {
    _name.dispose();
    _timezone.dispose();
    _bio.dispose();
    super.dispose();
  }

  Future<void> _checkHealth() async {
    try {
      final health = await context.read<AuthService>().api.health();
      setState(() => _apiHealth = '${health['status']} · ${health['service']}');
    } catch (e) {
      setState(() => _apiHealth = 'unreachable');
    }
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    final auth = context.read<AuthService>();
    try {
      await auth.api.updateMe({
        'display_name': _name.text.trim(),
        'timezone': _timezone.text.trim(),
        'bio': _bio.text.trim(),
      });
      await auth.refreshProfile();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profile saved')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final themes = context.watch<ThemeController>();
    final profile = auth.profile;
    final p = context.pulse;

    return Scaffold(
      appBar: AppBar(
        title: const ScreenAppBarTitle('Profile'),
        automaticallyImplyLeading: false,
        actions: [
          IconButton(
            onPressed: () async {
              await context.read<NotificationController>().onSignedOut();
              await auth.signOut();
            },
            icon: const Icon(Icons.logout),
            tooltip: 'Sign out',
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: ListTile(
              title: Text(profile?.email ?? '—'),
              subtitle: Text(
                auth.mode == AuthMode.dev
                    ? 'Dev auth · ${AppConfig.devBearerToken}'
                    : 'Signed in with Firebase',
              ),
            ),
          ),
          const SizedBox(height: 20),
          _NotificationsSection(
            onChanged: () async {
              if (!mounted) return;
              await syncLocalNotifications(context);
            },
          ),
          const SizedBox(height: 20),
          Text(
            'Appearance',
            style: TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 16,
              color: p.text,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Choose how Pulse Track looks on this device.',
            style: TextStyle(color: p.muted, fontSize: 13),
          ),
          const SizedBox(height: 12),
          for (final style in AppThemeStyle.values) ...[
            _ThemeOptionTile(
              style: style,
              selected: themes.style == style,
              onTap: () => themes.setStyle(style),
            ),
            const SizedBox(height: 8),
          ],
          const SizedBox(height: 12),
          TextField(
            controller: _name,
            decoration: const InputDecoration(labelText: 'Display name'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _timezone,
            decoration: const InputDecoration(labelText: 'Timezone'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _bio,
            maxLines: 3,
            decoration: const InputDecoration(labelText: 'Bio'),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _saving ? null : _save,
            child: Text(_saving ? 'Saving…' : 'Save profile'),
          ),
          const SizedBox(height: 24),
          Text(
            'API',
            style: TextStyle(fontWeight: FontWeight.w700, color: p.text),
          ),
          const SizedBox(height: 8),
          Text(AppConfig.apiBaseUrl, style: TextStyle(color: p.muted)),
          const SizedBox(height: 4),
          Text(
            AppConfig.usingLocalApi
                ? 'Source: local backend'
                : 'Source: deployed backend',
            style: TextStyle(color: p.muted),
          ),
          const SizedBox(height: 4),
          Text(
            'Health: ${_apiHealth ?? 'checking…'}',
            style: TextStyle(color: p.muted),
          ),
          const SizedBox(height: 4),
          Text(
            AppConfig.firebaseConfigured
                ? 'Firebase: pulse-track-3d1b5'
                : 'Firebase: not configured',
            style: TextStyle(color: p.muted),
          ),
        ],
      ),
    );
  }
}

class _NotificationsSection extends StatelessWidget {
  const _NotificationsSection({required this.onChanged});

  final VoidCallback onChanged;

  Future<void> _toggle(
    BuildContext context,
    Future<void> Function(NotificationPrefs p) edit,
  ) async {
    final ctrl = context.read<NotificationController>();
    await ctrl.updatePrefs(edit);
    onChanged();
  }

  @override
  Widget build(BuildContext context) {
    final ctrl = context.watch<NotificationController>();
    final p = ctrl.prefs;
    final palette = context.pulse;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Notifications',
          style: TextStyle(
            fontWeight: FontWeight.w800,
            fontSize: 16,
            color: palette.text,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'Local reminders on this device. Reschedules when you open the app or refresh Board, Goals, or Activities.',
          style: TextStyle(color: palette.muted, fontSize: 13),
        ),
        if (ctrl.syncing) ...[
          const SizedBox(height: 8),
          LinearProgressIndicator(
            minHeight: 2,
            color: palette.primary,
            backgroundColor: palette.line,
          ),
        ],
        const SizedBox(height: 8),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('Enable notifications'),
          value: p.enabled,
          onChanged: (v) => _toggle(context, (prefs) async {
            prefs.enabled = v;
          }),
        ),
        if (p.enabled) ...[
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Goal deadlines'),
            subtitle: const Text('Day before, due day, and day after'),
            value: p.goalDeadlines,
            onChanged: (v) => _toggle(context, (prefs) async {
              prefs.goalDeadlines = v;
            }),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Goal progress check-ins'),
            value: p.goalPace,
            onChanged: (v) => _toggle(context, (prefs) async {
              prefs.goalPace = v;
            }),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Overdue tasks'),
            value: p.taskOverdue,
            onChanged: (v) => _toggle(context, (prefs) async {
              prefs.taskOverdue = v;
            }),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Task start dates'),
            value: p.taskStartDates,
            onChanged: (v) => _toggle(context, (prefs) async {
              prefs.taskStartDates = v;
            }),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Stuck in progress'),
            subtitle: Text('No log for ${p.stuckInProgressDays}+ days'),
            value: p.taskStuckInProgress,
            onChanged: (v) => _toggle(context, (prefs) async {
              prefs.taskStuckInProgress = v;
            }),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Daily log reminder'),
            subtitle: Text(
              'Around ${p.dailyLogHour.toString().padLeft(2, '0')}:${p.dailyLogMinute.toString().padLeft(2, '0')} if nothing logged',
            ),
            value: p.dailyLogReminder,
            onChanged: (v) => _toggle(context, (prefs) async {
              prefs.dailyLogReminder = v;
            }),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Weekly summary'),
            subtitle: const Text('Sunday morning'),
            value: p.weeklySummary,
            onChanged: (v) => _toggle(context, (prefs) async {
              prefs.weeklySummary = v;
            }),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Sleep log reminder'),
            subtitle: const Text('When you have sleep tasks in progress'),
            value: p.sleepReminder,
            onChanged: (v) => _toggle(context, (prefs) async {
              prefs.sleepReminder = v;
            }),
          ),
        ],
      ],
    );
  }
}

class _ThemeOptionTile extends StatelessWidget {
  const _ThemeOptionTile({
    required this.style,
    required this.selected,
    required this.onTap,
  });

  final AppThemeStyle style;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.pulse;
    final swatch = PulsePalette.forStyle(style);

    return Material(
      color: selected ? p.softPrimary : p.panel,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selected ? p.primary : p.line,
              width: selected ? 1.5 : 1,
            ),
          ),
          child: Row(
            children: [
              _ThemeSwatch(palette: swatch),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      style.label,
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                        color: p.text,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      style.description,
                      style: TextStyle(fontSize: 12, color: p.muted),
                    ),
                  ],
                ),
              ),
              Icon(
                selected ? Icons.check_circle : Icons.circle_outlined,
                color: selected ? p.primary : p.muted,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ThemeSwatch extends StatelessWidget {
  const _ThemeSwatch({required this.palette});

  final PulsePalette palette;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: palette.lineStrong.withValues(alpha: 0.5)),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [palette.scaffoldBg, palette.panel, palette.primary],
          stops: const [0.0, 0.55, 1.0],
        ),
      ),
    );
  }
}
