import 'package:flutter/material.dart';
import 'package:smart_grading_mobile/domain/omr/models/omr_template.dart';

/// Chip-based picker for selecting the OMR template used in the Test Lab.
///
/// The Phiếu 30 câu - A4 option is rendered as disabled (greyed out, not
/// tappable) because the factory for that template is not yet implemented.
class TemplatePicker extends StatelessWidget {
  /// Currently selected template. Used to determine which chip is highlighted.
  final OMRTemplate selected;

  /// Invoked with the freshly-built template when the user taps an enabled chip.
  final ValueChanged<OMRTemplate> onChanged;

  const TemplatePicker({
    super.key,
    required this.selected,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final selectedKey = _keyFor(selected);

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      alignment: WrapAlignment.center,
      children: [
        _buildChip(
          label: 'Sample 4',
          keyValue: 'sample4',
          selectedKey: selectedKey,
          factoryBuilder: OMRTemplate.sample4,
          enabled: true,
        ),
        _buildChip(
          label: 'Phiếu 15 câu - A5',
          keyValue: '15q',
          selectedKey: selectedKey,
          factoryBuilder: OMRTemplate.from15Question,
          enabled: true,
        ),
        _buildChip(
          label: 'Phiếu 30 câu - A4',
          keyValue: '30q',
          selectedKey: selectedKey,
          factoryBuilder: null,
          enabled: false,
        ),
      ],
    );
  }

  Widget _buildChip({
    required String label,
    required String keyValue,
    required String selectedKey,
    required OMRTemplate Function()? factoryBuilder,
    required bool enabled,
  }) {
    final isSelected = keyValue == selectedKey;
    final selectedColor = const Color(0xFF6366F1);
    final disabledBg = const Color(0xFFE2E8F0);
    final disabledFg = const Color(0xFF94A3B8);

    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: enabled
          ? (picked) {
              if (picked && factoryBuilder != null) {
                onChanged(factoryBuilder());
              }
            }
          : null,
      selectedColor: selectedColor,
      backgroundColor: enabled ? Colors.white : disabledBg,
      labelStyle: TextStyle(
        color: !enabled
            ? disabledFg
            : (isSelected ? Colors.white : const Color(0xFF0F172A)),
        fontWeight: FontWeight.w600,
      ),
      side: BorderSide(
        color: isSelected ? selectedColor : const Color(0xFFE2E8F0),
        width: 1.5,
      ),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    );
  }

  String _keyFor(OMRTemplate t) {
    switch (t.id) {
      case '15q':
        return '15q';
      case 'sample4':
        return 'sample4';
      default:
        return '';
    }
  }
}
