import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:mocktail/mocktail.dart';

import 'package:smart_grading_mobile/repositories/submission_repository.dart';

class _MockClient extends Mock implements http.Client {}

void main() {
  late _MockClient httpClient;
  late SubmissionRepository repo;

  setUp(() {
    httpClient = _MockClient();
    repo = SubmissionRepository(
      baseUrl: 'http://api',
      httpClient: httpClient,
    );
    repo.setAuthToken('test-token');
  });

  test('scan posts originalUrl and returns submission', () async {
    when(
      () => httpClient.post(
        any(),
        headers: any(named: 'headers'),
        body: any(named: 'body'),
      ),
    ).thenAnswer(
      (_) async => http.Response(
        '{"_id":"s1","status":"scanning"}',
        202,
      ),
    );

    final result = await repo.scan(
      examId: 'e1',
      originalUrl: 'https://res.cloudinary.com/c/x.jpg',
      originalPublicId: 'p',
      imageMeta: {
        'width': 800,
        'height': 600,
        'bytes': 100,
        'format': 'jpg',
      },
      deviceInfo: {'platform': 'android'},
    );

    expect(result['_id'], 's1');
    expect(result['status'], 'scanning');
    verify(
      () => httpClient.post(
        Uri.parse('http://api/api/v1/submissions/scan'),
        headers: any(named: 'headers'),
        body: any(named: 'body'),
      ),
    ).called(1);
  });

  test('scan throws on non-2xx', () async {
    when(
      () => httpClient.post(
        any(),
        headers: any(named: 'headers'),
        body: any(named: 'body'),
      ),
    ).thenAnswer((_) async => http.Response('bad request', 400));

    expect(
      () => repo.scan(
        examId: 'e1',
        originalUrl: 'u',
        originalPublicId: 'p',
        imageMeta: const {},
        deviceInfo: const {},
      ),
      throwsA(isA<Exception>()),
    );
  });
}
