import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/domain/entities/bank_membership.entity.dart';

void main() {
  group('BankMembership', () {
    test('should parse active owner membership with userId object fallback to _id', () {
      final json = {
        'bankId': 'bank_123',
        'userId': {
          '_id': 'user_456',
          'name': 'John Doe',
          'email': 'john@example.com',
        },
        'role': 'owner',
        'status': 'active',
      };

      final membership = BankMembership.fromJson(json);

      expect(membership.bankId, equals('bank_123'));
      expect(membership.userId, equals('user_456'));
      expect(membership.role, equals('owner'));
      expect(membership.status, equals('active'));
    });

    test('should parse when userId is a string instead of object', () {
      final json = {
        'bankId': 'bank_789',
        'userId': 'user_123',
        'role': 'member',
        'status': 'active',
      };

      final membership = BankMembership.fromJson(json);

      expect(membership.bankId, equals('bank_789'));
      expect(membership.userId, equals('user_123'));
      expect(membership.role, equals('member'));
      expect(membership.status, equals('active'));
    });

    test('should default role to viewer when missing', () {
      final json = {
        'bankId': 'bank_456',
        'userId': 'user_789',
        'status': 'active',
      };

      final membership = BankMembership.fromJson(json);

      expect(membership.bankId, equals('bank_456'));
      expect(membership.userId, equals('user_789'));
      expect(membership.role, equals('viewer'));
      expect(membership.status, equals('active'));
    });

    test('should parse when bankId is an object with _id fallback', () {
      final json = {
        'bankId': {
          '_id': 'bank_object_123',
          'name': 'Test Bank',
        },
        'userId': 'user_456',
        'role': 'admin',
        'status': 'active',
      };

      final membership = BankMembership.fromJson(json);

      expect(membership.bankId, equals('bank_object_123'));
      expect(membership.userId, equals('user_456'));
      expect(membership.role, equals('admin'));
    });
  });
}
