import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'pulse_palette.dart';

class ThemeController extends ChangeNotifier {
  ThemeController();

  static const _prefsKey = 'theme_style';

  AppThemeStyle _style = AppThemeStyle.light;
  AppThemeStyle get style => _style;

  PulsePalette get palette => PulsePalette.forStyle(_style);

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    _style = AppThemeStyleX.fromStorage(prefs.getString(_prefsKey));
    notifyListeners();
  }

  Future<void> setStyle(AppThemeStyle style) async {
    if (_style == style) return;
    _style = style;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefsKey, style.storageValue);
  }
}
