import 'dart:math' as math;

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../constants/categories.dart';
import '../models/models.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../theme/pulse_palette.dart';
import '../theme/theme_rebuild.dart';
import '../widgets/analytics_period.dart';
import '../widgets/brand.dart';
import '../widgets/chart_series.dart';
import '../widgets/common.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late AnalyticsRange _range;
  late Future<AnalyticsSummary> _future;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _range = AnalyticsRange(
      mode: AnalyticsRangeMode.week,
      selectedMonth: DateTime(now.year, now.month),
    );
    _future = _load();
  }

  Future<AnalyticsSummary> _load() {
    final q = _range.apiQuery;
    return context.read<AuthService>().api.analytics(
          period: q.period,
          startDate: q.start,
          endDate: q.end,
        );
  }

  Future<void> _refresh() async {
    final next = _load();
    setState(() => _future = next);
    await next;
  }

  void _onRangeChanged(AnalyticsRange next) {
    setState(() {
      _range = next;
      _future = _load();
    });
  }

  Color _sleepColor(String? quality) {
    switch (quality?.toLowerCase()) {
      case 'ideal':
        return const Color(0xFF6EE7B7);
      case 'normal':
        return const Color(0xFF7DD3FC);
      case 'bad':
        return const Color(0xFFFCA5A5);
      default:
        return AppTheme.muted.withValues(alpha: 0.35);
    }
  }

  @override
  Widget build(BuildContext context) {
    context.watchAppearance();
    final chartPeriod = _range.chartPeriod;
    final monthLabel = _range.mode == AnalyticsRangeMode.calendar
        ? _range.calendarLabel
        : null;

    return Scaffold(
      backgroundColor: AppTheme.scaffoldBg,
      appBar: AppBar(title: const BrandedAppBarTitle('Dashboard')),
      body: Column(
        children: [
          AnalyticsPeriodBar(
            value: _range,
            onChanged: _onRangeChanged,
          ),
          Expanded(
            child: FutureBuilder<AnalyticsSummary>(
              future: _future,
              builder: (context, snap) {
                if (snap.connectionState != ConnectionState.done) {
                  return const LoadingView();
                }
                if (snap.hasError) {
                  return ErrorView(message: snap.error.toString(), onRetry: _refresh);
                }
                final data = snap.data!;
                final timeBars = prepareMinutesChart(
                  data.minutesOverTime,
                  period: chartPeriod,
                );
                final sleepBars = prepareSleepChart(
                  data.sleepOverTime,
                  period: chartPeriod,
                );
                return RefreshIndicator(
                  onRefresh: _refresh,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                    children: [
                      _StatsGrid(
                        children: [
                          _StatTile(
                            label: 'Logged time',
                            value: formatDuration(data.totalMinutes),
                            hint: _rangeHint(data.startDate, data.endDate),
                            icon: Icons.schedule_rounded,
                            accent: const Color(0xFF2563EB),
                          ),
                          _StatTile(
                            label: 'Activities',
                            value: '${data.activityCount}',
                            hint: 'Track record entries',
                            icon: Icons.list_alt_rounded,
                            accent: const Color(0xFFD97706),
                          ),
                          _StatTile(
                            label: 'Categories',
                            value: '${data.categoryBreakdown.length}',
                            hint: 'Active this period',
                            icon: Icons.category_rounded,
                            accent: const Color(0xFF059669),
                          ),
                          _StatTile(
                            label: 'Goals',
                            value: '${data.goalProgress.length}',
                            hint: 'Active targets',
                            icon: Icons.flag_rounded,
                            accent: const Color(0xFFE11D48),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      _Panel(
                        title: chartTitleTime(chartPeriod, monthLabel: monthLabel),
                        child: timeBars.isEmpty
                            ? Text(
                                'No time logged this period.',
                                style: TextStyle(color: AppTheme.muted),
                              )
                            : SizedBox(
                                height: 220,
                                child: _SimpleBarChart(
                                  points: timeBars,
                                  colorFor: (_) => AppTheme.primary,
                                  valueSuffix: '',
                                ),
                              ),
                      ),
                      const SizedBox(height: 12),
                      _Panel(
                        title: chartTitleSleep(chartPeriod, monthLabel: monthLabel),
                        child: sleepBars.isEmpty
                            ? Text(
                                'No sleep logs this period.',
                                style: TextStyle(color: AppTheme.muted),
                              )
                            : Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Wrap(
                                    spacing: 12,
                                    runSpacing: 6,
                                    children: [
                                      _SleepLegendItem(
                                        color: Color(0xFF6EE7B7),
                                        label: 'Ideal',
                                      ),
                                      _SleepLegendItem(
                                        color: Color(0xFF7DD3FC),
                                        label: 'Normal',
                                      ),
                                      _SleepLegendItem(
                                        color: Color(0xFFFCA5A5),
                                        label: 'Bad',
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  SizedBox(
                                    height: 220,
                                    child: _SimpleBarChart(
                                      points: sleepBars,
                                      valueSuffix: 'h',
                                      colorFor: (p) => p.value <= 0
                                          ? AppTheme.line
                                          : _sleepColor(p.quality),
                                    ),
                                  ),
                                ],
                              ),
                      ),
                      const SizedBox(height: 12),
                      _Panel(
                        title: 'Category mix',
                        child: data.categoryBreakdown.isEmpty
                            ? Text(
                                'No activities yet.',
                                style: TextStyle(color: AppTheme.muted),
                              )
                            : Column(
                                children: [
                                  for (final item in data.categoryBreakdown)
                                    ListTile(
                                      dense: true,
                                      contentPadding: EdgeInsets.zero,
                                      title: Text(categoryLabel(item.category)),
                                      trailing: Text(
                                        '${formatDuration(item.minutes)} · ${item.percentage}%',
                                      ),
                                      leading: CircleAvatar(
                                        radius: 6,
                                        backgroundColor: categoryOf(item.category).fg,
                                      ),
                                    ),
                                ],
                              ),
                      ),
                      const SizedBox(height: 12),
                      _Panel(
                        title: 'Goal progress',
                        child: data.goalProgress.isEmpty
                            ? Text(
                                'No active goals.',
                                style: TextStyle(color: AppTheme.muted),
                              )
                            : Column(
                                children: [
                                  for (final g in data.goalProgress) ...[
                                    ListTile(
                                      contentPadding: EdgeInsets.zero,
                                      title: Text(g.title),
                                      subtitle: Text(
                                        g.targetMinutes > 0
                                            ? '${g.actualMinutes}/${g.targetMinutes} min · ${g.completionPct.round()}%'
                                            : '${g.actualMinutes} min logged',
                                      ),
                                    ),
                                    if (g.targetMinutes > 0)
                                      LinearProgressIndicator(
                                        value: (g.completionPct / 100).clamp(0, 1),
                                        color: categoryOf(g.category).fg,
                                        backgroundColor: AppTheme.line,
                                      ),
                                    const SizedBox(height: 8),
                                  ],
                                ],
                              ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _SimpleBarChart extends StatelessWidget {
  const _SimpleBarChart({
    required this.points,
    required this.colorFor,
    this.valueSuffix = '',
  });

  final List<ChartBarPoint> points;
  final Color Function(ChartBarPoint point) colorFor;
  final String valueSuffix;

  @override
  Widget build(BuildContext context) {
    final interval = labelIntervalFor(points.length);
    final width = barWidthFor(points.length);
    final rawMax = points.fold<double>(0, (m, p) => p.value > m ? p.value : m);
    final maxY = rawMax <= 0 ? 1.0 : _niceMax(rawMax * 1.12);

    return BarChart(
      BarChartData(
        maxY: maxY,
        minY: 0,
        alignment: BarChartAlignment.spaceAround,
        groupsSpace: points.length > 20 ? 4 : 8,
        extraLinesData: ExtraLinesData(
          horizontalLines: [
            HorizontalLine(
              y: 0,
              color: AppTheme.line,
              strokeWidth: 1,
            ),
          ],
        ),
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          horizontalInterval: maxY / 4,
          getDrawingHorizontalLine: (value) => FlLine(
            color: AppTheme.chipBg,
            strokeWidth: 1,
          ),
        ),
        borderData: FlBorderData(
          show: true,
          border: Border(
            bottom: BorderSide(color: AppTheme.line),
            left: BorderSide(color: AppTheme.line),
          ),
        ),
        barTouchData: BarTouchData(
          enabled: true,
          touchTooltipData: BarTouchTooltipData(
            getTooltipColor: (_) => AppTheme.tooltipBg,
            tooltipPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            getTooltipItem: (group, groupIndex, rod, rodIndex) {
              if (groupIndex < 0 || groupIndex >= points.length) return null;
              final p = points[groupIndex];
              final text = p.tooltip ??
                  '${p.label}: ${rod.toY % 1 == 0 ? rod.toY.toInt() : rod.toY.toStringAsFixed(1)}$valueSuffix';
              return BarTooltipItem(
                text,
                TextStyle(
                  color: AppTheme.tooltipFg,
                  fontWeight: FontWeight.w600,
                  fontSize: 12,
                ),
              );
            },
          ),
        ),
        titlesData: FlTitlesData(
          topTitles: const AxisTitles(),
          rightTitles: const AxisTitles(),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 34,
              interval: maxY / 4,
              getTitlesWidget: (value, meta) {
                final ticks = [
                  0.0,
                  maxY / 4,
                  maxY / 2,
                  3 * maxY / 4,
                  maxY,
                ];
                final show = ticks.any((t) => (value - t).abs() < maxY * 0.02 + 0.001);
                if (!show) return const SizedBox.shrink();
                final label = valueSuffix == 'h'
                    ? (value % 1 == 0
                        ? '${value.toInt()}h'
                        : '${value.toStringAsFixed(1)}h')
                    : value >= 100
                        ? '${(value / 60).toStringAsFixed(1)}h'
                        : '${value.round()}';
                return Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: Text(
                    label,
                    style: TextStyle(
                      color: AppTheme.muted,
                      fontSize: 10,
                      fontWeight: FontWeight.w500,
                    ),
                    textAlign: TextAlign.right,
                  ),
                );
              },
            ),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 26,
              interval: 1,
              getTitlesWidget: (value, meta) {
                final i = value.toInt();
                if (i < 0 || i >= points.length) return const SizedBox.shrink();
                final show = i % interval == 0 || i == points.length - 1;
                if (!show) return const SizedBox.shrink();
                // Drop last label if it would sit on top of the previous shown tick
                if (i == points.length - 1 &&
                    points.length > 1 &&
                    interval > 1 &&
                    (points.length - 1) % interval != 0) {
                  final prevShown = ((points.length - 1) ~/ interval) * interval;
                  if ((points.length - 1) - prevShown < (interval / 2).ceil()) {
                    return const SizedBox.shrink();
                  }
                }
                return SideTitleWidget(
                  meta: meta,
                  space: 6,
                  child: Text(
                    points[i].label,
                    style: TextStyle(
                      color: AppTheme.muted,
                      fontSize: points.length > 14 ? 9 : 10,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                );
              },
            ),
          ),
        ),
        barGroups: [
          for (var i = 0; i < points.length; i++)
            BarChartGroupData(
              x: i,
              barRods: [
                BarChartRodData(
                  toY: points[i].value,
                  color: colorFor(points[i]),
                  width: width,
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(5),
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }

  static double _niceMax(double value) {
    if (value <= 0) return 1;
    final magnitude = math.pow(10, (math.log(value) / math.ln10).floor()).toDouble();
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
}

class _SleepLegendItem extends StatelessWidget {
  const _SleepLegendItem({required this.color, required this.label});

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(label, style: TextStyle(fontSize: 12, color: AppTheme.muted)),
      ],
    );
  }
}

String? _rangeHint(String start, String end) {
  final a = _shortDate(start);
  final b = _shortDate(end);
  if (a == null || b == null) return null;
  if (a == b) return a;
  return '$a → $b';
}

String? _shortDate(String iso) {
  final dt = DateTime.tryParse(iso.length >= 10 ? iso.substring(0, 10) : iso);
  if (dt == null) return null;
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return '${months[dt.month - 1]} ${dt.day}';
}

class _StatsGrid extends StatelessWidget {
  const _StatsGrid({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    assert(children.length == 4);
    return Column(
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: children[0]),
            const SizedBox(width: 10),
            Expanded(child: children[1]),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: children[2]),
            const SizedBox(width: 10),
            Expanded(child: children[3]),
          ],
        ),
      ],
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({
    required this.label,
    required this.value,
    required this.icon,
    required this.accent,
    this.hint,
  });

  final String label;
  final String value;
  final String? hint;
  final IconData icon;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    final p = context.pulse;
    return Container(
      constraints: const BoxConstraints(minHeight: 108),
      decoration: BoxDecoration(
        color: p.panel,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: p.line),
        boxShadow: [
          BoxShadow(
            color: accent.withValues(alpha: p.isDark ? 0.2 : 0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          Positioned(
            right: -10,
            top: -10,
            child: Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: accent.withValues(alpha: 0.1),
              ),
            ),
          ),
          Positioned(
            left: 0,
            top: 0,
            bottom: 0,
            child: Container(width: 3.5, color: accent),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: accent.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(icon, size: 16, color: accent),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        label.toUpperCase(),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: accent.withValues(alpha: 0.9),
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.6,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.5,
                    color: p.text,
                    height: 1.1,
                  ),
                ),
                if (hint != null && hint!.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    hint!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 11,
                      color: p.muted,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Panel extends StatelessWidget {
  const _Panel({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final p = context.pulse;
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: p.panel,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: p.line),
        boxShadow: [
          BoxShadow(
            color: p.isDark ? Colors.black45 : const Color(0x08000000),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 16,
              letterSpacing: -0.2,
              color: p.text,
            ),
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}
