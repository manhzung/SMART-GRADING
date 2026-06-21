import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/domain/entities/user.entity.dart';
import 'package:smart_grading_mobile/presentation/pages/profile_display.dart';

void main() {
  group('ProfileDisplay.roleLabel', () {
    test('returns human label for teacher', () {
      expect(ProfileDisplay.roleLabel('teacher'), equals('Teacher'));
    });

    test('returns human label for student', () {
      expect(ProfileDisplay.roleLabel('student'), equals('Student'));
    });

    test('returns human label for admin', () {
      expect(ProfileDisplay.roleLabel('admin'), equals('Administrator'));
    });

    test('returns human label for parent', () {
      expect(ProfileDisplay.roleLabel('parent'), equals('Parent'));
    });

    test('returns raw value for unknown role', () {
      expect(ProfileDisplay.roleLabel('guest'), equals('guest'));
    });

    test('returns fallback for null role', () {
      expect(ProfileDisplay.roleLabel(null), equals('Unknown role'));
    });
  });

  group('ProfileDisplay.displayName', () {
    test('returns name from user', () {
      final user = _user(name: 'Nguyễn Văn A');
      expect(ProfileDisplay.displayName(user), equals('Nguyễn Văn A'));
    });

    test('does not prefix teacher name with Dr. (no more Dr. Dr. bug)', () {
      final user = _user(name: 'Dr. Nguyễn Văn A', role: 'teacher');
      expect(ProfileDisplay.displayName(user), equals('Dr. Nguyễn Văn A'));
    });

    test('returns placeholder when name is empty', () {
      final user = _user(name: '');
      expect(ProfileDisplay.displayName(user), equals('Unnamed user'));
    });

    test('returns placeholder when user is null', () {
      expect(ProfileDisplay.displayName(null), equals('Unnamed user'));
    });
  });

  group('ProfileDisplay.avatarUrl', () {
    test('returns url from user', () {
      final user = _user(avatarUrl: 'https://cdn.example.com/a.png');
      expect(ProfileDisplay.avatarUrl(user), equals('https://cdn.example.com/a.png'));
    });

    test('returns null when missing so widget can render initials fallback', () {
      final user = _user(avatarUrl: null);
      expect(ProfileDisplay.avatarUrl(user), isNull);
    });

    test('returns null for empty string', () {
      final user = _user(avatarUrl: '   ');
      expect(ProfileDisplay.avatarUrl(user), isNull);
    });
  });

  group('ProfileDisplay.email / phone', () {
    test('email returns the user email', () {
      final user = _user(email: 'a@b.com');
      expect(ProfileDisplay.email(user), equals('a@b.com'));
    });

    test('email returns empty string for null user', () {
      expect(ProfileDisplay.email(null), equals(''));
    });

    test('phone returns trimmed phone', () {
      final user = _user(phone: ' 0901234567 ');
      expect(ProfileDisplay.phone(user), equals('0901234567'));
    });

    test('phone returns null when missing', () {
      final user = _user(phone: null);
      expect(ProfileDisplay.phone(user), isNull);
    });
  });
}

User _user({
  String id = 'u1',
  String name = 'Test User',
  String email = 'test@example.com',
  String role = 'teacher',
  String? avatarUrl,
  String? phone,
  String? schoolId,
}) {
  return User(
    id: id,
    name: name,
    email: email,
    role: role,
    avatarUrl: avatarUrl,
    phone: phone,
    schoolId: schoolId,
    createdAt: DateTime(2026, 1, 1),
  );
}
