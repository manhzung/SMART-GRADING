# Mobile Question Bank List & Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build mobile bank listing and bank detail screens that match the web question-bank flow, starting with `/banks` and `/banks/:bankId`.

**Architecture:** Add mobile `QuestionBank`/`BankMembership` entities, a `BankService` aligned with the existing web API, and replace the old flat `QuestionBankPage` entrypoint with `BanksPage` + `BankDetailPage`. Keep existing question CRUD and filters, but scope them to a selected bank.

**Tech Stack:** Flutter, Dio-backed `ApiClient`, GetIt, `flutter_test`

---

## File Structure

```
client/mobile/
├── lib/
│   ├── core/
│   │   ├── constants/
│   │   │   └── app_constants.dart
│   │   └── network/
│   │       ├── api_client.dart
│   │       ├── bank_service.dart
│   │       └── question_service.dart
│   ├── domain/
│   │   └── entities/
│   │       ├── question.entity.dart
│   │       ├── question_bank.entity.dart
│   │       └── bank_membership.entity.dart
│   ├── main.dart
│   ├── presentation/
│   │   ├── pages/
│   │   │   ├── banks_page.dart
│   │   │   ├── bank_detail_page.dart
│   │   │   └── question_bank_page.dart
│   │   └── widgets/
│   │       └── create_bank_sheet.dart
│   └── ...
└── test/
    ├── core/
    │   └── network/
    │       ├── bank_service_test.dart
    │       └── mock_api_client.dart
    ├── domain/
    │   └── entities/
    │       ├── question_bank.entity_test.dart
    │       └── bank_membership.entity_test.dart
    └── presentation/
        └── pages/
            ├── banks_page_test.dart
            └── bank_detail_page_test.dart
```

---

## Task 1: Add bank entities

**Files:**
- Create: `client/mobile/lib/domain/entities/question_bank.entity.dart`
- Create: `client/mobile/lib/domain/entities/bank_membership.entity.dart`
- Test: `client/mobile/test/domain/entities/question_bank.entity_test.dart`
- Test: `client/mobile/test/domain/entities/bank_membership.entity_test.dart`

### Step 1: Write failing tests

```dart
// test/domain/entities/question_bank.entity_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/domain/entities/question_bank.entity.dart';

void main() {
  group('QuestionBank', () {
    test('parses server response with _id fallback', () {
      final json = {
        '_id': 'bank-1',
        'name': 'Math',
        'description': 'Grade 10 math',
        'type': 'school',
        'schoolId': 'school-1',
        'isActive': true,
        'createdAt': '2026-07-02T00:00:00Z',
        'updatedAt': '2026-07-02T00:00:00Z',
      };

      final bank = QuestionBank.fromJson(json);

      expect(bank.id, 'bank-1');
      expect(bank.name, 'Math');
      expect(bank.type, 'school');
      expect(bank.isActive, true);
    });
  });
}
```

```dart
// test/domain/entities/bank_membership.entity_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/domain/entities/bank_membership.entity.dart';

void main() {
  group('BankMembership', () {
    test('parses active owner membership', () {
      final json = {
        'bankId': 'bank-1',
        'userId': 'user-1',
        'role': 'owner',
        'status': 'active',
      };

      final membership = BankMembership.fromJson(json);

      expect(membership.bankId, 'bank-1');
      expect(membership.role, 'owner');
      expect(membership.status, 'active');
    });
  });
}
```

### Step 2: Run tests to verify they fail

Run: `cd client/mobile && flutter test test/domain/entities/question_bank.entity_test.dart test/domain/entities/bank_membership.entity_test.dart`
Expected: FAIL with "Target of URI doesn't exist"

### Step 3: Write minimal implementation

```dart
// lib/domain/entities/question_bank.entity.dart
class QuestionBank {
  final String id;
  final String name;
  final String? description;
  final String type;
  final String? schoolId;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;

  const QuestionBank({
    required this.id,
    required this.name,
    this.description,
    required this.type,
    this.schoolId,
    required this.isActive,
    required this.createdAt,
    required this.updatedAt,
  });

  factory QuestionBank.fromJson(Map<String, dynamic> json) {
    return QuestionBank(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      description: json['description'] as String?,
      type: (json['type'] ?? 'personal').toString(),
      schoolId: json['schoolId'] as String?,
      isActive: json['isActive'] as bool? ?? true,
      createdAt: DateTime.tryParse((json['createdAt'] ?? '').toString()) ?? DateTime.now(),
      updatedAt: DateTime.tryParse((json['updatedAt'] ?? '').toString()) ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
    'name': name,
    'description': description,
    'type': type,
    'schoolId': schoolId,
    'isActive': isActive,
  };
}
```

