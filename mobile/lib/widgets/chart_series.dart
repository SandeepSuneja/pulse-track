import '../models/models.dart';

/// One bar on a dashboard / analytics time chart.
class ChartBarPoint {
  const ChartBarPoint({
    required this.label,
    required this.value,
    this.quality,
    this.tooltip,
  });

  final String label;
  final double value;
  final String? quality;
  final String? tooltip;
}

/// Collapse dense day series so charts stay readable on mobile.
///
/// [period] values: `day`, `week`, `last30`, `calendar` (and legacy `month`/`year`).
List<ChartBarPoint> prepareMinutesChart(
  List<TimePoint> points, {
  required String period,
}) {
  if (points.isEmpty) return const [];
  // Legacy year rollup — keep for any leftover callers.
  if (period == 'year') {
    return _aggregateMinutesByMonth(points, fillYearToDate: true);
  }
  return [
    for (final p in points)
      ChartBarPoint(
        label: _axisLabel(p.date, period: period),
        value: p.value,
        tooltip: '${_fullDate(p.date)} · ${_formatMinutes(p.value.round())}',
      ),
  ];
}

List<ChartBarPoint> prepareSleepChart(
  List<SleepPoint> points, {
  required String period,
}) {
  if (period == 'year') {
    final withSleep = points.where((p) => p.minutes > 0).toList();
    if (withSleep.isEmpty) return const [];
    return _aggregateSleepByMonth(withSleep, fillYearToDate: true);
  }

  // Keep the full calendar range so bars align with time chart (zeros = no sleep).
  if (points.isEmpty) return const [];
  final any = points.any((p) => p.minutes > 0);
  if (!any) return const [];

  return [
    for (final p in points)
      ChartBarPoint(
        label: _axisLabel(p.date, period: period),
        value: p.minutes / 60.0,
        quality: p.minutes > 0 ? _normalizeQuality(p.quality) : null,
        tooltip: p.minutes > 0
            ? '${_fullDate(p.date)} · ${(p.minutes / 60).toStringAsFixed(1)}h'
                '${p.quality != null ? ' · ${_qualityLabel(p.quality)}' : ''}'
            : '${_fullDate(p.date)} · no sleep',
      ),
  ];
}

String chartTitleTime(String period, {String? monthLabel}) {
  switch (period) {
    case 'year':
      return 'Time by month';
    case 'day':
      return 'Time today';
    case 'last30':
    case 'month':
      return 'Time · last 30 days';
    case 'calendar':
      return monthLabel != null ? 'Time · $monthLabel' : 'Time by day';
    default:
      return 'Time by day';
  }
}

String chartTitleSleep(String period, {String? monthLabel}) {
  switch (period) {
    case 'year':
      return 'Sleep by month';
    case 'day':
      return 'Sleep today';
    case 'last30':
    case 'month':
      return 'Sleep · last 30 days';
    case 'calendar':
      return monthLabel != null ? 'Sleep · $monthLabel' : 'Sleep by day';
    default:
      return 'Sleep by day';
  }
}

/// Show every label when few bars; otherwise evenly spaced including ends.
int labelIntervalFor(int count) {
  if (count <= 10) return 1;
  if (count <= 16) return 2;
  if (count <= 31) return 5;
  return (count / 6).ceil().clamp(1, 60);
}

double barWidthFor(int count) {
  if (count <= 0) return 14;
  if (count <= 7) return 22;
  if (count <= 14) return 14;
  if (count <= 22) return 10;
  if (count <= 31) return 7;
  return 16;
}

List<ChartBarPoint> _aggregateMinutesByMonth(
  List<TimePoint> points, {
  bool fillYearToDate = false,
}) {
  final sums = <String, double>{};
  for (final p in points) {
    final key = _monthKey(p.date);
    if (key == null) continue;
    sums[key] = (sums[key] ?? 0) + p.value;
  }
  final keys = fillYearToDate ? _yearToDateMonthKeys(points) : (sums.keys.toList()..sort());
  return [
    for (final key in keys)
      ChartBarPoint(
        label: _monthLabel(key),
        value: sums[key] ?? 0,
        tooltip: '${_monthLabel(key)} · ${_formatMinutes((sums[key] ?? 0).round())}',
      ),
  ];
}

List<ChartBarPoint> _aggregateSleepByMonth(
  List<SleepPoint> points, {
  bool fillYearToDate = false,
}) {
  final minutes = <String, int>{};
  final qualities = <String, List<String>>{};
  for (final p in points) {
    final key = _monthKey(p.date);
    if (key == null) continue;
    minutes[key] = (minutes[key] ?? 0) + p.minutes;
    qualities.putIfAbsent(key, () => []);
    final q = _normalizeQuality(p.quality);
    if (q != null) {
      qualities[key]!.add(q);
    }
  }
  final keys = fillYearToDate ? _yearToDateMonthKeysFromSleep(points) : (minutes.keys.toList()..sort());
  return [
    for (final key in keys)
      ChartBarPoint(
        label: _monthLabel(key),
        value: (minutes[key] ?? 0) / 60.0,
        quality: _dominantQuality(qualities[key] ?? const []),
        tooltip:
            '${_monthLabel(key)} · ${((minutes[key] ?? 0) / 60).toStringAsFixed(1)}h',
      ),
  ];
}

