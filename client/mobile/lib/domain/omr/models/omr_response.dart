/// Result of reading bubbles from a scanned OMR sheet.
class OMRResponse {
  /// fieldLabel -> marked value (e.g., 'q1' -> 'A', 'roll1' -> '12345')
  final Map<String, String> answers;

  /// True if multiple bubbles were marked in any single row
  final bool multiMarked;

  /// True if at least one question strip had no bubble marked
  final bool hasUnmarked;

  const OMRResponse({
    required this.answers,
    this.multiMarked = false,
    this.hasUnmarked = false,
  });

  OMRResponse copyWith({
    Map<String, String>? answers,
    bool? multiMarked,
    bool? hasUnmarked,
  }) {
    return OMRResponse(
      answers: answers ?? Map.from(this.answers),
      multiMarked: multiMarked ?? this.multiMarked,
      hasUnmarked: hasUnmarked ?? this.hasUnmarked,
    );
  }
}

/// Represents intensity data for a single bubble.
class BubbleIntensity {
  final String bubbleValue;
  final double meanIntensity;
  final bool isMarked;

  const BubbleIntensity({
    required this.bubbleValue,
    required this.meanIntensity,
    required this.isMarked,
  });
}

/// Extended response with per-bubble intensity data (for debugging).
class OMRResponseDebug extends OMRResponse {
  /// fieldLabel -> list of (bubbleValue, meanIntensity) for each bubble in the strip
  final Map<String, List<BubbleIntensity>> bubbleIntensities;

  /// Global threshold computed
  final double globalThreshold;

  /// Per-strip local thresholds
  final Map<String, double> localThresholds;

  const OMRResponseDebug({
    required super.answers,
    super.multiMarked,
    super.hasUnmarked,
    required this.bubbleIntensities,
    required this.globalThreshold,
    required this.localThresholds,
  });
}
