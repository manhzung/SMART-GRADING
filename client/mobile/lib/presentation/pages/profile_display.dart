import '../../domain/entities/user.entity.dart';

/// Pure helpers used by the profile screen.
///
/// Extracted out of the widget so they can be unit-tested without rendering UI
/// and to remove the previous hardcoded "Dr. Eleanor Vance" fallback values.
class ProfileDisplay {
  const ProfileDisplay._();

  /// Maps the raw server role to a human-readable display label.
  ///
  /// The API returns the role as a lowercase enum string (`teacher`,
  /// `student`, `admin`, `parent`). The profile screen must show the real
  /// role from the server instead of inventing a fixed "Lead Curriculum
  /// Director" label.
  static String roleLabel(String? role) {
    switch (role) {
      case 'teacher':
        return 'Teacher';
      case 'student':
        return 'Student';
      case 'admin':
        return 'Administrator';
      case 'parent':
        return 'Parent';
      default:
        return role?.isNotEmpty == true ? role! : 'Unknown role';
    }
  }

  /// Returns the full name as it should be displayed.
  ///
  /// The previous implementation prefixed the teacher name with "Dr." which
  /// produced "Dr. Dr. John" when the underlying name already contained the
  /// title. We now return the name unchanged so the user sees the value they
  /// actually saved on the server.
  static String displayName(User? user) {
    final name = user == null ? '' : (user.name.trim());
    return name.isEmpty ? 'Unnamed user' : name;
  }

  /// Returns the avatar URL to render.
  ///
  /// When the server has not provided an `avatarUrl` we deliberately return
  /// `null` so the widget can show a deterministic initials placeholder
  /// instead of fetching a third-party stock photo.
  static String? avatarUrl(User? user) {
    final url = user?.avatarUrl?.trim();
    if (url == null || url.isEmpty) return null;
    return url;
  }

  /// Returns the email to show, or an empty string if the user is unknown.
  static String email(User? user) {
    return user?.email ?? '';
  }

  /// Returns the phone to show, or `null` if the user has no phone set.
  static String? phone(User? user) {
    final value = user?.phone?.trim();
    if (value == null || value.isEmpty) return null;
    return value;
  }
}
