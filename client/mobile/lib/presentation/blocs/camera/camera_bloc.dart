import 'dart:async';
import 'dart:typed_data';
import 'dart:ui';
import 'package:camera/camera.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:smart_grading_mobile/domain/omr/engine/camera_engine.dart';

part 'camera_event.dart';
part 'camera_state.dart';

class CameraBloc extends Bloc<CameraEvent, CameraBlocState> {
  final CameraEngine _cameraEngine;
  CameraController? _controller;
  List<Offset>? _lastCorners;
  DateTime? _cornerStableSince;
  Timer? _stabilityTimer;
  bool _disposed = false;
  bool _processingFrame = false;
  DateTime? _lastFrameTime;

  static const _stableThresholdMs = 500;
  static const _frameThrottleMs = 500;

  CameraBloc({CameraEngine? cameraEngine})
      : _cameraEngine = cameraEngine ?? CameraEngine(),
        super(CameraInitializing()) {
    on<CameraInitialize>(_onInitialize);
    on<CameraFrameAvailable>(_onFrameAvailable);
    on<CameraCornersDetected>(_onCornersDetected);
    on<CameraCornersLost>(_onCornersLost);
    on<CameraCapture>(_onCapture);
    on<CameraRetake>(_onRetake);
    on<CameraDispose>(_onDispose);
  }

  CameraController? get controller => _controller;

  Future<void> _onInitialize(
    CameraInitialize event,
    Emitter<CameraBlocState> emit,
  ) async {
    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        emit(const CameraError('No cameras available'));
        return;
      }

      final backCamera = cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.back,
        orElse: () => cameras.first,
      );

      _controller = CameraController(
        backCamera,
        ResolutionPreset.high,
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.jpeg,
      );

      await _controller!.initialize();

      if (_disposed) {
        await _controller?.dispose();
        return;
      }

      await _controller!.startImageStream((CameraImage image) async {
        if (_disposed) return;

        try {
          final bytes = await _convertCameraImageToJpeg(image);
          if (bytes != null && !_disposed) {
            add(CameraFrameAvailable(bytes));
          }
        } catch (_) {
          // Silently handle conversion errors
        }
      });

      emit(const CameraReady());
    } catch (e) {
      emit(CameraError('Failed to initialize camera: $e'));
    }
  }

  Future<Uint8List?> _convertCameraImageToJpeg(CameraImage image) async {
    try {
      if (image.format.group == ImageFormatGroup.jpeg) {
        return Uint8List.fromList(image.planes.first.bytes);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<void> _onFrameAvailable(
    CameraFrameAvailable event,
    Emitter<CameraBlocState> emit,
  ) async {
    if (_disposed) return;

    final currentState = state;
    if (currentState is CameraCapturing || currentState is CameraImageReady) {
      return;
    }

    if (_processingFrame) return;

    final now = DateTime.now();
    if (_lastFrameTime != null &&
        now.difference(_lastFrameTime!).inMilliseconds < _frameThrottleMs) {
      return;
    }
    _lastFrameTime = now;

    _processingFrame = true;

    try {
      final corners = await _cameraEngine.detectCorners(event.imageBytes);

      if (corners != null) {
        final isStable = _lastCorners != null && _cornersSimilar(corners, _lastCorners!);
        add(CameraCornersDetected(corners, isStable));
      } else {
        add(CameraCornersLost());
      }
    } catch (_) {
      add(CameraCornersLost());
    } finally {
      _processingFrame = false;
    }
  }

  void _onCornersDetected(
    CameraCornersDetected event,
    Emitter<CameraBlocState> emit,
  ) {
    _lastCorners = event.corners;
    final skewAngle = _calculateSkew(event.corners);

    if (event.isStable) {
      if (_cornerStableSince == null) {
        _cornerStableSince = DateTime.now();
      } else {
        final elapsed = DateTime.now().difference(_cornerStableSince!);
        if (elapsed.inMilliseconds >= _stableThresholdMs) {
          emit(CameraStable(corners: event.corners, skewAngle: skewAngle));
          return;
        }
      }
      emit(CameraCornerDetected(corners: event.corners, skewAngle: skewAngle));
    } else {
      _cornerStableSince = null;
      emit(CameraCornerDetected(corners: event.corners, skewAngle: skewAngle));
    }
  }

  void _onCornersLost(
    CameraCornersLost event,
    Emitter<CameraBlocState> emit,
  ) {
    _lastCorners = null;
    _cornerStableSince = null;
    emit(const CameraReady());
  }

  Future<void> _onCapture(
    CameraCapture event,
    Emitter<CameraBlocState> emit,
  ) async {
    if (_controller == null || !_controller!.value.isInitialized) {
      return;
    }

    emit(CameraCapturing());

    try {
      final file = await _controller!.takePicture();
      final bytes = await file.readAsBytes();

      List<Offset>? corners;
      double skewAngle = 0;

      final currentState = state;
      if (currentState is CameraStable) {
        corners = currentState.corners;
        skewAngle = currentState.skewAngle;
      } else if (currentState is CameraCornerDetected) {
        corners = currentState.corners;
        skewAngle = currentState.skewAngle;
      }

      emit(CameraImageReady(
        imageBytes: bytes,
        corners: corners,
        skewAngle: skewAngle,
      ));
    } catch (e) {
      emit(CameraError('Failed to capture image: $e'));
    }
  }

  void _onRetake(
    CameraRetake event,
    Emitter<CameraBlocState> emit,
  ) {
    emit(const CameraReady());
  }

  Future<void> _onDispose(
    CameraDispose event,
    Emitter<CameraBlocState> emit,
  ) async {
    _disposed = true;
    _stabilityTimer?.cancel();
    _stabilityTimer = null;

    if (_controller != null) {
      try {
        if (_controller!.value.isInitialized) {
          await _controller!.stopImageStream();
        }
        await _controller!.dispose();
      } catch (_) {
        // Ignore disposal errors
      }
      _controller = null;
    }
  }

  bool _cornersSimilar(List<Offset> corners1, List<Offset> corners2) {
    if (corners1.length != corners2.length) return false;
    const threshold = 15.0;
    for (int i = 0; i < corners1.length; i++) {
      final dx = corners1[i].dx - corners2[i].dx;
      final dy = corners1[i].dy - corners2[i].dy;
      final distance = (dx * dx + dy * dy);
      if (distance > threshold * threshold) return false;
    }
    return true;
  }

  double _calculateSkew(List<Offset> corners) {
    if (corners.length < 2) return 0;
    final topLeft = corners[0];
    final topRight = corners.length > 1 ? corners[1] : corners[0];
    final dx = topRight.dx - topLeft.dx;
    final dy = topRight.dy - topLeft.dy;
    if (dx == 0) return 0;
    return (dy / dx) * (180 / 3.14159265359);
  }

  @override
  Future<void> close() {
    _disposed = true;
    _stabilityTimer?.cancel();
    _stabilityTimer = null;

    if (_controller != null && _controller!.value.isInitialized) {
      try {
        _controller!.stopImageStream();
      } catch (_) {}
      _controller!.dispose();
    }
    _controller = null;

    return super.close();
  }
}
