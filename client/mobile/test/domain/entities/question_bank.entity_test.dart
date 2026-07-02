import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/domain/entities/question_bank.entity.dart';

void main() {
  group('QuestionBank', () {
    test('should parse server response with _id fallback to id', () {
      final json = {
        '_id': 'bank_123',
        'name': 'Math Bank',
        'description': 'Math questions for grade 10',
        'type': 'public',
        'schoolId': 'school_456',
        'isActive': true,
        'createdAt': '2024-01-15T10:30:00Z',
        'updatedAt': '2024-01-20T14:45:00Z',
      };

      final bank = QuestionBank.fromJson(json);

      expect(bank.id, equals('bank_123'));
      expect(bank.name, equals('Math Bank'));
      expect(bank.description, equals('Math questions for grade 10'));
      expect(bank.type, equals('public'));
      expect(bank.schoolId, equals('school_456'));
      expect(bank.isActive, isTrue);
      expect(bank.createdAt.year, equals(2024));
      expect(bank.updatedAt.month, equals(1));
    });

    test('should parse when id is used instead of _id', () {
      final json = {
        'id': 'bank_789',
        'name': 'Science Bank',
        'description': 'Science questions',
        'type': 'private',
        'schoolId': 'school_123',
        'isActive': false,
        'createdAt': '2024-02-01T08:00:00Z',
        'updatedAt': '2024-02-01T08:00:00Z',
      };

      final bank = QuestionBank.fromJson(json);

      expect(bank.id, equals('bank_789'));
      expect(bank.name, equals('Science Bank'));
      expect(bank.isActive, isFalse);
    });
  });
}
