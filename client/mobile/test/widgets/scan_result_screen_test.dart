import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:smart_grading_mobile/repositories/submission_repository.dart';
import 'package:smart_grading_mobile/screens/scanner/scan_result_screen.dart';
import 'package:smart_grading_mobile/services/cloudinary_service.dart';

void main() {
  testWidgets('scan_result_screen renders with required deps', (tester) async {
    final cloudinary = CloudinaryService(baseUrl: 'http://api');
    final repo = SubmissionRepository(baseUrl: 'http://api');

    await tester.pumpWidget(
      MaterialApp(
        home: ScanResultScreen(
          examId: 'e1',
          cloudinary: cloudinary,
          submissionRepo: repo,
          capturedFile: null,
        ),
      ),
    );

    expect(find.byType(ScanResultScreen), findsOneWidget);
    expect(find.text('No captured image'), findsOneWidget);
    expect(find.text('Submit'), findsOneWidget);
  });
}
