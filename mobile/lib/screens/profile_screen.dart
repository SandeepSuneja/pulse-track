import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../config/app_config.dart';
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
        title: const BrandedAppBarTitle('Profile'),
        actions: [
          IconButton(
            onPressed: () async {
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
