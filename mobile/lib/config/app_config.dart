import 'dart:io' show Platform;

import 'package:http/http.dart' as http;

/// Runtime configuration for the Pulse Track mobile client.
class AppConfig {
  AppConfig._();

  /// Deployed FastAPI origin (ECS Express Mode). Override with
  /// `--dart-define=DEPLOYED_API_BASE_URL=https://…`.
  static const deployedApiBaseUrl = String.fromEnvironment(
    'DEPLOYED_API_BASE_URL',
    defaultValue: 'https://pu-33c5978573c14366842f5c7087cb4002.ecs.us-east-1.on.aws',
  );

  /// Local backend when developing on emulator / host.
  /// Android emulator + `adb reverse tcp:8000 tcp:8000` → `127.0.0.1:8000`.
  static String get localApiBaseUrl {
    const fromEnv = String.fromEnvironment('LOCAL_API_BASE_URL');
    if (fromEnv.isNotEmpty) return _trimSlash(fromEnv);
    return 'http://127.0.0.1:8000';
  }

  /// Force local (`true`) or deployed (`false`). When unset, auto-detect.
  static const preferLocalApi = bool.fromEnvironment('USE_LOCAL_API');
  static const preferDeployedApi = bool.fromEnvironment('USE_DEPLOYED_API');

  static String? _resolvedApiBaseUrl;

  /// Backend origin (no trailing slash). Call [resolveApiBaseUrl] in `main`
  /// before creating [ApiClient] / [AuthService].
  static String get apiBaseUrl {
    const forced = String.fromEnvironment('API_BASE_URL');
    if (forced.isNotEmpty) return _trimSlash(forced);
    return _resolvedApiBaseUrl ?? _trimSlash(deployedApiBaseUrl);
  }

  static bool get usingLocalApi =>
      apiBaseUrl.contains('127.0.0.1') ||
      apiBaseUrl.contains('10.0.2.2') ||
      apiBaseUrl.contains('localhost');

  /// Pick local API when reachable; otherwise use the deployed URL.
  ///
  /// Priority:
  /// 1. `--dart-define=API_BASE_URL=…` (handled in [apiBaseUrl] getter)
  /// 2. `--dart-define=USE_LOCAL_API=true` → local
  /// 3. `--dart-define=USE_DEPLOYED_API=true` → deployed
  /// 4. Auto: health-check local, fall back to deployed
  static Future<String> resolveApiBaseUrl({http.Client? httpClient}) async {
    const forced = String.fromEnvironment('API_BASE_URL');
    if (forced.isNotEmpty) {
      _resolvedApiBaseUrl = _trimSlash(forced);
      return _resolvedApiBaseUrl!;
    }

    if (preferDeployedApi && !preferLocalApi) {
      _resolvedApiBaseUrl = _trimSlash(deployedApiBaseUrl);
      return _resolvedApiBaseUrl!;
    }

    if (preferLocalApi) {
      _resolvedApiBaseUrl = localApiBaseUrl;
      return _resolvedApiBaseUrl!;
    }

    final local = localApiBaseUrl;
    final client = httpClient ?? http.Client();
    try {
      final ok = await _isHealthy(client, local);
      _resolvedApiBaseUrl = ok ? local : _trimSlash(deployedApiBaseUrl);
    } finally {
      if (httpClient == null) client.close();
    }
    return _resolvedApiBaseUrl!;
  }

  static Future<bool> _isHealthy(http.Client client, String base) async {
    try {
      final res = await client
          .get(Uri.parse('$base/api/health'))
          .timeout(const Duration(milliseconds: 900));
      return res.statusCode >= 200 && res.statusCode < 300;
    } catch (_) {
      return false;
    }
  }

  static String _trimSlash(String url) => url.replaceAll(RegExp(r'/$'), '');

  /// Same Firebase project as the web client.
  static bool get firebaseConfigured {
    const key = String.fromEnvironment(
      'FIREBASE_API_KEY',
      defaultValue: 'AIzaSyD4QVtgtDkXuAKing8m4UcoUyzbEmIROKc',
    );
    const project = String.fromEnvironment(
      'FIREBASE_PROJECT_ID',
      defaultValue: 'pulse-track-3d1b5',
    );
    return key.isNotEmpty && project.isNotEmpty;
  }

  /// OAuth Web client ID (client_type 3) from `android/app/google-services.json`.
  /// Required so Google Sign-In returns an ID token for Firebase Auth.
  static const googleServerClientId = String.fromEnvironment(
    'FIREBASE_WEB_CLIENT_ID',
    defaultValue:
        '657064691901-mqp49ini9b104vu7h06t8iqlse9d0l1e.apps.googleusercontent.com',
  );

  /// Optional local-only bypass (`Bearer dev:<uid>`). Off by default (matches web).
  static const useDevAuth = bool.fromEnvironment(
    'USE_DEV_AUTH',
    defaultValue: false,
  );

  static const devUid = String.fromEnvironment(
    'DEV_UID',
    defaultValue: 'mobile-demo',
  );

  static String get devBearerToken => 'dev:$devUid';

  /// Platform hint for docs / Profile debug.
  static String get platformLabel {
    if (Platform.isAndroid) return 'Android';
    if (Platform.isIOS) return 'iOS';
    return 'unknown';
  }
}
