import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:smart_grading_mobile/domain/omr/models/omr_template.dart';
import 'package:smart_grading_mobile/presentation/blocs/omr_scanner/omr_scanner_bloc.dart';

class MockConnectivity extends Mock implements Connectivity {}

void main() {
  late MockConnectivity connectivity;
  late OMRScannerBloc bloc;

  setUp(() {
    connectivity = MockConnectivity();
    bloc = OMRScannerBloc(connectivity: connectivity);
  });

  tearDown(() async {
    await bloc.close();
  });

  test('OMRScannerTemplateSet event carries classId and className', () async {
    final template = OMRTemplate.simpleMcq(numQuestions: 1, numOptions: 4);

    bloc.add(OMRScannerTemplateSet(
      templateJson: template.toJson(),
      examId: 'exam-1',
      examName: 'Exam 1',
      classId: 'class-1',
      className: 'Class 1',
    ));

    await expectLater(
      bloc.stream,
      emitsThrough(predicate<OMRScannerState>(
        (state) =>
            state is OMRScannerTemplateReady &&
            state.classId == 'class-1' &&
            state.className == 'Class 1' &&
            state.examId == 'exam-1',
      )),
    );
  });
}
