part of 'camera_bloc.dart';

abstract class CameraEvent extends Equatable {
  const CameraEvent();

  @override
  List<Object?> get props => [];
}

class CameraInitialize extends CameraEvent {}

class CameraFrameAvailable extends CameraEvent {
  final Uint8List imageBytes;

  const CameraFrameAvailable(this.imageBytes);

  @override
  List<Object?> get props => [imageBytes];
}

class CameraCornersDetected extends CameraEvent {
  final List<Offset> corners;
  final bool isStable;

  const CameraCornersDetected(this.corners, this.isStable);

  @override
  List<Object?> get props => [corners, isStable];
}

class CameraCornersLost extends CameraEvent {}

class CameraCapture extends CameraEvent {}

class CameraRetake extends CameraEvent {}

class CameraDispose extends CameraEvent {}