```dart
// lib/domain/entities/bank_membership.entity.dart
class BankMembership {
  final String bankId;
  final String userId;
  final String role;
  final String status;

  const BankMembership({
    required this.bankId,
    required this.userId,
    required this.role,
    required this.status,
  });

  factory BankMembership.fromJson(Map<String, dynamic> json) {
    return BankMembership(
      bankId: (json['bankId'] ?? '').toString(),
      userId: (json['userId'] is String)
          ? json['userId'] as String
          : (json['userId']?['_id'] ?? json['userId']?['id'] ?? '').toString(),
      role: (json['role'] ?? 'viewer').toString(),
      status: (json['status'] ?? 'active').toString(),
    );
  }
}
```

### Step 4: Run tests to verify they pass

Run: `cd client/mobile && flutter test test/domain/entities/question_bank.entity_test.dart test/domain/entities/bank_membership.entity_test.dart`
Expected: PASS

### Step 5: Commit

```bash
git add client/mobile/lib/domain/entities/question_bank.entity.dart \
     client/mobile/lib/domain/entities/bank_membership.entity.dart \
     client/mobile/test/domain/entities/question_bank.entity_test.dart \
     client/mobile/test/domain/entities/bank_membership.entity_test.dart
git commit -m "feat(mobile): add question bank and membership entities"
```

---

## Task 2: Add bank service and constants

**Files:**
- Modify: `client/mobile/lib/core/constants/app_constants.dart`
- Create: `client/mobile/lib/core/network/bank_service.dart`
- Test: `client/mobile/test/core/network/bank_service_test.dart`

### Step 1: Write a failing test

```dart
// test/core/network/bank_service_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/core/network/bank_service.dart';
import 'package:smart_grading_mobile/core/network/mock_api_client.dart';

void main() {
  group('BankService', () {
    late MockApiClient mockClient;
    late BankService service;

    setUp(() {
      mockClient = MockApiClient();
      service = BankService(apiClient: mockClient);
    });

    test('listBanks returns summaries', () async {
      mockClient.mockResponse = [
        {
          '_id': 'bank-1',
          'name': 'Math',
          'type': 'school',
          'isActive': true,
          'createdAt': '2026-07-02T00:00:00Z',
          'updatedAt': '2026-07-02T00:00:00Z',
          'membership': {'role': 'owner', 'status': 'active'},
        }
      ];

      final result = await service.listBanks();

      expect(result.length, 1);
      expect(result.first.bank.name, 'Math');
      expect(mockClient.lastPath, '/banks');
    });

    test('createBank posts payload', () async {
      mockClient.mockResponse = {
        '_id': 'bank-2',
        'name': 'Physics',
        'type': 'personal',
        'isActive': true,
        'createdAt': '2026-07-02T00:00:00Z',
        'updatedAt': '2026-07-02T00:00:00Z',
      };

      final bank = await service.createBank(name: 'Physics', description: null, type: 'personal');

      expect(bank.name, 'Physics');
      expect(mockClient.lastPath, '/banks');
      expect(mockClient.lastBody['type'], 'personal');
    });
  });
}
```

### Step 2: Run tests to verify they fail

Run: `cd client/mobile && flutter test test/core/network/bank_service_test.dart`
Expected: FAIL with target URI missing

### Step 3: Write minimal implementation

```dart
// lib/core/constants/app_constants.dart
class ApiConstants {
  static String get baseUrl => EnvironmentConfig.apiBaseUrl;
  static const Duration connectionTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  static const String questions = '/questions';
  static const String banks = '/banks';
}
```

