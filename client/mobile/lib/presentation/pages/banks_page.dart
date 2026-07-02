import 'package:flutter/material.dart';
import 'package:get_it/get_it.dart';
import '../../core/network/bank_service.dart';
import '../../domain/entities/question_bank.entity.dart';

class BanksPage extends StatefulWidget {
  const BanksPage({super.key});

  @override
  State<BanksPage> createState() => _BanksPageState();
}

class _BanksPageState extends State<BanksPage> {
  final TextEditingController _searchController = TextEditingController();
  
  List<QuestionBank> _yourBanks = [];
  List<QuestionBank> _allSystemBanks = [];
  bool _isLoading = false;
  bool _isSearching = false;
  String? _errorMessage;
  String _searchQuery = '';

  BankService get _bankService => GetIt.instance<BankService>();

  @override
  void initState() {
    super.initState();
    _loadYourBanks();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadYourBanks() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      final banks = await _bankService.listBanks();
      if (mounted) {
        setState(() {
          _yourBanks = banks;
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
        _allSystemBanks = [];
      });
      return;
    }

    setState(() {
      _isSearching = true;
      _searchQuery = query;
      _errorMessage = null;
    });

    try {
      final result = await _bankService.searchBanks(query);
      if (mounted) {
        setState(() {
          _allSystemBanks = result.results;
          _isSearching = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSearching = false;
          _errorMessage = e.toString();
        });
      }
    }
  }

  Future<void> _requestAccess(String bankId) async {
    try {
      await _bankService.requestAccess(bankId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Access request sent successfully'),
            backgroundColor: Color(0xFF16A34A),
          ),
        );
        // Remove from "All Banks" and refresh "Your Banks"
        setState(() {
          _allSystemBanks.removeWhere((b) => b.id == bankId);
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to request access: ${e.toString()}'),
            backgroundColor: const Color(0xFFDC2626),
          ),
        );
      }
    }
  }


  void _navigateToDetail(QuestionBank bank) {
    Navigator.pushNamed(
      context,
      '/banks/detail',
      arguments: {'bankId': bank.id},
    );
  }

  void _clearSearch() {
    _searchController.clear();
    setState(() {
      _searchQuery = '';
      _allSystemBanks = [];
    });
  }

  bool get _isDisplayingSearchResults => _searchQuery.isNotEmpty;

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

      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: TextField(
                controller: _searchController,
                onChanged: (value) {
                  if (value.isEmpty) {
                    _clearSearch();
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
                          onPressed: _clearSearch,
                        )
                      : null,
                ),
              ),
            ),
            Expanded(
              child: _buildBody(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBody() {
    // Loading state during initial load
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    // Error state
    if (_errorMessage != null && _yourBanks.isEmpty && _allSystemBanks.isEmpty) {
      return Center(
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
              onPressed: _loadYourBanks,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    // Search loading state
    if (_isSearching) {
      return const Center(child: CircularProgressIndicator());
    }

    // Empty state checks
    final hasYourBanks = _yourBanks.isNotEmpty;
    final hasSearchResults = _allSystemBanks.isNotEmpty;

    if (!hasYourBanks && !hasSearchResults) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.account_balance_outlined, size: 64, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            Text(
              _isDisplayingSearchResults ? 'No banks found' : 'No banks found',
              style: const TextStyle(
                fontSize: 16,
                color: Color(0xFF64748B),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _isDisplayingSearchResults
                  ? 'Try a different search term'
                  : 'Create your first bank to get started',
              style: const TextStyle(
                fontSize: 14,
                color: Color(0xFF94A3B8),
              ),
            ),
          ],
        ),
      );
    }

    // Main list content
    return RefreshIndicator(
      onRefresh: _loadYourBanks,
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        children: [
          // "Your Banks" section - shown when not searching
          if (hasYourBanks && !_isDisplayingSearchResults) ...[
            _buildSectionHeader('Your Banks', _yourBanks.length),
            ..._yourBanks.map((bank) => _buildBankCard(bank, isMember: true)),
          ],
          // "All Banks in System" section - shown when searching
          if (hasSearchResults) ...[
            if (hasYourBanks && !_isDisplayingSearchResults) const SizedBox(height: 16),
            _buildSectionHeader('All Banks in System', _allSystemBanks.length),
            ..._allSystemBanks.map((bank) => _buildBankCard(bank, isMember: false)),
          ],
          const SizedBox(height: 80),
        ],
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

  Widget _buildBankCard(QuestionBank bank, {required bool isMember}) {
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
                if (!isMember) ...[
                  const Spacer(),
                  TextButton.icon(
                    onPressed: () => _requestAccess(bank.id),
                    icon: const Icon(Icons.person_add_outlined, size: 16),
                    label: const Text('Request Access'),
                    style: TextButton.styleFrom(
                      foregroundColor: const Color(0xFF081C43),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                  ),
                ] else ...[
                  const Spacer(),
                  const Icon(
                    Icons.chevron_right,
                    size: 20,
                    color: Color(0xFF94A3B8),
                  ),
                ],
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
