import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show TargetPlatform, defaultTargetPlatform, kIsWeb;

/// Firebase options for the Pulse Track project (`pulse-track-3d1b5`).
///
/// Android values match `android/app/google-services.json`.
/// Web values match `frontend/.env` `VITE_FIREBASE_*`.
class DefaultFirebaseOptions {
  const DefaultFirebaseOptions._();

  static FirebaseOptions get currentPlatform {
    if (kIsWeb) return web;
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        return web;
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: String.fromEnvironment(
      'FIREBASE_API_KEY',
      defaultValue: 'AIzaSyD4QVtgtDkXuAKing8m4UcoUyzbEmIROKc',
    ),
    appId: String.fromEnvironment(
      'FIREBASE_APP_ID',
      defaultValue: '1:657064691901:web:e0397b01c1d15068aa0fd4',
    ),
    messagingSenderId: String.fromEnvironment(
      'FIREBASE_MESSAGING_SENDER_ID',
      defaultValue: '657064691901',
    ),
    projectId: String.fromEnvironment(
      'FIREBASE_PROJECT_ID',
      defaultValue: 'pulse-track-3d1b5',
    ),
    authDomain: String.fromEnvironment(
      'FIREBASE_AUTH_DOMAIN',
      defaultValue: 'pulse-track-3d1b5.firebaseapp.com',
    ),
    storageBucket: String.fromEnvironment(
      'FIREBASE_STORAGE_BUCKET',
      defaultValue: 'pulse-track-3d1b5.firebasestorage.app',
    ),
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: String.fromEnvironment(
      'FIREBASE_ANDROID_API_KEY',
      defaultValue: 'AIzaSyAwQfXubSfofBSh1iNoJfHtGsxirB0PZvk',
    ),
    appId: String.fromEnvironment(
      'FIREBASE_ANDROID_APP_ID',
      defaultValue: '1:657064691901:android:8b127b8cd9a2217eaa0fd4',
    ),
    messagingSenderId: String.fromEnvironment(
      'FIREBASE_MESSAGING_SENDER_ID',
      defaultValue: '657064691901',
    ),
    projectId: String.fromEnvironment(
      'FIREBASE_PROJECT_ID',
      defaultValue: 'pulse-track-3d1b5',
    ),
    storageBucket: String.fromEnvironment(
      'FIREBASE_STORAGE_BUCKET',
      defaultValue: 'pulse-track-3d1b5.firebasestorage.app',
    ),
  );

  static const FirebaseOptions ios = web;
}
