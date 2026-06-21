class UploadResult {
  final String publicId;
  final String url;
  final String secureUrl;
  final int width;
  final int height;
  final int bytes;
  final String format;

  UploadResult({
    required this.publicId,
    required this.url,
    required this.secureUrl,
    required this.width,
    required this.height,
    required this.bytes,
    required this.format,
  });

  factory UploadResult.fromCloudinaryJson(Map<String, dynamic> j) =>
      UploadResult(
        publicId: j['public_id'] as String,
        url: j['url'] as String,
        secureUrl: j['secure_url'] as String,
        width: (j['width'] as num).toInt(),
        height: (j['height'] as num).toInt(),
        bytes: (j['bytes'] as num).toInt(),
        format: j['format'] as String,
      );
}
