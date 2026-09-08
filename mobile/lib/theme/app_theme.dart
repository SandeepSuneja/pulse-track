import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'pulse_palette.dart';
import 'theme_controller.dart';

/// Builds [ThemeData] and exposes palette tokens.
///
/// Prefer [context.pulse] in widgets. Static [AppTheme] color getters read from
/// the bound [ThemeController] — call [bind] whenever the controller is used
/// (including on each theme rebuild) so hot reload cannot desync colors.
class AppTheme {
  static ThemeController? _controller;

  static void bind(ThemeController controller) {
    _controller = controller;
  }

  static PulsePalette get _p {
    final bound = _controller;
    if (bound != null) return bound.palette;
    return PulsePalette.light;
  }

  static Color get bg => _p.bg;
  static Color get surface => _p.surface;
  static Color get panel => _p.panel;
  static Color get line => _p.line;
  static Color get text => _p.text;
  static Color get muted => _p.muted;
  static Color get primary => _p.primary;
  static Color get primarySoft => _p.primarySoft;
  static Color get cyan => _p.primary;
  static Color get cyanSoft => _p.primarySoft;
  static Color get softPrimary => _p.softPrimary;
  static Color get scaffoldBg => _p.scaffoldBg;
  static Color get chipBg => _p.chipBg;
  static Color get chartGrid => _p.chartGrid;
  static Color get tooltipBg => _p.tooltipBg;
  static Color get tooltipFg => _p.tooltipFg;
  static Color get onPrimary => _p.onPrimary;
  static Color get lineStrong => _p.lineStrong;
  static bool get isDark => _p.isDark;

  static const radius = 8.0;

  static ThemeData build(AppThemeStyle style) {
    final p = PulsePalette.forStyle(style);
    final brightness =
        style == AppThemeStyle.light ? Brightness.light : Brightness.dark;

    final base = ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: ColorScheme(
        brightness: brightness,
        primary: p.primary,
        onPrimary: p.onPrimary,
        secondary: p.primarySoft,
        onSecondary: p.onPrimary,
        error: p.danger,
        onError: Colors.white,
        surface: p.surface,
        onSurface: p.text,
      ),
      scaffoldBackgroundColor: p.scaffoldBg,
      extensions: <ThemeExtension<dynamic>>[p],
    );

    return base.copyWith(
      appBarTheme: AppBarTheme(
        backgroundColor: p.surface,
        foregroundColor: p.text,
        elevation: 0,
        scrolledUnderElevation: style == AppThemeStyle.web ? 0 : 0.5,
        centerTitle: false,
        systemOverlayStyle: brightness == Brightness.dark
            ? SystemUiOverlayStyle.light
            : SystemUiOverlayStyle.dark,
        titleTextStyle: TextStyle(
          color: p.text,
          fontSize: 20,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.3,
        ),
        iconTheme: IconThemeData(color: p.text),
      ),
      cardTheme: CardThemeData(
        color: p.panel,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: p.line),
        ),
        margin: EdgeInsets.zero,
      ),
      chipTheme: base.chipTheme.copyWith(
        selectedColor: p.softPrimary,
        labelStyle: TextStyle(fontWeight: FontWeight.w600, color: p.text),
        secondaryLabelStyle:
            TextStyle(fontWeight: FontWeight.w600, color: p.muted),
        side: BorderSide(color: p.line),
        backgroundColor: p.chipBg,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: p.surface,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radius),
          borderSide: BorderSide(color: p.line),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radius),
          borderSide: BorderSide(color: p.line),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radius),
          borderSide: BorderSide(color: p.primary, width: 1.5),
        ),
        labelStyle: TextStyle(color: p.muted, fontWeight: FontWeight.w600),
        floatingLabelStyle:
            TextStyle(color: p.muted, fontWeight: FontWeight.w600),
        hintStyle: TextStyle(
          color: p.muted.withValues(alpha: 0.75),
          fontWeight: FontWeight.w400,
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: p.primary,
          foregroundColor: p.onPrimary,
          elevation: 0,
          minimumSize: const Size.fromHeight(48),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radius),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: p.text,
          backgroundColor: p.surface,
          side: BorderSide(color: p.line),
          minimumSize: const Size.fromHeight(48),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radius),
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: p.primary,
          textStyle: const TextStyle(fontWeight: FontWeight.w600),
        ),
      ),
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: p.primary,
        foregroundColor: p.onPrimary,
        elevation: 2,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: p.surface,
        elevation: 0,
        height: 68,
        indicatorColor: p.softPrimary,
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return TextStyle(
            fontSize: 11,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            color: selected ? p.primary : p.muted,
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
            color: selected ? p.primary : p.muted,
            size: 22,
          );
        }),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: style == AppThemeStyle.light ? p.text : p.panel,
        contentTextStyle: TextStyle(
          color: style == AppThemeStyle.light ? Colors.white : p.text,
        ),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
      dividerTheme: DividerThemeData(color: p.line, thickness: 1),
      dialogTheme: DialogThemeData(
        backgroundColor: p.panel,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: p.panel,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
        ),
      ),
      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: p.primary,
        linearTrackColor: p.line,
      ),
      listTileTheme: ListTileThemeData(
        iconColor: p.muted,
        textColor: p.text,
        subtitleTextStyle: TextStyle(color: p.muted, fontSize: 13),
        titleTextStyle: TextStyle(
          color: p.text,
          fontSize: 16,
          fontWeight: FontWeight.w500,
        ),
      ),
      textTheme: base.textTheme.apply(bodyColor: p.text, displayColor: p.text),
      primaryTextTheme:
          base.primaryTextTheme.apply(bodyColor: p.text, displayColor: p.text),
      iconTheme: IconThemeData(color: p.text),
      canvasColor: p.scaffoldBg,
      dividerColor: p.line,
    );
  }

  static ThemeData light() => build(AppThemeStyle.light);
}
