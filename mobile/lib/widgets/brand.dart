import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme/pulse_palette.dart';

/// Crisp vector pulse mark (matches brand PNG geometry).
class PulseLogoPainter extends CustomPainter {
  const PulseLogoPainter({this.fill, this.stroke});

  final Color? fill;
  final Color? stroke;

  static const _fill = Color(0xFFC6D9F7);
  static const _stroke = Color(0xFF2B6BE7);

  @override
  void paint(Canvas canvas, Size size) {
    final side = math.min(size.width, size.height);
    final origin = Offset((size.width - side) / 2, (size.height - side) / 2);
    final cx = origin.dx + side / 2;
    final cy = origin.dy + side / 2;
    final r = side / 2;

    canvas.drawCircle(
      Offset(cx, cy),
      r,
      Paint()
        ..color = fill ?? _fill
        ..isAntiAlias = true
        ..filterQuality = FilterQuality.high,
    );

    final y = origin.dy + side * 0.52;
    final path = Path()
      ..moveTo(origin.dx + side * 0.14, y)
      ..lineTo(origin.dx + side * 0.30, y)
      ..lineTo(origin.dx + side * 0.35, origin.dy + side * 0.42)
      ..lineTo(origin.dx + side * 0.40, y)
      ..lineTo(origin.dx + side * 0.455, origin.dy + side * 0.68)
      ..lineTo(origin.dx + side * 0.52, origin.dy + side * 0.24)
      ..lineTo(origin.dx + side * 0.585, origin.dy + side * 0.68)
      ..lineTo(origin.dx + side * 0.64, y)
      ..lineTo(origin.dx + side * 0.86, y);

    final strokeW = (side * 0.078).clamp(1.5, 14.0);
    canvas.drawPath(
      path,
      Paint()
        ..color = stroke ?? _stroke
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeW
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..isAntiAlias = true
        ..filterQuality = FilterQuality.high,
    );
  }

  @override
  bool shouldRepaint(covariant PulseLogoPainter oldDelegate) =>
      oldDelegate.fill != fill || oldDelegate.stroke != stroke;
}

/// Pulse Track circular pulse-wave mark — vector first for crisp edges at any size.
class BrandLogo extends StatelessWidget {
  const BrandLogo({super.key, this.height = 48});

  final double height;

  @override
  Widget build(BuildContext context) {
    final p = context.pulse;
    final stroke = p.style == AppThemeStyle.web ? p.primary : const Color(0xFF2B6BE7);
    final fill = p.isDark
        ? p.softPrimary
        : const Color(0xFFC6D9F7);
    return SizedBox(
      height: height,
      width: height,
      child: CustomPaint(
        painter: PulseLogoPainter(fill: fill, stroke: stroke),
        child: const SizedBox.expand(),
      ),
    );
  }
}

class BrandWordmark extends StatelessWidget {
  const BrandWordmark({super.key, this.fontSize = 22});

  final double fontSize;

  @override
  Widget build(BuildContext context) {
    final p = context.pulse;
    return Text(
      'Pulse Track',
      style: TextStyle(
        color: p.primary,
        fontSize: fontSize,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.4,
      ),
    );
  }
}

/// Compact header used on authenticated screens.
class BrandHeader extends StatelessWidget {
  const BrandHeader({super.key, this.title});

  final String? title;

  @override
  Widget build(BuildContext context) {
    final p = context.pulse;
    return Row(
      children: [
        const BrandLogo(height: 28),
        const SizedBox(width: 10),
        Flexible(
          child: Text(
            title ?? 'Pulse Track',
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: p.text,
              fontWeight: FontWeight.w700,
              fontSize: 18,
            ),
          ),
        ),
      ],
    );
  }
}

class GoogleMark extends StatelessWidget {
  const GoogleMark({super.key, this.size = 20});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      'assets/images/google_g.png',
      width: size,
      height: size,
      fit: BoxFit.contain,
      filterQuality: FilterQuality.high,
      errorBuilder: (context, error, stackTrace) => Text(
        'G',
        style: TextStyle(
          fontSize: size * 0.85,
          fontWeight: FontWeight.w800,
          color: const Color(0xFF4285F4),
        ),
      ),
    );
  }
}

/// App bar title with Pulse Track mark + page name.
class BrandedAppBarTitle extends StatelessWidget {
  const BrandedAppBarTitle(this.title, {super.key});

  final String title;

  @override
  Widget build(BuildContext context) {
    final p = context.pulse;
    return Row(
      children: [
        const BrandLogo(height: 28),
        const SizedBox(width: 10),
        Flexible(
          child: Text(
            title,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: p.text,
              fontWeight: FontWeight.w700,
              fontSize: 18,
            ),
          ),
        ),
      ],
    );
  }
}
