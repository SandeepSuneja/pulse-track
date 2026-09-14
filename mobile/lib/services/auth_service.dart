import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../config/app_config.dart';
import '../models/models.dart';
import 'api_client.dart';

enum AuthMode { signedOut, dev, firebase }

class AuthService extends ChangeNotifier {
  AuthService({ApiClient? apiClient}) {
    _api = apiClient ?? ApiClient(tokenProvider: getIdToken);
  }

  late final ApiClient _api;
  AuthMode _mode = AuthMode.signedOut;
  UserProfile? _profile;
  String? _devToken;
  String? _error;
  bool _ready = false;
  bool _busy = false;
  bool _googleReady = false;

  ApiClient get api => _api;
  AuthMode get mode => _mode;
  UserProfile? get profile => _profile;
  String? get error => _error;
  bool get ready => _ready;
  bool get busy => _busy;
  bool get isSignedIn => _mode != AuthMode.signedOut;
  bool get firebaseConfigured => AppConfig.firebaseConfigured;

  Future<void> bootstrap() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedDev = prefs.getString('dev_token');

      if (AppConfig.useDevAuth && savedDev != null && savedDev.isNotEmpty) {
        _devToken = savedDev;
        _mode = AuthMode.dev;
        await _loadProfile();
      } else if (AppConfig.firebaseConfigured) {
        final user = FirebaseAuth.instance.currentUser;
        if (user != null) {
          _mode = AuthMode.firebase;
          await _loadProfile();
        }
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _ready = true;
      notifyListeners();
    }
  }

  Future<String?> getIdToken() async {
    if (_mode == AuthMode.dev) return _devToken ?? AppConfig.devBearerToken;
    if (_mode == AuthMode.firebase) {
      return FirebaseAuth.instance.currentUser?.getIdToken();
    }
    return null;
  }

  Future<void> _ensureGoogleInitialized() async {
    if (_googleReady) return;
    final serverClientId = AppConfig.googleServerClientId.trim();
    await GoogleSignIn.instance.initialize(
      serverClientId: serverClientId.isEmpty ? null : serverClientId,
    );
    _googleReady = true;
  }

  String _formatAuthError(Object err) {
    if (err is GoogleSignInException) {
      switch (err.code) {
        case GoogleSignInExceptionCode.canceled:
          final detail = (err.description ?? '').trim();
          if (detail.contains('16') ||
              detail.toLowerCase().contains('reauth') ||
              detail.toLowerCase().contains('activity is cancelled')) {
            return 'Google Sign-In failed (often a SHA-1 mismatch on Play builds, '
                'not a real cancel). Add the Play App Signing SHA-1 from '
                'Play Console → Protected with Play → Manage Play app signing '
                '(use Download certificates → deployment_cert.der if shown) '
                'in Firebase, replace google-services.json, rebuild, and reupload.\n'
                'Expected Play SHA-1 currently in google-services.json:\n'
                '82:F0:60:D3:E4:25:26:76:DF:4D:9B:E1:60:48:07:85:C1:F3:9E:A1'
                '${detail.isEmpty ? '' : '\n($detail)'}';
          }
          return detail.isEmpty
              ? 'Google sign-in was cancelled.'
              : 'Google sign-in was cancelled. ($detail)';
        case GoogleSignInExceptionCode.interrupted:
          return 'Google sign-in was interrupted. Try again.';
        case GoogleSignInExceptionCode.uiUnavailable:
          return 'Google sign-in UI is unavailable right now. Try again.';
        case GoogleSignInExceptionCode.clientConfigurationError:
        case GoogleSignInExceptionCode.providerConfigurationError:
          return 'Google Sign-In is misconfigured for Android '
              '(com.pulsetrack.pulse_track_mobile). In Firebase, add SHA-1s for '
              'debug, upload, and Play App Signing keys, download a fresh '
              'google-services.json, then rebuild/reupload the Play release.\n'
              'Debug: C4:71:B5:D6:4C:2F:2A:13:9A:C5:AE:60:53:8F:60:D6:FA:91:00:CE\n'
              'Upload: 7C:0B:A1:85:B3:32:1E:CF:9C:72:0A:51:4F:90:E5:A3:91:76:4A:80'
              '${err.description == null ? '' : '\n(${err.description})'}';
        default:
          return err.description ?? err.toString();
      }
    }
    if (err is FirebaseAuthException) {
      switch (err.code) {
        case 'user-not-found':
        case 'wrong-password':
        case 'invalid-credential':
          return 'Invalid email or password.';
        case 'email-already-in-use':
          return 'An account already exists for that email.';
        case 'weak-password':
          return 'Password should be at least 6 characters.';
        case 'invalid-email':
          return 'Enter a valid email address.';
        case 'network-request-failed':
          return 'Network error. Check your connection and try again.';
        default:
          return err.message ?? err.code;
      }
    }
    if (err is ApiException) return err.message;
    final text = err.toString();
    if (text.contains('10:') ||
        text.toLowerCase().contains('developer_error') ||
        text.toLowerCase().contains('api_exception: 10')) {
      return 'Google Sign-In developer error (API 10). Add debug + upload + '
          'Play App Signing SHA-1s in Firebase for '
          'com.pulsetrack.pulse_track_mobile, replace google-services.json, '
          'then rebuild and reupload the Play AAB.\n'
          'Debug: C4:71:B5:D6:4C:2F:2A:13:9A:C5:AE:60:53:8F:60:D6:FA:91:00:CE\n'
          'Upload: 7C:0B:A1:85:B3:32:1E:CF:9C:72:0A:51:4F:90:E5:A3:91:76:4A:80';
    }
    return text;
  }

  Future<void> signInDev({String? uid}) async {
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      final token = 'dev:${uid ?? AppConfig.devUid}';
      _devToken = token;
      _mode = AuthMode.dev;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('dev_token', token);
      await _loadProfile();
    } catch (e) {
      _mode = AuthMode.signedOut;
      _error = _formatAuthError(e);
      rethrow;
    } finally {
      _busy = false;
      notifyListeners();
    }
  }

  Future<void> signInEmail(String email, String password) async {
    if (!AppConfig.firebaseConfigured) {
      throw StateError('Firebase is not configured.');
    }
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      await FirebaseAuth.instance.signInWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
      _mode = AuthMode.firebase;
      await _loadProfile();
    } catch (e) {
      _error = _formatAuthError(e);
      rethrow;
    } finally {
      _busy = false;
      notifyListeners();
    }
  }

  Future<void> registerEmail(
    String email,
    String password, {
    String? displayName,
  }) async {
    if (!AppConfig.firebaseConfigured) {
      throw StateError('Firebase is not configured.');
    }
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      final cred = await FirebaseAuth.instance.createUserWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
      final name = displayName?.trim();
      if (name != null && name.isNotEmpty) {
        await cred.user?.updateDisplayName(name);
      }
      _mode = AuthMode.firebase;
      await _loadProfile();
    } catch (e) {
      _error = _formatAuthError(e);
      rethrow;
    } finally {
      _busy = false;
      notifyListeners();
    }
  }

  Future<void> signInGoogle() async {
    if (!AppConfig.firebaseConfigured) {
      throw StateError('Firebase is not configured.');
    }
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      // Native account picker (Credential Manager) — not the browser OAuth sheet.
      await _ensureGoogleInitialized();
      final googleUser = await GoogleSignIn.instance.authenticate(
        scopeHint: const ['email', 'profile'],
      );
      final idToken = googleUser.authentication.idToken;
      if (idToken == null || idToken.isEmpty) {
        throw StateError(
          'Google did not return an ID token. Confirm FIREBASE_WEB_CLIENT_ID '
          'matches the Web client in google-services.json, and that the Android '
          'app SHA-1 is registered in Firebase.',
        );
      }
      final credential = GoogleAuthProvider.credential(idToken: idToken);
      await FirebaseAuth.instance.signInWithCredential(credential);
      _mode = AuthMode.firebase;
      await _loadProfile();
    } catch (e) {
      _error = _formatAuthError(e);
      rethrow;
    } finally {
      _busy = false;
      notifyListeners();
    }
  }

  Future<void> signOut() async {
    if (_mode == AuthMode.firebase) {
      await FirebaseAuth.instance.signOut();
      try {
        await GoogleSignIn.instance.signOut();
      } catch (_) {}
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('dev_token');
    _devToken = null;
    _profile = null;
    _mode = AuthMode.signedOut;
    notifyListeners();
  }

  Future<void> refreshProfile() async {
    await _loadProfile();
    notifyListeners();
  }

  Future<void> _loadProfile() async {
    _profile = await _api.me();
  }
}
