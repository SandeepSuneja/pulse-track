import 'package:flutter/material.dart';

/// Product theme styles (not Flutter ThemeMode).
enum AppThemeStyle { light, dark, web }

extension AppThemeStyleX on AppThemeStyle {
  String get label {
    switch (this) {
      case AppThemeStyle.light:
        return 'Light';
      case AppThemeStyle.dark:
        return 'Dark';
      case AppThemeStyle.web:
        return 'Web';
    }
  }

  String get description {
    switch (this) {
      case AppThemeStyle.light:
        return 'Clean white with corporate blue';
      case AppThemeStyle.dark:
        return 'Black surfaces with soft blue accents';
      case AppThemeStyle.web:
        return 'Navy canvas with cyan — matches the web app';
    }
  }

  String get storageValue => name;

  static AppThemeStyle fromStorage(String? value) {
    return AppThemeStyle.values.firstWhere(
      (s) => s.name == value,
      orElse: () => AppThemeStyle.light,
    );
  }
}

/// Design tokens carried on [ThemeData] via [ThemeExtension].
@immutable
class PulsePalette extends ThemeExtension<PulsePalette> {
  const PulsePalette({
    required this.style,
    required this.bg,
    required this.scaffoldBg,
    required this.surface,
    required this.panel,
    required this.text,
    required this.muted,
    required this.primary,
    required this.primarySoft,
    required this.onPrimary,
    required this.line,
    required this.lineStrong,
    required this.softPrimary,
    required this.chipBg,
    required this.chartGrid,
    required this.tooltipBg,
    required this.tooltipFg,
    required this.success,
    required this.warning,
    required this.danger,
  });

  final AppThemeStyle style;
  final Color bg;
  final Color scaffoldBg;
  final Color surface;
  final Color panel;
  final Color text;
  final Color muted;
  final Color primary;
  final Color primarySoft;
  final Color onPrimary;
  final Color line;
  final Color lineStrong;
  final Color softPrimary;
  final Color chipBg;
  final Color chartGrid;
  final Color tooltipBg;
  final Color tooltipFg;
  final Color success;
  final Color warning;
  final Color danger;

  bool get isDark => style != AppThemeStyle.light;

  static const light = PulsePalette(
    style: AppThemeStyle.light,
    bg: Color(0xFFFFFFFF),
    scaffoldBg: Color(0xFFF8FAFC),
    surface: Color(0xFFFFFFFF),
    panel: Color(0xFFFFFFFF),
    text: Color(0xFF111827),
    muted: Color(0xFF6B7280),
    primary: Color(0xFF2563EB),
    primarySoft: Color(0xFF1D4ED8),
    onPrimary: Color(0xFFFFFFFF),
    line: Color(0xFFD1D5DB),
    lineStrong: Color(0xFF9CA3AF),
    softPrimary: Color(0xFFE8F0FE),
    chipBg: Color(0xFFF3F4F6),
    chartGrid: Color(0xFFF3F4F6),
    tooltipBg: Color(0xFF111827),
    tooltipFg: Color(0xFFFFFFFF),
    success: Color(0xFF059669),
    warning: Color(0xFFD97706),
    danger: Color(0xFFE11D48),
  );

  static const dark = PulsePalette(
    style: AppThemeStyle.dark,
    bg: Color(0xFF000000),
    scaffoldBg: Color(0xFF000000),
    surface: Color(0xFF121212),
    panel: Color(0xFF1A1A1A),
    text: Color(0xFFF5F5F5),
    muted: Color(0xFFA3A3A3),
    primary: Color(0xFF3B82F6),
    primarySoft: Color(0xFF2563EB),
    onPrimary: Color(0xFFFFFFFF),
    line: Color(0xFF2A2A2A),
    lineStrong: Color(0xFF404040),
    softPrimary: Color(0xFF1E3A5F),
    chipBg: Color(0xFF262626),
    chartGrid: Color(0xFF262626),
    tooltipBg: Color(0xFFF5F5F5),
    tooltipFg: Color(0xFF111827),
    success: Color(0xFF34D399),
    warning: Color(0xFFFBBF24),
    danger: Color(0xFFFB7185),
  );

  /// Matches the web app navy + cyan look.
  static const web = PulsePalette(
    style: AppThemeStyle.web,
    bg: Color(0xFF060B14),
    scaffoldBg: Color(0xFF060B14),
    surface: Color(0xFF0D1624),
    panel: Color(0xFF121C2E),
    text: Color(0xFFE8F1FF),
    muted: Color(0xFF8BA3C7),
    primary: Color(0xFF22D3EE),
    primarySoft: Color(0xFF0891B2),
    onPrimary: Color(0xFF041018),
    line: Color(0x14E8F1FF),
    lineStrong: Color(0x24E8F1FF),
    softPrimary: Color(0x2422D3EE),
    chipBg: Color(0xFF0A1220),
    chartGrid: Color(0x14E8F1FF),
    tooltipBg: Color(0xFF0A1220),
    tooltipFg: Color(0xFFE8F1FF),
    success: Color(0xFF34D399),
    warning: Color(0xFFFBBF24),
    danger: Color(0xFFFB7185),
  );

  static PulsePalette forStyle(AppThemeStyle style) {
    switch (style) {
      case AppThemeStyle.light:
        return light;
      case AppThemeStyle.dark:
        return dark;
      case AppThemeStyle.web:
        return web;
    }
  }

  @override
  PulsePalette copyWith({
    AppThemeStyle? style,
    Color? bg,
    Color? scaffoldBg,
    Color? surface,
    Color? panel,
    Color? text,
    Color? muted,
    Color? primary,
    Color? primarySoft,
    Color? onPrimary,
    Color? line,
    Color? lineStrong,
    Color? softPrimary,
    Color? chipBg,
    Color? chartGrid,
    Color? tooltipBg,
    Color? tooltipFg,
    Color? success,
    Color? warning,
    Color? danger,
  }) {
    return PulsePalette(
      style: style ?? this.style,
      bg: bg ?? this.bg,
      scaffoldBg: scaffoldBg ?? this.scaffoldBg,
      surface: surface ?? this.surface,
      panel: panel ?? this.panel,
      text: text ?? this.text,
      muted: muted ?? this.muted,
      primary: primary ?? this.primary,
      primarySoft: primarySoft ?? this.primarySoft,
      onPrimary: onPrimary ?? this.onPrimary,
      line: line ?? this.line,
      lineStrong: lineStrong ?? this.lineStrong,
      softPrimary: softPrimary ?? this.softPrimary,
      chipBg: chipBg ?? this.chipBg,
      chartGrid: chartGrid ?? this.chartGrid,
      tooltipBg: tooltipBg ?? this.tooltipBg,
      tooltipFg: tooltipFg ?? this.tooltipFg,
      success: success ?? this.success,
      warning: warning ?? this.warning,
      danger: danger ?? this.danger,
    );
  }

  @override
  PulsePalette lerp(ThemeExtension<PulsePalette>? other, double t) {
    if (other is! PulsePalette) return this;
    if (t < 0.5) return this;
    return other;
  }
}

extension PulseThemeContext on BuildContext {
  PulsePalette get pulse =>
      Theme.of(this).extension<PulsePalette>() ?? PulsePalette.light;
}
