class User {
  final String id;
  final String name;
  final String email;
  final String role;
  final String? avatarUrl;
  final String? phone;
  final String? schoolId;
  final bool isActive;
  final DateTime createdAt;
  final String? studentCode;
  final String? gender;
  final DateTime? dateOfBirth;

  User({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.avatarUrl,
    this.phone,
    this.schoolId,
    this.isActive = true,
    required this.createdAt,
    this.studentCode,
    this.gender,
    this.dateOfBirth,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      role: (json['role'] ?? 'teacher').toString(),
      avatarUrl: json['avatarUrl']?.toString(),
      phone: json['phone']?.toString(),
      schoolId: json['schoolId']?.toString(),
      isActive: json['isActive'] as bool? ?? true,
      createdAt: DateTime.tryParse((json['createdAt'] ?? '').toString()) ?? DateTime.now(),
      studentCode: json['studentCode']?.toString(),
      gender: json['gender']?.toString(),
      dateOfBirth: json['dateOfBirth'] != null
          ? DateTime.tryParse(json['dateOfBirth'].toString())
          : null,
    );
  }

  bool get isAdmin => role == 'admin';
  bool get isTeacher => role == 'teacher';
  bool get isStudent => role == 'student';
  bool get isParent => role == 'parent';
}

class School {
  final String id;
  final String name;
  final String? address;
  final String? logoUrl;
  final DateTime createdAt;
  final List<String> subjectIds;

  School({
    required this.id,
    required this.name,
    this.address,
    this.logoUrl,
    required this.createdAt,
    this.subjectIds = const [],
  });

  factory School.fromJson(Map<String, dynamic> json) {
    final addressJson = json['address'];
    final address = addressJson is Map<String, dynamic>
        ? [
            addressJson['street'],
            addressJson['ward'],
            addressJson['district'],
            addressJson['city'],
          ].whereType<String>().where((value) => value.trim().isNotEmpty).join(', ')
        : null;

    return School(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      address: address,
      logoUrl: json['logoUrl']?.toString(),
      createdAt: DateTime.tryParse((json['createdAt'] ?? '').toString()) ?? DateTime.now(),
      subjectIds: (json['subjectIds'] as List<dynamic>? ?? const []).map((item) => item.toString()).toList(),
    );
  }
}

class Subject {
  final String id;
  final String name;
  final String code;
  final String? description;
  final int gradeLevel;

  Subject({
    required this.id,
    required this.name,
    required this.code,
    this.description,
    required this.gradeLevel,
  });

  factory Subject.fromJson(Map<String, dynamic> json) {
    return Subject(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      code: (json['code'] ?? '').toString(),
      description: json['description']?.toString(),
      gradeLevel: (json['gradeLevel'] as num?)?.toInt() ?? 0,
    );
  }
}

class ClassStudent {
  final String id;
  final String name;
  final String email;
  final String? studentCode;
  final bool isActive;
  final DateTime? dateOfBirth;

  ClassStudent({
    required this.id,
    required this.name,
    required this.email,
    this.studentCode,
    this.isActive = true,
    this.dateOfBirth,
  });

  factory ClassStudent.fromJson(Map<String, dynamic> json) {
    return ClassStudent(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      studentCode: json['studentCode']?.toString(),
      isActive: json['isActive'] as bool? ?? true,
      dateOfBirth: json['dateOfBirth'] != null
          ? DateTime.tryParse(json['dateOfBirth'].toString())
          : null,
    );
  }
}

class SubjectTeacher {
  final Subject? subject;
  final String? teacherId;
  final String? teacherName;
  final DateTime? addedAt;

  SubjectTeacher({
    this.subject,
    this.teacherId,
    this.teacherName,
    this.addedAt,
  });

  factory SubjectTeacher.fromJson(Map<String, dynamic> json) {
    Subject? subject;
    if (json['subjectId'] != null) {
      subject = Subject.fromJson(json['subjectId'] as Map<String, dynamic>);
    }
    String? teacherName;
    if (json['teacherId'] != null && json['teacherId'] is Map<String, dynamic>) {
      teacherName = json['teacherId']['name']?.toString();
    }
    return SubjectTeacher(
      subject: subject,
      teacherId: json['teacherId'] is Map<String, dynamic>
          ? (json['teacherId']['_id'] ?? json['teacherId']['id'] ?? '').toString()
          : json['teacherId']?.toString(),
      teacherName: teacherName,
      addedAt: json['addedAt'] != null
          ? DateTime.tryParse(json['addedAt'].toString())
          : null,
    );
  }
}

class Class {
  final String id;
  final String name;
  final String code;
  final int? gradeLevel;
  final String? academicYear;
  final String? homeroomTeacherId;
  final String? homeroomTeacherName;
  final List<ClassStudent> studentIds;
  final List<SubjectTeacher> subjectTeachers;
  final String? schoolId;
  final bool isActive;
  final String? enrollmentCode;
  final DateTime createdAt;

  Class({
    required this.id,
    required this.name,
    required this.code,
    this.gradeLevel,
    this.academicYear,
    this.homeroomTeacherId,
    this.homeroomTeacherName,
    this.studentIds = const [],
    this.subjectTeachers = const [],
    this.schoolId,
    this.isActive = true,
    this.enrollmentCode,
    required this.createdAt,
  });

  factory Class.fromJson(Map<String, dynamic> json) {
    final studentsRaw = json['studentIds'] as List<dynamic>? ?? [];
    final students = studentsRaw
        .whereType<Map<String, dynamic>>()
        .map((e) => ClassStudent.fromJson(e))
        .toList();

    final teachersRaw = json['subjectTeachers'] as List<dynamic>? ?? [];
    final teachers = teachersRaw
        .whereType<Map<String, dynamic>>()
        .map((e) => SubjectTeacher.fromJson(e))
        .toList();

    String? homeroomTeacherName;
    if (json['homeroomTeacherId'] != null && json['homeroomTeacherId'] is Map<String, dynamic>) {
      homeroomTeacherName = json['homeroomTeacherId']['name']?.toString();
    }

    return Class(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      code: (json['code'] ?? '').toString(),
      gradeLevel: (json['gradeLevel'] as num?)?.toInt(),
      academicYear: json['academicYear']?.toString(),
      homeroomTeacherId: json['homeroomTeacherId'] is Map<String, dynamic>
          ? (json['homeroomTeacherId']['_id'] ?? json['homeroomTeacherId']['id'] ?? '').toString()
          : json['homeroomTeacherId']?.toString(),
      homeroomTeacherName: homeroomTeacherName,
      studentIds: students,
      subjectTeachers: teachers,
      schoolId: json['schoolId']?.toString(),
      isActive: json['isActive'] as bool? ?? true,
      enrollmentCode: json['enrollmentCode']?.toString(),
      createdAt: DateTime.tryParse((json['createdAt'] ?? '').toString()) ?? DateTime.now(),
    );
  }

  int get studentCount => studentIds.where((s) => s.isActive).length;

  String get gradeDisplay {
    if (gradeLevel != null) return 'Grade $gradeLevel';
    return '';
  }

  String get subtitle {
    final parts = <String>[];
    if (gradeLevel != null) parts.add('Grade $gradeLevel');
    if (code.isNotEmpty) parts.add(code);
    return parts.join(' \u2022 ');
  }
}
