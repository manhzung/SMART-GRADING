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
import 'my_scores_page.dart';
import 'my_appeals_page.dart';
import '../widgets/search_sheet.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final getIt = GetIt.instance;
  int _selectedIndex = 0;

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

  void _setTab(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  List<Widget> _buildPages(String role) {
    switch (role) {
      case 'admin':
        return [
          DashboardView(onViewAllExams: () => _setTab(0)),
          const AdminNavView(),
          const SchoolsNavView(),
          const AnalyticsNavView(),
          const ProfileView(),
        ];
      case 'student':
        return [
          DashboardView(onViewAllExams: () => _setTab(0)),
          const MyScoresPage(),
          const MyAppealsPage(),
          const ProfileView(),
        ];
      default: // teacher
        return [
          DashboardView(onViewAllExams: () => _setTab(1)),
          ExamsView(),
          ScanView(),
          ClassesView(),
          ProfileView(),
        ];
    }
  }

  List<BottomNavigationBarItem> _buildNavItems(String role) {
    switch (role) {
      case 'admin':
        return const [
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard_outlined),
            activeIcon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.people_outline),
            activeIcon: Icon(Icons.people),
            label: 'Users',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.school_outlined),
            activeIcon: Icon(Icons.school),
            label: 'Schools',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.bar_chart_outlined),
            activeIcon: Icon(Icons.bar_chart),
            label: 'Analytics',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_outline),
            activeIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ];
      case 'student':
        return const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home_outlined),
            activeIcon: Icon(Icons.home),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.score_outlined),
            activeIcon: Icon(Icons.score),
            label: 'Scores',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.rate_review_outlined),
            activeIcon: Icon(Icons.rate_review),
            label: 'Appeals',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_outline),
            activeIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ];
      default: // teacher
        return const [
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
        ];
    }
  }

  String _getAppBarTitle(int index, String role) {
    switch (role) {
      case 'admin':
        switch (index) {
          case 0: return 'Dashboard';
          case 1: return 'Users';
          case 2: return 'Schools';
          case 3: return 'Analytics';
          case 4: return 'Profile';
          default: return 'Smart Grading';
        }
      case 'student':
        switch (index) {
          case 0: return 'Home';
          case 1: return 'My Scores';
          case 2: return 'My Appeals';
          case 3: return 'Profile';
          default: return 'Smart Grading';
        }
      default: // teacher
        switch (index) {
          case 0: return 'Home';
          case 1: return 'Exams';
          case 2: return 'Grading';
          case 3: return 'Classes';
          case 4: return 'Profile';
          default: return 'Smart Grading';
        }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = context.watch<AuthBloc>().state;
    String role = 'teacher';
    String? avatarUrl;
    if (authState is AuthAuthenticated) {
      role = authState.user.role;
      avatarUrl = authState.user.avatarUrl;
    }

    final pages = _buildPages(role);
    final navItems = _buildNavItems(role);

    if (_selectedIndex >= pages.length) {
      _selectedIndex = 0;
    }

    Widget appBarTitle;
    List<Widget> appBarActions = [];
    final title = _getAppBarTitle(_selectedIndex, role);

    if (role == 'teacher' && _selectedIndex == 1) {
      appBarTitle = Text(
        title,
        style: const TextStyle(
          color: Color(0xFF0F172A),
          fontWeight: FontWeight.bold,
          fontSize: 24,
        ),
      );
      appBarActions = [
        IconButton(
          icon: const Icon(Icons.search, color: Color(0xFF0F172A), size: 26),
          onPressed: () async {
            await SearchSheet.show(context: context, title: 'Exams', hint: 'Search exams...');
            if (!mounted) return;
            setState(() {});
          },
        ),
        IconButton(
          icon: const Icon(Icons.quiz_outlined, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pushNamed(context, '/question-bank'),
        ),
        IconButton(
          icon: const Icon(Icons.notifications_none_outlined, color: Color(0xFF0F172A), size: 26),
          onPressed: () => Navigator.pushNamed(context, '/notifications'),
        ),
        const SizedBox(width: 8),
        _buildAvatar(avatarUrl),
        const SizedBox(width: 16),
      ];
    } else if (role == 'teacher' && _selectedIndex == 3) {
      appBarTitle = const Row(
        children: [
          Icon(Icons.school_outlined, color: Color(0xFF0F172A), size: 28),
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
          icon: const Icon(Icons.search, color: Color(0xFF0F172A), size: 26),
          onPressed: () => SearchSheet.show(context: context, title: 'Classes', hint: 'Search classes...'),
        ),
        const SizedBox(width: 8),
        _buildAvatar(avatarUrl),
        const SizedBox(width: 16),
      ];
    } else {
      appBarTitle = Row(
        children: [
          const Icon(Icons.school_outlined, color: Color(0xFF0F172A), size: 28),
          const SizedBox(width: 8),
          Text(
            title,
            style: const TextStyle(
              color: Color(0xFF0F172A),
              fontWeight: FontWeight.bold,
              fontSize: 20,
            ),
          ),
        ],
      );
      appBarActions = [
        IconButton(
          icon: const Icon(Icons.notifications_none_outlined, color: Color(0xFF0F172A), size: 26),
          onPressed: () => Navigator.pushNamed(context, '/notifications'),
        ),
        const SizedBox(width: 8),
        _buildAvatar(avatarUrl),
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
        child: pages[_selectedIndex],
      ),
      floatingActionButton: _buildFab(role),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: Color(0xFFE2E8F0), width: 1)),
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
          items: navItems,
        ),
      ),
    );
  }

  Widget _buildAvatar(String? avatarUrl) {
    return ClipRRect(
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
          child: const Center(child: Icon(Icons.person, color: Colors.white, size: 20)),
        ),
      ),
    );
  }

  Widget? _buildFab(String role) {
    if (role == 'student') return null;
    if (role == 'admin') {
      if (_selectedIndex == 0) {
        return FloatingActionButton(
          onPressed: () => Navigator.pushNamed(context, '/create-exam'),
          backgroundColor: const Color(0xFF0F172A),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: const Icon(Icons.add, color: Colors.white, size: 28),
        );
      }
      return null;
    }
    // teacher
    if (_selectedIndex == 0 || _selectedIndex == 1) {
      return FloatingActionButton(
        onPressed: () => Navigator.pushNamed(context, '/create-exam'),
        backgroundColor: const Color(0xFF0F172A),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: const Icon(Icons.add, color: Colors.white, size: 28),
      );
    }
    return null;
  }
}

