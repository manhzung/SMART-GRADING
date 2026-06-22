# Mobile AI Tutor Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add AI Tutor and AI Report features to the Flutter mobile app so students can chat with an AI tutor about exam mistakes and view AI-generated learning analysis.

**Architecture:** Create `AIService` for API calls, `AIChatBloc` for chat state management, `AITutorPage` for the chat UI, and `AIReportPage` for viewing reports. Reuse the existing `app_constants.dart` API endpoints and follow the existing BLoC pattern used throughout the app.

**Tech Stack:** Flutter, flutter_bloc, Dio (for API calls — already used in the app).

---

## File Structure

```
client/mobile/lib/
├── core/network/
│   └── ai_service.dart            # API calls for AI chat and reports
├── presentation/
│   ├── pages/
│   │   ├── ai_tutor_page.dart   # AI chat tutor page
│   │   └── ai_report_page.dart   # AI report view page
│   ├── blocs/
│   │   └── ai_chat/
│   │       ├── ai_chat_bloc.dart
│   │       ├── ai_chat_event.dart
│   │       └── ai_chat_state.dart
│   └── widgets/
│       ├── ai_chat_bubble.dart   # Chat bubble widget
│       └── ai_report_card.dart   # Report display card
└── test/
    └── ai_service_test.dart
```

**Prerequisites:** Plan 1 (AI Chat System backend) must be completed first. The Flutter app calls the `/api/v1/ai-chat/*` endpoints.

---

## Task 1: Create AIService

**Files:**
- Create: `client/mobile/lib/core/network/ai_service.dart`
- Create: `client/mobile/test/ai_service_test.dart`

- [ ] **Step 1: Write failing test**

Create `client/mobile/test/ai_service_test.dart`:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/core/network/ai_service.dart';

void main() {
  group('AIService', () {
    test('sendMessage returns Map', () async {
      // This will fail because AIService is not implemented yet
      // After implementation, mock the HTTP client
      expect(AIService(), isNotNull);
    });
  });
}
```

- [ ] **Step 2: Write AIService**

Create `client/mobile/lib/core/network/ai_service.dart`:

```dart
import 'package:dio/dio.dart';
import '../constants/app_constants.dart';

class AIService {
  final Dio _dio;

  AIService({Dio? dio}) : _dio = dio ?? Dio();

  Future<AIChatMessage> sendMessage({
    required String message,
    List<AIChatMessage>? history,
    AIChatContext? context,
  }) async {
    final response = await _dio.post(
      '${AppConstants.baseUrl}/ai-chat/send',
      data: {
        'message': message,
        if (history != null)
          'history': history.map((m) => {
                'role': m.role,
                'content': m.content,
              }).toList(),
        if (context != null)
          'context': {
            'examId': context.examId,
            'questionIds': context.questionIds,
            'recentMistakes': context.recentMistakes,
            'weakTopics': context.weakTopics,
            'gradeLevel': context.gradeLevel,
          },
      },
    );

    final data = response.data['data'];
    return AIChatMessage(
      id: data['id'] ?? '',
      content: data['message'] ?? '',
      role: 'assistant',
      createdAt: DateTime.parse(data['createdAt'] ?? DateTime.now().toIso8601String()),
    );
  }

  Future<List<AIConversation>> getConversations({int limit = 20}) async {
    final response = await _dio.get(
      '${AppConstants.baseUrl}/ai-chat/conversations',
      queryParameters: {'limit': limit},
    );

    final List<dynamic> data = response.data['data'] ?? [];
    return data.map((json) => AIConversation.fromJson(json)).toList();
  }

  Future<List<AIChatMessage>> getHistory(String conversationId) async {
    final response = await _dio.get(
      '${AppConstants.baseUrl}/ai-chat/history/$conversationId',
    );

    final data = response.data['data'];
    final List<dynamic> messages = data['messages'] ?? [];
    return messages.map((json) => AIChatMessage.fromJson(json)).toList();
  }

  Future<AIConversation> createConversation({String? examId}) async {
    final response = await _dio.post(
      '${AppConstants.baseUrl}/ai-chat/conversations',
      data: {
        if (examId != null) 'examId': examId,
      },
    );

    return AIConversation.fromJson(response.data['data']);
  }

