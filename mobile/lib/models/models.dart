class UserProfile {
  const UserProfile({
    required this.id,
    required this.email,
    this.displayName,
    this.timezone,
    this.bio,
  });

  final int id;
  final String email;
  final String? displayName;
  final String? timezone;
  final String? bio;

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id'] as int,
      email: json['email'] as String? ?? '',
      displayName: json['display_name'] as String?,
      timezone: json['timezone'] as String?,
      bio: json['bio'] as String?,
    );
  }

  Map<String, dynamic> toUpdateJson() => {
        if (displayName != null) 'display_name': displayName,
        if (timezone != null) 'timezone': timezone,
        if (bio != null) 'bio': bio,
      };
}

class TaskItem {
  const TaskItem({
    required this.id,
    required this.title,
    required this.status,
    required this.category,
    this.startDate,
    this.dueDate,
    this.goalIds = const [],
    this.goalTitles = const [],
    this.notes = '',
    this.activityCount = 0,
    this.loggedMinutes = 0,
    this.healthActivityType,
    this.healthCardioType,
  });

  final int id;
  final String title;
  final String status;
  final String category;
  final String? startDate;
  final String? dueDate;
  final List<int> goalIds;
  final List<String> goalTitles;
  final String notes;
  final int activityCount;
  final int loggedMinutes;
  final String? healthActivityType;
  final String? healthCardioType;

  String get ticketId => 'PT-$id';

