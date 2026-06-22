# Mobile Missing Pages & Navigation Implementation Plan

**Goal:** Identify all missing screens/routes in the Flutter mobile app compared to the React web app, and create detailed implementation plans for each.

**Architecture:** Mobile app uses Navigator 1.0 (routes defined in `main.dart`) with BLoC state management. Missing pages will be implemented following existing patterns.

**Tech Stack:** Flutter, BLoC pattern (`flutter_bloc`), Navigator 1.0 routing, existing API services.

---

## Current State Summary

| Area | Web Has | Mobile Has | Status |
|------|---------|-----------|--------|
| **Auth Flow** | 6 pages | 6 pages | ✅ Complete |
| **Admin Section** | 3 pages (dashboard, schools, users) | 0 pages | ❌ Missing |
| **Student Views** | MyScores, MyAppeals | None | ❌ Missing |
| **Profile** | ProfilePage (full) | ProfileView (partial) | ⚠️ Incomplete |
| **AI Features** | AITutor (chat), Reports | AI Tutor, AI Report (basic) | ⚠️ Incomplete |
| **Navigation** | Role-based sidebar | Single bottom nav | ❌ Missing |
| **Submission Detail** | Full page with images | Basic page | ⚠️ Incomplete |
| **Email Pending** | Dedicated page | None | ❌ Missing |

---

## Part 1: Missing Pages to Create

### Task 1: Admin Dashboard Page

**Files:**
- Create: `client/mobile/lib/presentation/pages/admin/admin_dashboard_page.dart`
- Modify: `client/mobile/lib/main.dart` (add route)
- Modify: `client/mobile/lib/presentation/pages/home_page.dart` (add admin nav item)
- Test: `client/mobile/test/presentation/pages/admin_dashboard_page_test.dart`

**Files to reference:**
- Web: `client/web/src/pages/admin/AdminDashboard.tsx` (design reference)
- Mobile existing: `client/mobile/lib/presentation/pages/analytics_page.dart` (layout pattern)

- [ ] **Step 1: Write the failing test**

```dart
// client/mobile/test/presentation/pages/admin/admin_dashboard_page_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mocktail/mocktail.dart';
import 'package:smart_grading/presentation/pages/admin/admin_dashboard_page.dart';
import 'package:smart_grading/presentation/blocs/school/school_bloc.dart';
import 'package:smart_grading/presentation/blocs/admin/admin_bloc.dart';

class MockSchoolBloc extends Mock implements SchoolBloc {}
class MockAdminBloc extends Mock implements AdminBloc {}

void main() {
  late MockSchoolBloc mockSchoolBloc;
  late MockAdminBloc mockAdminBloc;

  setUp(() {
    mockSchoolBloc = MockSchoolBloc();
    mockAdminBloc = MockAdminBloc();
    when(() => mockSchoolBloc.state).returns(SchoolInitial());
    when(() => mockAdminBloc.state).returnValue(AdminInitial());
  });

  testWidgets('AdminDashboardPage renders admin title', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: MultiBlocProvider(
          providers: [
            BlocProvider.value(value: mockSchoolBloc),
            BlocProvider.value(value: mockAdminBloc),
          ],
          child: const AdminDashboardPage(),
        ),
      ),
    );
    expect(find.text('Admin Dashboard'), findsOneWidget);
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client/mobile && flutter test test/presentation/pages/admin/admin_dashboard_page_test.dart`
Expected: FAIL - file does not exist

- [ ] **Step 3: Create directory and implement page**

```dart
// client/mobile/lib/presentation/pages/admin/admin_dashboard_page.dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:smart_grading/presentation/blocs/school/school_bloc.dart';
import 'package:smart_grading/presentation/blocs/admin/admin_bloc.dart';

class AdminDashboardPage extends StatelessWidget {
  const AdminDashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin Dashboard'),
        backgroundColor: Theme.of(context).colorScheme.primary,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildStatCard(context, 'Schools', Icons.school, Colors.blue),
            const SizedBox(height: 12),
            _buildStatCard(context, 'Users', Icons.people, Colors.green),
            const SizedBox(height: 12),
            _buildStatCard(context, 'Classes', Icons.class_, Colors.orange),
            const SizedBox(height: 24),
            _buildActionSection(context),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(BuildContext context, String title, IconData icon, Color color) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
              child: Icon(icon, color: color, size: 28),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: Theme.of(context).textTheme.titleMedium),
                  Text('0 total', style: Theme.of(context).textTheme.bodySmall),
                ],
              ),
            ),
            Icon(Icons.chevron_right, color: Colors.grey[400]),
          ],
        ),
      ),
    );
  }

  Widget _buildActionSection(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Quick Actions', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 12),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            _buildActionChip(context, 'Manage Schools', Icons.school, () => Navigator.pushNamed(context, '/admin/schools')),
            _buildActionChip(context, 'Manage Users', Icons.people, () => Navigator.pushNamed(context, '/admin/users')),
          ],
        ),
      ],
    );
  }

  Widget _buildActionChip(BuildContext context, String label, IconData icon, VoidCallback onTap) {
    return ActionChip(
      avatar: Icon(icon, size: 18),
      label: Text(label),
      onPressed: onTap,
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd client/mobile && flutter test test/presentation/pages/admin/admin_dashboard_page_test.dart`
Expected: PASS

- [ ] **Step 5: Add route to main.dart**

In `client/mobile/lib/main.dart`, add after the existing routes:

