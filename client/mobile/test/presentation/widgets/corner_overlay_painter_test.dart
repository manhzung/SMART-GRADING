import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/presentation/widgets/corner_overlay_painter.dart';

void main() {
  testWidgets('renders with null corners without crash', (tester) async {
    final key = UniqueKey();
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: CustomPaint(
            key: key,
            size: const Size(600, 900),
            painter: CornerOverlayPainter(
              corners: null,
              isStable: false,
            ),
          ),
        ),
      ),
    );

    expect(find.byKey(key), findsOneWidget);
  });

  testWidgets('renders with corners', (tester) async {
    final key = UniqueKey();
    final corners = [
      const Offset(100, 200),
      const Offset(500, 200),
      const Offset(500, 700),
      const Offset(100, 700),
    ];

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: CustomPaint(
            key: key,
            size: const Size(600, 900),
            painter: CornerOverlayPainter(
              corners: corners,
              isStable: true,
              skewAngle: 2.5,
            ),
          ),
        ),
      ),
    );

    expect(find.byKey(key), findsOneWidget);
  });
}
