import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:mocktail/mocktail.dart';

import 'package:smart_grading_mobile/models/image_type.dart';
import 'package:smart_grading_mobile/services/cloudinary_service.dart';

class _MockClient extends Mock implements http.Client {}

void main() {
  late _MockClient httpClient;
  late CloudinaryService service;

  setUp(() {
    httpClient = _MockClient();
    service = CloudinaryService(
      baseUrl: 'http://api',
      httpClient: httpClient,
    );
    service.setAuthToken('test-token');
  });

  test('getUploadSignature returns parsed model', () async {
    when(() => httpClient.get(any(), headers: any(named: 'headers')))
        .thenAnswer(
      (_) async => http.Response(
        '{"signature":"s","apiKey":"k","cloudName":"c",'
        '"timestamp":1,"folder":"f","publicId":"p",'
        '"uploadUrl":"u","expiresIn":300}',
        200,
      ),
    );

    final sig = await service.getUploadSignature(
      examId: 'e1',
      type: ImageType.original,
    );

    expect(sig.cloudName, 'c');
    expect(sig.folder, 'f');
    expect(sig.apiKey, 'k');
    expect(sig.uploadUrl, 'u');
    verify(
      () => httpClient.get(
        Uri.parse(
          'http://api/api/v1/upload/signature'
          '?examId=e1&type=original',
        ),
        headers: any(named: 'headers'),
      ),
    ).called(1);
  });

  test('getUploadSignature throws on non-200', () async {
    when(() => httpClient.get(any(), headers: any(named: 'headers')))
        .thenAnswer((_) async => http.Response('unauthorized', 401));

    expect(
      () => service.getUploadSignature(
        examId: 'e1',
        type: ImageType.original,
      ),
      throwsA(isA<CloudinaryException>()),
    );
  });
}