```dart
'/admin': (context) => const AdminDashboardPage(),
'/admin/schools': (context) => const SchoolsManagementPage(),
'/admin/users': (context) => const UsersManagementPage(),
```

- [ ] **Step 6: Commit**

```bash
git add client/mobile/lib/presentation/pages/admin/admin_dashboard_page.dart
git add client/mobile/test/presentation/pages/admin/admin_dashboard_page_test.dart
git commit -m "feat(mobile): add admin dashboard page"
```

---

### Task 2: Schools Management Page

**Files:**
- Create: `client/mobile/lib/presentation/pages/admin/schools_management_page.dart`
- Create: `client/mobile/lib/presentation/blocs/school/school_bloc.dart` (if not exists)
- Create: `client/mobile/lib/presentation/blocs/school/school_event.dart`
- Create: `client/mobile/lib/presentation/blocs/school/school_state.dart`
- Modify: `client/mobile/lib/main.dart`
- Test: `client/mobile/test/presentation/pages/schools_management_page_test.dart`

**Reference:**
- Web: `client/web/src/pages/admin/SchoolsPage.tsx` (design reference)

- [ ] **Step 1: Write the failing test**

```dart
// client/mobile/test/presentation/pages/schools_management_page_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mocktail/mocktail.dart';
import 'package:smart_grading/presentation/pages/admin/schools_management_page.dart';
import 'package:smart_grading/presentation/blocs/school/school_bloc.dart';

class MockSchoolBloc extends Mock implements SchoolBloc {}

void main() {
  late MockSchoolBloc mockSchoolBloc;
  setUp(() {
    mockSchoolBloc = MockSchoolBloc();
    when(() => mockSchoolBloc.state).returnValue(SchoolInitial());
  });
  testWidgets('SchoolsManagementPage renders schools list', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: BlocProvider.value(
          value: mockSchoolBloc,
          child: const SchoolsManagementPage(),
        ),
      ),
    );
    expect(find.text('Schools'), findsOneWidget);
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client/mobile && flutter test test/presentation/pages/schools_management_page_test.dart`
Expected: FAIL

- [ ] **Step 3: Implement SchoolsManagementPage**

```dart
// client/mobile/lib/presentation/pages/admin/schools_management_page.dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:smart_grading/presentation/blocs/school/school_bloc.dart';
import 'package:smart_grading/presentation/blocs/school/school_event.dart';
import 'package:smart_grading/presentation/blocs/school/school_state.dart';
import 'package:smart_grading/core/network/school_service.dart';

class SchoolsManagementPage extends StatelessWidget {
  const SchoolsManagementPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Schools'), backgroundColor: Theme.of(context).colorScheme.primary),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddSchoolDialog(context),
        child: const Icon(Icons.add),
      ),
      body: BlocBuilder<SchoolBloc, SchoolState>(
        builder: (context, state) {
          if (state is SchoolLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is SchoolLoaded) {
            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: state.schools.length,
              itemBuilder: (context, index) {
                final school = state.schools[index];
                return Card(
                  child: ListTile(
                    leading: const CircleAvatar(child: Icon(Icons.school)),
                    title: Text(school.name),
                    subtitle: Text(school.address ?? ''),
                    trailing: PopupMenuButton(
                      itemBuilder: (context) => [
                        const PopupMenuItem(value: 'edit', child: Text('Edit')),
                        const PopupMenuItem(value: 'delete', child: Text('Delete')),
                      ],
                      onSelected: (value) {
                        if (value == 'edit') _showEditSchoolDialog(context, school);
                        if (value == 'delete') _deleteSchool(context, school.id);
                      },
                    ),
                  ),
                );
              },
            );
          }
          if (state is SchoolError) {
            return Center(child: Text('Error: ${state.message}'));
          }
          return const Center(child: Text('No schools found'));
        },
      ),
    );
  }

  void _showAddSchoolDialog(BuildContext context) {
    final nameController = TextEditingController();
    final addressController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add School'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: nameController, decoration: const InputDecoration(labelText: 'School Name')),
            const SizedBox(height: 8),
            TextField(controller: addressController, decoration: const InputDecoration(labelText: 'Address')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              context.read<SchoolBloc>().add(AddSchool(nameController.text, addressController.text));
              Navigator.pop(ctx);
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  void _showEditSchoolDialog(BuildContext context, dynamic school) {
    final nameController = TextEditingController(text: school.name);
    final addressController = TextEditingController(text: school.address ?? '');
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Edit School'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: nameController, decoration: const InputDecoration(labelText: 'School Name')),
            const SizedBox(height: 8),
            TextField(controller: addressController, decoration: const InputDecoration(labelText: 'Address')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              context.read<SchoolBloc>().add(UpdateSchool(school.id, nameController.text, addressController.text));
              Navigator.pop(ctx);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _deleteSchool(BuildContext context, String schoolId) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete School'),
        content: const Text('Are you sure you want to delete this school?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              context.read<SchoolBloc>().add(DeleteSchool(schoolId));
              Navigator.pop(ctx);
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd client/mobile && flutter test test/presentation/pages/schools_management_page_test.dart`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/mobile/lib/presentation/pages/admin/schools_management_page.dart
git add client/mobile/test/presentation/pages/schools_management_page_test.dart
git commit -m "feat(mobile): add schools management page"
```

---

### Task 3: Users Management Page

**Files:**
- Create: `client/mobile/lib/presentation/pages/admin/users_management_page.dart`
- Modify: `client/mobile/lib/main.dart`
- Test: `client/mobile/test/presentation/pages/users_management_page_test.dart`

**Reference:**
- Web: `client/web/src/pages/admin/UsersPage.tsx`

- [ ] **Step 1: Write the failing test**

```dart
// client/mobile/test/presentation/pages/users_management_page_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mocktail/mocktail.dart';
import 'package:smart_grading/presentation/pages/admin/users_management_page.dart';
import 'package:smart_grading/presentation/blocs/admin/admin_bloc.dart';

