import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../constants/categories.dart';
import '../models/models.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../theme/pulse_palette.dart';
import '../widgets/analytics_period.dart';
import '../widgets/brand.dart';
import '../widgets/chart_series.dart';
import '../widgets/common.dart';

class AnalyticsScreen extends StatefulWidget {
  const AnalyticsScreen({super.key});

  @override
  State<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends State<AnalyticsScreen> {
  late AnalyticsRange _range;
  late Future<AnalyticsSummary> _future;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _range = AnalyticsRange(
      mode: AnalyticsRangeMode.last30,
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

  List<String> _categoryKeys(AnalyticsSummary data) {
    final keys = <String>{};
    for (final point in data.categoryMinutesOverTime) {
      keys.addAll(point.minutesByCategory.keys);
    }
    if (keys.isEmpty) {
      for (final item in data.categoryBreakdown) {
        keys.add(item.category);
      }
    }
    final order = categories.map((c) => c.id).toList();
    final list = keys.toList()
      ..sort((a, b) {
        final ia = order.indexOf(a);
        final ib = order.indexOf(b);
        if (ia == -1 && ib == -1) return a.compareTo(b);
        if (ia == -1) return 1;
        if (ib == -1) return -1;
        return ia.compareTo(ib);
      });
    return list;
  }

  String _rangeCaption(AnalyticsSummary data) {
    final a = _prettyDate(data.startDate);
    final b = _prettyDate(data.endDate);
    if (a == null || b == null) {
      return data.startDate == data.endDate
          ? data.startDate
          : '${data.startDate} → ${data.endDate}';
    }
    if (a == b) return a;
    return '$a → $b';
  }

  static String? _prettyDate(String iso) {
    final dt = DateTime.tryParse(iso.length >= 10 ? iso.substring(0, 10) : iso);
    if (dt == null) return null;
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return '${months[dt.month - 1]} ${dt.day}, ${dt.year}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.scaffoldBg,
      appBar: AppBar(title: const BrandedAppBarTitle('Analytics')),
      body: Column(
        children: [
          AnalyticsPeriodBar(
            value: _range,
            onChanged: _onRangeChanged,
            showYear: true,
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
                final catKeys = _categoryKeys(data);
                final period = _range.chartPeriod;
                final series = prepareCategoryOverTime(
                  data.categoryMinutesOverTime,
                  period: period,
                );
                final hasOverTime = series.any(
                  (p) => p.minutesByCategory.values.any((v) => v > 0),
                );
                final useBars = period == 'day' ||
                    period == 'year' ||
                    series.length <= 8;

                return RefreshIndicator(
                  onRefresh: _refresh,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                    children: [
                      Text(
                        _rangeCaption(data),
                        style: TextStyle(color: AppTheme.muted, fontSize: 13),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Total ${formatDuration(data.totalMinutes)} · ${data.activityCount} activities',
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 17,
                          letterSpacing: -0.2,
                        ),
                      ),
                      const SizedBox(height: 16),
                      _SectionCard(
                        title: 'By category',
                        child: data.categoryBreakdown.isEmpty
                            ? Text(
                                'No data',
                                style: TextStyle(color: AppTheme.muted),
                              )
                            : Column(
                                children: [
                                  SizedBox(
                                    height: 180,
                                    child: PieChart(
                                      PieChartData(
                                        sectionsSpace: 2,
                                        centerSpaceRadius: 36,
                                        sections: [
                                          for (final item in data.categoryBreakdown)
                                            PieChartSectionData(
                                              value: item.minutes
                                                  .toDouble()
                                                  .clamp(0.1, double.infinity),
                                              color: _chartColor(item.category),
                                              title: item.percentage >= 8
                                                  ? '${item.percentage.round()}%'
                                                  : '',
                                              radius: 52,
                                              titleStyle: const TextStyle(
                                                fontSize: 11,
                                                fontWeight: FontWeight.w700,
                                                color: Colors.white,
                                              ),
                                            ),
                                        ],
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  ...data.categoryBreakdown.map((item) {
                                    final cat = categoryOf(item.category);
                                    return ListTile(
                                      dense: true,
                                      contentPadding: EdgeInsets.zero,
                                      leading: CircleAvatar(
                                        radius: 6,
                                        backgroundColor: _chartColor(item.category),
                                      ),
                                      title: Text(cat.label),
                                      trailing: Text(
                                        '${formatDuration(item.minutes)} · ${item.percentage}%',
                                      ),
                                    );
                                  }),
                                ],
                              ),
                      ),
                      if (hasOverTime && catKeys.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        _SectionCard(
                          title: period == 'year'
                              ? 'Time by month'
                              : 'Time over time',
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              SizedBox(
                                height: 250,
                                child: useBars
                                    ? _CategoryStackedBarChart(
                                        series: series,
                                        categoryKeys: catKeys,
                                        period: period,
                                      )
                                    : _CategoryLineChart(
                                        series: series,
                                        categoryKeys: catKeys,
                                        period: period,
                                      ),
                              ),
                              const SizedBox(height: 12),
                              Wrap(
                                spacing: 12,
                                runSpacing: 8,
                                children: [
                                  for (final key in catKeys)
                                    Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Container(
                                          width: 10,
                                          height: 10,
                                          decoration: BoxDecoration(
                                            color: _chartColor(key),
                                            shape: BoxShape.circle,
                                          ),
                                        ),
                                        const SizedBox(width: 5),
                                        Text(
                                          categoryLabel(key),
                                          style: TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w600,
                                            color: AppTheme.muted,
                                          ),
                                        ),
                                      ],
                                    ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                      const SizedBox(height: 12),
                      _SectionCard(
                        title: 'By task',
                        child: data.taskBreakdown.isEmpty
                            ? Text(
                                'No data',
                                style: TextStyle(color: AppTheme.muted),
                              )
                            : Column(
                                children: [
                                  for (final item in data.taskBreakdown)
                                    Builder(
                                      builder: (context) {
                                        final maxMins = data.taskBreakdown.first
                                            .minutes
                                            .clamp(1, double.infinity)
                                            .toDouble();
                                        return Padding(
                                          padding: const EdgeInsets.only(bottom: 12),
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Row(
                                                children: [
                                                  Expanded(
                                                    child: Text(
                                                      item.title,
                                                      maxLines: 1,
                                                      overflow: TextOverflow.ellipsis,
                                                      style: const TextStyle(
                                                        fontWeight: FontWeight.w600,
                                                      ),
                                                    ),
                                                  ),
                                                  Text(
                                                    '${formatDuration(item.minutes)} · ${item.percentage}%',
                                                    style: TextStyle(
                                                      color: AppTheme.muted,
                                                      fontSize: 12,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                              const SizedBox(height: 4),
                                              ClipRRect(
                                                borderRadius:
                                                    BorderRadius.circular(4),
                                                child: LinearProgressIndicator(
                                                  value: (item.minutes / maxMins)
                                                      .clamp(0, 1),
                                                  minHeight: 10,
                                                  color: _chartColor(item.category),
                                                  backgroundColor: AppTheme.line,
                                                ),
                                              ),
                                            ],
                                          ),
                                        );
                                      },
                                    ),
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

/// Ensure light category colors stay visible on charts.
Color _chartColor(String? categoryId) {
  final c = categoryOf(categoryId).fg;
  if (c.computeLuminance() > 0.82) {
    return const Color(0xFF64748B);
  }
  return c;
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final p = context.pulse;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
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

String _formatAxisHours(double minutes) {
  if (minutes <= 0) return '0';
  if (minutes < 60) return '${minutes.round()}m';
  final h = minutes / 60;
  if ((h * 10).round() % 10 == 0) return '${h.round()}h';
  return '${h.toStringAsFixed(1)}h';
}

class _CategoryLineChart extends StatelessWidget {
  const _CategoryLineChart({
    required this.series,
    required this.categoryKeys,
    required this.period,
  });

  final List<CategoryMinutesPoint> series;
  final List<String> categoryKeys;
  final String period;

  @override
  Widget build(BuildContext context) {
    var rawMax = 0.0;
    for (final point in series) {
      for (final key in categoryKeys) {
        final v = point.minutesByCategory[key] ?? 0;
        if (v > rawMax) rawMax = v;
      }
    }
    final maxY = niceChartMax(rawMax * 1.15);
    final interval = labelIntervalFor(series.length);

    return LineChart(
      LineChartData(
        minX: 0,
        maxX: (series.length - 1).clamp(0, 9999).toDouble(),
        minY: 0,
        maxY: maxY,
        clipData: const FlClipData.all(),
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          horizontalInterval: maxY / 4,
          getDrawingHorizontalLine: (value) => FlLine(color: AppTheme.chipBg,
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
        lineTouchData: LineTouchData(
          handleBuiltInTouches: true,
          touchTooltipData: LineTouchTooltipData(
            getTooltipColor: (_) => AppTheme.tooltipBg,
            fitInsideHorizontally: true,
            fitInsideVertically: true,
            getTooltipItems: (spots) {
              return [
                for (final spot in spots)
                  LineTooltipItem(
                    '${categoryLabel(categoryKeys[spot.barIndex])}: '
                    '${formatDuration(spot.y.round())}',
                    TextStyle(
                      color: AppTheme.tooltipFg,
                      fontWeight: FontWeight.w600,
                      fontSize: 11,
                    ),
                  ),
              ];
            },
          ),
        ),
        titlesData: FlTitlesData(
          topTitles: const AxisTitles(),
          rightTitles: const AxisTitles(),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 36,
              interval: maxY / 4,
              getTitlesWidget: (value, meta) {
                final ticks = [0.0, maxY / 4, maxY / 2, 3 * maxY / 4, maxY];
                final show =
                    ticks.any((t) => (value - t).abs() < maxY * 0.02 + 0.001);
                if (!show) return const SizedBox.shrink();
                return Padding(
                  padding: const EdgeInsets.only(right: 4),
                  child: Text(
                    _formatAxisHours(value),
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
              reservedSize: 28,
              interval: 1,
              getTitlesWidget: (value, meta) {
                final i = value.toInt();
                if (i < 0 || i >= series.length) return const SizedBox.shrink();
                final show = i % interval == 0 || i == series.length - 1;
                if (!show) return const SizedBox.shrink();
                if (i == series.length - 1 &&
                    series.length > 1 &&
                    interval > 1 &&
                    (series.length - 1) % interval != 0) {
                  final prev = ((series.length - 1) ~/ interval) * interval;
                  if ((series.length - 1) - prev < (interval / 2).ceil()) {
                    return const SizedBox.shrink();
                  }
                }
                return SideTitleWidget(
                  meta: meta,
                  space: 6,
                  child: Text(
                    categoryAxisLabel(series[i].date, period: period),
                    style: TextStyle(
                      color: AppTheme.muted,
                      fontSize: series.length > 16 ? 9 : 10,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                );
              },
            ),
          ),
        ),
        lineBarsData: [
          for (var k = 0; k < categoryKeys.length; k++)
            LineChartBarData(
              spots: [
                for (var i = 0; i < series.length; i++)
                  FlSpot(
                    i.toDouble(),
                    series[i].minutesByCategory[categoryKeys[k]] ?? 0,
                  ),
              ],
              isCurved: true,
              preventCurveOverShooting: true,
              curveSmoothness: 0.18,
              color: _chartColor(categoryKeys[k]),
              barWidth: 2.5,
              isStrokeCapRound: true,
              dotData: FlDotData(
                show: series.length <= 14,
                getDotPainter: (spot, percent, bar, index) => FlDotCirclePainter(
                  radius: 3,
                  color: bar.color ?? AppTheme.primary,
                  strokeWidth: 1.5,
                  strokeColor: AppTheme.panel,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _CategoryStackedBarChart extends StatelessWidget {
  const _CategoryStackedBarChart({
    required this.series,
    required this.categoryKeys,
    required this.period,
  });

  final List<CategoryMinutesPoint> series;
  final List<String> categoryKeys;
  final String period;

  @override
  Widget build(BuildContext context) {
    var rawMax = 0.0;
    for (final point in series) {
      final total = categoryKeys.fold<double>(
        0,
        (sum, key) => sum + (point.minutesByCategory[key] ?? 0),
      );
      if (total > rawMax) rawMax = total;
    }
    final maxY = niceChartMax(rawMax * 1.12);
    final interval = labelIntervalFor(series.length);
    final width = barWidthFor(series.length).clamp(8, 28).toDouble();

    return BarChart(
      BarChartData(
        maxY: maxY,
        minY: 0,
        alignment: BarChartAlignment.spaceAround,
        groupsSpace: series.length > 14 ? 4 : 8,
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          horizontalInterval: maxY / 4,
          getDrawingHorizontalLine: (value) => FlLine(color: AppTheme.chipBg,
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
            fitInsideHorizontally: true,
            fitInsideVertically: true,
            getTooltipItem: (group, groupIndex, rod, rodIndex) {
              if (groupIndex < 0 || groupIndex >= series.length) return null;
              final point = series[groupIndex];
              final title = categoryPointTitle(point.date, period: period);
              final parts = <String>[title];
              for (final key in categoryKeys) {
                final mins = (point.minutesByCategory[key] ?? 0).round();
                if (mins <= 0) continue;
                parts.add('${categoryLabel(key)} ${formatDuration(mins)}');
              }
              if (parts.length == 1) {
                parts.add('No time logged');
              }
              return BarTooltipItem(
                parts.join('\n'),
                TextStyle(
                  color: AppTheme.tooltipFg,
                  fontWeight: FontWeight.w600,
                  fontSize: 11,
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
              reservedSize: 36,
              interval: maxY / 4,
              getTitlesWidget: (value, meta) {
                final ticks = [0.0, maxY / 4, maxY / 2, 3 * maxY / 4, maxY];
                final show =
                    ticks.any((t) => (value - t).abs() < maxY * 0.02 + 0.001);
                if (!show) return const SizedBox.shrink();
                return Padding(
                  padding: const EdgeInsets.only(right: 4),
                  child: Text(
                    _formatAxisHours(value),
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
              reservedSize: 28,
              interval: 1,
              getTitlesWidget: (value, meta) {
                final i = value.toInt();
                if (i < 0 || i >= series.length) return const SizedBox.shrink();
                final show = i % interval == 0 || i == series.length - 1;
                if (!show) return const SizedBox.shrink();
                return SideTitleWidget(
                  meta: meta,
                  space: 6,
                  child: Text(
                    categoryAxisLabel(series[i].date, period: period),
                    style: TextStyle(
                      color: AppTheme.muted,
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                );
              },
            ),
          ),
        ),
        barGroups: [
          for (var i = 0; i < series.length; i++)
            BarChartGroupData(
              x: i,
              barRods: [
                BarChartRodData(
                  toY: categoryKeys.fold<double>(
                    0,
                    (sum, key) =>
                        sum + (series[i].minutesByCategory[key] ?? 0),
                  ),
                  width: width,
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(5),
                  ),
                  rodStackItems: _stackItems(series[i], categoryKeys),
                  color: Colors.transparent,
                ),
              ],
            ),
        ],
      ),
    );
  }

  static List<BarChartRodStackItem> _stackItems(
    CategoryMinutesPoint point,
    List<String> categoryKeys,
  ) {
    final items = <BarChartRodStackItem>[];
    var cursor = 0.0;
    for (final key in categoryKeys) {
      final v = point.minutesByCategory[key] ?? 0;
      if (v <= 0) continue;
      items.add(
        BarChartRodStackItem(cursor, cursor + v, _chartColor(key)),
      );
      cursor += v;
    }
    if (items.isEmpty) {
      items.add(BarChartRodStackItem(0, 0, AppTheme.line));
    }
    return items;
  }
}