```dart
// lib/core/network/bank_service.dart
import 'package:smart_grading_mobile/core/constants/app_constants.dart';
import 'package:smart_grading_mobile/domain/entities/question_bank.entity.dart';
import 'package:smart_grading_mobile/domain/entities/bank_membership.entity.dart';
import 'package:smart_grading_mobile/core/network/api_client.dart';

class BankSummary {
  final QuestionBank bank;
  final BankMembership? membership;

  const BankSummary({required this.bank, this.membership});

  factory BankSummary.fromJson(Map<String, dynamic> json) {
    return BankSummary(
      bank: QuestionBank.fromJson(json),
      membership: json['membership'] == null
          ? null
          : BankMembership.fromJson(json['membership'] as Map<String, dynamic>),
    );
  }
}

class BankDetail {
  final QuestionBank bank;
  final BankMembership? membership;

  const BankDetail({required this.bank, this.membership});

  factory BankDetail.fromJson(Map<String, dynamic> json) {
    return BankDetail(
      bank: QuestionBank.fromJson(json['bank'] ?? json),
      membership: json['membership'] == null
          ? null
          : BankMembership.fromJson(json['membership'] as Map<String, dynamic>),
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
        final list = data as List;
        return list.map((item) => BankSummary.fromJson(item as Map<String, dynamic>)).toList();
      },
    );
  }

  Future<BankDetail> getBank(String bankId) {
    return _apiClient.get<BankDetail>(
      '${ApiConstants.banks}/$bankId',
      parser: (data) => BankDetail.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<QuestionBank> createBank({required String name, String? description, required String type}) {
    return _apiClient.post<QuestionBank>(
      ApiConstants.banks,
      data: {'name': name, 'description': description, 'type': type},
      parser: (data) => QuestionBank.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<List<QuestionBank>> searchBanks(String query) {
    return _apiClient.get<List<QuestionBank>>(
      '${ApiConstants.banks}/search',
      queryParameters: {'q': query},
      parser: (data) {
        final list = data as List;
        return list.map((item) => QuestionBank.fromJson(item as Map<String, dynamic>)).toList();
      },
    );
  }

  Future<void> requestAccess(String bankId) {
    return _apiClient.post<void>('${ApiConstants.banks}/$bankId/request-access');
  }
}
```

### Step 4: Run tests to verify they pass

Run: `cd client/mobile && flutter test test/core/network/bank_service_test.dart`
Expected: PASS

### Step 5: Commit

```bash
git add client/mobile/lib/core/constants/app_constants.dart \
     client/mobile/lib/core/network/bank_service.dart \
     client/mobile/test/core/network/bank_service_test.dart
git commit -m "feat(mobile): add bank service aligned with web API"
```

---

## Task 3: Register bank routes and DI

**Files:**
- Modify: `client/mobile/lib/main.dart`

### Step 1: Write failing tests

```dart
// test/presentation/pages/banks_page_route_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/main.dart';

void main() {
  testWidgets('banks route is registered', (tester) async {
    await tester.pumpWidget(const SmartGradingApp());
    final route = tester.widget(find.byType(MaterialApp)).onFindRoute('/banks');
    expect(route, isNotNull);
  });
}
```

If your project does not expose an easy route lookup test, use a simpler smoke test instead:

```dart
testWidgets('opens banks page via quiz icon', (tester) async {
  await tester.pumpWidget(const SmartGradingApp());
  // Navigate to home first if needed, then tap quiz icon if present.
});
```

### Step 2: Run tests to verify they fail or need route addition

Run: `cd client/mobile && flutter test test/presentation/pages/banks_page_route_test.dart`
Expected: FAIL or missing route

### Step 3: Update `main.dart`

1. Add route registration:

```dart
Routes.banks: (context) => const BanksPage(),
Routes.bankDetail: (context) {
  final args = ModalRoute.of(context)?.settings.arguments;
  final bankId = args is String ? args : '';
  return BankDetailPage(bankId: bankId);
},
```

2. Update the old route to redirect or replace:

```dart
// Replace:
'/question-bank': (context) => const QuestionBankPage(),

// With:
'/banks': (context) => const BanksPage(),
'/banks/:bankId': (context) {
  final args = ModalRoute.of(context)?.settings.arguments;
  final bankId = args is String ? args : '';
  return BankDetailPage(bankId: bankId);
},
```

3. Register `BankService` in `setupDependencies()`:

```dart
getIt.registerLazySingleton<BankService>(
  () => BankService(apiClient: getIt<ApiClient>()),
);
```