class MockAdminBloc extends Mock implements AdminBloc {}
class FakeAdminEvent extends Fake implements AdminEvent {}

void main() {
  late MockAdminBloc mockAdminBloc;
  setUpAll(() { registerFallbackValue(FakeAdminEvent()); });
  setUp(() {
    mockAdminBloc = MockAdminBloc();
    when(() => mockAdminBloc.state).returnValue(AdminInitial());
  });
  testWidgets('UsersManagementPage renders users title', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: BlocProvider.value(
          value: mockAdminBloc,
          child: const UsersManagementPage(),
        ),
      ),
    );
    expect(find.text('Users'), findsOneWidget);
  });
}
```

- [ ] **Step 2: Run test to verify it fails**
Expected: FAIL

- [ ] **Step 3: Implement UsersManagementPage**

```dart
// client/mobile/lib/presentation/pages/admin/users_management_page.dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:smart_grading/presentation/blocs/admin/admin_bloc.dart';
import 'package:smart_grading/presentation/blocs/admin/admin_event.dart';
import 'package:smart_grading/presentation/blocs/admin/admin_state.dart';

class UsersManagementPage extends StatefulWidget {
  const UsersManagementPage({super.key});

  @override
  State<UsersManagementPage> createState() => _UsersManagementPageState();
}

class _UsersManagementPageState extends State<UsersManagementPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    context.read<AdminBloc>().add(LoadUsers());
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Users'),
        backgroundColor: Theme.of(context).colorScheme.primary,
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'All'),
            Tab(text: 'Teachers'),
            Tab(text: 'Students'),
          ],
        ),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Search users...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onChanged: (value) => setState(() => _searchQuery = value),
            ),
          ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildUserList(null),
                _buildUserList('teacher'),
                _buildUserList('student'),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddUserDialog(context),
        child: const Icon(Icons.person_add),
      ),
    );
  }

  Widget _buildUserList(String? filterRole) {
    return BlocBuilder<AdminBloc, AdminState>(
      builder: (context, state) {
        if (state is AdminLoading) return const Center(child: CircularProgressIndicator());
        if (state is AdminLoaded) {
          final users = state.users.where((u) {
            final matchesRole = filterRole == null || u.role == filterRole;
            final matchesSearch = _searchQuery.isEmpty ||
                u.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
                u.email.toLowerCase().contains(_searchQuery.toLowerCase());
            return matchesRole && matchesSearch;
          }).toList();

          if (users.isEmpty) return const Center(child: Text('No users found'));
          return ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: users.length,
            itemBuilder: (context, index) {
              final user = users[index];
              return Card(
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: _getRoleColor(user.role),
                    child: Text(user.name.isNotEmpty ? user.name[0].toUpperCase() : '?'),
                  ),
                  title: Text(user.name),
                  subtitle: Text('${user.email} • ${user.role}'),
                  trailing: PopupMenuButton(
                    itemBuilder: (context) => [
                      const PopupMenuItem(value: 'edit', child: Text('Edit')),
                      const PopupMenuItem(value: 'reset', child: Text('Reset Password')),
                      const PopupMenuItem(value: 'delete', child: Text('Delete')),
                    ],
                    onSelected: (value) {
                      if (value == 'edit') _showEditUserDialog(context, user);
                      if (value == 'delete') _deleteUser(context, user.id);
                    },
                  ),
                ),
              );
            },
          );
        }
        if (state is AdminError) return Center(child: Text('Error: ${state.message}'));
        return const Center(child: Text('Loading users...'));
      },
    );
  }

  Color _getRoleColor(String role) {
    switch (role) {
      case 'admin': return Colors.red;
      case 'teacher': return Colors.blue;
      case 'student': return Colors.green;
      default: return Colors.grey;
    }
  }

  void _showAddUserDialog(BuildContext context) {
    final nameController = TextEditingController();
    final emailController = TextEditingController();
    String selectedRole = 'student';
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Add User'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: nameController, decoration: const InputDecoration(labelText: 'Full Name')),
              const SizedBox(height: 8),
              TextField(controller: emailController, decoration: const InputDecoration(labelText: 'Email')),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                value: selectedRole,
                decoration: const InputDecoration(labelText: 'Role'),
                items: const [
                  DropdownMenuItem(value: 'admin', child: Text('Admin')),
                  DropdownMenuItem(value: 'teacher', child: Text('Teacher')),
                  DropdownMenuItem(value: 'student', child: Text('Student')),
                ],
                onChanged: (value) => setDialogState(() => selectedRole = value!),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () {
                context.read<AdminBloc>().add(AddUser(nameController.text, emailController.text, selectedRole));
                Navigator.pop(ctx);
              },
              child: const Text('Add'),
            ),
          ],
        ),
      ),
    );
  }

  void _showEditUserDialog(BuildContext context, dynamic user) {
    final nameController = TextEditingController(text: user.name);
    String selectedRole = user.role;
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Edit User'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: nameController, decoration: const InputDecoration(labelText: 'Full Name')),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                value: selectedRole,
                decoration: const InputDecoration(labelText: 'Role'),
                items: const [
                  DropdownMenuItem(value: 'admin', child: Text('Admin')),
                  DropdownMenuItem(value: 'teacher', child: Text('Teacher')),
                  DropdownMenuItem(value: 'student', child: Text('Student')),
                ],
                onChanged: (value) => setDialogState(() => selectedRole = value!),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () {
                context.read<AdminBloc>().add(UpdateUser(user.id, nameController.text, selectedRole));
                Navigator.pop(ctx);
              },
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
  }

  void _deleteUser(BuildContext context, String userId) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete User'),
        content: const Text('Are you sure? This action cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              context.read<AdminBloc>().add(DeleteUser(userId));
              Navigator.pop(ctx);
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/mobile/lib/presentation/pages/admin/users_management_page.dart
git add client/mobile/test/presentation/pages/users_management_page_test.dart
git commit -m "feat(mobile): add users management page"
```

---

### Task 4: My Scores Page (Student Role)

**Files:**
- Create: `client/mobile/lib/presentation/pages/my_scores_page.dart`
- Modify: `client/mobile/lib/main.dart`
- Modify: `client/mobile/lib/presentation/pages/home_page.dart` (add student nav)
- Test: `client/mobile/test/presentation/pages/my_scores_page_test.dart`

**Reference:**
- Web: `client/web/src/pages/MyScoresPage.tsx`

- [ ] **Step 1: Write the failing test**

```dart
// client/mobile/test/presentation/pages/my_scores_page_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading/presentation/pages/my_scores_page.dart';

void main() {
  testWidgets('MyScoresPage renders scores title', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: MyScoresPage()));
    expect(find.text('My Scores'), findsOneWidget);
  });
}
```

- [ ] **Step 2: Run test to verify it fails**
Expected: FAIL

- [ ] **Step 3: Implement MyScoresPage**

```dart
// client/mobile/lib/presentation/pages/my_scores_page.dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:smart_grading/presentation/blocs/submission/submission_bloc.dart';
import 'package:smart_grading/presentation/blocs/submission/submission_state.dart';
import 'package:smart_grading/domain/entities/exam.entity.dart';

