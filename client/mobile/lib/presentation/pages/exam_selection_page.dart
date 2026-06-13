import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:smart_grading_mobile/presentation/blocs/exam/exam_bloc.dart';
import 'package:smart_grading_mobile/presentation/pages/student_list_page.dart';

class ExamSelectionPage extends StatelessWidget {
  const ExamSelectionPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF0F172A),
        elevation: 0,
        title: const Text(
          'Select Exam',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
      ),
      body: BlocBuilder<ExamBloc, ExamState>(
        builder: (context, state) {
          if (state is ExamLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is ExamLoaded) {
            if (state.exams.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.assignment_outlined,
                        size: 64, color: Color(0xFFCBD5E1)),
                    const SizedBox(height: 16),
                    const Text(
                      'No exams found',
                      style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF64748B)),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Create an exam first to start scanning',
                      style: TextStyle(color: Color(0xFF94A3B8)),
                    ),
                  ],
                ),
              );
            }

            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: state.exams.length,
              itemBuilder: (context, index) {
                final exam = state.exams[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  child: ListTile(
                    contentPadding: const EdgeInsets.all(16),
                    title: Text(
                      exam.title,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    subtitle: Text(
                      '${exam.numberOfQuestions} questions',
                      style: const TextStyle(color: Color(0xFF64748B)),
                    ),
                    trailing: const Icon(Icons.chevron_right,
                        color: Color(0xFF94A3B8)),
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => StudentListPage(exam: exam),
                        ),
                      );
                    },
                  ),
                );
              },
            );
          }

          if (state is ExamError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline,
                      size: 48, color: Color(0xFFEF4444)),
                  const SizedBox(height: 16),
                  Text('Error: ${state.message}'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      context.read<ExamBloc>().add(const ExamLoadRequested());
                    },
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          // ExamInitial — trigger load
          WidgetsBinding.instance.addPostFrameCallback((_) {
            context.read<ExamBloc>().add(const ExamLoadRequested());
          });
          return const Center(child: CircularProgressIndicator());
        },
      ),
    );
  }
}