  factory TaskItem.fromJson(Map<String, dynamic> json) {
    return TaskItem(
      id: json['id'] as int,
      title: json['title'] as String? ?? '',
      status: json['status'] as String? ?? 'todo',
      category: json['category'] as String? ?? 'others',
      startDate: json['start_date'] as String?,
      dueDate: json['due_date'] as String?,
      goalIds: (json['goal_ids'] as List<dynamic>?)
              ?.map((e) => (e as num).toInt())
              .toList() ??
          const [],
      goalTitles: (json['goal_titles'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
      notes: json['notes'] as String? ?? '',
      activityCount: json['activity_count'] as int? ?? 0,
      loggedMinutes: json['logged_minutes'] as int? ?? 0,
      healthActivityType: json['health_activity_type'] as String?,
      healthCardioType: json['health_cardio_type'] as String?,
    );
  }
}

class ActivityItem {
  const ActivityItem({
    required this.id,
    required this.taskId,
    required this.title,
    required this.category,
    required this.activityDate,
    required this.durationMinutes,
    this.notes = '',
    this.sleepStartTime,
    this.sleepEndTime,
    this.sleepQuality,
    this.distanceKm,
  });

  final int id;
  final int? taskId;
  final String title;
  final String category;
  final String activityDate;
  final int durationMinutes;
  final String notes;
  final String? sleepStartTime;
  final String? sleepEndTime;
  final String? sleepQuality;
  final double? distanceKm;

  factory ActivityItem.fromJson(Map<String, dynamic> json) {
    return ActivityItem(
      id: json['id'] as int,
      taskId: json['task_id'] as int?,
      title: json['title'] as String? ?? '',
      category: json['category'] as String? ?? 'others',
      activityDate: json['activity_date'] as String? ?? '',
      durationMinutes: json['duration_minutes'] as int? ?? 0,
      notes: json['notes'] as String? ?? '',
      sleepStartTime: json['sleep_start_time'] as String?,
      sleepEndTime: json['sleep_end_time'] as String?,
      sleepQuality: json['sleep_quality'] as String?,
      distanceKm: (json['distance_km'] as num?)?.toDouble(),
    );
  }
}

class GoalTaskRef {
  const GoalTaskRef({
    required this.id,
    required this.title,
    this.status,
    this.category,
  });

  final int id;
  final String title;
  final String? status;
  final String? category;

  factory GoalTaskRef.fromJson(Map<String, dynamic> json) {
    return GoalTaskRef(
      id: json['id'] as int,
      title: json['title'] as String? ?? '',
      status: json['status'] as String?,
      category: json['category'] as String?,
    );
  }
}

class GoalItem {
  const GoalItem({
    required this.id,
    required this.title,
    required this.category,
    required this.period,
    required this.status,
    this.targetMinutes,
    this.startDate,
    this.endDate,
    this.isActive = true,
    this.completionPct = 0,
    this.taskIds = const [],
    this.tasks = const [],
  });

  final int id;
  final String title;
  final String category;
  final String period;
  final String status;
  final int? targetMinutes;
  final String? startDate;
  final String? endDate;
  final bool isActive;
  final int completionPct;
  final List<int> taskIds;
  final List<GoalTaskRef> tasks;

  bool get isDeadline => period == 'deadline' || (targetMinutes == null && endDate != null);

  GoalItem copyWith({int? completionPct}) {
    return GoalItem(
      id: id,
      title: title,
      category: category,
      period: period,
      status: status,
      targetMinutes: targetMinutes,
      startDate: startDate,
      endDate: endDate,
      isActive: isActive,
      completionPct: completionPct ?? this.completionPct,
      taskIds: taskIds,
      tasks: tasks,
    );
  }

  factory GoalItem.fromJson(Map<String, dynamic> json) {
    final rawIds = json['task_ids'];
    final rawTasks = json['tasks'];
    return GoalItem(
      id: json['id'] as int,
      title: json['title'] as String? ?? '',
      category: json['category'] as String? ?? 'others',
      period: json['period'] as String? ?? 'weekly',
      status: json['status'] as String? ?? 'active',
      targetMinutes: json['target_minutes'] as int?,
      startDate: json['start_date'] as String?,
      endDate: json['end_date'] as String?,
      isActive: json['is_active'] == true || json['is_active'] == 1,
      completionPct: () {
        final raw = json['completion_pct'] as num?;
        if (raw == null) return 0;
        return raw.round().clamp(0, 100);
      }(),
      taskIds: rawIds is List
          ? rawIds.map((e) => e as int).toList()
          : const <int>[],
      tasks: rawTasks is List
          ? rawTasks
              .map((e) => GoalTaskRef.fromJson(Map<String, dynamic>.from(e as Map)))
              .toList()
          : const <GoalTaskRef>[],
    );
  }
}

class TaskBreakdownItem {
  const TaskBreakdownItem({
    required this.title,
    required this.minutes,
    required this.percentage,
    this.taskId,
    this.category = 'others',
  });

  final int? taskId;
  final String title;
  final String category;
  final int minutes;
  final double percentage;

  factory TaskBreakdownItem.fromJson(Map<String, dynamic> json) {
    return TaskBreakdownItem(
      taskId: json['task_id'] as int?,
      title: json['title'] as String? ?? '',
      category: json['category'] as String? ?? 'others',
      minutes: json['minutes'] as int? ?? 0,
      percentage: (json['percentage'] as num?)?.toDouble() ?? 0,
    );
  }
}

class CategoryMinutesPoint {
  const CategoryMinutesPoint({
    required this.date,
    required this.minutesByCategory,
  });

  final String date;
  final Map<String, double> minutesByCategory;

  factory CategoryMinutesPoint.fromJson(Map<String, dynamic> json) {
    final minutes = <String, double>{};
    final nested = json['values'];
    if (nested is Map) {
      for (final entry in nested.entries) {
        final n = entry.value;
        if (n is num) minutes[entry.key.toString()] = n.toDouble();
      }
    }
    for (final entry in json.entries) {
      if (entry.key == 'date' || entry.key == 'values' || entry.key == 'total') {
        continue;
      }
      final n = entry.value;
      if (n is num) minutes[entry.key] = n.toDouble();
    }
    return CategoryMinutesPoint(
      date: json['date']?.toString() ?? '',
      minutesByCategory: minutes,
    );
  }
}

class HealthPoint {
  const HealthPoint({
    required this.date,
    this.weightLiftingMinutes = 0,
    this.walkingRunningMinutes = 0,
    this.walkingRunningDistanceKm = 0,
    this.cyclingMinutes = 0,
    this.swimmingMinutes = 0,
  });

  final String date;
  final double weightLiftingMinutes;
  final double walkingRunningMinutes;
  final double walkingRunningDistanceKm;
  final double cyclingMinutes;
  final double swimmingMinutes;

  factory HealthPoint.fromJson(Map<String, dynamic> json) {
    return HealthPoint(
      date: json['date']?.toString() ?? '',
      weightLiftingMinutes:
          (json['weight_lifting_minutes'] as num?)?.toDouble() ?? 0,
      walkingRunningMinutes:
          (json['walking_running_minutes'] as num?)?.toDouble() ?? 0,
      walkingRunningDistanceKm:
          (json['walking_running_distance_km'] as num?)?.toDouble() ?? 0,
      cyclingMinutes: (json['cycling_minutes'] as num?)?.toDouble() ?? 0,
      swimmingMinutes: (json['swimming_minutes'] as num?)?.toDouble() ?? 0,
    );
  }
}

class AnalyticsSummary {
  const AnalyticsSummary({
    required this.period,
    required this.startDate,
    required this.endDate,
    required this.totalMinutes,
    required this.activityCount,
    this.categoryBreakdown = const [],
    this.taskBreakdown = const [],
    this.minutesOverTime = const [],
    this.categoryMinutesOverTime = const [],
    this.sleepOverTime = const [],
    this.healthOverTime = const [],
    this.goalProgress = const [],
  });

  final String period;
  final String startDate;
  final String endDate;
  final int totalMinutes;
  final int activityCount;
  final List<CategoryBreakdown> categoryBreakdown;
  final List<TaskBreakdownItem> taskBreakdown;
  final List<TimePoint> minutesOverTime;
  final List<CategoryMinutesPoint> categoryMinutesOverTime;
  final List<SleepPoint> sleepOverTime;
  final List<HealthPoint> healthOverTime;
  final List<GoalProgress> goalProgress;

  factory AnalyticsSummary.fromJson(Map<String, dynamic> json) {
    return AnalyticsSummary(
      period: json['period'] as String? ?? 'week',
      startDate: json['start_date'] as String? ?? '',
      endDate: json['end_date'] as String? ?? '',
      totalMinutes: json['total_minutes'] as int? ?? 0,
      activityCount: json['activity_count'] as int? ?? 0,
      categoryBreakdown: (json['category_breakdown'] as List? ?? [])
          .map((e) => CategoryBreakdown.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(),
      taskBreakdown: (json['task_breakdown'] as List? ?? [])
          .map((e) => TaskBreakdownItem.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(),
      minutesOverTime: (json['minutes_over_time'] as List? ?? [])
          .map((e) => TimePoint.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(),
      categoryMinutesOverTime: (json['category_minutes_over_time'] as List? ?? [])
          .map((e) => CategoryMinutesPoint.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(),
      sleepOverTime: (json['sleep_over_time'] as List? ?? [])
          .map((e) => SleepPoint.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(),
      healthOverTime: (json['health_over_time'] as List? ?? [])
          .map((e) => HealthPoint.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(),
      goalProgress: (json['goal_progress'] as List? ?? [])
          .map((e) => GoalProgress.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(),
    );
  }
}

class CategoryBreakdown {
  const CategoryBreakdown({
    required this.category,
    required this.minutes,
    required this.percentage,
  });

  final String category;
  final int minutes;
  final double percentage;

  factory CategoryBreakdown.fromJson(Map<String, dynamic> json) {
    return CategoryBreakdown(
      category: json['category'] as String? ?? 'others',
      minutes: json['minutes'] as int? ?? 0,
      percentage: (json['percentage'] as num?)?.toDouble() ?? 0,
    );
  }
}

class TimePoint {
  const TimePoint({required this.date, required this.value});

  final String date;
  final double value;

  factory TimePoint.fromJson(Map<String, dynamic> json) {
    return TimePoint(
      date: json['date']?.toString() ?? '',
      value: (json['value'] as num?)?.toDouble() ?? 0,
    );
  }
}

class SleepPoint {
  const SleepPoint({
    required this.date,
    required this.minutes,
    this.quality,
  });

  final String date;
  final int minutes;
  final String? quality;

  factory SleepPoint.fromJson(Map<String, dynamic> json) {
    return SleepPoint(
      date: json['date']?.toString() ?? '',
      minutes: json['minutes'] as int? ?? 0,
      quality: json['quality'] as String?,
    );
  }
}

class GoalProgress {
  const GoalProgress({
    required this.goalId,
    required this.title,
    required this.category,
    required this.period,
    required this.targetMinutes,
    required this.actualMinutes,
    required this.completionPct,
  });

  final int goalId;
  final String title;
  final String category;
  final String period;
  final int targetMinutes;
  final int actualMinutes;
  final double completionPct;

  factory GoalProgress.fromJson(Map<String, dynamic> json) {
    return GoalProgress(
      goalId: json['goal_id'] as int,
      title: json['title'] as String? ?? '',
      category: json['category'] as String? ?? 'others',
      period: json['period'] as String? ?? 'weekly',
      targetMinutes: json['target_minutes'] as int? ?? 0,
      actualMinutes: json['actual_minutes'] as int? ?? 0,
      completionPct: (json['completion_pct'] as num?)?.toDouble() ?? 0,
    );
  }
}