class MyScoresPage extends StatelessWidget {
  const MyScoresPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Scores'),
        backgroundColor: Theme.of(context).colorScheme.primary,
      ),
      body: BlocBuilder<SubmissionBloc, SubmissionState>(
        builder: (context, state) {
          if (state is SubmissionLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is SubmissionLoaded) {
            final mySubmissions = state.submissions.where((s) => s.studentId == _getCurrentStudentId(context)).toList();
            if (mySubmissions.isEmpty) {
              return const Center(child: Text('No scores yet'));
            }
            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: mySubmissions.length,
              itemBuilder: (context, index) {
                final submission = mySubmissions[index];
                return Card(
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: _getScoreColor(submission.score ?? 0),
                      child: Text(
                        submission.score != null ? '${submission.score!.round()}' : '-',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                      ),
                    ),
                    title: Text(submission.examTitle ?? 'Exam'),
                    subtitle: Text(
                      'Submitted: ${_formatDate(submission.submittedAt)}',
                    ),
                    trailing: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: _getStatusColor(submission.status).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        submission.status ?? 'pending',
                        style: TextStyle(color: _getStatusColor(submission.status)),
                        fontSize: 12,
                      ),
                    ),
                    onTap: () => Navigator.pushNamed(
                      context,
                      '/submission-detail',
                      arguments: submission,
                    ),
                  ),
                );
              },
            );
          }
          if (state is SubmissionError) {
            return Center(child: Text('Error: ${state.message}'));
          }
          return const Center(child: Text('Loading...'));
        },
      ),
    );
  }

  String _getCurrentStudentId(BuildContext context) => '';
  String _formatDate(DateTime? date) => date != null ? '${date.day}/${date.month}/${date.year}' : '-';

  Color _getScoreColor(double score) {
    if (score >= 8) return Colors.green;
    if (score >= 5) return Colors.orange;
    return Colors.red;
  }

  Color _getStatusColor(String? status) {
    switch (status) {
      case 'graded': return Colors.green;
      case 'pending': return Colors.orange;
      case 'rejected': return Colors.red;
      default: return Colors.grey;
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/mobile/lib/presentation/pages/my_scores_page.dart
git commit -m "feat(mobile): add my scores page for students"
```

---

### Task 5: My Appeals Page (Student Role)

**Files:**
- Create: `client/mobile/lib/presentation/pages/my_appeals_page.dart`
- Modify: `client/mobile/lib/main.dart`
- Test: `client/mobile/test/presentation/pages/my_appeals_page_test.dart`

**Reference:**
- Web: `client/web/src/pages/MyAppealsPage.tsx`

- [ ] **Step 1: Write the failing test**

```dart
// client/mobile/test/presentation/pages/my_appeals_page_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading/presentation/pages/my_appeals_page.dart';

void main() {
  testWidgets('MyAppealsPage renders appeals title', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: MyAppealsPage()));
    expect(find.text('My Appeals'), findsOneWidget);
  });
}
```

- [ ] **Step 2: Run test to verify it fails**
Expected: FAIL

- [ ] **Step 3: Implement MyAppealsPage**

```dart
// client/mobile/lib/presentation/pages/my_appeals_page.dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:smart_grading/domain/entities/appeal.entity.dart';
import 'package:smart_grading/core/network/appeal_service.dart';
import 'package:get_it/get_it.dart';

class MyAppealsPage extends StatefulWidget {
  const MyAppealsPage({super.key});

  @override
  State<MyAppealsPage> createState() => _MyAppealsPageState();
}

