import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../blocs/admin/admin_bloc.dart';

class AdminDashboardPage extends StatefulWidget {
  const AdminDashboardPage({super.key});

  @override
  State<AdminDashboardPage> createState() => _AdminDashboardPageState();
}

class _AdminDashboardPageState extends State<AdminDashboardPage> {
  @override
  void initState() {
    super.initState();
    context.read<AdminBloc>().add(AdminLoadUsersRequested());
    context.read<AdminBloc>().add(AdminLoadSchoolsRequested());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Admin Dashboard',
          style: TextStyle(
            color: Color(0xFF0F172A),
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        centerTitle: true,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1.0),
          child: Container(color: const Color(0xFFE2E8F0), height: 1.0),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'System Management',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Manage users, schools, and system settings.',
                style: TextStyle(fontSize: 14, color: Color(0xFF64748B)),
              ),
              const SizedBox(height: 24),
              BlocBuilder<AdminBloc, AdminState>(
                builder: (context, state) {
                  int userCount = 0;
                  if (state is AdminUsersLoaded) userCount = state.users.length;
                  return Row(
                    children: [
                      Expanded(
                        child: _buildStatCard(
                          context,
                          'Users',
                          Icons.people,
                          '$userCount',
                          const Color(0xFF6366F1),
                          () => Navigator.pushNamed(context, '/admin/users'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: BlocBuilder<AdminBloc, AdminState>(
                          builder: (context, schoolState) {
                            int schoolCount = 0;
                            if (schoolState is AdminSchoolsLoaded) schoolCount = schoolState.schools.length;
                            return _buildStatCard(
                              context,
                              'Schools',
                              Icons.school,
                              '$schoolCount',
                              const Color(0xFF10B981),
                              () => Navigator.pushNamed(context, '/admin/schools'),
                            );
                          },
                        ),
                      ),
                    ],
                  );
                },
              ),
              const SizedBox(height: 24),
              const Text(
                'Management',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 12),
              _buildMenuCard(
                context,
                icon: Icons.people,
                iconColor: const Color(0xFF6366F1),
                title: 'Manage Users',
                subtitle: 'Add, edit, or delete user accounts',
                onTap: () => Navigator.pushNamed(context, '/admin/users'),
              ),
              const SizedBox(height: 12),
              _buildMenuCard(
                context,
                icon: Icons.school,
                iconColor: const Color(0xFF10B981),
                title: 'Manage Schools',
                subtitle: 'Add, edit, or delete schools',
                onTap: () => Navigator.pushNamed(context, '/admin/schools'),
              ),
              const SizedBox(height: 12),
              _buildMenuCard(
                context,
                icon: Icons.bar_chart,
                iconColor: const Color(0xFFF59E0B),
                title: 'Analytics',
                subtitle: 'View system statistics',
                onTap: () => Navigator.pushNamed(context, '/analytics'),
              ),
              const SizedBox(height: 12),
              _buildMenuCard(
                context,
                icon: Icons.settings,
                iconColor: const Color(0xFF64748B),
                title: 'Settings',
                subtitle: 'System settings',
                onTap: () => Navigator.pushNamed(context, '/settings'),
              ),
              const SizedBox(height: 30),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatCard(
    BuildContext context,
    String title,
    IconData icon,
    String value,
    Color color,
    VoidCallback onTap,
  ) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(height: 12),
            Text(
              value,
              style: const TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: Color(0xFF0F172A),
              ),
            ),
            Text(
              title,
              style: const TextStyle(
                fontSize: 14,
                color: Color(0xFF64748B),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuCard(
    BuildContext context, {
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: iconColor, size: 24),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: Color(0xFF94A3B8)),
          ],
        ),
      ),
    );
  }
}