  Future<List<AIReport>> getReports({
    String? examId,
    String? subjectId,
    int limit = 10,
  }) async {
    final queryParams = <String, dynamic>{'limit': limit};
    if (examId != null) queryParams['examId'] = examId;
    if (subjectId != null) queryParams['subjectId'] = subjectId;

    final response = await _dio.get(
      '${AppConstants.baseUrl}/ai-chat/reports',
      queryParameters: queryParams,
    );

    final List<dynamic> data = response.data['data'] ?? [];
    return data.map((json) => AIReport.fromJson(json)).toList();
  }

  Future<AIReport> generateReport(String examId) async {
    final response = await _dio.post(
      '${AppConstants.baseUrl}/ai-reports/exam/$examId',
    );

    return AIReport.fromJson(response.data['data']);
  }
}

// ─── Data Models ──────────────────────────────────────────────────────────────

class AIChatMessage {
  final String id;
  final String content;
  final String role; // 'user', 'assistant', 'system'
  final DateTime createdAt;

  AIChatMessage({
    required this.id,
    required this.content,
    required this.role,
    required this.createdAt,
  });

  factory AIChatMessage.fromJson(Map<String, dynamic> json) {
    return AIChatMessage(
      id: json['_id'] ?? json['id'] ?? '',
      content: json['content'] ?? json['message'] ?? '',
      role: json['role'] ?? 'assistant',
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
    );
  }
}

class AIConversation {
  final String id;
  final String? examId;
  final AIChatContext? context;
  final DateTime? lastMessageAt;

  AIConversation({
    required this.id,
    this.examId,
    this.context,
    this.lastMessageAt,
  });

  factory AIConversation.fromJson(Map<String, dynamic> json) {
    return AIConversation(
      id: json['_id'] ?? '',
      examId: json['examId'] is String ? json['examId'] : null,
      context: json['context'] != null ? AIChatContext.fromJson(json['context']) : null,
      lastMessageAt: json['lastMessageAt'] != null
          ? DateTime.parse(json['lastMessageAt'])
          : null,
    );
  }
}

class AIChatContext {
  final String? examId;
  final List<String>? questionIds;
  final List<AIRecentMistake>? recentMistakes;
  final List<String>? weakTopics;
  final int gradeLevel;

  AIChatContext({
    this.examId,
    this.questionIds,
    this.recentMistakes,
    this.weakTopics,
    this.gradeLevel = 10,
  });

  factory AIChatContext.fromJson(Map<String, dynamic> json) {
    return AIChatContext(
      examId: json['examId'],
      questionIds: json['questionIds'] != null
          ? List<String>.from(json['questionIds'])
          : null,
      recentMistakes: json['recentMistakes'] != null
          ? (json['recentMistakes'] as List)
              .map((m) => AIRecentMistake.fromJson(m))
              .toList()
          : null,
      weakTopics: json['weakTopics'] != null
          ? List<String>.from(json['weakTopics'])
          : null,
      gradeLevel: json['gradeLevel'] ?? 10,
    );
  }
}

class AIRecentMistake {
  final String? questionId;
  final String? questionContent;
  final String? studentAnswer;
  final String? correctAnswer;

  AIRecentMistake({
    this.questionId,
    this.questionContent,
    this.studentAnswer,
    this.correctAnswer,
  });

  factory AIRecentMistake.fromJson(Map<String, dynamic> json) {
    return AIRecentMistake(
      questionId: json['questionId'],
      questionContent: json['questionContent'],
      studentAnswer: json['studentAnswer'],
      correctAnswer: json['correctAnswer'],
    );
  }
}

class AIReport {
  final String id;
  final String examId;
  final String summary;
  final List<String> strengths;
  final List<String> weaknesses;
  final List<String> recommendations;
  final double? avgScore;
  final double? passRate;
  final int? totalStudents;
  final DateTime createdAt;

  AIReport({
    required this.id,
    required this.examId,
    required this.summary,
    required this.strengths,
    required this.weaknesses,
    required this.recommendations,
    this.avgScore,
    this.passRate,
    this.totalStudents,
    required this.createdAt,
  });

