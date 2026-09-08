import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import '../models/models.dart';

class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

typedef TokenProvider = Future<String?> Function();

class ApiClient {
  ApiClient({TokenProvider? tokenProvider, http.Client? httpClient})
      : _tokenProvider = tokenProvider,
        _http = httpClient ?? http.Client();

  final TokenProvider? _tokenProvider;
  final http.Client _http;

  Uri _uri(String path, [Map<String, String>? query]) {
    final base = AppConfig.apiBaseUrl;
    return Uri.parse('$base$path').replace(queryParameters: query);
  }

  Future<dynamic> _request(
    String method,
    String path, {
    Map<String, String>? query,
    Object? body,
    bool auth = true,
  }) async {
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (auth) {
      final token = await _tokenProvider?.call();
      if (token == null || token.isEmpty) {
        throw ApiException('Not signed in', statusCode: 401);
      }
      headers['Authorization'] = 'Bearer $token';
    }

    late http.Response res;
    try {
      final uri = _uri(path, query);
      final encoded = body == null ? null : jsonEncode(body);
      switch (method) {
        case 'GET':
          res = await _http.get(uri, headers: headers);
        case 'POST':
          res = await _http.post(uri, headers: headers, body: encoded);
        case 'PATCH':
          res = await _http.patch(uri, headers: headers, body: encoded);
        case 'DELETE':
          res = await _http.delete(uri, headers: headers);
        default:
          throw ApiException('Unsupported method $method');
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(
        'Cannot reach the API at ${AppConfig.apiBaseUrl}. '
        '${AppConfig.usingLocalApi ? 'Start the local backend or wait for auto-fallback to the deployed API on next launch. ' : ''}'
        'Override with --dart-define=API_BASE_URL=… '
        'Details: $e',
      );
    }

    if (res.statusCode == 204) return null;

    dynamic data;
    try {
      data = res.body.isEmpty ? {} : jsonDecode(res.body);
    } catch (_) {
      data = {};
    }

    if (res.statusCode < 200 || res.statusCode >= 300) {
      final detail = data is Map ? data['detail'] : null;
      final message = detail is String
          ? detail
          : detail != null
              ? jsonEncode(detail)
              : (res.reasonPhrase ?? 'Request failed');
      throw ApiException(message, statusCode: res.statusCode);
    }
    return data;
  }

  Future<Map<String, dynamic>> health() async {
    final data = await _request('GET', '/api/health', auth: false);
    return Map<String, dynamic>.from(data as Map);
  }

  Future<UserProfile> me() async {
    final data = await _request('GET', '/api/users/me');
    return UserProfile.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<UserProfile> updateMe(Map<String, dynamic> body) async {
    final data = await _request('PATCH', '/api/users/me', body: body);
    return UserProfile.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<List<TaskItem>> listTasks({String? status}) async {
    final data = await _request(
      'GET',
      '/api/tasks',
      query: status == null ? null : {'status': status},
    );
    return (data as List)
        .map((e) => TaskItem.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }

  Future<TaskItem> createTask(Map<String, dynamic> body) async {
    final data = await _request('POST', '/api/tasks', body: body);
    return TaskItem.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<TaskItem> updateTask(int id, Map<String, dynamic> body) async {
    final data = await _request('PATCH', '/api/tasks/$id', body: body);
    return TaskItem.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<void> deleteTask(int id) async {
    await _request('DELETE', '/api/tasks/$id');
  }

  Future<List<ActivityItem>> listActivities({
    int? taskId,
    String? category,
    String? startDate,
    String? endDate,
  }) async {
    final query = <String, String>{
      if (taskId != null) 'task_id': '$taskId',
      if (category != null && category.isNotEmpty) 'category': category,
      if (startDate != null && startDate.isNotEmpty) 'start_date': startDate,
      if (endDate != null && endDate.isNotEmpty) 'end_date': endDate,
    };
    final data = await _request(
      'GET',
      '/api/activities',
      query: query.isEmpty ? null : query,
    );
    return (data as List)
        .map((e) => ActivityItem.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }

  Future<ActivityItem> createActivity(Map<String, dynamic> body) async {
    final data = await _request('POST', '/api/activities', body: body);
    return ActivityItem.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<ActivityItem> updateActivity(int id, Map<String, dynamic> body) async {
    final data = await _request('PATCH', '/api/activities/$id', body: body);
    return ActivityItem.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<void> deleteActivity(int id) async {
    await _request('DELETE', '/api/activities/$id');
  }

  Future<List<GoalItem>> listGoals() async {
    final data = await _request('GET', '/api/goals');
    return (data as List)
        .map((e) => GoalItem.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }

  Future<GoalItem> createGoal(Map<String, dynamic> body) async {
    final data = await _request('POST', '/api/goals', body: body);
    return GoalItem.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<GoalItem> updateGoal(int id, Map<String, dynamic> body) async {
    final data = await _request('PATCH', '/api/goals/$id', body: body);
    return GoalItem.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<void> deleteGoal(int id) async {
    await _request('DELETE', '/api/goals/$id');
  }

  Future<AnalyticsSummary> analytics({
    String period = 'week',
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    final query = <String, String>{'period': period};
    if (startDate != null) {
      query['start_date'] = _ymd(startDate);
    }
    if (endDate != null) {
      query['end_date'] = _ymd(endDate);
    }
    final data = await _request(
      'GET',
      '/api/analytics/summary',
      query: query,
    );
    return AnalyticsSummary.fromJson(Map<String, dynamic>.from(data as Map));
  }

  static String _ymd(DateTime d) {
    final y = d.year.toString().padLeft(4, '0');
    final m = d.month.toString().padLeft(2, '0');
    final day = d.day.toString().padLeft(2, '0');
    return '$y-$m-$day';
  }
}
