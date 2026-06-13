/// Represents a single bubble (answer choice) on the OMR sheet.
class Bubble {
  final int x;
  final int y;
  final String fieldLabel;
  final String fieldValue;

  const Bubble({
    required this.x,
    required this.y,
    required this.fieldLabel,
    required this.fieldValue,
  });

  @override
  String toString() =>
      'Bubble(x: $x, y: $y, label: $fieldLabel, value: $fieldValue)';

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Bubble &&
          runtimeType == other.runtimeType &&
          x == other.x &&
          y == other.y &&
          fieldLabel == other.fieldLabel &&
          fieldValue == other.fieldValue;

  @override
  int get hashCode => Object.hash(x, y, fieldLabel, fieldValue);
}