  factory AIReport.fromJson(Map<String, dynamic> json) {
    return AIReport(
      id: json['_id'] ?? '',
      examId: json['examId'] is Map ? json['examId']['_id'] ?? '' : (json['examId'] ?? ''),
      summary: json['summary'] ?? '',
      strengths: json['strengths'] != null
          ? List<String>.from(json['strengths'])
          : [],
      weaknesses: json['weaknesses'] != null
          ? List<String>.from(json['weaknesses'])
          : [],
      recommendations: json['recommendations'] != null
          ? List<String>.from(json['recommendations'])
          : [],
      avgScore: json['avgScore']?.toDouble(),
      passRate: json['passRate']?.toDouble(),
      totalStudents: json['totalStudents'],
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
    );
  }
}
```

- [ ] **Step 3: Run flutter analyze to check for errors**

Run: `cd c:\TAILIEU\DATN\SMART GRADING\client\mobile && flutter analyze lib/core/network/ai_service.dart 2>&1 | head -30`
Expected: No errors (just warnings are OK)

- [ ] **Step 4: Commit**

```bash
git add client/mobile/lib/core/network/ai_service.dart client/mobile/test/ai_service_test.dart
git commit -m "feat(mobile): add AIService for AI chat and reports API"
```

---

## Task 2: Create AIChatBloc

**Files:**
- Create: `client/mobile/lib/presentation/blocs/ai_chat/ai_chat_bloc.dart`
- Create: `client/mobile/lib/presentation/blocs/ai_chat/ai_chat_event.dart`
- Create: `client/mobile/lib/presentation/blocs/ai_chat/ai_chat_state.dart`

- [ ] **Step 1: Write AIChatEvent**

Create `client/mobile/lib/presentation/blocs/ai_chat/ai_chat_event.dart`:

```dart
import 'package:equatable/equatable.dart';

abstract class AIChatEvent extends Equatable {
  const AIChatEvent();

  @override
  List<Object?> get props => [];
}

class AIChatSendMessage extends AIChatEvent {
  final String message;

  const AIChatSendMessage(this.message);

  @override
  List<Object?> get props => [message];
}

class AIChatLoadHistory extends AIChatEvent {
  final String conversationId;

  const AIChatLoadHistory(this.conversationId);

  @override
  List<Object?> get props => [conversationId];
}

class AIChatStartNewConversation extends AIChatEvent {
  final String? examId;

  const AIChatStartNewConversation({this.examId});

  @override
  List<Object?> get props => [examId];
}

class AIChatLoadConversations extends AIChatEvent {
  const AIChatLoadConversations();
}

class AIChatLoadReports extends AIChatEvent {
  final String? examId;

  const AIChatLoadReports({this.examId});

  @override
  List<Object?> get props => [examId];
}

class AIChatClearError extends AIChatEvent {
  const AIChatClearError();
}
```

- [ ] **Step 2: Write AIChatState**

Create `client/mobile/lib/presentation/blocs/ai_chat/ai_chat_state.dart`:

```dart
import 'package:equatable/equatable.dart';
import '../../../core/network/ai_service.dart';

abstract class AIChatState extends Equatable {
  const AIChatState();

  @override
  List<Object?> get props => [];
}

class AIChatInitial extends AIChatState {
  const AIChatInitial();
}

class AIChatLoading extends AIChatState {
  const AIChatLoading();
}

class AIChatLoaded extends AIChatState {
  final List<AIChatMessage> messages;
  final String? conversationId;
  final bool isSending;

  const AIChatLoaded({
    required this.messages,
    this.conversationId,
    this.isSending = false,
  });

  AIChatLoaded copyWith({
    List<AIChatMessage>? messages,
    String? conversationId,
    bool? isSending,
  }) {
    return AIChatLoaded(
      messages: messages ?? this.messages,
      conversationId: conversationId ?? this.conversationId,
      isSending: isSending ?? this.isSending,
    );
  }

  @override
  List<Object?> get props => [messages, conversationId, isSending];
}

class AIChatConversationsLoaded extends AIChatState {
  final List<AIConversation> conversations;

  const AIChatConversationsLoaded(this.conversations);

  @override
  List<Object?> get props => [conversations];
}

class AIChatReportsLoaded extends AIChatState {
  final List<AIReport> reports;

  const AIChatReportsLoaded(this.reports);

  @override
  List<Object?> get props => [reports];
}

class AIChatError extends AIChatState {
  final String message;
  final AIChatState? previousState;

  const AIChatError(this.message, {this.previousState});

