import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/domain/omr/models/omr_template.dart';
import 'package:smart_grading_mobile/presentation/widgets/template_picker.dart';

void main() {
  testWidgets('renders 3 chips: Sample 4, Phiếu 15 câu - A5, Phiếu 30 câu - A4',
      (tester) async {
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: TemplatePicker(
          selected: OMRTemplate.sample4(),
          onChanged: (_) {},
        ),
      ),
    ));

    expect(find.text('Sample 4'), findsOneWidget);
    expect(find.text('Phiếu 15 câu - A5'), findsOneWidget);
    expect(find.text('Phiếu 30 câu - A4'), findsOneWidget);
  });

  testWidgets('emits from15Question template when 15q chip tapped', (tester) async {
    OMRTemplate? captured;
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: TemplatePicker(
          selected: OMRTemplate.sample4(),
          onChanged: (t) => captured = t,
        ),
      ),
    ));

    await tester.tap(find.text('Phiếu 15 câu - A5'));
    await tester.pump();

    expect(captured, isNotNull);
    expect(captured!.id, '15q');
    expect(captured!.pageWidth, 1748);
  });

  testWidgets('emits sample4 template when Sample 4 chip tapped', (tester) async {
    OMRTemplate? captured;
    final t15 = OMRTemplate.from15Question();
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: TemplatePicker(
          selected: t15,
          onChanged: (t) => captured = t,
        ),
      ),
    ));

    await tester.tap(find.text('Sample 4'));
    await tester.pump();

    expect(captured, isNotNull);
    expect(captured!.id, isNot('15q'));
    expect(captured!.name, 'Sample 4 - 11 MCQ');
  });

  testWidgets('30q chip is disabled (no callback fired)', (tester) async {
    var fired = false;
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: TemplatePicker(
          selected: OMRTemplate.sample4(),
          onChanged: (_) => fired = true,
        ),
      ),
    ));

    await tester.tap(find.text('Phiếu 30 câu - A4'));
    await tester.pump();

    expect(fired, isFalse);
  });
}