class _MyAppealsPageState extends State<MyAppealsPage> {
  late Future<List<AppealEntity>> _appealsFuture;

  @override
  void initState() {
    super.initState();
    _loadAppeals();
  }

  void _loadAppeals() {
    _appealsFuture = GetIt.instance<AppealService>().getMyAppeals();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Appeals'),
        backgroundColor: Theme.of(context).colorScheme.primary,
      ),
      body: FutureBuilder<List<AppealEntity>>(
        future: _appealsFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }
          final appeals = snapshot.data ?? [];
          if (appeals.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.check_circle_outline, size: 64, color: Colors.green[300]),
                  const SizedBox(height: 16),
                  const Text('No appeals submitted', style: TextStyle(fontSize: 16)),
                ],
              ),
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: appeals.length,
            itemBuilder: (context, index) {
              final appeal = appeals[index];
              return Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              appeal.examTitle ?? 'Exam Appeal',
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                          ),
                          _buildStatusChip(appeal.status),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Question: ${appeal.questionNumber ?? "-"} | Original: ${appeal.originalScore ?? "-"}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      const SizedBox(height: 4),
                      Text(appeal.reason ?? '', style: Theme.of(context).textTheme.bodyMedium),
                      if (appeal.adminResponse != null) ...[
                        const Divider(),
                        Text(
                          'Admin Response: ${appeal.adminResponse}',
                          style: TextStyle(color: Colors.green[700], fontStyle: FontStyle.italic),
                        ),
                      ],
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }

  Widget _buildStatusChip(String? status) {
    Color color;
    switch (status) {
      case 'approved': color = Colors.green; break;
      case 'rejected': color = Colors.red; break;
      default: color = Colors.orange;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
      child: Text(status ?? 'pending', style: TextStyle(color: color, fontSize: 12)),
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/mobile/lib/presentation/pages/my_appeals_page.dart
git commit -m "feat(mobile): add my appeals page for students"
```

---

### Task 6: Email Verification Pending Page

**Files:**
- Create: `client/mobile/lib/presentation/pages/email_verification_pending_page.dart`
- Modify: `client/mobile/lib/main.dart`
- Test: `client/mobile/test/presentation/pages/email_verification_pending_page_test.dart`

**Reference:**
- Web: `client/web/src/pages/EmailVerificationPendingPage.tsx`

- [ ] **Step 1: Write the failing test**
Expected: FAIL

- [ ] **Step 2: Implement EmailVerificationPendingPage**

```dart
// client/mobile/lib/presentation/pages/email_verification_pending_page.dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:smart_grading/presentation/blocs/auth/auth_bloc.dart';
import 'package:smart_grading/presentation/blocs/auth/auth_event.dart';

class EmailVerificationPendingPage extends StatefulWidget {
  final String email;
  const EmailVerificationPendingPage({super.key, required this.email});

  @override
  State<EmailVerificationPendingPage> createState() => _EmailVerificationPendingPageState();
}

class _EmailVerificationPendingPageState extends State<EmailVerificationPendingPage> {
  bool _resent = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.mark_email_unread, size: 80, color: Colors.orange),
              const SizedBox(height: 24),
              Text(
                'Verify Your Email',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              Text(
                'We sent a verification email to\n${widget.email}',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              const SizedBox(height: 8),
              const Text(
                'Please click the link in the email to activate your account.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey),
              ),
              const SizedBox(height: 32),
              if (!_resent) ...[
                ElevatedButton.icon(
                  onPressed: () {
                    context.read<AuthBloc>().add(ResendVerificationEmail(widget.email));
                    setState(() => _resent = true);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Verification email resent!')),
                    );
                  },
                  icon: const Icon(Icons.send),
                  label: const Text('Resend Email'),
                ),
              ] else ...[
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.check_circle, color: Colors.green),
                    const SizedBox(width: 8),
                    const Text('Email resent!', style: TextStyle(color: Colors.green)),
                  ],
                ),
              ],
              const SizedBox(height: 16),
              TextButton(
                onPressed: () => Navigator.pushReplacementNamed(context, '/login'),
                child: const Text('Back to Login'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

- [ ] **Step 3: Run test to verify it passes**
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add client/mobile/lib/presentation/pages/email_verification_pending_page.dart
git commit -m "feat(mobile): add email verification pending page"
```

---

### Task 7: Enhanced Submission Detail Page

**Files:**
- Modify: `client/mobile/lib/presentation/pages/submission_detail_page.dart`
- Modify: `client/mobile/lib/main.dart` (route already exists but improve page)
- Test: `client/mobile/test/presentation/pages/submission_detail_page_test.dart`

**Reference:**
- Web: `client/web/src/components/submission/SubmissionDetailPage.tsx`

The existing `submission_detail_page.dart` is basic. Improve it to match web with:
- Image gallery for scanned sheets (using `photo_view` package)
- Detailed grading breakdown per question
- Appeal submission button
- Export/share functionality

- [ ] **Step 1: Read current implementation**

Run: Read `client/mobile/lib/presentation/pages/submission_detail_page.dart`

- [ ] **Step 2: Write enhanced test**

```dart
// client/mobile/test/presentation/pages/submission_detail_page_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading/presentation/pages/submission_detail_page.dart';
import 'package:smart_grading/domain/entities/submission.entity.dart';

void main() {
  testWidgets('SubmissionDetailPage renders submission info', (tester) async {
    final submission = SubmissionEntity(
      id: 'test-1',
      examId: 'exam-1',
      studentId: 'student-1',
      status: 'graded',
      score: 8.5,
      answers: const {},
    );
    await tester.pumpWidget(MaterialApp(home: SubmissionDetailPage(submission: submission)));
    expect(find.text('Submission Details'), findsOneWidget);
    expect(find.text('8.5'), findsOneWidget);
  });
}
```

- [ ] **Step 3: Run test to verify it fails**
Expected: FAIL

- [ ] **Step 4: Implement enhanced SubmissionDetailPage**

Rewrite `client/mobile/lib/presentation/pages/submission_detail_page.dart` with:
- AppBar with share/export actions
- Score summary card
- Question-by-question breakdown list
- Scanned image gallery (if images available)
- Submit appeal button
- Loading states and error handling

- [ ] **Step 5: Run test to verify it passes**
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add client/mobile/lib/presentation/pages/submission_detail_page.dart
git commit -m "feat(mobile): enhance submission detail page with image gallery and appeal"
```

---

### Task 8: Exam Selection Page (for grading flow)

**Files:**
- Modify: `client/mobile/lib/presentation/pages/exam_selection_page.dart` (already exists - audit it)
- Modify: `client/mobile/lib/main.dart` (route already exists `/exam-selection`)
- Test: `client/mobile/test/presentation/pages/exam_selection_page_test.dart`

The `ExamSelectionPage` already exists. Audit and improve it to match web behavior.

- [ ] **Step 1: Read current implementation**

Run: Read `client/mobile/lib/presentation/pages/exam_selection_page.dart`

- [ ] **Step 2: Verify and improve if needed**
Check if it properly loads exams and navigates to scan with selected exam.

- [ ] **Step 3: Run existing tests or write new ones**
Run: `cd client/mobile && flutter test test/presentation/pages/exam_selection_page_test.dart`

- [ ] **Step 4: Commit improvements**

---

### Task 9: Enhanced AI Tutor Page

**Files:**
- Modify: `client/mobile/lib/presentation/pages/ai_tutor_page.dart`
- Modify: `client/mobile/lib/presentation/blocs/ai_chat/ai_chat_bloc.dart` (if needed)
- Test: `client/mobile/test/presentation/pages/ai_tutor_page_test.dart`

**Reference:**
- Web: `client/web/src/features/ai-tutor/AITutorPage.tsx` and `AITutorChat.tsx`

Current AI tutor page may be basic. Enhance with:
- Chat message bubbles with proper styling (similar to web)
- Typing indicator animation
- Suggested questions/chips
- Clear conversation button
- Save/share conversation

- [ ] **Step 1: Read current implementation**

Run: Read `client/mobile/lib/presentation/pages/ai_tutor_page.dart`

- [ ] **Step 2: Write test for enhanced version**

```dart
// client/mobile/test/presentation/pages/ai_tutor_page_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading/presentation/pages/ai_tutor_page.dart';

void main() {
  testWidgets('AITutorPage renders chat interface', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: AITutorPage()));
    expect(find.text('AI Tutor'), findsOneWidget);
    expect(find.byType(TextField), findsOneWidget);
  });
}
```

- [ ] **Step 3: Run test to verify current state**

- [ ] **Step 4: Enhance the AI tutor page**
Improve with better chat UI, typing indicator, suggested questions.

- [ ] **Step 5: Run test to verify it passes**
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add client/mobile/lib/presentation/pages/ai_tutor_page.dart
git commit -m "feat(mobile): enhance AI tutor page with improved chat UI"
```

---

### Task 10: Enhanced AI Report Page

**Files:**
- Modify: `client/mobile/lib/presentation/pages/ai_report_page.dart`
- Test: `client/mobile/test/presentation/pages/ai_report_page_test.dart`

- [ ] **Step 1: Read current implementation**

Run: Read `client/mobile/lib/presentation/pages/ai_report_page.dart`

- [ ] **Step 2: Write test**

```dart
// client/mobile/test/presentation/pages/ai_report_page_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading/presentation/pages/ai_report_page.dart';

void main() {
  testWidgets('AIReportPage renders report', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: AIReportPage()));
    expect(find.text('AI Report'), findsOneWidget);
  });
}
```

- [ ] **Step 3: Enhance AI report page**
Add share, export, chart visualizations.

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

---

## Part 2: Navigation & Role-Based Access

### Task 11: Role-Based Navigation in HomePage

**Files:**
- Modify: `client/mobile/lib/presentation/pages/home_page.dart`
- Create: `client/mobile/lib/presentation/blocs/auth/auth_bloc.dart` (enhance role detection)
- Test: `client/mobile/test/presentation/pages/home_page_test.dart`

**Problem:** Current `HomePage` uses a fixed 5-tab bottom navigation. Need to change tabs based on user role.

**Reference:**
- Web: `client/web/src/presentation/components/Layout.tsx` (role-based sidebar)

Current tabs: Home | Exams | Grading | Classes | Profile

Needed role-based tabs:

| Role | Tab 1 | Tab 2 | Tab 3 | Tab 4 | Tab 5 |
|------|-------|-------|-------|-------|-------|
| **Admin** | Dashboard | Users | Schools | Analytics | Profile |
| **Teacher** | Dashboard | Exams | Grading | Classes | Profile |
| **Student** | Dashboard | My Scores | My Appeals | Profile | Settings |

- [ ] **Step 1: Write failing test**

```dart
// client/mobile/test/presentation/pages/home_page_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading/presentation/pages/home_page.dart';

