import 'package:flutter/material.dart';

import '../constants/sleep.dart';
import '../theme/pulse_palette.dart';

class LoadingView extends StatelessWidget {
  const LoadingView({super.key, this.message = 'Loading…'});

  final String message;

  @override
  Widget build(BuildContext context) {
    final p = context.pulse;
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircularProgressIndicator(color: p.primary),
          const SizedBox(height: 12),
          Text(message, style: TextStyle(color: p.muted)),
        ],
      ),
    );
  }
}

class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.message, this.onRetry});

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, color: Colors.redAccent, size: 36),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            if (onRetry != null) ...[
              const SizedBox(height: 16),
              OutlinedButton(onPressed: onRetry, child: const Text('Retry')),
            ],
          ],
        ),
      ),
    );
  }
}

/// Due-date chip — amber when upcoming, rose when overdue/failed.
class GoalDueChip extends StatelessWidget {
  const GoalDueChip({
    super.key,
    required this.dueDate,
    this.overdue = false,
  });

  final String dueDate;
  final bool overdue;

  @override
  Widget build(BuildContext context) {
    final p = context.pulse;
    final fg = overdue ? p.danger : p.warning;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: fg.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: fg.withValues(alpha: 0.35)),
      ),
      child: Text(
        'Due $dueDate',
        style: TextStyle(
          color: fg,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

/// Goal status pill — colors align with the web Goals page.
class GoalStatusPill extends StatelessWidget {
  const GoalStatusPill({super.key, required this.status});

  final String status;

  String get _label {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return 'Active';
    }
  }

  (Color fg, Color bg, Color border) _colors(PulsePalette p) {
    switch (status) {
      case 'completed':
        return (
          p.success,
          p.success.withValues(alpha: 0.12),
          p.success.withValues(alpha: 0.35),
        );
      case 'failed':
        return (
          p.danger,
          p.danger.withValues(alpha: 0.12),
          p.danger.withValues(alpha: 0.35),
        );
      default:
        return (
          p.primary,
          p.primary.withValues(alpha: 0.12),
          p.primary.withValues(alpha: 0.35),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pulse;
    final (fg, bg, border) = _colors(p);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: border),
      ),
      child: Text(
        _label.toUpperCase(),
        style: TextStyle(
          color: fg,
          fontSize: 10,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.3,
        ),
      ),
    );
  }
}

class CategoryChip extends StatelessWidget {
  const CategoryChip({super.key, required this.label, required this.fg, required this.bg});

  final String label;
  final Color fg;
  final Color bg;