class AdminNavView extends StatelessWidget {
  const AdminNavView({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.admin_panel_settings, size: 64, color: Color(0xFF6366F1)),
          SizedBox(height: 16),
          Text('Admin Navigation', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          SizedBox(height: 8),
          Text('Select a section from the menu above', style: TextStyle(color: Color(0xFF64748B))),
        ],
      ),
    );
  }
}

class SchoolsNavView extends StatelessWidget {
  const SchoolsNavView({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: const Color(0xFF10B981).withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.school, size: 64, color: Color(0xFF10B981)),
          ),
          const SizedBox(height: 16),
          const Text('Schools Management', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          const Text('Manage school institutions', style: TextStyle(color: Color(0xFF64748B))),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () => Navigator.pushNamed(context, '/admin/schools'),
            icon: const Icon(Icons.open_in_new),
            label: const Text('Open Schools Manager'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              foregroundColor: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}

class AnalyticsNavView extends StatelessWidget {
  const AnalyticsNavView({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: const Color(0xFFF59E0B).withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.bar_chart, size: 64, color: Color(0xFFF59E0B)),
          ),
          const SizedBox(height: 16),
          const Text('Analytics', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          const Text('View system statistics and reports', style: TextStyle(color: Color(0xFF64748B))),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () => Navigator.pushNamed(context, '/analytics'),
            icon: const Icon(Icons.open_in_new),
            label: const Text('Open Analytics'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFF59E0B),
              foregroundColor: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}