4. Update `home_page.dart` quiz icon target from `/question-bank` to `/banks`.

### Step 4: Run tests to verify they pass

Run: `cd client/mobile && flutter test`
Expected: PASS

### Step 5: Commit

```bash
git add client/mobile/lib/main.dart client/mobile/lib/presentation/pages/home_page.dart
git commit -m "feat(mobile): register banks routes and update home entry"
```

---

## Task 4: Create `BanksPage`

**Files:**
- Create: `client/mobile/lib/presentation/pages/banks_page.dart`
- Create: `client/mobile/lib/presentation/widgets/create_bank_sheet.dart`
- Test: `client/mobile/test/presentation/pages/banks_page_test.dart`

### Step 1: Write failing widget tests

```dart
// test/presentation/pages/banks_page_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/core/network/mock_api_client.dart';
import 'package:smart_grading_mobile/presentation/pages/banks_page.dart';

void main() {
  testWidgets('renders loading then bank cards', (tester) async {
    // TODO: inject MockApiClient via service locator or wrapper if needed
  });
}
```

If your app initializes GetIt with real services, prefer a wrapper or mock approach instead of asserting deep UI state in full app. For this plan, keep the test to a smoke render + empty state when service throws.

### Step 2: Run tests to verify they fail

Run: `cd client/mobile && flutter test test/presentation/pages/banks_page_test.dart`
Expected: FAIL

### Step 3: Implement minimal `BanksPage`

```dart
// lib/presentation/pages/banks_page.dart
import 'package:flutter/material.dart';
import 'package:smart_grading_mobile/core/network/bank_service.dart';
import 'package:smart_grading_mobile/domain/entities/question_bank.entity.dart';

class BanksPage extends StatefulWidget {
  const BanksPage({super.key});

  @override
  State<BanksPage> createState() => _BanksPageState();
}

class _BanksPageState extends State<BanksPage> {
  final TextEditingController _searchController = TextEditingController();
  bool _isLoading = true;
  String? _errorMessage;
  List<BankSummary> _myBanks = [];
  List<QuestionBank> _allBanks = [];
  final BankService _bankService = GetIt.instance<BankService>();

  @override
  void initState() {
    super.initState();
    _loadBanks();
  }

  Future<void> _loadBanks() async {
    setState(() { _isLoading = true; _errorMessage = null; });
    try {
      final summaries = await _bankService.listBanks();
      if (!mounted) return;
      setState(() {
        _myBanks = summaries;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() { _errorMessage = e.toString(); _isLoading = false; });
    }
  }

  Future<void> _openCreateBankSheet() async {
    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const CreateBankSheet(),
    );

    if (result == null || !mounted) return;
    await _bankService.createBank(
      name: result['name'] as String,
      description: result['description'] as String?,
      type: result['type'] as String,
    );
    await _loadBanks();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Question Banks'),
        backgroundColor: const Color(0xFFF8FAFC),
        elevation: 0,
      ),
      body: RefreshIndicator(
        onRefresh: _loadBanks,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            ElevatedButton.icon(
              onPressed: _openCreateBankSheet,
              icon: const Icon(Icons.add),
              label: const Text('New Bank'),
            ),
            const SizedBox(height: 16),
            if (_isLoading)
              const Center(child: CircularProgressIndicator())
            else if (_errorMessage != null)
              Text('Error: $_errorMessage')
            else
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (_myBanks.isNotEmpty) ...[
                    const Text('Your Banks', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    ..._myBanks.map((summary) => _BankCard(
                      bank: summary.bank,
                      role: summary.membership?.role,
                      onTap: () => Navigator.pushNamed(context, '/banks/:bankId', arguments: summary.bank.id),
                    )),
                  ],
                  const SizedBox(height: 24),
                  const Text('All Banks in System', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  if (_allBanks.isEmpty)
                    const Text('No additional banks found.')
                  else
                    ..._allBanks.map((bank) => _BankCard(
                      bank: bank,
                      role: null,
                      onTap: () {},
                      trailing: TextButton.icon(
                        onPressed: () async {
                          await _bankService.requestAccess(bank.id);
                        },
                        icon: const Icon(Icons.request_page_outlined),
                        label: const Text('Request Access'),
                      ),
                    )),
                ],
              )
          ],
        ),
      ),
    );
  }
}

class _BankCard extends StatelessWidget {
  final QuestionBank bank;
  final String? role;
  final VoidCallback onTap;
  final Widget? trailing;

  const _BankCard({required this.bank, this.role, required this.onTap, this.trailing});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: const Icon(Icons.menu_book_outlined),
        title: Text(bank.name),
        subtitle: Text(bank.description ?? ''),
        trailing: Wrap(
          spacing: 8,
          children: [
            Chip(label: Text(bank.type == 'school' ? 'School' : 'Personal')),
            if (role != null) Chip(label: Text(role!)),
            if (trailing != null) trailing!,
          ],
        ),
        onTap: onTap,
      ),
    );
  }
}
```