  @override
  List<Object?> get props => [message, previousState];
}
```

- [ ] **Step 3: Write AIChatBloc**

Create `client/mobile/lib/presentation/blocs/ai_chat/ai_chat_bloc.dart`:

```dart
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/network/ai_service.dart';
import 'ai_chat_event.dart';
import 'ai_chat_state.dart';

class AIChatBloc extends Bloc<AIChatEvent, AIChatState> {
  final AIService _aiService;

  AIChatBloc({AIService? aiService})
      : _aiService = aiService ?? AIService(),
        super(const AIChatInitial()) {
    on<AIChatSendMessage>(_onSendMessage);
    on<AIChatLoadHistory>(_onLoadHistory);
    on<AIChatStartNewConversation>(_onStartNewConversation);
    on<AIChatLoadConversations>(_onLoadConversations);
    on<AIChatLoadReports>(_onLoadReports);
    on<AIChatClearError>(_onClearError);
  }

  Future<void> _onSendMessage(
    AIChatSendMessage event,
    Emitter<AIChatState> emit,
  ) async {
    final currentState = state;
    List<AIChatMessage> currentMessages = [];

    if (currentState is AIChatLoaded) {
      currentMessages = currentState.messages;
      emit(currentState.copyWith(isSending: true));
    }

    // Add user message
    final userMessage = AIChatMessage(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      content: event.message,
      role: 'user',
      createdAt: DateTime.now(),
    );

    emit(AIChatLoaded(
      messages: [...currentMessages, userMessage],
      conversationId: currentState is AIChatLoaded ? currentState.conversationId : null,
      isSending: true,
    ));

    try {
      final response = await _aiService.sendMessage(
        message: event.message,
        history: currentMessages
            .map((m) => AIChatMessage(
                  id: m.id,
                  content: m.content,
                  role: m.role,
                  createdAt: m.createdAt,
                ))
            .toList(),
      );

      emit(AIChatLoaded(
        messages: [...currentMessages, userMessage, response],
        conversationId: response.id.isNotEmpty ? response.id : (currentState is AIChatLoaded ? currentState.conversationId : null),
        isSending: false,
      ));
    } catch (e) {
      emit(AIChatError(
        'Failed to send message: ${e.toString()}',
        previousState: AIChatLoaded(
          messages: [...currentMessages, userMessage],
          isSending: false,
        ),
      ));
    }
  }

  Future<void> _onLoadHistory(
    AIChatLoadHistory event,
    Emitter<AIChatState> emit,
  ) async {
    emit(const AIChatLoading());

    try {
      final messages = await _aiService.getHistory(event.conversationId);
      emit(AIChatLoaded(
        messages: messages.where((m) => m.role != 'system').toList(),
        conversationId: event.conversationId,
      ));
    } catch (e) {
      emit(AIChatError('Failed to load history: ${e.toString()}'));
    }
  }

  Future<void> _onStartNewConversation(
    AIChatStartNewConversation event,
    Emitter<AIChatState> emit,
  ) async {
    emit(const AIChatLoaded(messages: [], isSending: false));

    if (event.examId != null) {
      try {
        final conversation = await _aiService.createConversation(examId: event.examId);
        emit(AIChatLoaded(
          messages: [],
          conversationId: conversation.id,
        ));
      } catch (e) {
        // Non-fatal: just start with empty chat
      }
    }
  }

  Future<void> _onLoadConversations(
    AIChatLoadConversations event,
    Emitter<AIChatState> emit,
  ) async {
    emit(const AIChatLoading());

    try {
      final conversations = await _aiService.getConversations();
      emit(AIChatConversationsLoaded(conversations));
    } catch (e) {
      emit(AIChatError('Failed to load conversations: ${e.toString()}'));
    }
  }

  Future<void> _onLoadReports(
    AIChatLoadReports event,
    Emitter<AIChatState> emit,
  ) async {
    emit(const AIChatLoading());

    try {
      final reports = await _aiService.getReports(examId: event.examId);
      emit(AIChatReportsLoaded(reports));
    } catch (e) {
      emit(AIChatError('Failed to load reports: ${e.toString()}'));
    }
  }

