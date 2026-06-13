part of 'camera_bloc.dart';

abstract class CameraBlocState extends Equatable {
  const CameraBlocState();

  @override
  List<Object?> get props => [];
}

class CameraInitializing extends CameraBlocState {}

class CameraReady extends CameraBlocState {
  final double brightness;

  const CameraReady({this.brightness = 0.5});

  @override
  List<Object?> get props => [brightness];
}

class CameraCornerDetected extends CameraBlocState {
  final List<Offset> corners;
  final double skewAngle;

  const CameraCornerDetected({
    required this.corners,
    required this.skewAngle,
  });

  @override
  List<Object?> get props => [corners, skewAngle];
}

class CameraStable extends CameraBlocState {
  final List<Offset> corners;
  final double skewAngle;

  const CameraStable({
    required this.corners,
    required this.skewAngle,
  });

  @override
  List<Object?> get props => [corners, skewAngle];
}

class CameraCapturing extends CameraBlocState {}

class CameraImageReady extends CameraBlocState {
  final Uint8List imageBytes;
  final List<Offset>? corners;
  final double skewAngle;

  const CameraImageReady({
    required this.imageBytes,
    this.corners,
    this.skewAngle = 0,
  });

  @override
  List<Object?> get props => [imageBytes, corners, skewAngle];
}

class CameraError extends CameraBlocState {
  final String message;

  const CameraError(this.message);

  @override
  List<Object?> get props => [message];
}
