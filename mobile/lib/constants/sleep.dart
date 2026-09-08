const minGoodSleepMinutes = 7 * 60;

/// Shown under sleep time pickers (matches web Activities hint).
const sleepQualityHint =
    'Ideal: wake 6:00–6:30 AM · Normal: wake 6:30–7:30 AM · both need ≥ 7 hrs sleep · otherwise Bad';

int? sleepDurationMinutes(String? startHhmm, String? endHhmm) {
  final start = _toMinutes(startHhmm);
  final end = _toMinutes(endHhmm);
  if (start == null || end == null) return null;
  if (end <= start) return end + 24 * 60 - start;
  return end - start;
}

/// Ideal: wake 06:00–06:30 and ≥ 7h. Normal: wake 06:30–07:30 and ≥ 7h.
/// Ideal is checked first when windows overlap (e.g. exactly 06:30).
String? classifySleepQuality(String? startHhmm, String? endHhmm) {
  final start = _toMinutes(startHhmm);
  final end = _toMinutes(endHhmm);
  if (start == null || end == null) return null;

  final duration = sleepDurationMinutes(startHhmm, endHhmm);
  if (duration == null || duration < minGoodSleepMinutes) return 'bad';

  if (end >= 6 * 60 && end <= 6 * 60 + 30) return 'ideal';
  if (end >= 6 * 60 + 30 && end <= 7 * 60 + 30) return 'normal';
  return 'bad';
}

const sleepQualityLabel = <String, String>{
  'ideal': 'Ideal',
  'normal': 'Normal',
  'bad': 'Bad',
};

int? _toMinutes(String? hhmm) {
  if (hhmm == null || hhmm.isEmpty) return null;
  final parts = hhmm.split(':');
  if (parts.length < 2) return null;
  final h = int.tryParse(parts[0]);
  final m = int.tryParse(parts[1]);
  if (h == null || m == null) return null;
  return h * 60 + m;
}