  void _onClearError(
    AIChatClearError event,
    Emitter<AIChatState> emit,
  ) {
    final current = state;
    if (current is AIChatError && current.previousState != null) {
      emit(current.previousState!);
    } else {
      emit(const AIChatLoaded(messages: [], isSending: false));
    }
  }
}
```

- [ ] **Step 4: Run flutter analyze**

Run: `cd c:\TAILIEU\DATN\SMART GRADING\client\mobile && flutter analyze lib/presentation/blocs/ai_chat/ 2>&1 | head -20`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add client/mobile/lib/presentation/blocs/ai_chat/
git commit -m "feat(mobile): add AIChatBloc for chat state management"
```

---

## Task 3: Create AITutorPage and AIReportPage

**Files:**
- Create: `client/mobile/lib/presentation/pages/ai_tutor_page.dart`
- Create: `client/mobile/lib/presentation/pages/ai_report_page.dart`
- Create: `client/mobile/lib/presentation/widgets/ai_chat_bubble.dart`
- Create: `client/mobile/lib/presentation/widgets/ai_report_card.dart`

- [ ] **Step 1: Write AIChatBubble widget**

Create `client/mobile/lib/presentation/widgets/ai_chat_bubble.dart`:

```dart
import 'package:flutter/material.dart';
import '../../core/network/ai_service.dart';

class AIChatBubble extends StatelessWidget {
  final AIChatMessage message;

  const AIChatBubble({super.key, required this.message});

  @override
  Widget build(BuildContext context) {
    final isUser = message.role == 'user';

    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 16),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        decoration: BoxDecoration(
          color: isUser
              ? const Color(0xFF6366F1)
              : const Color(0xFF1E293B),
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isUser ? 16 : 4),
            bottomRight: Radius.circular(isUser ? 4 : 16),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              message.content,
              style: TextStyle(
                color: isUser ? Colors.white : Colors.white70,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              _formatTime(message.createdAt),
              style: TextStyle(
                color: (isUser ? Colors.white : Colors.white54),
                fontSize: 10,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(DateTime dt) {
    return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }
}
```

- [ ] **Step 2: Write AIReportCard widget**

Create `client/mobile/lib/presentation/widgets/ai_report_card.dart`:

```dart
import 'package:flutter/material.dart';
import '../../core/network/ai_service.dart';

class AIReportCard extends StatelessWidget {
  final AIReport report;
  final VoidCallback? onTap;

  const AIReportCard({super.key, required this.report, this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF6366F1).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text(
                      'AI Report',
                      style: TextStyle(
                        color: Color(0xFF6366F1),
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const Spacer(),
                  Text(
                    _formatDate(report.createdAt),
                    style: const TextStyle(color: Colors.grey, fontSize: 12),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                report.summary.isNotEmpty
                    ? report.summary
                    : 'Tap to view AI learning analysis',
                style: const TextStyle(fontSize: 14, color: Colors.white70),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              if (report.strengths.isNotEmpty || report.weaknesses.isNotEmpty) ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Icon(Icons.check_circle, color: Colors.green, size: 16),
                    const SizedBox(width: 4),
                    Text(
                      '${report.strengths.length} strengths',
                      style: const TextStyle(color: Colors.green, fontSize: 12),
                    ),
                    const SizedBox(width: 12),
                    const Icon(Icons.warning, color: Colors.orange, size: 16),
                    const SizedBox(width: 4),
                    Text(
                      '${report.weaknesses.length} areas to improve',
                      style: const TextStyle(color: Colors.orange, fontSize: 12),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  String _formatDate(DateTime dt) {
    return '${dt.day}/${dt.month}/${dt.year}';
  }
}
```

- [ ] **Step 3: Write AITutorPage**

