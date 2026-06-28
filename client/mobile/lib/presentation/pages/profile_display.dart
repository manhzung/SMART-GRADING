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

  /// Returns the school name to show in the profile's "School Information"
  /// section.
  ///
  /// The backend only sends a `schoolId` on the user payload; resolving it
  /// into a human-readable name requires looking it up in the list of schools
  /// loaded by `SchoolBloc`. While the lookup is still in progress (or when
  /// the id cannot be matched — for example because the school was deleted)
  /// we fall back to the raw `schoolId` so the user always sees *something*
  /// meaningful instead of a blank field. If the user has no school at all,
  /// we surface the same "Not assigned" placeholder the old UI used.
  static String schoolName(User? user, {List<School>? schools}) {
    final schoolId = user?.schoolId?.trim();
    if (schoolId == null || schoolId.isEmpty) {
      return 'Not assigned';
    }

    if (schools != null && schools.isNotEmpty) {
      for (final school in schools) {
        if (school.id == schoolId) {
          final name = school.name.trim();
          if (name.isNotEmpty) return name;
          break;
        }
      }
    }

    return schoolId;
  }
}