void main() {
  testWidgets('HomePage renders bottom navigation', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: HomePage()));
    expect(find.byType(BottomNavigationBar), findsOneWidget);
  });
}
```

- [ ] **Step 2: Run test to verify it passes**
Expected: PASS (existing implementation)

- [ ] **Step 3: Enhance HomePage with role-based tabs**

Modify `client/mobile/lib/presentation/pages/home_page.dart`:
- Read user role from `AuthBloc`
- Build tabs dynamically based on role
- Add admin tabs when role is `admin`
- Add student-specific tabs (My Scores, My Appeals) when role is `student`

```dart
// Key changes in HomePage:
// 1. Inject AuthBloc
// 2. Read user role: final role = authState.user?.role ?? 'teacher';
// 3. Build tabs dynamically:

List<BottomNavigationBarItem> _buildNavItems(String role) {
  switch (role) {
    case 'admin':
      return const [
        BottomNavigationBarItem(icon: Icon(Icons.dashboard), label: 'Dashboard'),
        BottomNavigationBarItem(icon: Icon(Icons.people), label: 'Users'),
        BottomNavigationBarItem(icon: Icon(Icons.school), label: 'Schools'),
        BottomNavigationBarItem(icon: Icon(Icons.bar_chart), label: 'Analytics'),
        BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
      ];
    case 'student':
      return const [
        BottomNavigationBarItem(icon: Icon(Icons.dashboard), label: 'Dashboard'),
        BottomNavigationBarItem(icon: Icon(Icons.score), label: 'My Scores'),
        BottomNavigationBarItem(icon: Icon(Icons.scale), label: 'My Appeals'),
        BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
        BottomNavigationBarItem(icon: Icon(Icons.settings), label: 'Settings'),
      ];
    default: // teacher
      return const [
        BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
        BottomNavigationBarItem(icon: Icon(Icons.description), label: 'Exams'),
        BottomNavigationBarItem(icon: Icon(Icons.fact_check), label: 'Grading'),
        BottomNavigationBarItem(icon: Icon(Icons.people), label: 'Classes'),
        BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
      ];
  }
}
```

- [ ] **Step 4: Add Admin BLoC (if not exists)**

Create:
- `client/mobile/lib/presentation/blocs/admin/admin_bloc.dart`
- `client/mobile/lib/presentation/blocs/admin/admin_event.dart`
- `client/mobile/lib/presentation/blocs/admin/admin_state.dart`

```dart
// client/mobile/lib/presentation/blocs/admin/admin_bloc.dart
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:smart_grading/presentation/blocs/admin/admin_event.dart';
import 'package:smart_grading/presentation/blocs/admin/admin_state.dart';
import 'package:smart_grading/core/network/user_service.dart';
import 'package:get_it/get_it.dart';