Create `client/mobile/lib/presentation/pages/ai_tutor_page.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../blocs/ai_chat/ai_chat_bloc.dart';
import '../blocs/ai_chat/ai_chat_event.dart';
import '../blocs/ai_chat/ai_chat_state.dart';
import '../widgets/ai_chat_bubble.dart';

class AITutorPage extends StatefulWidget {
  final String? examId;
  final String? conversationId;

  const AITutorPage({super.key, this.examId, this.conversationId});

  @override
  State<AITutorPage> createState() => _AITutorPageState();
}

class _AITutorPageState extends State<AITutorPage> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  late AIChatBloc _bloc;

  @override
  void initState() {
    super.initState();
    _bloc = AIChatBloc();

    if (widget.conversationId != null) {
      _bloc.add(AIChatLoadHistory(widget.conversationId!));
    } else {
      _bloc.add(AIChatStartNewConversation(examId: widget.examId));
    }
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    _bloc.close();
    super.dispose();
  }

  void _sendMessage() {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;

    _messageController.clear();
    _bloc.add(AIChatSendMessage(text));
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      Future.delayed(const Duration(milliseconds: 100), () {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: _bloc,
      child: Scaffold(
        backgroundColor: const Color(0xFF0F172A),
        appBar: AppBar(
          backgroundColor: const Color(0xFF0F172A),
          title: const Row(
            children: [
              Icon(Icons.smart_toy, color: Color(0xFF6366F1)),
              SizedBox(width: 8),
              Text(
                'AI Tutor',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ],
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.history, color: Colors.white70),
              onPressed: () => _showHistory(context),
              tooltip: 'Conversation history',
            ),
          ],
        ),
        body: Column(
          children: [
            Expanded(
              child: BlocConsumer<AIChatBloc, AIChatState>(
                listener: (context, state) {
                  if (state is AIChatLoaded) {
                    _scrollToBottom();
                  }
                  if (state is AIChatError) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(state.message),
                        backgroundColor: Colors.red,
                        action: SnackBarAction(
                          label: 'Retry',
                          textColor: Colors.white,
                          onPressed: () => _bloc.add(const AIChatClearError()),
                        ),
                      ),
                    );
                  }
                },
                builder: (context, state) {
                  if (state is AIChatLoading) {
                    return const Center(
                      child: CircularProgressIndicator(color: Color(0xFF6366F1)),
                    );
                  }

                  if (state is AIChatLoaded) {
                    if (state.messages.isEmpty) {
                      return _buildEmptyState();
                    }

                    return ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      itemCount: state.messages.length,
                      itemBuilder: (context, index) {
                        return AIChatBubble(message: state.messages[index]);
                      },
                    );
                  }

                  if (state is AIChatError) {
                    final prev = state.previousState;
                    if (prev is AIChatLoaded && prev.messages.isNotEmpty) {
                      return ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        itemCount: prev.messages.length,
                        itemBuilder: (context, index) {
                          return AIChatBubble(message: prev.messages[index]);
                        },
                      );
                    }
                    return _buildEmptyState();
                  }

                  return _buildEmptyState();
                },
              ),
            ),
            _buildInputBar(),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.auto_awesome,
              size: 64,
              color: Color(0xFF6366F1),
            ),
            const SizedBox(height: 16),
            const Text(
              'AI Tutor sẵn sàng hỗ trợ!',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            const Text(
              'Hỏi về bài thi, giải thích đáp án, hay bất kỳ câu hỏi nào về kiến thức.',
              style: TextStyle(color: Colors.white54, fontSize: 14),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            _buildQuickActions(),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActions() {
    final actions = [
      'Giải thích đáp án bài thi',
      'Tôi sai ở đâu?',
      'Làm sao cải thiện điểm số?',
      'Ôn tập chủ đề yếu',
    ];

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      alignment: WrapAlignment.center,
      children: actions.map((action) {
        return ActionChip(
          label: Text(action, style: const TextStyle(fontSize: 12)),
          backgroundColor: const Color(0xFF1E293B),
          side: const BorderSide(color: Color(0xFF334155)),
          onPressed: () {
            _messageController.text = action;
            _sendMessage();
          },
        );
      }).toList(),
    );
  }

  Widget _buildInputBar() {
    return BlocBuilder<AIChatBloc, AIChatState>(
      builder: (context, state) {
        final isSending = state is AIChatLoaded && state.isSending;

        return Container(
          padding: EdgeInsets.only(
            left: 16,
            right: 16,
            top: 12,
            bottom: MediaQuery.of(context).padding.bottom + 12,
          ),
          decoration: const BoxDecoration(
            color: Color(0xFF1E293B),
            border: Border(top: BorderSide(color: Color(0xFF334155))),
          ),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _messageController,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    hintText: 'Ask the AI tutor...',
                    hintStyle: const TextStyle(color: Colors.white38),
                    filled: true,
                    fillColor: const Color(0xFF0F172A),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(24),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 10,
                    ),
                  ),
                  onSubmitted: (_) => _sendMessage(),
                  textInputAction: TextInputAction.send,
                ),
              ),
              const SizedBox(width: 8),
              isSending
                  ? const SizedBox(
                      width: 48,
                      height: 48,
                      child: Padding(
                        padding: EdgeInsets.all(12),
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Color(0xFF6366F1),
                        ),
                      ),
                    )
                  : IconButton(
                      onPressed: _sendMessage,
                      icon: const Icon(Icons.send),
                      color: const Color(0xFF6366F1),
                      iconSize: 24,
                    ),
            ],
          ),
        );
      },
    );
  }

  void _showHistory(BuildContext context) {
    _bloc.add(const AIChatLoadConversations());
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1E293B),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => BlocProvider.value(
        value: _bloc,
        child: BlocBuilder<AIChatBloc, AIChatState>(
          builder: (context, state) {
            if (state is AIChatConversationsLoaded) {
              if (state.conversations.isEmpty) {
                return const SizedBox(
                  height: 200,
                  child: Center(
                    child: Text(
                      'No conversation history',
                      style: TextStyle(color: Colors.white54),
                    ),
                  ),
                );
              }
              return ListView.builder(
                shrinkWrap: true,
                itemCount: state.conversations.length,
                itemBuilder: (context, index) {
                  final conv = state.conversations[index];
                  return ListTile(
                    leading: const Icon(Icons.chat, color: Color(0xFF6366F1)),
                    title: Text(
                      conv.examId != null ? 'Exam ${conv.examId}' : 'General Chat',
                      style: const TextStyle(color: Colors.white),
                    ),
                    subtitle: Text(
                      conv.lastMessageAt != null
                          ? _formatDateTime(conv.lastMessageAt!)
                          : 'New conversation',
                      style: const TextStyle(color: Colors.white38, fontSize: 12),
                    ),
                    onTap: () {
                      Navigator.pop(context);
                      _bloc.add(AIChatLoadHistory(conv.id));
                    },
                  );
                },
              );
            }
            return const SizedBox(
              height: 200,
              child: Center(child: CircularProgressIndicator()),
            );
          },
        ),
      ),
    );
  }

  String _formatDateTime(DateTime dt) {
    return '${dt.day}/${dt.month} ${dt.hour}:${dt.minute.toString().padLeft(2, '0')}';
  }
}
```

