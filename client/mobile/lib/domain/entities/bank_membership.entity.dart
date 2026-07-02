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

    return BankMembership(
      bankId: (json['bankId'] ?? '').toString(),
      userId: parsedUserId,
      role: (json['role'] ?? 'member').toString(),
      status: (json['status'] ?? 'active').toString(),
    );
  }
}
