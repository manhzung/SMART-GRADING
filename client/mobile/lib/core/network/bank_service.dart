import '../../core/network/api_client.dart';
import '../../core/constants/app_constants.dart';
import '../../domain/entities/question_bank.entity.dart';
import '../../domain/entities/bank_membership.entity.dart';

class BankSummary {
  final QuestionBank bank;
  final BankMembership? membership;

  BankSummary({
    required this.bank,
    this.membership,
  });

  factory BankSummary.fromJson(Map<String, dynamic> json) {
    return BankSummary(
      bank: QuestionBank.fromJson(json['bank'] as Map<String, dynamic>),
      membership: json['membership'] != null
          ? BankMembership.fromJson(json['membership'] as Map<String, dynamic>)
          : null,
    );
  }
}

class BankDetail {
  final QuestionBank bank;
  final BankMembership? membership;

  BankDetail({
    required this.bank,
    this.membership,
  });

  factory BankDetail.fromJson(Map<String, dynamic> json) {
    return BankDetail(
      bank: QuestionBank.fromJson(json['bank'] as Map<String, dynamic>),
      membership: json['membership'] != null
          ? BankMembership.fromJson(json['membership'] as Map<String, dynamic>)
          : null,
    );
  }
}

class BankService {
  BankService({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  Future<List<BankSummary>> listBanks() {
    return _apiClient.get<List<BankSummary>>(
      ApiConstants.banks,
      parser: (data) {
        final list = data as List<dynamic>;
        return list
            .map((e) => BankSummary.fromJson(e as Map<String, dynamic>))
            .toList();
      },
    );
  }

  Future<BankDetail> getBank(String bankId) {
    return _apiClient.get<BankDetail>(
      '${ApiConstants.banks}/$bankId',
      parser: (data) => BankDetail.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<QuestionBank> createBank({
    required String name,
    String? description,
    required String type,
  }) {
    return _apiClient.post<QuestionBank>(
      ApiConstants.banks,
      data: {
        'name': name,
        if (description != null && description.isNotEmpty) 'description': description,
        'type': type,
      },
      parser: (data) => QuestionBank.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<List<QuestionBank>> searchBanks(String query) {
    return _apiClient.get<List<QuestionBank>>(
      '${ApiConstants.banks}/search',
      queryParameters: {'q': query},
      parser: (data) {
        final list = data as List<dynamic>;
        return list
            .map((e) => QuestionBank.fromJson(e as Map<String, dynamic>))
            .toList();
      },
    );
  }

  Future<void> requestAccess(String bankId) {
    return _apiClient.post<void>(
      '${ApiConstants.banks}/$bankId/request-access',
    );
  }
}
