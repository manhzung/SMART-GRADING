/// Configuration parameters for OMR processing, tuned for mobile.
class OMRConfig {
  final bool autoAlign;
  final int processingWidth;
  final int processingHeight;
  final int displayWidth;
  final int displayHeight;
  final int minJump;
  final int minJumpStd;
  final int confidentSurplus;
  final int jumpDelta;
  final int morphThresholdMobile;
  final int globalThreshold;
  final double gamma;
  final int matchCol;
  final int alignStride;
  final int maxSteps;
  final int thickness;
  final bool pageTypeWhite;
  final int showImageLevel;

  const OMRConfig({
    this.autoAlign = true,
    this.processingWidth = 1240,
    this.processingHeight = 1754,
    this.displayWidth = 820,
    this.displayHeight = 1240,
    this.minJump = 20,
    this.minJumpStd = 10,
    this.confidentSurplus = 10,
    this.jumpDelta = 20,
    this.morphThresholdMobile = 40,
    this.globalThreshold = 200,
    this.gamma = 0.4,
    this.matchCol = 3,
    this.alignStride = 3,
    this.maxSteps = 20,
    this.thickness = 3,
    this.pageTypeWhite = true,
    this.showImageLevel = 0,
  });

  int get effectiveGlobalThreshold =>
      pageTypeWhite ? globalThreshold : 100;

  factory OMRConfig.fromJson(Map<String, dynamic> json) {
    final dims = json['dimensions'] as Map<String, dynamic>? ?? {};
    final thresh = json['threshold_params'] as Map<String, dynamic>? ?? {};
    final align = json['alignment_params'] as Map<String, dynamic>? ?? {};
    final outputs = json['outputs'] as Map<String, dynamic>? ?? {};

    final pageType = thresh['PAGE_TYPE_FOR_THRESHOLD']?.toString() ?? 'white';

    return OMRConfig(
      autoAlign: align['auto_align'] as bool? ?? true,
      processingWidth: (dims['processing_width'] as num?)?.toInt() ?? 1240,
      processingHeight: (dims['processing_height'] as num?)?.toInt() ?? 1754,
      displayWidth: (dims['display_width'] as num?)?.toInt() ?? 820,
      displayHeight: (dims['display_height'] as num?)?.toInt() ?? 1240,
      minJump: (thresh['MIN_JUMP'] as num?)?.toInt() ?? 20,
      minJumpStd: (thresh['MIN_GAP'] as num?)?.toInt() ?? 10,
      confidentSurplus: (thresh['CONFIDENT_SURPLUS'] as num?)?.toInt() ?? 10,
      jumpDelta: (thresh['JUMP_DELTA'] as num?)?.toInt() ?? 20,
      morphThresholdMobile: (thresh['MORPH_THRESHOLD_MOBILE'] as num?)?.toInt() ?? 40,
      globalThreshold: (thresh['GLOBAL_PAGE_THRESHOLD'] as num?)?.toInt() ?? 200,
      gamma: (thresh['GAMMA_LOW'] as num?)?.toDouble() ?? 0.4,
      matchCol: (align['match_col'] as num?)?.toInt() ?? 3,
      alignStride: (align['stride'] as num?)?.toInt() ?? 3,
      maxSteps: (align['max_steps'] as num?)?.toInt() ?? 20,
      thickness: (align['thickness'] as num?)?.toInt() ?? 3,
      pageTypeWhite: pageType == 'white',
      showImageLevel: (outputs['show_image_level'] as num?)?.toInt() ?? 0,
    );
  }
}