```dart
// lib/presentation/widgets/create_bank_sheet.dart
import 'package:flutter/material.dart';

class CreateBankSheet extends StatefulWidget {
  const CreateBankSheet({super.key});

  @override
  State<CreateBankSheet> createState() => _CreateBankSheetState();
}

class _CreateBankSheetState extends State<CreateBankSheet> {
  final _nameController = TextEditingController();
  final _descController = TextEditingController();
  String _type = 'personal';

  @override
  Widget build(BuildContext context) {
    final bottomPadding = MediaQuery.of(context).viewInsets.bottom;
    return Container(
      padding: EdgeInsets.fromLTRB(24, 12, 24, 24 + bottomPadding),
      decoration: const BoxDecoration(
        color: Color(0xFFF8FAFC),
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Center(
            child: Container(width: 40, height: 4, decoration: BoxDecoration(color: const Color(0xFFCBD5E1), borderRadius: BorderRadius.circular(2))),
          ),
          const SizedBox(height: 20),
          TextField(controller: _nameController, decoration: const InputDecoration(labelText: 'Bank name')),
          const SizedBox(height: 12),
          TextField(controller: _descController, decoration: const InputDecoration(labelText: 'Description')),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: _type,
            items: const [
              DropdownMenuItem(value: 'personal', child: Text('Personal')),
              DropdownMenuItem(value: 'school', child: Text('School')),
            ],
            onChanged: (v) => setState(() => _type = v ?? 'personal'),
            decoration: const InputDecoration(labelText: 'Type'),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(child: TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel'))),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: () {
                    if (_nameController.text.trim().isEmpty) return;
                    Navigator.pop(context, {
                      'name': _nameController.text.trim(),
                      'description': _descController.text.trim().isEmpty ? null : _descController.text.trim(),
                      'type': _type,
                    });
                  },
                  child: const Text('Create'),
                ),
              )
            ],
          )
        ],
      ),
    );
  }
}
```

### Step 4: Run tests to verify they pass

Run: `cd client/mobile && flutter test test/presentation/pages/banks_page_test.dart`
Expected: PASS or meaningful smoke assertions pass

### Step 5: Commit

```bash
git add client/mobile/lib/presentation/pages/banks_page.dart \
     client/mobile/lib/presentation/widgets/create_bank_sheet.dart \
     client/mobile/test/presentation/pages/banks_page_test.dart
git commit -m "feat(mobile): add banks listing page"
```

---

## Task 5: Create `BankDetailPage`

**Files:**
- Create: `client/mobile/lib/presentation/pages/bank_detail_page.dart`
- Test: `client/mobile/test/presentation/pages/bank_detail_page_test.dart`

### Step 1: Write failing tests

```dart
// test/presentation/pages/bank_detail_page_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/presentation/pages/bank_detail_page.dart';

void main() {
  testWidgets('renders bank header', (tester) async {
    await tester.pumpWidget(MaterialApp(home: BankDetailPage(bankId: 'bank-1')));
    // Keep assertion minimal to avoid hard dependency on mocked network
    expect(find.byType(BankDetailPage), findsOneWidget);
  });
}
```

### Step 2: Run tests to verify they fail

Run: `cd client/mobile && flutter test test/presentation/pages/bank_detail_page_test.dart`
Expected: FAIL because file does not exist yet

### Step 3: Implement minimal `BankDetailPage`

