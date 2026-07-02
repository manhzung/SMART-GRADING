import 'package:flutter/material.dart';
import 'package:get_it/get_it.dart';
import '../../core/network/bank_service.dart';
import '../../domain/entities/question_bank.entity.dart';
import '../widgets/create_bank_sheet.dart';

class BanksPage extends StatefulWidget {
  const BanksPage({super.key});

  @override
  State<BanksPage> createState() => _BanksPageState();
}

class _BanksPageState extends State<BanksPage> {
  final TextEditingController _searchController = TextEditingController();
  
  List<QuestionBank> _allBanks = [];
  List<QuestionBank> _filteredBanks = [];
  bool _isLoading = true;
  String? _errorMessage;
  String _searchQuery = '';

  BankService get _bankService => GetIt.instance<BankService>();

  @override
  void initState() {
    super.initState();
    _loadBanks();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadBanks() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      final banks = await _bankService.listBanks();
      if (mounted) {
        setState(() {
          _allBanks = banks;
          _applySearch();
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _searchBanks(String query) async {
    if (query.isEmpty) {
      setState(() {
        _searchQuery = '';
        _applySearch();
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _searchQuery = query;
    });

    try {
      final result = await _bankService.searchBanks(query);
      if (mounted) {
        setState(() {
          _filteredBanks = result.results;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = e.toString();
        });
      }
    }
  }

  void _applySearch() {
    if (_searchQuery.isEmpty) {
      _filteredBanks = List.from(_allBanks);
    }
  }

  List<QuestionBank> get _personalBanks {
    return _filteredBanks.where((b) => b.type == 'personal').toList();
  }

  List<QuestionBank> get _schoolBanks {
    return _filteredBanks.where((b) => b.type == 'school').toList();
  }

  void _showCreateBankSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => CreateBankSheet(
        onCreated: (bank) {
          setState(() {
            _allBanks.insert(0, bank);
            _applySearch();
          });
        },
      ),
    );
  }

  void _navigateToDetail(QuestionBank bank) {
    Navigator.pushNamed(
      context,
      '/banks/detail',
      arguments: {'bankId': bank.id},
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Question Banks',
          style: TextStyle(
            color: Color(0xFF0F172A),
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showCreateBankSheet,
        backgroundColor: const Color(0xFF081C43),
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('New Bank'),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: TextField(
                controller: _searchController,
                onChanged: (value) {
                  if (value.isEmpty) {
                    _applySearch();
                  }
                },
                onSubmitted: _searchBanks,
                decoration: InputDecoration(
                  hintText: 'Search banks...',
                  hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
                  prefixIcon: const Icon(Icons.search, color: Color(0xFF64748B)),
                  filled: true,
                  fillColor: Colors.white,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFF081C43), width: 2),
                  ),
                  suffixIcon: _searchQuery.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear, color: Color(0xFF64748B)),
                          onPressed: () {
                            _searchController.clear();
                            setState(() {
                              _searchQuery = '';
                              _applySearch();
                            });
                          },
                        )
                      : null,
                ),
              ),
            ),
            Expanded(
              child: _isLoading && _allBanks.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : _errorMessage != null && _allBanks.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.error_outline, size: 48, color: Color(0xFFDC2626)),
                              const SizedBox(height: 16),
                              const Text(
                                'Unable to load banks',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w500,
                                  color: Color(0xFF64748B),
                                ),
                              ),
                              const SizedBox(height: 8),
                              ElevatedButton(
                                onPressed: _loadBanks,
                                child: const Text('Retry'),
                              ),
                            ],
                          ),
                        )
                      : _filteredBanks.isEmpty
                          ? Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.account_balance_outlined, size: 64, color: Colors.grey.shade300),
                                  const SizedBox(height: 16),
                                  const Text(
                                    'No banks found',
                                    style: TextStyle(
                                      fontSize: 16,
                                      color: Color(0xFF64748B),
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  const Text(
                                    'Create your first bank to get started',
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: Color(0xFF94A3B8),
                                    ),
                                  ),
                                ],
                              ),
                            )
                          : RefreshIndicator(
                              onRefresh: _loadBanks,
                              child: ListView(
                                padding: const EdgeInsets.symmetric(horizontal: 16),
                                children: [
                                  if (_personalBanks.isNotEmpty) ...[
                                    _buildSectionHeader('Your Banks', _personalBanks.length),
                                    ..._personalBanks.map((bank) => _buildBankCard(bank)),
                                  ],
                                  if (_schoolBanks.isNotEmpty) ...[
                                    const SizedBox(height: 16),
                                    _buildSectionHeader('All Banks in System', _schoolBanks.length),
                                    ..._schoolBanks.map((bank) => _buildBankCard(bank)),
                                  ],
                                  const SizedBox(height: 80),
                                ],
                              ),
                            ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title, int count) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: const Color(0xFFE2E8F0),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              '$count',
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: Color(0xFF64748B),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBankCard(QuestionBank bank) {
    return GestureDetector(
      onTap: () => _navigateToDetail(bank),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    bank.name,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                ),
                _buildTypeBadge(bank.type),
              ],
            ),
            if (bank.description != null && bank.description!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                bank.description!,
                style: const TextStyle(
                  fontSize: 14,
                  color: Color(0xFF64748B),
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
            const SizedBox(height: 12),
            Row(
              children: [
                Icon(
                  bank.type == 'personal' ? Icons.person_outline : Icons.school_outlined,
                  size: 16,
                  color: const Color(0xFF94A3B8),
                ),
                const SizedBox(width: 4),
                Text(
                  bank.type == 'personal' ? 'Personal' : 'School',
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF94A3B8),
                  ),
                ),
                const Spacer(),
                const Icon(
                  Icons.chevron_right,
                  size: 20,
                  color: Color(0xFF94A3B8),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTypeBadge(String type) {
    final isPersonal = type == 'personal';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: isPersonal ? const Color(0xFFDCFCE7) : const Color(0xFFDBEAFE),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        isPersonal ? 'Personal' : 'School',
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.bold,
          color: isPersonal ? const Color(0xFF16A34A) : const Color(0xFF1D4ED8),
        ),
      ),
    );
  }
}
