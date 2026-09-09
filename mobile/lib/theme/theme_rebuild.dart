import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'theme_controller.dart';

extension ThemeRebuild on BuildContext {
  /// Subscribe this [Element] to appearance changes.
  ///
  /// Static [AppTheme] color getters do not register a [Theme] dependency, so
  /// widgets that only read those tokens will not rebuild when the user picks
  /// a new style unless something else marks them dirty. Call this at the
  /// start of each screen [build] so Light / Dark / Web apply immediately.
  void watchAppearance() => watch<ThemeController>();
}