List<String> _yearToDateMonthKeys(List<TimePoint> points) {
  if (points.isEmpty) return const [];
  final first = points.first.date;
  final last = points.last.date;
  return _monthKeysBetween(first, last);
}

List<String> _yearToDateMonthKeysFromSleep(List<SleepPoint> points) {
  if (points.isEmpty) return const [];
  final keys = points.map((p) => _monthKey(p.date)).whereType<String>().toList()..sort();
  if (keys.isEmpty) return const [];
  return _monthKeysBetween('${keys.first}-01', '${keys.last}-28');
}

List<String> _monthKeysBetween(String startIso, String endIso) {
  final start = DateTime.tryParse(startIso.length >= 10 ? startIso.substring(0, 10) : startIso);
  final end = DateTime.tryParse(endIso.length >= 10 ? endIso.substring(0, 10) : endIso);
  if (start == null || end == null) return const [];
  var cursor = DateTime(start.year, start.month);
  final last = DateTime(end.year, end.month);
  final out = <String>[];
  while (!cursor.isAfter(last)) {
    final m = cursor.month.toString().padLeft(2, '0');
    out.add('${cursor.year}-$m');
    cursor = DateTime(cursor.year, cursor.month + 1);
  }
  return out;
}

String? _monthKey(String isoDate) {
  if (isoDate.length < 7) return null;
  return isoDate.substring(0, 7);
}

String _monthLabel(String yyyyMm) {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  final parts = yyyyMm.split('-');
  if (parts.length < 2) return yyyyMm;
  final m = int.tryParse(parts[1]) ?? 0;
  if (m < 1 || m > 12) return yyyyMm;
  return months[m - 1];
}

String _axisLabel(String isoDate, {required String period}) {
  final dt = DateTime.tryParse(isoDate.length >= 10 ? isoDate.substring(0, 10) : isoDate);
  if (dt == null) return isoDate;
  if (period == 'week' || period == 'day') {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days[dt.weekday - 1];
  }
  if (period == 'last30') {
    return '${dt.month}/${dt.day}';
  }
  // calendar / month: day of month
  return '${dt.day}';
}

String _fullDate(String isoDate) {
  final dt = DateTime.tryParse(isoDate.length >= 10 ? isoDate.substring(0, 10) : isoDate);
  if (dt == null) return isoDate;
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return '${months[dt.month - 1]} ${dt.day}';
}

String _formatMinutes(int minutes) {
  if (minutes >= 60) {
    final h = minutes ~/ 60;
    final m = minutes % 60;
    if (m == 0) return '${h}h';
    return '${h}h ${m}m';
  }
  return '${minutes}m';
}

String? _normalizeQuality(String? quality) {
  if (quality == null || quality.isEmpty) return null;
  return quality.toLowerCase();
}

String _qualityLabel(String? quality) {
  switch (_normalizeQuality(quality)) {
    case 'ideal':
      return 'Ideal';
    case 'normal':
      return 'Normal';
    case 'bad':
      return 'Bad';
    default:
      return 'Unrated';
  }
}

String? _dominantQuality(List<String> values) {
  if (values.isEmpty) return null;
  final counts = <String, int>{};
  for (final v in values) {
    counts[v] = (counts[v] ?? 0) + 1;
  }
  const rank = ['bad', 'normal', 'ideal'];
  var best = values.first;
  var bestCount = 0;
  for (final entry in counts.entries) {
    if (entry.value > bestCount) {
      best = entry.key;
      bestCount = entry.value;
    } else if (entry.value == bestCount) {
      final a = rank.indexOf(entry.key);
      final b = rank.indexOf(best);
      if (a != -1 && (b == -1 || a < b)) best = entry.key;
    }
  }
  return best;
}

/// Aggregate category time series by month for year view.
List<CategoryMinutesPoint> prepareCategoryOverTime(
  List<CategoryMinutesPoint> series, {
  required String period,
}) {
  if (series.isEmpty || period != 'year') return series;
  final maps = <String, Map<String, double>>{};
  for (final point in series) {
    final key = _monthKey(point.date);
    if (key == null) continue;
    final bucket = maps.putIfAbsent(key, () => {});
    for (final entry in point.minutesByCategory.entries) {
      bucket[entry.key] = (bucket[entry.key] ?? 0) + entry.value;
    }
  }
  final keys = _monthKeysBetween(series.first.date, series.last.date);
  return [
    for (final key in keys)
      CategoryMinutesPoint(
        date: '$key-01',
        minutesByCategory: maps[key] ?? const {},
      ),
  ];
}

/// X-axis label for analytics category-over-time charts.
String categoryAxisLabel(String isoDate, {required String period}) {
  final dt = DateTime.tryParse(isoDate.length >= 10 ? isoDate.substring(0, 10) : isoDate);
  if (dt == null) return isoDate;
  if (period == 'year') {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return months[dt.month - 1];
  }
  if (period == 'week' || period == 'day') {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days[dt.weekday - 1];
  }
  if (period == 'last30') {
    return '${dt.month}/${dt.day}';
  }
  return '${dt.day}';
}

String categoryPointTitle(String isoDate, {required String period}) {
  if (period == 'year') {
    final dt = DateTime.tryParse(isoDate.length >= 10 ? isoDate.substring(0, 10) : isoDate);
    if (dt == null) return isoDate;
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return '${months[dt.month - 1]} ${dt.year}';
  }
  return _fullDate(isoDate);
}
