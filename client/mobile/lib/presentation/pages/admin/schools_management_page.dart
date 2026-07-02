import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../blocs/admin/admin_bloc.dart';
import '../../../domain/entities/user.entity.dart';

class SchoolsManagementPage extends StatefulWidget {
  const SchoolsManagementPage({super.key});

  @override
  State<SchoolsManagementPage> createState() => _SchoolsManagementPageState();
}

class _SchoolsManagementPageState extends State<SchoolsManagementPage> {
  @override
  void initState() {
    super.initState();
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
          'Schools',
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
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddSchoolDialog(context),
        backgroundColor: const Color(0xFF0F172A),
        child: const Icon(Icons.add, color: Colors.white),
      ),
      body: SafeArea(
        child: BlocConsumer<AdminBloc, AdminState>(
          listener: (context, state) {
            if (state is AdminOperationSuccess) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text(state.message), backgroundColor: const Color(0xFF16A34A)),
              );
            }
            if (state is AdminError) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text(state.message), backgroundColor: const Color(0xFFDC2626)),
              );
            }
          },
          builder: (context, state) {
            if (state is AdminLoading) {
              return const Center(child: CircularProgressIndicator());
            }
            if (state is AdminSchoolsLoaded) {
              if (state.schools.isEmpty) {
                return const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.school_outlined, size: 64, color: Color(0xFF94A3B8)),
                      SizedBox(height: 16),
                      Text('No schools found', style: TextStyle(color: Color(0xFF64748B))),
                    ],
                  ),
                );
              }
              return ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: state.schools.length,
                itemBuilder: (context, index) {
                  final school = state.schools[index];
                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: ListTile(
                      contentPadding: const EdgeInsets.all(12),
                      onTap: () => _showSchoolDetailSheet(context, school),
                      leading: Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.school, color: Color(0xFF10B981)),
                      ),
                      title: Text(
                        school.name,
                        style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                      ),
                      subtitle: Text(
                        school.address ?? 'No address',
                        style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                      ),
                      trailing: PopupMenuButton<String>(
                        icon: const Icon(Icons.more_vert, color: Color(0xFF64748B)),
                        onSelected: (value) {
                          if (value == 'edit') _showEditSchoolDialog(context, school);
                          if (value == 'delete') _deleteSchool(context, school.id);
                        },
                        itemBuilder: (context) => [
                          const PopupMenuItem(value: 'edit', child: Text('Edit')),
                          const PopupMenuItem(value: 'delete', child: Text('Delete', style: TextStyle(color: Colors.red))),
                        ],
                      ),
                    ),
                  );
                },
              );
            }
            if (state is AdminError) {
              return Center(child: Text('Error: ${state.message}'));
            }
            return const Center(child: Text('Loading...'));
          },
        ),
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
            TextField(
              controller: nameController,
              decoration: const InputDecoration(labelText: 'School Name', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: addressController,
              decoration: const InputDecoration(labelText: 'Address', border: OutlineInputBorder()),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              if (nameController.text.trim().isEmpty) return;
              context.read<AdminBloc>().add(AdminAddSchoolRequested(
                name: nameController.text.trim(),
                address: addressController.text.trim().isEmpty ? null : addressController.text.trim(),
              ));
              Navigator.pop(ctx);
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  void _showEditSchoolDialog(BuildContext context, School school) {
    final nameController = TextEditingController(text: school.name);
    final addressController = TextEditingController(text: school.address ?? '');
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Edit School'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameController,
              decoration: const InputDecoration(labelText: 'School Name', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: addressController,
              decoration: const InputDecoration(labelText: 'Address', border: OutlineInputBorder()),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              if (nameController.text.trim().isEmpty) return;
              context.read<AdminBloc>().add(AdminUpdateSchoolRequested(
                schoolId: school.id,
                name: nameController.text.trim(),
                address: addressController.text.trim().isEmpty ? null : addressController.text.trim(),
              ));
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
              context.read<AdminBloc>().add(AdminDeleteSchoolRequested(schoolId: schoolId));
              Navigator.pop(ctx);
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  void _showSchoolDetailSheet(BuildContext context, School school) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.school, color: Color(0xFF10B981)),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              school.name,
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                            if (school.address != null && school.address!.isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Text(
                                school.address!,
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: Color(0xFF64748B),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: Color(0xFF64748B)),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (school.logoUrl != null && school.logoUrl!.isNotEmpty) ...[
              Row(
                children: [
                  const Icon(Icons.image_outlined, size: 18, color: Color(0xFF64748B)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      school.logoUrl!,
                      style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
            ],
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}
