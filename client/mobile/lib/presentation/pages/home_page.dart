import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get_it/get_it.dart';
import '../../core/network/omr_submission_sync_service.dart';
import '../blocs/auth/auth_bloc.dart';
import '../blocs/exam/exam_bloc.dart';
import '../blocs/submission/submission_bloc.dart';
import '../blocs/class/class_bloc.dart';

import 'dashboard_view.dart';
import 'exams_view.dart';
import 'scan_view.dart';
import 'classes_view.dart';
import 'profile_view.dart';
import '../widgets/quick_create_exam_sheet.dart';
import '../widgets/search_sheet.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final getIt = GetIt.instance;
  int _selectedIndex = 0;

  final List<Widget> _pages = const [
    DashboardView(),
    ExamsView(),
    ScanView(),
    ClassesView(),
    ProfileView(),
  ];

  @override
  void initState() {
    super.initState();
    context.read<ExamBloc>().add(const ExamLoadRequested());
    context.read<ExamBloc>().add(const UpcomingExamsLoadRequested(limit: 5));
    context.read<ClassBloc>().add(const ClassFetchRequested());
    context.read<SubmissionBloc>().add(const SubmissionLoadRequested());
    _syncPendingSubmissions();
  }

  Future<void> _syncPendingSubmissions() async {
    try {
      final syncService = getIt<OMRSubmissionSyncService>();
      final synced = await syncService.syncPendingSubmissions();
      if (synced > 0 && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Da dong bo $synced bai cham offline'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (_) {
      // Silence sync errors on startup
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = context.watch<AuthBloc>().state;
    String? avatarUrl;
    if (authState is AuthAuthenticated) {
      avatarUrl = authState.user.avatarUrl;
    }

    Widget appBarTitle;
    List<Widget> appBarActions = [];

    if (_selectedIndex == 1) {
      appBarTitle = const Text(
        'Exams',
        style: TextStyle(
          color: Color(0xFF0F172A),
          fontWeight: FontWeight.bold,
          fontSize: 24,
        ),
      );
      appBarActions = [
        IconButton(
          icon: const Icon(
            Icons.search,
            color: Color(0xFF0F172A),
            size: 26,
          ),
            onPressed: () async {
              await SearchSheet.show(
                context: context,
                title: 'Exams',
                hint: 'Search exams...',
              );
              if (!mounted) return;
              setState(() {
                _selectedIndex = 1;
              });
            },
        ),
        IconButton(
          icon: const Icon(Icons.quiz_outlined, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pushNamed(context, '/question-bank'),
        ),
        IconButton(
          icon: const Icon(
            Icons.notifications_none_outlined,
            color: Color(0xFF0F172A),
            size: 26,
          ),
          onPressed: () => Navigator.pushNamed(context, '/notifications'),
        ),
        const SizedBox(width: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(20),
          child: Image.network(
            avatarUrl ?? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=60',
            width: 36,
            height: 36,
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) => Container(
              width: 36,
              height: 36,
              color: const Color(0xFF0F172A),
              child: const Center(
                child: Icon(Icons.person, color: Colors.white, size: 20),
              ),
            ),
          ),
        ),
        const SizedBox(width: 16),
      ];
    } else if (_selectedIndex == 3) {
      appBarTitle = const Row(
        children: [
          Icon(
            Icons.school_outlined,
            color: Color(0xFF0F172A),
            size: 28,
          ),
          SizedBox(width: 8),
          Text(
            'Smart Grading',
            style: TextStyle(
              color: Color(0xFF0F172A),
              fontWeight: FontWeight.bold,
              fontSize: 20,
            ),
          ),
        ],
      );
      appBarActions = [
        IconButton(
          icon: const Icon(
            Icons.search,
            color: Color(0xFF0F172A),
            size: 26,
          ),
          onPressed: () => SearchSheet.show(
            context: context,
            title: 'Classes',
            hint: 'Search classes...',
          ),
        ),
        const SizedBox(width: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(20),
          child: Image.network(
            avatarUrl ?? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=60',
            width: 36,
            height: 36,
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) => Container(
              width: 36,
              height: 36,
              color: const Color(0xFF0F172A),
              child: const Center(
                child: Icon(Icons.person, color: Colors.white, size: 20),
              ),
            ),
          ),
        ),
        const SizedBox(width: 16),
      ];
    } else {
      appBarTitle = const Row(
        children: [
          Icon(
            Icons.school_outlined,
            color: Color(0xFF0F172A),
            size: 28,
          ),
          SizedBox(width: 8),
          Text(
            'Smart Grading',
            style: TextStyle(
              color: Color(0xFF0F172A),
              fontWeight: FontWeight.bold,
              fontSize: 20,
            ),
          ),
        ],
      );
      appBarActions = [
        IconButton(
          icon: const Icon(
            Icons.notifications_none_outlined,
            color: Color(0xFF0F172A),
            size: 26,
          ),
          onPressed: () => Navigator.pushNamed(context, '/notifications'),
        ),
        const SizedBox(width: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(20),
          child: Image.network(
            avatarUrl ?? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=60',
            width: 36,
            height: 36,
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) => Container(
              width: 36,
              height: 36,
              color: const Color(0xFF0F172A),
              child: const Center(
                child: Icon(Icons.person, color: Colors.white, size: 20),
              ),
            ),
          ),
        ),
        const SizedBox(width: 16),
      ];
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF8FAFC),
        elevation: 0,
        scrolledUnderElevation: 0,
        automaticallyImplyLeading: false,
        title: appBarTitle,
        actions: appBarActions,
      ),
      body: SafeArea(
        child: _pages[_selectedIndex],
      ),
      floatingActionButton: (_selectedIndex == 0 || _selectedIndex == 1)
          ? FloatingActionButton(
              onPressed: () {
                if (_selectedIndex == 0) {
                  QuickCreateExamSheet.show(context);
                } else {
                  QuickCreateExamSheet.show(context);
                }
              },
              backgroundColor: const Color(0xFF0F172A),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(Icons.add, color: Colors.white, size: 28),
            )
          : null,
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(
            top: BorderSide(color: Color(0xFFE2E8F0), width: 1),
          ),
        ),
        child: BottomNavigationBar(
          backgroundColor: Colors.white,
          elevation: 0,
          selectedItemColor: const Color(0xFF0F172A),
          unselectedItemColor: const Color(0xFF64748B),
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
          unselectedLabelStyle: const TextStyle(fontSize: 11),
          type: BottomNavigationBarType.fixed,
          currentIndex: _selectedIndex,
          onTap: (index) {
            setState(() {
              _selectedIndex = index;
            });
          },
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.home_outlined),
              activeIcon: Icon(Icons.home),
              label: 'Home',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.description_outlined),
              activeIcon: Icon(Icons.description),
              label: 'Exams',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.fact_check_outlined),
              activeIcon: Icon(Icons.fact_check),
              label: 'Grading',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.people_outline),
              activeIcon: Icon(Icons.people),
              label: 'Classes',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.person_outline),
              activeIcon: Icon(Icons.person),
              label: 'Profile',
            ),
          ],
        ),
      ),
    );
  }
}