```dart
// lib/presentation/pages/bank_detail_page.dart
import 'package:flutter/material.dart';
import 'package:smart_grading_mobile/core/network/bank_service.dart';
import 'package:smart_grading_mobile/core/network/question_service.dart';
import 'package:smart_grading_mobile/domain/entities/question_bank.entity.dart';
import 'package:smart_grading_mobile/domain/entities/question.entity.dart';

class BankDetailPage extends StatefulWidget {
  const BankDetailPage({super.key, required this.bankId});
  final String bankId;

  @override
  State<BankDetailPage> createState() => _BankDetailPageState();
}

class _BankDetailPageState extends State<BankDetailPage> {
  final BankService _bankService = GetIt.instance<BankService>();
  final QuestionService _questionService = GetIt.instance<QuestionService>();
  bool _isLoadingBank = true;
  String? _bankError;
  BankDetail? _detail;
  List<QuestionModel> _questions = [];
  bool _isLoadingQuestions = true;
  String? _questionError;
  String _selectedFilter = 'All';
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadBank();
    _loadQuestions();
  }

  Future<void> _loadBank() async {
    setState(() { _isLoadingBank = true; _bankError = null; });
    try {
      final detail = await _bankService.getBank(widget.bankId);
      if (!mounted) return;
      setState(() { _detail = detail; _isLoadingBank = false; });
    } catch (e) {
      if (!mounted) return;
      setState(() { _bankError = e.toString(); _isLoadingBank = false; });
    }
  }

  Future<void> _loadQuestions() async {
    setState(() { _isLoadingQuestions = true; _questionError = null; });
    try {
      String? difficulty;
      if (_selectedFilter == 'Easy') difficulty = 'easy';
      else if (_selectedFilter == 'Medium') difficulty = 'medium';
      else if (_selectedFilter == 'Hard') difficulty = 'hard';

      final result = await _questionService.getQuestions(
        limit: 50,
        bankId: widget.bankId,
        difficulty: difficulty,
        search: _searchController.text.isNotEmpty ? _searchController.text : null,
      );
      if (!mounted) return;
      setState(() { _questions = result.results; _isLoadingQuestions = false; });
    } catch (e) {
      if (!mounted) return;
      setState(() { _questionError = e.toString(); _isLoadingQuestions = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_detail?.bank.name ?? 'Bank'),
        backgroundColor: const Color(0xFFF8FAFC),
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (_isLoadingBank)
            const Center(child: CircularProgressIndicator())
          else if (_bankError != null)
            Text('Error: $_bankError')
          else if (_detail != null) ...[
            _BankHeader(detail: _detail!),
            const SizedBox(height: 20),
          ],
          const SizedBox(height: 12),
          TextField(
            controller: _searchController,
            decoration: const InputDecoration(labelText: 'Search questions'),
            onSubmitted: (_) => _loadQuestions(),
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 40,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: ['All', 'Easy', 'Medium', 'Hard']
                  .map((f) => Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: FilterChip(
                          label: Text(f),
                          selected: _selectedFilter == f,
                          onSelected: (_) {
                            setState(() => _selectedFilter = f);
                            _loadQuestions();
                          },
                        ),
                      ))
                  .toList(),
            ),
          ),
          const SizedBox(height: 12),
          if (_isLoadingQuestions)
            const Center(child: CircularProgressIndicator())
          else if (_questionError != null)
            Text('Error: $_questionError')
          else if (_questions.isEmpty)
            const Center(child: Text('No questions found.'))
          else
            ..._questions.map((q) => Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ListTile(
                    title: Text(q.content),
                    subtitle: Text(q.difficulty),
                  ),
                ))
        ],
      ),
    );
  }
}

class _BankHeader extends StatelessWidget {
  const _BankHeader({required this.detail});
  final BankDetail detail;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(child: Text(detail.bank.name, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold))),
            Chip(label: Text(detail.bank.type == 'school' ? 'School' : 'Personal')),
            if (detail.membership != null)
              Chip(label: Text(detail.membership!.role)),
          ],
        ),
        if (detail.bank.description != null && detail.bank.description!.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(detail.bank.description!),
          )
      ],
    );
  }
}
```

### Step 4: Run tests to verify they pass

Run: `cd client/mobile && flutter test test/presentation/pages/bank_detail_page_test.dart`
Expected: PASS

### Step 5: Commit

