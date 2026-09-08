import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../theme/pulse_palette.dart';

/// Dashboard / Analytics range modes.
enum AnalyticsRangeMode { day, week, last30, calendar, year }

class AnalyticsRange {
  const AnalyticsRange({
    required this.mode,
    required this.selectedMonth,
  });

  final AnalyticsRangeMode mode;
  final DateTime selectedMonth;

  String get chartPeriod {
    switch (mode) {
      case AnalyticsRangeMode.day:
        return 'day';
      case AnalyticsRangeMode.week:
        return 'week';
      case AnalyticsRangeMode.last30:
        return 'last30';
      case AnalyticsRangeMode.calendar:
        return 'calendar';
      case AnalyticsRangeMode.year:
        return 'year';
    }
  }

  /// API period + optional custom bounds.
  ({String period, DateTime? start, DateTime? end}) get apiQuery {
    final today = DateTime.now();
    final todayDate = DateTime(today.year, today.month, today.day);
    switch (mode) {
      case AnalyticsRangeMode.day:
        return (period: 'day', start: null, end: null);
      case AnalyticsRangeMode.week:
        return (period: 'week', start: null, end: null);
      case AnalyticsRangeMode.last30:
        return (
          period: 'custom',
          start: todayDate.subtract(const Duration(days: 29)),
          end: todayDate,
        );
      case AnalyticsRangeMode.calendar:
        final start = DateTime(selectedMonth.year, selectedMonth.month, 1);
        final lastDay = DateTime(selectedMonth.year, selectedMonth.month + 1, 0);
        final end = lastDay.isAfter(todayDate) ? todayDate : lastDay;
        return (period: 'custom', start: start, end: end);
      case AnalyticsRangeMode.year:
        return (period: 'year', start: null, end: null);
    }
  }

  String get calendarLabel {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return '${months[selectedMonth.month - 1]} ${selectedMonth.year}';
  }

  AnalyticsRange copyWith({
    AnalyticsRangeMode? mode,
    DateTime? selectedMonth,
  }) {
    return AnalyticsRange(
      mode: mode ?? this.mode,
      selectedMonth: selectedMonth ?? this.selectedMonth,
    );
  }
}

/// Day / Week / 30 days / By month [/ Year].
class AnalyticsPeriodBar extends StatelessWidget {
  const AnalyticsPeriodBar({
    super.key,
    required this.value,
    required this.onChanged,
    this.showYear = false,
  });

  final AnalyticsRange value;
  final ValueChanged<AnalyticsRange> onChanged;
  final bool showYear;

  Future<void> _pickMonth(BuildContext context) async {
    final months = _recentMonths(24);
    final picked = await showModalBottomSheet<DateTime>(
      context: context,
      showDragHandle: true,
      builder: (ctx) {
        return SafeArea(
          child: ListView(
            shrinkWrap: true,
            children: [
              const Padding(
                padding: EdgeInsets.fromLTRB(16, 4, 16, 8),
                child: Text(
                  'Select month',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                ),
              ),
              for (final m in months)
                ListTile(
                  title: Text(_monthYear(m)),
                  trailing: value.selectedMonth.year == m.year &&
                          value.selectedMonth.month == m.month
                      ? Icon(Icons.check, color: AppTheme.primary)
                      : null,
                  onTap: () => Navigator.pop(ctx, m),
                ),
            ],
          ),
        );
      },
    );
    if (picked == null) return;
    onChanged(
      value.copyWith(
        mode: AnalyticsRangeMode.calendar,
        selectedMonth: DateTime(picked.year, picked.month),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Row(
        children: [
          _PeriodPill(
            label: 'Day',
            selected: value.mode == AnalyticsRangeMode.day,
            onTap: () => onChanged(value.copyWith(mode: AnalyticsRangeMode.day)),
          ),
          const SizedBox(width: 8),
          _PeriodPill(
            label: 'Week',
            selected: value.mode == AnalyticsRangeMode.week,
            onTap: () => onChanged(value.copyWith(mode: AnalyticsRangeMode.week)),
          ),
          const SizedBox(width: 8),
          _PeriodPill(
            label: '30 days',
            selected: value.mode == AnalyticsRangeMode.last30,
            onTap: () =>
                onChanged(value.copyWith(mode: AnalyticsRangeMode.last30)),
          ),
          const SizedBox(width: 8),
          _PeriodPill(
            label: value.mode == AnalyticsRangeMode.calendar
                ? value.calendarLabel
                : 'By month',
            selected: value.mode == AnalyticsRangeMode.calendar,
            onTap: () => _pickMonth(context),
            showChevron: true,
          ),
          if (showYear) ...[
            const SizedBox(width: 8),
            _PeriodPill(
              label: 'Year',
              selected: value.mode == AnalyticsRangeMode.year,
              onTap: () =>
                  onChanged(value.copyWith(mode: AnalyticsRangeMode.year)),
            ),
          ],
        ],
      ),
    );
  }

  static List<DateTime> _recentMonths(int count) {
    final now = DateTime.now();
    return [
      for (var i = 0; i < count; i++) DateTime(now.year, now.month - i),
    ];
  }

  static String _monthYear(DateTime m) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return '${months[m.month - 1]} ${m.year}';
  }
}

class _PeriodPill extends StatelessWidget {
  const _PeriodPill({
    required this.label,
    required this.selected,
    required this.onTap,
    this.showChevron = false,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;
  final bool showChevron;

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
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: TextStyle(
                  color: selected ? p.onPrimary : p.text,
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
              if (showChevron) ...[
                const SizedBox(width: 2),
                Icon(
                  Icons.expand_more,
                  size: 18,
                  color: selected ? p.onPrimary : p.text,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

double niceChartMax(double value) {
  if (value <= 0) return 1;
  final magnitude =
      math.pow(10, (math.log(value) / math.ln10).floor()).toDouble();
  final residual = value / magnitude;
  final nice = residual <= 1
      ? 1.0
      : residual <= 2
          ? 2.0
          : residual <= 5
              ? 5.0
              : 10.0;
  return nice * magnitude;
}
