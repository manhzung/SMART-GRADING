import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get_it/get_it.dart';
import 'package:smart_grading_mobile/core/network/user_service.dart';
import 'package:smart_grading_mobile/domain/entities/user.entity.dart';
import 'package:smart_grading_mobile/presentation/blocs/omr_scanner/omr_scanner_bloc.dart';

class StudentPickerDialog extends StatefulWidget {
  final String classId;
  final String className;
  final String examId;
  final String examName;
  final Uint8List imageBytes;
  final String? prefillCode;

  const StudentPickerDialog({
    super.key,
    required this.classId,
    required this.className,
    required this.examId,
    required this.examName,
    required this.imageBytes,
    this.prefillCode,
  });

  static Future<void> show({
    required BuildContext context,
    required String classId,
    required String className,
    required String examId,
    required String examName,
    required Uint8List imageBytes,
    String? prefillCode,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => StudentPickerDialog(
        classId: classId,
        className: className,
        examId: examId,
        examName: examName,
        imageBytes: imageBytes,
        prefillCode: prefillCode,
      ),
    );
  }

  @override
  State<StudentPickerDialog> createState() => _StudentPickerDialogState();
}

class _StudentPickerDialogState extends State<StudentPickerDialog> {
  final UserService _userService = GetIt.instance<UserService>();
  final TextEditingController _searchController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  List<ClassStudent> _students = [];
  bool _isLoading = true;
  String? _error;
  String _searchQuery = '';
  bool _isSubmitting = false;
  int? _highlightedIndex;

  @override
  void initState() {
    super.initState();
    if (widget.prefillCode != null) {
      _searchController.text = widget.prefillCode!;
      _searchQuery = widget.prefillCode!;
    }
    _loadStudents();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadStudents() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final result = await _userService.getStudents(
        classId: widget.classId,
        search: _searchQuery.isEmpty ? null : _searchQuery,
      );
      setState(() {
        _students = result.results.map((u) => ClassStudent(
          id: u.id,
          name: u.name,
          email: u.email,
          studentCode: u.studentCode,
          isActive: u.isActive,
          dateOfBirth: u.dateOfBirth,
        )).toList();
        _isLoading = false;
        
        // Auto-highlight if prefillCode matches
        if (widget.prefillCode != null && _students.isNotEmpty) {
          _highlightedIndex = _students.indexWhere(
            (s) => s.studentCode?.toLowerCase() == widget.prefillCode!.toLowerCase(),
          );
          if (_highlightedIndex == -1) _highlightedIndex = null;
        }
      });
    } catch (e) {
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _isLoading = false;
      });
    }
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      // Could implement pagination here
    }
  }

  void _onSearchChanged(String value) {
    _searchQuery = value;
    _highlightedIndex = null;
    _loadStudents();
  }

  Future<void> _onSubmit(ClassStudent student) async {
    if (_isSubmitting) return;
    setState(() => _isSubmitting = true);
    
    // Submit via bloc instead of just popping
    context.read<OMRScannerBloc>().add(OMRScannerConfirmStudent(student));
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.75,
      decoration: const BoxDecoration(
        color: Color(0xFFF8FAFC),
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          _buildHandle(),
          _buildHeader(),
          _buildSearchBar(),
          Expanded(child: _buildBody()),
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

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: const Color(0xFFE8F0FE),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(
              Icons.person_search,
              color: Color(0xFF1A73E8),
              size: 22,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Assign Student',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0F172A),
                  ),
                ),
                Text(
                  widget.className,
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: () => Navigator.of(context).pop(),
            icon: const Icon(Icons.close, color: Color(0xFF94A3B8)),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: TextField(
          controller: _searchController,
          onChanged: _onSearchChanged,
          decoration: const InputDecoration(
            hintText: 'Search by name or student code...',
            hintStyle: TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
            prefixIcon: Icon(Icons.search, color: Color(0xFF64748B)),
            border: InputBorder.none,
            contentPadding: EdgeInsets.symmetric(vertical: 14),
          ),
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Color(0xFFEF4444)),
            const SizedBox(height: 12),
            Text(
              _error!,
              style: const TextStyle(color: Color(0xFF64748B)),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadStudents,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_students.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.people_outline, size: 48, color: Color(0xFFCBD5E1)),
            const SizedBox(height: 12),
            const Text(
              'No students found',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Color(0xFF64748B),
              ),
            ),
            if (_searchQuery.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                'Try a different search term',
                style: TextStyle(color: Colors.black.withValues(alpha: 0.4)),
              ),
            ],
          ],
        ),
      );
    }

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(horizontal: 20),
      itemCount: _students.length,
      itemBuilder: (context, index) {
        final isHighlighted = _highlightedIndex == index;
        return _buildStudentTile(_students[index], isHighlighted: isHighlighted);
      },
    );
  }

  Widget _buildStudentTile(ClassStudent student, {bool isHighlighted = false}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: isHighlighted ? const Color(0xFFEEF2FF) : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isHighlighted ? const Color(0xFF6366F1) : const Color(0xFFE2E8F0),
          width: isHighlighted ? 2 : 1,
        ),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        leading: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: isHighlighted 
                ? const Color(0xFF6366F1).withValues(alpha: 0.1)
                : const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Center(
            child: isHighlighted
                ? const Icon(Icons.auto_awesome, color: Color(0xFF6366F1), size: 20)
                : Text(
                    _getInitials(student.name),
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF475569),
                    ),
                  ),
          ),
        ),
        title: Text(
          student.name,
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 15,
            color: Color(0xFF0F172A),
          ),
        ),
        subtitle: student.studentCode != null
            ? Text(
                student.studentCode!,
                style: const TextStyle(
                  fontSize: 13,
                  color: Color(0xFF64748B),
                ),
              )
            : null,
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (isHighlighted)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF6366F1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text(
                  'DETECTED',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            if (_isSubmitting)
              const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            else
              const Icon(Icons.chevron_right, color: Color(0xFF94A3B8)),
          ],
        ),
        onTap: () => _onSubmit(student),
      ),
    );
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts[0][0].toUpperCase();
    return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
  }
}
