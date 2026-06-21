enum ImageType { original, preprocessed, annotated }

extension ImageTypeX on ImageType {
  String get wire {
    switch (this) {
      case ImageType.original:
        return 'original';
      case ImageType.preprocessed:
        return 'preprocessed';
      case ImageType.annotated:
        return 'annotated';
    }
  }
}
