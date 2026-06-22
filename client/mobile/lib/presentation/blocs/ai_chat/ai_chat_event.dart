part of 'ai_chat_bloc.dart';

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

class AIChatClearConversation extends AIChatEvent {
  const AIChatClearConversation();
}
