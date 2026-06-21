part of 'ai_chat_bloc.dart';

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
