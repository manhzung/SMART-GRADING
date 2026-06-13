import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../blocs/auth/auth_bloc.dart';
import '../blocs/exam/exam_bloc.dart';
import '../blocs/class/class_bloc.dart';

class DashboardView extends StatelessWidget {
  const DashboardView({super.key});

  @override
  Widget build(BuildContext context) {
    final authState = context.watch<AuthBloc>().state;
    String teacherName = 'Teacher';
    String schoolName = '';
    if (authState is AuthAuthenticated) {
      teacherName = authState.user.name;
    }

    final classState = context.watch<ClassBloc>().state;
    final examState = context.watch<ExamBloc>().state;

    int classCount = 0;
    int examCount = 0;
    int studentCount = 0;
    int paperCount = 0;

    if (classState is ClassLoaded) {
      classCount = classState.classes.length;
      studentCount = classState.classes.fold<int>(0, (sum, c) => sum + c.studentCount);
    }

    if (examState is ExamLoaded) {
      examCount = examState.exams.length;
      paperCount = examState.exams.fold<int>(0, (sum, e) => sum + e.totalSubmissions);
    }

    final isLoading = (examState is ExamLoading) || (classState is ClassLoading);
    final isLoadingUpcoming = examState is ExamUpcomingLoading;
    final upcomingExams = _buildUpcomingExams(examState);

    return RefreshIndicator(
      onRefresh: () async {
        context.read<ExamBloc>().add(const ExamLoadRequested());
        context.read<ExamBloc>().add(const UpcomingExamsLoadRequested(limit: 5));
        context.read<ClassBloc>().add(const ClassFetchRequested());
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Hi, Prof. $teacherName',
              style: const TextStyle(
                fontSize: 26,
                fontWeight: FontWeight.bold,
                color: Color(0xFF0F172A),
                letterSpacing: -0.5,
              ),
            ),
            if (schoolName.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                schoolName,
                style: const TextStyle(
                  fontSize: 14,
                  color: Color(0xFF64748B),
                  fontWeight: FontWeight.w400,
                ),
              ),
            ],
            const SizedBox(height: 24),

            if (isLoading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.symmetric(vertical: 20),
                  child: CircularProgressIndicator(),
                ),
              ),

            Row(
              children: [
                Expanded(
                  child: StatCard(
                    icon: Icons.school_outlined,
                    title: 'CLASSES',
                    value: classCount.toString(),
                    isLoading: classState is ClassLoading,
                    onTap: () => Navigator.pushNamed(context, '/analytics'),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: StatCard(
                    icon: Icons.assignment_outlined,
                    title: 'EXAMS',
                    value: examCount.toString(),
                    isLoading: examState is ExamLoading,
                    onTap: () => Navigator.pushNamed(context, '/analytics'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: StatCard(
                    icon: Icons.people_outline,
                    title: 'STUDENTS',
                    value: studentCount.toString(),
                    isLoading: classState is ClassLoading,
                    onTap: () => Navigator.pushNamed(context, '/analytics'),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: StatCard(
                    icon: Icons.assignment_turned_in_outlined,
                    title: 'PAPERS',
                    value: paperCount.toString(),
                    extraValue: paperCount > 0 ? 'Graded' : null,
                    extraColor: const Color(0xFF64748B),
                    isLoading: examState is ExamLoading,
                    onTap: () => Navigator.pushNamed(context, '/analytics'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 28),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Upcoming Exams',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0F172A),
                  ),
                ),
                TextButton(
                  onPressed: () {
                    // Navigate to Exams tab with index 1
                    // Parent will handle via callback or state
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Navigate to Exams tab'),
                        duration: Duration(seconds: 1),
                      ),
                    );
                  },
                  style: TextButton.styleFrom(
                    padding: EdgeInsets.zero,
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: const Text(
                    'View all',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            if (isLoadingUpcoming)
              Container(
                width: double.infinity,
                height: 70,
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: const Center(
                  child: SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                ),
              )
            else if (upcomingExams.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 32),
                child: const Column(
                  children: [
                    Icon(Icons.assignment_outlined, size: 40, color: Color(0xFFCBD5E1)),
                    SizedBox(height: 12),
                    Text(
                      'No upcoming exams',
                      style: TextStyle(
                        fontSize: 14,
                        color: Color(0xFF94A3B8),
                      ),
                    ),
                  ],
                ),
              )
            else
              ...upcomingExams,

            const SizedBox(height: 28),

            const Text(
              'Recent Activity',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Color(0xFF0F172A),
              ),
            ),
            const SizedBox(height: 12),

            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  const ActivityItem(
                    icon: Icons.check_circle_outline_rounded,
                    iconColor: Color(0xFF10B981),
                    iconBgColor: Color(0xFFE6F4EA),
                    richTextSpan: TextSpan(
                      text: 'Dashboard loaded with real data',
                      style: TextStyle(color: Color(0xFF0F172A), fontSize: 14),
                    ),
                    time: 'Now',
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 12),
                    child: Divider(color: Color(0xFFE2E8F0), height: 1),
                  ),
                  const ActivityItem(
                    icon: Icons.people_outline_rounded,
                    iconColor: Color(0xFF3B82F6),
                    iconBgColor: Color(0xFFEFF6FF),
                    richTextSpan: TextSpan(
                      text: 'Synced classes and exams from server',
                      style: TextStyle(color: Color(0xFF0F172A), fontSize: 14),
                    ),
                    time: 'Just now',
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: OutlinedButton(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Activity history feature coming soon'),
                            duration: Duration(seconds: 2),
                          ),
                        );
                      },
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFFE2E8F0)),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        backgroundColor: const Color(0xFFF8FAFC),
                      ),
                      child: const Text(
                        'View History',
                        style: TextStyle(
                          color: Color(0xFF0C2B64),
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 60),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildUpcomingExams(ExamState state) {
    // Prefer the dedicated ExamUpcomingLoaded state; fall back to nothing.
    if (state is! ExamUpcomingLoaded) {
      return [];
    }
    final upcoming = state.exams.take(3).toList();
    if (upcoming.isEmpty) return [];

    return upcoming.map((exam) {
      String statusLabel = exam.status.toUpperCase();
      Color bg = const Color(0xFFE2E5FA);
      Color text = const Color(0xFF6366F1);
      if (exam.status == 'published') {
        bg = const Color(0xFF0C2B64);
        text = Colors.white;
      } else if (exam.status == 'in_progress') {
        bg = const Color(0xFFFDECE2);
        text = const Color(0xFFD47C56);
      } else if (exam.status == 'completed') {
        bg = const Color(0xFFE6F4EA);
        text = const Color(0xFF137333);
      }

      String dateText = 'No date';
      if (exam.examDate != null) {
        final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        dateText = '${months[exam.examDate!.month - 1]} ${exam.examDate!.day.toString().padLeft(2, '0')}';
      }

      return Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: UpcomingExamCard(
          title: exam.title,
          subtitle: '${exam.primaryClassName} \u2022 $dateText',
          status: statusLabel,
          statusBgColor: bg,
          statusTextColor: text,
        ),
      );
    }).toList();
  }
}

class StatCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;
  final String? extraValue;
  final Color? extraColor;
  final bool isLoading;
  final VoidCallback? onTap;

  const StatCard({
    super.key,
    required this.icon,
    required this.title,
    required this.value,
    this.extraValue,
    this.extraColor,
    this.isLoading = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    Widget card = Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: const Color(0xFF0F172A), size: 20),
              const SizedBox(width: 8),
              Text(
                title,
                style: const TextStyle(
                  color: Color(0xFF64748B),
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (isLoading)
            const SizedBox(
              height: 28,
              width: 60,
              child: LinearProgressIndicator(
                borderRadius: BorderRadius.all(Radius.circular(4)),
                backgroundColor: Color(0xFFE2E8F0),
                color: Color(0xFF6366F1),
              ),
            )
          else
            Row(
              textBaseline: TextBaseline.alphabetic,
              crossAxisAlignment: CrossAxisAlignment.baseline,
              children: [
                Text(
                  value,
                  style: const TextStyle(
                    color: Color(0xFF0F172A),
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                if (extraValue != null) ...[
                  const SizedBox(width: 6),
                  Text(
                    extraValue!,
                    style: TextStyle(
                      color: extraColor ?? const Color(0xFF64748B),
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ],
            ),
        ],
      ),
    );

    if (onTap != null) {
      return InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: card,
      );
    }
    return card;
  }
}

class UpcomingExamCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final String status;
  final Color statusBgColor;
  final Color statusTextColor;

  const UpcomingExamCard({
    super.key,
    required this.title,
    required this.subtitle,
    required this.status,
    required this.statusBgColor,
    required this.statusTextColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ),
          Container(
            decoration: BoxDecoration(
              color: statusBgColor,
              borderRadius: BorderRadius.circular(16),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            child: Text(
              status,
              style: TextStyle(
                color: statusTextColor,
                fontSize: 11,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.5,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class ActivityItem extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final Color iconBgColor;
  final TextSpan richTextSpan;
  final String time;

  const ActivityItem({
    super.key,
    required this.icon,
    required this.iconColor,
    required this.iconBgColor,
    required this.richTextSpan,
    required this.time,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: iconBgColor,
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: iconColor, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              RichText(text: richTextSpan),
              const SizedBox(height: 4),
              Text(
                time,
                style: const TextStyle(
                  color: Color(0xFF64748B),
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