class AdminBloc extends Bloc<AdminEvent, AdminState> {
  final UserService _userService = GetIt.instance<UserService>();

  AdminBloc() : super(AdminInitial()) {
    on<LoadUsers>(_onLoadUsers);
    on<AddUser>(_onAddUser);
    on<UpdateUser>(_onUpdateUser);
    on<DeleteUser>(_onDeleteUser);
  }

  Future<void> _onLoadUsers(LoadUsers event, Emitter<AdminState> emit) async {
    emit(AdminLoading());
    try {
      final users = await _userService.getUsers();
      emit(AdminLoaded(users));
    } catch (e) {
      emit(AdminError(e.toString()));
    }
  }

  Future<void> _onAddUser(AddUser event, Emitter<AdminState> emit) async {
    try {
      await _userService.createUser(event.name, event.email, event.role);
      add(LoadUsers());
    } catch (e) {
      emit(AdminError(e.toString()));
    }
  }

  Future<void> _onUpdateUser(UpdateUser event, Emitter<AdminState> emit) async {
    try {
      await _userService.updateUser(event.userId, event.name, event.role);
      add(LoadUsers());
    } catch (e) {
      emit(AdminError(e.toString()));
    }
  }

  Future<void> _onDeleteUser(DeleteUser event, Emitter<AdminState> emit) async {
    try {
      await _userService.deleteUser(event.userId);
      add(LoadUsers());
    } catch (e) {
      emit(AdminError(e.toString()));
    }
  }
}
```

- [ ] **Step 5: Register AdminBloc in GetIt (main.dart)**

- [ ] **Step 6: Run tests to verify**

- [ ] **Step 7: Commit**

```bash
git add client/mobile/lib/presentation/pages/home_page.dart
git add client/mobile/lib/presentation/blocs/admin/
git commit -m "feat(mobile): add role-based navigation to HomePage"
```

---

### Task 12: Admin Route Guard in Navigation

**Files:**
- Modify: `client/mobile/lib/main.dart`
- Modify: `client/mobile/lib/presentation/blocs/auth/auth_bloc.dart`

Protect admin routes - only allow access if user has `admin` role.

- [ ] **Step 1: Add route guard helper in main.dart**

```dart
Route<dynamic> _adminGuard(BuildContext context, RouteSettings settings) {
  final authState = context.read<AuthBloc>().state;
  if (authState is! AuthAuthenticated || authState.user?.role != 'admin') {
    return MaterialPageRoute(builder: (_) => const HomePage());
  }
  return MaterialPageRoute(
    builder: (_) => _routeBuilders[settings.name]!(context),
  );
}
```

- [ ] **Step 2: Apply guard to admin routes**
Wrap admin routes with role check.

- [ ] **Step 3: Commit**

---

### Task 13: Navigation Drawer for Profile Tab

**Files:**
- Modify: `client/mobile/lib/presentation/pages/profile_view.dart`

Add a drawer from the profile tab with links to:
- Settings
- Help
- Notifications
- Logout

Reference web: `client/web/src/presentation/components/Layout.tsx` sidebar items.

- [ ] **Step 1: Read current profile_view.dart**

- [ ] **Step 2: Add navigation drawer**

- [ ] **Step 3: Commit**

---

### Task 14: Complete Bottom Navigation for All Tabs

**Files:**
- Modify: `client/mobile/lib/presentation/pages/home_page.dart`
- Create missing tab content pages

Current bottom nav tabs:
- Tab 0: DashboardView (✅)
- Tab 1: ExamsView (✅)
- Tab 2: ScanView (✅)
- Tab 3: ClassesView (✅)
- Tab 4: ProfileView (✅)

Audit each view:
- `DashboardView` - check if complete
- `ExamsView` - check if complete
- `ScanView` - check if complete
- `ClassesView` - check if complete
- `ProfileView` - check if complete

- [ ] **Step 1: Read each view file and audit completeness**

For each view, check:
1. Does it load data on init?
2. Does it handle loading states?
3. Does it handle error states?
4. Does navigation work properly?
5. Does it match web equivalent?

- [ ] **Step 2: Fix any incomplete views**

- [ ] **Step 3: Commit**

---

### Task 15: Update main.dart Route Registration

**Files:**
- Modify: `client/mobile/lib/main.dart`

Add all missing routes:

```dart
'/admin': (context) => const AdminDashboardPage(),
'/admin/schools': (context) => const SchoolsManagementPage(),
'/admin/users': (context) => const UsersManagementPage(),
'/my-scores': (context) => const MyScoresPage(),
'/my-appeals': (context) => const MyAppealsPage(),
'/email-verification-pending': (context) {
  final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
  return EmailVerificationPendingPage(email: args?['email'] ?? '');
},
```

- [ ] **Step 1: Add all missing routes to main.dart**

- [ ] **Step 2: Verify no duplicate routes**

- [ ] **Step 3: Run flutter analyze**

Run: `cd client/mobile && flutter analyze`
Expected: No errors (warnings acceptable)

- [ ] **Step 4: Commit**

---

## Part 3: Missing Features on Mobile (Not in Web)

### Task 16: OMR Test Lab Page (Teacher Role)

**Files:**
- Audit: `client/mobile/lib/presentation/pages/omr_test_lab_page.dart` (already exists)
- Test: `client/mobile/test/presentation/pages/omr_test_lab_page_test.dart`

The page exists. Audit and verify it's functional. Check if it's accessible from navigation.

- [ ] **Step 1: Read omr_test_lab_page.dart**

- [ ] **Step 2: Verify it has proper route**

- [ ] **Step 3: Add to teacher navigation if missing**

Add a hidden "OMR Test Lab" button/link in the Grading tab for teachers.

- [ ] **Step 4: Commit**

---

## Implementation Order

| Order | Task | Priority | Notes |
|-------|------|----------|-------|
| 1 | Task 6: Email Verification Pending Page | High | Auth flow blocker |
| 2 | Task 11: Role-Based Navigation | High | Foundation for all roles |
| 3 | Task 14: Complete Bottom Navigation | High | Core UX |
| 4 | Task 15: Update main.dart Routes | High | Wiring everything together |
| 5 | Task 4: My Scores Page | Medium | Student feature |
| 6 | Task 5: My Appeals Page | Medium | Student feature |
| 7 | Task 7: Enhanced Submission Detail | Medium | Student/Teacher feature |
| 8 | Task 1: Admin Dashboard | Medium | Admin feature |
| 9 | Task 2: Schools Management | Medium | Admin feature |
| 10 | Task 3: Users Management | Medium | Admin feature |
| 11 | Task 9: Enhanced AI Tutor | Low | Enhancement |
| 12 | Task 10: Enhanced AI Report | Low | Enhancement |
| 13 | Task 12: Admin Route Guard | Medium | Security |
| 14 | Task 13: Profile Navigation Drawer | Low | UX enhancement |
| 15 | Task 8: Exam Selection Page Audit | Low | Verify existing |
| 16 | Task 16: OMR Test Lab Audit | Low | Verify existing |

---

## Summary of Pages to Create

| # | Page | File | Role |
|---|------|------|------|
| 1 | Admin Dashboard | `lib/presentation/pages/admin/admin_dashboard_page.dart` | Admin |
| 2 | Schools Management | `lib/presentation/pages/admin/schools_management_page.dart` | Admin |
| 3 | Users Management | `lib/presentation/pages/admin/users_management_page.dart` | Admin |
| 4 | My Scores | `lib/presentation/pages/my_scores_page.dart` | Student |
| 5 | My Appeals | `lib/presentation/pages/my_appeals_page.dart` | Student |
| 6 | Email Verification Pending | `lib/presentation/pages/email_verification_pending_page.dart` | All |

## Summary of Pages to Enhance

| # | Page | Changes |
|---|------|---------|
| 7 | Submission Detail | Add image gallery, appeal button |
| 8 | AI Tutor | Better chat UI, typing indicator |
| 9 | AI Report | Charts, export |
| 10 | Profile View | Add navigation drawer |
| 11 | HomePage | Role-based bottom navigation |
| 12 | main.dart | Add all missing routes, admin guards |

## New BLoCs to Create

| # | BLoC | Files |
|---|------|-------|
| 1 | AdminBloc | `admin_bloc.dart`, `admin_event.dart`, `admin_state.dart` |
