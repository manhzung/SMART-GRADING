import '../../core/network/api_client.dart';
import '../../core/constants/app_constants.dart';
import '../../domain/entities/question_bank.entity.dart';
import '../../domain/entities/bank_membership.entity.dart';

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

class PaginatedBanks {
  final List<QuestionBank> results;
  final int total;
  final int page;
  final int pages;

  PaginatedBanks({
    required this.results,
    required this.total,
    required this.page,
    required this.pages,
  });

  factory PaginatedBanks.fromJson(Map<String, dynamic> json) {
    return PaginatedBanks(
      results: (json['results'] as List<dynamic>)
          .map((e) => QuestionBank.fromJson(e as Map<String, dynamic>))
          .toList(),
      total: json['total'] as int? ?? 0,
      page: json['page'] as int? ?? 1,
      pages: json['pages'] as int? ?? 1,
    );
  }
}

class BankService {
  BankService({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  /// GET /banks → returns flat QuestionBank[]
  Future<List<QuestionBank>> listBanks() {
    return _apiClient.get<List<QuestionBank>>(
      ApiConstants.banks,
      parser: (data) {
        final list = data as List<dynamic>;
        return list
            .map((e) => QuestionBank.fromJson(e as Map<String, dynamic>))
            .toList();
      },
    );
  }

  /// GET /banks/:bankId → returns { bank, membership }
  Future<BankDetail> getBank(String bankId) {
    return _apiClient.get<BankDetail>(
      '${ApiConstants.banks}/$bankId',
      parser: (data) => BankDetail.fromJson(data as Map<String, dynamic>),
    );
  }

  /// POST /banks → returns flat QuestionBank
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

  /// GET /banks/search → returns { results, total, page, pages }
  Future<PaginatedBanks> searchBanks(String query) {
    return _apiClient.get<PaginatedBanks>(
      '${ApiConstants.banks}/search',
      queryParameters: {'q': query},
      parser: (data) => PaginatedBanks.fromJson(data as Map<String, dynamic>),
    );
  }

  /// POST /banks/:bankId/request-access → returns flat BankMembership
  Future<BankMembership> requestAccess(String bankId) {
    return _apiClient.post<BankMembership>(
      '${ApiConstants.banks}/$bankId/request-access',
      parser: (data) => BankMembership.fromJson(data as Map<String, dynamic>),
    );
  }
}
