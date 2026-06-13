import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/presentation/pages/omr_test_lab_page.dart';

void main() {
  testWidgets('shows capture buttons initially', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: OMRTestLabPage()));
    await tester.pumpAndSettle();

    expect(find.text('OMR Test Lab'), findsOneWidget);
    expect(find.text('Camera'), findsOneWidget);
    expect(find.text('Gallery'), findsOneWidget);
  });

  testWidgets('shows template info', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: OMRTestLabPage()));
    await tester.pumpAndSettle();

    expect(find.text('11 Questions | 4 Options'), findsOneWidget);
  });
}
