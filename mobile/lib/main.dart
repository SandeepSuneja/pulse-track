import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'config/app_config.dart';
import 'firebase_options.dart';
import 'router/app_router.dart';
import 'services/auth_service.dart';
import 'theme/app_theme.dart';
import 'theme/theme_controller.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Prefer local API when reachable; otherwise use the deployed HTTPS API.
  await AppConfig.resolveApiBaseUrl();

  if (AppConfig.firebaseConfigured) {
    // google-services.json can auto-init Firebase on Android before Dart runs,
    // so [Firebase.apps] may still look empty while "[DEFAULT]" already exists.
    try {
      await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform,
      );
    } catch (e) {
      final message = e.toString();
      final isDuplicate = (e is FirebaseException && e.code == 'duplicate-app') ||
          message.contains('duplicate-app');
      if (!isDuplicate) rethrow;
    }
  }

  final auth = AuthService();
  final themes = ThemeController();
  await Future.wait([auth.bootstrap(), themes.load()]);
  AppTheme.bind(themes);

  runApp(PulseTrackApp(auth: auth, themes: themes));
}

class PulseTrackApp extends StatelessWidget {
  const PulseTrackApp({super.key, required this.auth, required this.themes});

  final AuthService auth;
  final ThemeController themes;

  @override
  Widget build(BuildContext context) {
    final appRouter = AppRouter(auth);

    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: auth),
        ChangeNotifierProvider.value(value: themes),
        Provider.value(value: appRouter),
      ],
      child: Consumer<ThemeController>(
        builder: (context, themeController, _) {
          // Re-bind on every rebuild so hot reload cannot leave static tokens
          // stuck on Light while ThemeData is Dark/Web.
          AppTheme.bind(themeController);
          final style = themeController.style;
          return MaterialApp.router(
            title: 'Pulse Track',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.build(style),
            routerConfig: appRouter.router,
          );
        },
      ),
    );
  }
}