  /// Keep category [fg] for accents/borders; when [fg] is too light to read,
  /// fall back to a readable ink color for the current theme.
  Color _labelColor(BuildContext context) {
    if (fg.computeLuminance() <= 0.65) return fg;
    final p = context.pulse;
    return p.isDark ? p.text : const Color(0xFF475569);
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pulse;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
        border: fg.computeLuminance() > 0.65
            ? Border.all(
                color: p.isDark ? p.lineStrong : const Color(0xFFCBD5E1),
              )
            : null,
      ),
      child: Text(
        label,
        style: TextStyle(
          color: _labelColor(context),
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

/// Web-style duration: 90 → `1h 30m`, 60 → `1h`, 45 → `45m`.
String formatDuration(int minutes) {
  final n = minutes < 0 ? 0 : minutes;
  final h = n ~/ 60;
  final m = n % 60;
  if (h > 0 && m > 0) return '${h}h ${m}m';
  if (h > 0) return '${h}h';
  return '${m}m';
}

String isoToday() {
  final now = DateTime.now();
  final y = now.year.toString().padLeft(4, '0');
  final m = now.month.toString().padLeft(2, '0');
  final d = now.day.toString().padLeft(2, '0');
  return '$y-$m-$d';
}

String formatShortDate(String? isoDate) {
  if (isoDate == null || isoDate.isEmpty) return '';
  final parts = isoDate.split('-');
  if (parts.length < 3) return isoDate;
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  final month = int.tryParse(parts[1]) ?? 0;
  final day = int.tryParse(parts[2]) ?? 0;
  if (month < 1 || month > 12) return isoDate;
  return '${months[month - 1]} $day';
}

bool isOverdue(String? dueDate, String status) {
  if (dueDate == null || dueDate.isEmpty || status == 'completed') return false;
  final today = DateTime.now();
  final due = DateTime.tryParse(dueDate);
  if (due == null) return false;
  final startToday = DateTime(today.year, today.month, today.day);
  return due.isBefore(startToday);
}

String toTimeInputValue(String? value) {
  if (value == null || value.isEmpty) return '';
  return value.length >= 5 ? value.substring(0, 5) : value;
}

Future<String?> pickIsoDate(
  BuildContext context, {
  String? initial,
}) async {
  final now = DateTime.now();
  final initialDate = DateTime.tryParse(initial ?? '') ?? now;
  final picked = await showDatePicker(
    context: context,
    initialDate: initialDate,
    firstDate: DateTime(now.year - 5),
    lastDate: DateTime(now.year + 5),
  );
  if (picked == null) return null;
  final y = picked.year.toString().padLeft(4, '0');
  final m = picked.month.toString().padLeft(2, '0');
  final d = picked.day.toString().padLeft(2, '0');
  return '$y-$m-$d';
}

Future<TimeOfDay?> pickTimeOfDay(
  BuildContext context, {
  String? initialHhmm,
}) async {
  TimeOfDay initial = const TimeOfDay(hour: 23, minute: 0);
  final mins = _hhmmToMinutes(initialHhmm);
  if (mins != null) {
    initial = TimeOfDay(hour: mins ~/ 60, minute: mins % 60);
  }
  return showTimePicker(context: context, initialTime: initial);
}

String formatTimeOfDay(TimeOfDay t) {
  final h = t.hour.toString().padLeft(2, '0');
  final m = t.minute.toString().padLeft(2, '0');
  return '$h:$m';
}

int? _hhmmToMinutes(String? hhmm) {
  if (hhmm == null || hhmm.isEmpty) return null;
  final parts = hhmm.split(':');
  if (parts.length < 2) return null;
  final h = int.tryParse(parts[0]);
  final m = int.tryParse(parts[1]);
  if (h == null || m == null) return null;
  return h * 60 + m;
}

class SleepQualityChip extends StatelessWidget {
  const SleepQualityChip({super.key, required this.quality});

  final String? quality;

  static Color fgFor(String? quality, {Color? mutedFallback}) {
    switch (quality) {
      case 'ideal':
        return const Color(0xFF059669);
      case 'normal':
        return const Color(0xFFD97706);
      case 'bad':
        return const Color(0xFFE11D48);
      default:
        return mutedFallback ?? const Color(0xFF64748B);
    }
  }

  static Color bgFor(String? quality, {Color? lineFallback}) {
    switch (quality) {
      case 'ideal':
        return const Color(0xFFD1FAE5);
      case 'normal':
        return const Color(0xFFFEF3C7);
      case 'bad':
        return const Color(0xFFFFE4E6);
      default:
        return (lineFallback ?? const Color(0xFFE2E8F0)).withValues(alpha: 0.4);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (quality == null || quality!.isEmpty) return const SizedBox.shrink();
    final p = context.pulse;
    final label = sleepQualityLabel[quality] ?? quality!;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bgFor(quality, lineFallback: p.line),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: fgFor(quality, mutedFallback: p.muted),
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

/// High-contrast day/week/month/year period selector.
class PeriodPills extends StatelessWidget {
  const PeriodPills({
    super.key,
    required this.value,
    required this.onChanged,
    this.periods = const ['day', 'week', 'month', 'year'],
  });

  final String value;
  final ValueChanged<String> onChanged;
  final List<String> periods;

  static String labelFor(String period) {
    switch (period) {
      case 'day':
        return 'Day';
      case 'week':
        return 'Week';
      case 'month':
        return 'Month';
      case 'year':
        return 'Year';
      default:
        if (period.isEmpty) return period;
        return '${period[0].toUpperCase()}${period.substring(1)}';
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Row(
        children: [
          for (final period in periods) ...[
            _PeriodPill(
              label: labelFor(period),
              selected: value == period,
              onTap: () => onChanged(period),
            ),
            const SizedBox(width: 8),
          ],
        ],
      ),
    );
  }
}

class _PeriodPill extends StatelessWidget {
  const _PeriodPill({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.pulse;
    return Material(
      color: selected ? p.primary : p.panel,
      shape: StadiumBorder(
        side: BorderSide(
          color: selected ? p.primary : p.lineStrong,
          width: selected ? 0 : 1.25,
        ),
      ),
      child: InkWell(
        onTap: onTap,
        customBorder: const StadiumBorder(),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: Text(
            label,
            style: TextStyle(
              color: selected ? p.onPrimary : p.text,
              fontWeight: FontWeight.w700,
              fontSize: 13,
            ),
          ),
        ),
      ),
    );
  }
}
