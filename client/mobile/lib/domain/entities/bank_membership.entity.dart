class BankMembership {
  final String bankId;
  final String userId;
  final String role;
  final String status;

  BankMembership({
    required this.bankId,
    required this.userId,
    required this.role,
    required this.status,
  });

  factory BankMembership.fromJson(Map<String, dynamic> json) {
    String parsedUserId;
    if (json['userId'] is Map<String, dynamic>) {
      parsedUserId = (json['userId']['_id'] ?? json['userId']['id'] ?? '').toString();
    } else {
      parsedUserId = json['userId']?.toString() ?? '';
    }

    String parsedBankId;
    if (json['bankId'] is Map<String, dynamic>) {
      parsedBankId = (json['bankId']['_id'] ?? json['bankId']['id'] ?? '').toString();
    } else {
      parsedBankId = json['bankId']?.toString() ?? '';
    }

    return BankMembership(
      bankId: parsedBankId,
      userId: parsedUserId,
      role: (json['role'] ?? 'viewer').toString(),
      status: (json['status'] ?? 'active').toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'bankId': bankId,
      'userId': userId,
      'role': role,
      'status': status,
    };
  }
}
