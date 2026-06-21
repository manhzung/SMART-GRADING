import 'dart:io';

import 'package:flutter/material.dart';

import '../../repositories/submission_repository.dart';
import '../../services/cloudinary_service.dart';

class ScanResultScreen extends StatefulWidget {
  final String examId;
  final CloudinaryService cloudinary;
  final SubmissionRepository submissionRepo;
  final File? capturedFile;

  const ScanResultScreen({
    super.key,
    required this.examId,
    required this.cloudinary,
    required this.submissionRepo,
    this.capturedFile,
  });

  @override
  State<ScanResultScreen> createState() => _ScanResultScreenState();
}

class _ScanResultScreenState extends State<ScanResultScreen> {
  File? _capturedImage;
  bool _isSubmitting = false;
  double _uploadProgress = 0;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _capturedImage = widget.capturedFile;
  }

  Future<void> _handleSubmit() async {
    if (_capturedImage == null) return;
    setState(() {
      _isSubmitting = true;
      _uploadProgress = 0;
      _errorMessage = null;
    });
    try {
      final result = await widget.cloudinary.captureAndUpload(
        examId: widget.examId,
        file: _capturedImage!,
        onProgress: (p) => setState(() => _uploadProgress = p),
      );
      final submission = await widget.submissionRepo.scan(
        examId: widget.examId,
        originalUrl: result.secureUrl,
        originalPublicId: result.publicId,
        imageMeta: {
          'width': result.width,
          'height': result.height,
          'bytes': result.bytes,
          'format': result.format,
        },
        deviceInfo: {'platform': Platform.operatingSystem},
      );
      if (!mounted) return;
      Navigator.pushReplacementNamed(
        context,
        '/submission-detail',
        arguments: submission,
      );
    } catch (e) {
      _showError(e.toString());
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  void _showError(String message) {
    if (!mounted) return;
    setState(() => _errorMessage = message);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Scan Result')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: _capturedImage == null
                  ? const Center(child: Text('No captured image'))
                  : Image.file(_capturedImage!, fit: BoxFit.contain),
            ),
            if (_errorMessage != null) ...[
              const SizedBox(height: 8),
              Text(
                _errorMessage!,
                style: const TextStyle(color: Colors.red),
              ),
            ],
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _isSubmitting ? null : _handleSubmit,
              child: const Text('Submit'),
            ),
            if (_isSubmitting) ...[
              const SizedBox(height: 8),
              LinearProgressIndicator(
                value: _uploadProgress > 0 ? _uploadProgress : null,
              ),
              const SizedBox(height: 4),
              Text('${(_uploadProgress * 100).toStringAsFixed(0)}%'),
            ],
          ],
        ),
      ),
    );
  }
}
