import 'package:flutter/material.dart';

class SearchSheet extends StatefulWidget {
  final String title;
  final String hint;
  final List<String> suggestions;

  const SearchSheet({
    super.key,
    required this.title,
    required this.hint,
    this.suggestions = const [],
  });

  static Future<void> show({
    required BuildContext context,
    required String title,
    required String hint,
    List<String> suggestions = const [],
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => SearchSheet(
        title: title,
        hint: hint,
        suggestions: suggestions,
      ),
    );
  }

  @override
  State<SearchSheet> createState() => _SearchSheetState();
}

class _SearchSheetState extends State<SearchSheet> {
  final TextEditingController _controller = TextEditingController();
  final FocusNode _focusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _focusNode.requestFocus();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottomPadding = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: Color(0xFFF8FAFC),
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          _buildHandle(),
          _buildSearchBar(bottomPadding),
          Expanded(child: _buildSuggestions()),
        ],
      ),
    );
  }

  Widget _buildHandle() {
    return Container(
      margin: const EdgeInsets.only(top: 12),
      width: 40,
      height: 4,
      decoration: BoxDecoration(
        color: const Color(0xFFCBD5E1),
        borderRadius: BorderRadius.circular(2),
      ),
    );
  }

  Widget _buildSearchBar(double bottomPadding) {
    return Container(
      padding: EdgeInsets.fromLTRB(16, 16, 16, 8 + bottomPadding),
      child: Row(
        children: [
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: TextField(
                controller: _controller,
                focusNode: _focusNode,
                onSubmitted: (_) {
                  Navigator.of(context).pop(_controller.text.trim());
                },
                decoration: InputDecoration(
                  hintText: widget.hint,
                  hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
                  prefixIcon: const Icon(Icons.search, color: Color(0xFF64748B)),
                  suffixIcon: _controller.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear, color: Color(0xFF94A3B8)),
                          onPressed: () {
                            _controller.clear();
                            setState(() {});
                          },
                        )
                      : null,
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(vertical: 14),
                ),
                onChanged: (_) => setState(() {}),
              ),
            ),
          ),
          const SizedBox(width: 8),
          TextButton(
            onPressed: () => Navigator.of(context).pop(_controller.text.trim()),
            child: const Text(
              'Search',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSuggestions() {
    final query = _controller.text.toLowerCase();
    final filtered = widget.suggestions
        .where((s) => query.isEmpty || s.toLowerCase().contains(query))
        .toList();

    if (widget.suggestions.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.search, size: 48, color: Color(0xFFCBD5E1)),
            const SizedBox(height: 12),
            Text(
              query.isEmpty
                  ? 'Type to search ${widget.title.toLowerCase()}'
                  : 'No results for "$query"',
              style: const TextStyle(color: Color(0xFF94A3B8)),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: filtered.length,
      itemBuilder: (context, index) {
        return ListTile(
          leading: const Icon(Icons.history, color: Color(0xFF94A3B8)),
          title: Text(filtered[index]),
          onTap: () => Navigator.of(context).pop(filtered[index]),
        );
      },
    );
  }
}
