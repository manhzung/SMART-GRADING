import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../core/network/ai_service.dart';
import '../../../domain/entities/ai_chat_message.entity.dart';
import '../../../domain/entities/ai_conversation.entity.dart';
import '../../../domain/entities/ai_report.entity.dart';

part 'ai_chat_event.dart';
part 'ai_chat_state.dart';

class AIChatBloc extends Bloc<AIChatEvent, AIChatState> {
  AIChatBloc({required AIService aiService})
      : _aiService = aiService,
        super(const AIChatInitial()) {
    on<AIChatSendMessage>(_onSendMessage);
    on<AIChatLoadHistory>(_onLoadHistory);
    on<AIChatStartNewConversation>(_onStartNewConversation);
    on<AIChatLoadConversations>(_onLoadConversations);
    on<AIChatLoadReports>(_onLoadReports);
    on<AIChatClearError>(_onClearError);
    on<AIChatClearConversation>(_onClearConversation);
  }

  final AIService _aiService;

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

    final userMessage = AIChatMessage(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      content: event.message,
      role: 'user',
      createdAt: DateTime.now(),
    );

    emit(AIChatLoaded(
      messages: [...currentMessages, userMessage],
      conversationId:
          currentState is AIChatLoaded ? currentState.conversationId : null,
      isSending: true,
    ));

    try {
      final response = await _aiService.sendMessage(message: event.message);

      emit(AIChatLoaded(
        messages: [...currentMessages, userMessage, response],
        conversationId: response.id.isNotEmpty
            ? response.id
            : (currentState is AIChatLoaded ? currentState.conversationId : null),
        isSending: false,
      ));
    } catch (e) {
      emit(AIChatError(
        'Failed to send message',
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
      emit(const AIChatError('Failed to load history'));
    }
  }

  Future<void> _onStartNewConversation(
    AIChatStartNewConversation event,
    Emitter<AIChatState> emit,
  ) async {
    emit(const AIChatLoaded(messages: [], isSending: false));

    if (event.examId != null) {
      try {
        final conversation =
            await _aiService.createConversation(examId: event.examId);
        emit(AIChatLoaded(
          messages: [],
          conversationId: conversation.id,
        ));
      } catch (_) {}
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
      emit(const AIChatError('Failed to load conversations'));
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
      emit(const AIChatError('Failed to load reports'));
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

  void _onClearConversation(
    AIChatClearConversation event,
    Emitter<AIChatState> emit,
  ) {
    emit(const AIChatLoaded(messages: [], isSending: false));
  }
}