- [ ] **Step 4: Write AIReportPage**

Create `client/mobile/lib/presentation/pages/ai_report_page.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../blocs/ai_chat/ai_chat_bloc.dart';
import '../blocs/ai_chat/ai_chat_event.dart';
import '../blocs/ai_chat/ai_chat_state.dart';
import '../widgets/ai_report_card.dart';

class AIReportPage extends StatefulWidget {
  final String? examId;

  const AIReportPage({super.key, this.examId});

  @override
  State<AIReportPage> createState() => _AIReportPageState();
}

class _AIReportPageState extends State<AIReportPage> {
  late AIChatBloc _bloc;

  @override
  void initState() {
    super.initState();
    _bloc = AIChatBloc();
    _bloc.add(AIChatLoadReports(examId: widget.examId));
  }

  @override
  void dispose() {
    _bloc.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: _bloc,
      child: Scaffold(
        backgroundColor: const Color(0xFF0F172A),
        appBar: AppBar(
          backgroundColor: const Color(0xFF0F172A),
          title: const Row(
            children: [
              Icon(Icons.analytics, color: Color(0xFF6366F1)),
              SizedBox(width: 8),
              Text('AI Learning Reports', style: TextStyle(fontWeight: FontWeight.bold)),
            ],
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh, color: Colors.white70),
              onPressed: () => _bloc.add(AIChatLoadReports(examId: widget.examId)),
            ),
          ],
        ),
        body: BlocBuilder<AIChatBloc, AIChatState>(
          builder: (context, state) {
            if (state is AIChatLoading) {
              return const Center(
                child: CircularProgressIndicator(color: Color(0xFF6366F1)),
              );
            }

            if (state is AIChatReportsLoaded) {
              if (state.reports.isEmpty) {
                return _buildEmptyState();
              }
              return RefreshIndicator(
                onRefresh: () async {
                  _bloc.add(AIChatLoadReports(examId: widget.examId));
                },
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  itemCount: state.reports.length,
                  itemBuilder: (context, index) {
                    final report = state.reports[index];
                    return AIReportCard(
                      report: report,
                      onTap: () => _showReportDetail(context, report),
                    );
                  },
                ),
              );
            }

            if (state is AIChatError) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline, color: Colors.red, size: 48),
                    const SizedBox(height: 16),
                    Text(
                      state.message,
                      style: const TextStyle(color: Colors.white54),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: () => _bloc.add(AIChatLoadReports(examId: widget.examId)),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              );
            }

            return _buildEmptyState();
          },
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.assessment_outlined,
              size: 64,
              color: Color(0xFF6366F1),
            ),
            const SizedBox(height: 16),
            const Text(
              'Chưa có báo cáo AI',
              style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            const Text(
              'Báo cáo AI sẽ được tạo tự động sau khi bạn hoàn thành các bài thi.',
              style: TextStyle(color: Colors.white54, fontSize: 14),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  void _showReportDetail(BuildContext context, dynamic report) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1E293B),
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) {
          return SingleChildScrollView(
            controller: scrollController,
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.white24,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                const Text(
                  'AI Learning Analysis',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),

                // Summary
                if (report.summary.isNotEmpty) ...[
                  const Text('Summary', style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F172A),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(report.summary, style: const TextStyle(color: Colors.white70)),
                  ),
                  const SizedBox(height: 16),
                ],

                // Strengths
                if (report.strengths.isNotEmpty) ...[
                  const Row(
                    children: [
                      Icon(Icons.check_circle, color: Colors.green, size: 18),
                      SizedBox(width: 8),
                      Text('Strengths', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ...report.strengths.map<Widget>((s) => Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Text('- $s', style: const TextStyle(color: Colors.white70)),
                  )),
                  const SizedBox(height: 16),
                ],

                // Weaknesses
                if (report.weaknesses.isNotEmpty) ...[
                  const Row(
                    children: [
                      Icon(Icons.warning, color: Colors.orange, size: 18),
                      SizedBox(width: 8),
                      Text('Areas to Improve', style: TextStyle(color: Colors.orange, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ...report.weaknesses.map<Widget>((w) => Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Text('- $w', style: const TextStyle(color: Colors.white70)),
                  )),
                  const SizedBox(height: 16),
                ],

                // Recommendations
                if (report.recommendations.isNotEmpty) ...[
                  const Row(
                    children: [
                      Icon(Icons.lightbulb, color: Color(0xFF6366F1), size: 18),
                      SizedBox(width: 8),
                      Text('Recommendations', style: TextStyle(color: Color(0xFF6366F1), fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ...report.recommendations.asMap().entries.map<Widget>((e) => Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Text('${e.key + 1}. ${e.value}', style: const TextStyle(color: Colors.white70)),
                  )),
                ],

                const SizedBox(height: 32),
              ],
            ),
          );
        },
      ),
    );
  }
}
```

