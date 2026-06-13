class UploadSignature {
  final String signature;
  final String apiKey;
  final String cloudName;
  final int timestamp;
  final String folder;
  final String publicId;
  final String uploadUrl;
  final int expiresIn;

  UploadSignature({
    required this.signature,
    required this.apiKey,
    required this.cloudName,
    required this.timestamp,
    required this.folder,
    required this.publicId,
    required this.uploadUrl,
    required this.expiresIn,
  });

  factory UploadSignature.fromJson(Map<String, dynamic> j) => UploadSignature(
        signature: j['signature'] as String,
        apiKey: j['apiKey'] as String,
        cloudName: j['cloudName'] as String,
        timestamp: j['timestamp'] as int,
        folder: j['folder'] as String,
        publicId: j['publicId'] as String,
        uploadUrl: j['uploadUrl'] as String,
        expiresIn: j['expiresIn'] as int,
      );
}