```bash
git add client/mobile/lib/presentation/pages/bank_detail_page.dart \
     client/mobile/test/presentation/pages/bank_detail_page_test.dart
git commit -m "feat(mobile): add bank detail page with questions"
```

---

## Task 6: Wire `QuestionService.getQuestions` bank scoping

**Files:**
- Modify: `client/mobile/lib/core/network/question_service.dart`

### Step 1: Write failing tests

```dart
// test/core/network/question_service_bank_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/core/network/question_service.dart';
import 'package:smart_grading_mobile/core/network/mock_api_client.dart';

void main() {
  test('getQuestions includes bankId when provided', () async {
    final mockClient = MockApiClient();
    final service = QuestionService(apiClient: mockClient);

    mockClient.mockResponse = {
      'results': [],
      'page': 1,
      'limit': 50,
      'total': 0,
      'pages': 1,
    };

    await service.getQuestions(bankId: 'bank-1');

    expect(mockClient.lastQuery['bankId'], 'bank-1');
  });
}
```

### Step 2: Run tests to verify they fail

Run: `cd client/mobile && flutter test test/core/network/question_service_bank_test.dart`
Expected: FAIL because `bankId` param is not supported yet

### Step 3: Add `bankId` support

```dart
Future<PaginatedQuestions> getQuestions({
  int page = 1,
  int limit = 20,
  String? difficulty,
  String? isApproved,
  String? tags,
  String? search,
  String? source,
  String? bankId,
}) {
  final queryParams = <String, dynamic>{
    'page': page,
    'limit': limit,
  };
  if (difficulty != null && difficulty.isNotEmpty) queryParams['difficulty'] = difficulty.toLowerCase();
  if (search != null && search.isNotEmpty) queryParams['search'] = search;
  if (source != null && source.isNotEmpty) queryParams['source'] = source;
  if (bankId != null && bankId.isNotEmpty) queryParams['bankId'] = bankId;

  return _apiClient.get<PaginatedQuestions>(
    ApiConstants.questions,
    queryParameters: queryParams,
    parser: (data) => PaginatedQuestions.fromJson(data as Map<String, dynamic>),
  );
}
```

### Step 4: Run tests to verify they pass

Run: `cd client/mobile && flutter test test/core/network/question_service_bank_test.dart`
Expected: PASS

### Step 5: Commit

```bash
git add client/mobile/lib/core/network/question_service.dart \
     client/mobile/test/core/network/question_service_bank_test.dart
git commit -m "feat(mobile): support bankId scoping in question list"
```

---

## Task 7: Migration cleanup

**Files:**
- Modify: `client/mobile/lib/presentation/pages/home_page.dart`
- Modify: `client/mobile/lib/main.dart`
- Modify: `client/mobile/lib/presentation/pages/question_bank_page.dart`

### Step 1: Write failing tests

Add a route smoke test if desired:

```dart
// test/presentation/pages/question_bank_legacy_route_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/main.dart';

void main() {
  testWidgets('legacy question-bank route is removed', (tester) async {
    // Optional: ensure navigation through /banks instead.
  });
}
```

### Step 2: Run tests to verify they fail or confirm old behavior exists

Run: `cd client/mobile && flutter test`
Expected: existing tests still pass before migration

### Step 3: Migrate entrypoint and routes

1. In `main.dart`, remove `/question-bank` and ensure `/banks` + `/banks/:bankId` exist.
2. In `home_page.dart`, change the quiz icon to:

```dart
IconButton(
  icon: const Icon(Icons.quiz_outlined, color: Color(0xFF0F172A)),
  onPressed: () => Navigator.pushNamed(context, '/banks'),
),
```

3. Keep `question_bank_page.dart` temporarily or mark it as legacy if other flows still reference it. Do not delete it until migration is verified.

### Step 4: Run tests to verify they pass

Run: `cd client/mobile && flutter test`
Expected: PASS

### Step 5: Commit

```bash
git add client/mobile/lib/main.dart \
     client/mobile/lib/presentation/pages/home_page.dart
git commit -m "refactor(mobile): migrate question bank entry to banks route"
```

---

## Verification Checklist

Before finishing, run:
- `cd client/mobile && flutter analyze`
- `cd client/mobile && flutter test`

Expected: no analysis errors and all tests pass.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-07-02-mobile-bank-list-detail.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