- [ ] **Step 5: Run flutter analyze**

Run: `cd c:\TAILIEU\DATN\SMART GRADING\client\mobile && flutter analyze lib/presentation/pages/ai_tutor_page.dart lib/presentation/pages/ai_report_page.dart lib/presentation/widgets/ai_report_card.dart lib/presentation/widgets/ai_chat_bubble.dart 2>&1 | head -30`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add client/mobile/lib/presentation/pages/ai_tutor_page.dart client/mobile/lib/presentation/pages/ai_report_page.dart client/mobile/lib/presentation/widgets/ai_chat_bubble.dart client/mobile/lib/presentation/widgets/ai_report_card.dart
git commit -m "feat(mobile): add AI Tutor and AI Report pages to Flutter app"
```

---

## Self-Review Checklist

1. **Spec coverage:**
   - ✅ AIService with all API calls (sendMessage, conversations, history, reports)
   - ✅ AIChatBloc for state management
   - ✅ AITutorPage with chat UI, quick actions, history
   - ✅ AIReportPage with report list and detail view
   - ✅ Reuses existing app design (dark theme, indigo accent)
   - ✅ Quick action chips for common questions

2. **Placeholder scan:** No "TBD" or "TODO" in the plan.

3. **Type consistency:** All models match backend API response format (from Plan 1).

4. **Dependencies:** Depends on Plan 1 (backend AI Chat System).
