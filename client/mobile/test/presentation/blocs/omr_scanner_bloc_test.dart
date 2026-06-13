import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:smart_grading_mobile/domain/omr/engine/omr_engine.dart';
import 'package:smart_grading_mobile/domain/omr/models/omr_template.dart';
import 'package:smart_grading_mobile/domain/omr/models/evaluation_config.dart';
import 'package:smart_grading_mobile/presentation/blocs/omr_scanner/omr_scanner_bloc.dart';

class MockOMREngine extends Mock implements OMREngine {}

class MockConnectivity extends Mock implements Connectivity {}

void main() {
  late MockOMREngine engine;
  late MockConnectivity connectivity;
  late OMRScannerBloc bloc;

  setUp(() {
    engine = MockOMREngine();
    connectivity = MockConnectivity();
    bloc = OMRScannerBloc(engine: engine, connectivity: connectivity);
  });

  tearDown(() async {
    await bloc.close();
  });

  test('OMRScannerTemplateSet event carries classId and className', () async {
    final template = OMRTemplate.simpleMcq(numQuestions: 1, numOptions: 4);
    final evalConfig = EvaluationConfig.simple(
      questionAnswers: {'q1': 'A'},
      correct: 1.0,
      incorrect: 0.0,
      unmarked: 0.0,
    );

    bloc.add(OMRScannerTemplateSet(
      template: template,
      evaluationConfig: evalConfig,
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
