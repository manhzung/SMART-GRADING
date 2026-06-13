import 'package:flutter/material.dart';
import 'package:smart_grading_mobile/domain/entities/exam.entity.dart';
import 'package:smart_grading_mobile/presentation/pages/student_list_page.dart';

class ClassSelectionPage extends StatelessWidget {
  final Exam exam;

  const ClassSelectionPage({super.key, required this.exam});

  List<ExamClass> _getUniqueClasses() {
    final byId = <String, ExamClass>{};
    for (final c in exam.classIds) {
      byId[c.id] = c;
    }
    if (exam.primaryClassId != null) {
      byId[exam.primaryClassId!.id] = exam.primaryClassId!;
    }
    return byId.values.toList();
  }

  @override
  Widget build(BuildContext context) {
    final classes = _getUniqueClasses();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF0F172A),
        elevation: 0,
        title: Text(
          'Choose class for ${exam.title}',
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ),
      body: classes.isEmpty
          ? const _EmptyState()
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: classes.length,
              itemBuilder: (context, index) {
                final cls = classes[index];
                final isPrimary = exam.primaryClassId?.id == cls.id;
                return _ClassCard(
                  cls: cls,
                  isPrimary: isPrimary,
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => StudentListPage(
                          exam: exam,
                          classId: cls.id,
                          className: cls.name,
                        ),
                      ),
                    );
                  },
                );
              },
            ),
    );
  }
}

class _ClassCard extends StatelessWidget {
  final ExamClass cls;
  final bool isPrimary;
  final VoidCallback onTap;

  const _ClassCard({
    required this.cls,
    required this.isPrimary,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: const Color(0xFFE8F0FE),
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Icon(Icons.class_, color: Color(0xFF1A73E8)),
        ),
        title: Row(
          children: [
            Expanded(
              child: Text(
                cls.name,
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
            if (isPrimary)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text(
                  'Primary',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFFD97706),
                  ),
                ),
              ),
          ],
        ),
        subtitle: Text(
          cls.studentCount != null
              ? '${cls.code} • ${cls.studentCount} students'
              : cls.code,
          style: const TextStyle(color: Color(0xFF64748B)),
        ),
        trailing: const Icon(Icons.chevron_right, color: Color(0xFF94A3B8)),
        onTap: onTap,
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: const [
            Icon(Icons.class_outlined, size: 64, color: Color(0xFFCBD5E1)),
            SizedBox(height: 16),
            Text(
              'No classes assigned to this exam',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Color(0xFF64748B),
              ),
            ),
            SizedBox(height: 8),
            Text(
              'Please assign a class to this exam first',
              style: TextStyle(color: Color(0xFF94A3B8)),
            ),
          ],
        ),
      ),
    );
  }
}
