import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get_it/get_it.dart';
import '../../core/network/ai_service.dart';
import '../blocs/ai_chat/ai_chat_bloc.dart';
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

  AIService get _aiService => GetIt.instance<AIService>();

  @override
  void initState() {
    super.initState();
    _bloc = AIChatBloc(aiService: _aiService);

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
        if (mounted) {
          _scrollController.animateTo(
            _scrollController.position.maxScrollExtent,
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOut,
          );
        }
      });
    }
  }

  Widget _buildTypingIndicator() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _buildDot(0),
                const SizedBox(width: 4),
                _buildDot(1),
                const SizedBox(width: 4),
                _buildDot(2),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDot(int index) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.0, end: 1.0),
      duration: Duration(milliseconds: 600 + index * 200),
      builder: (context, value, child) {
        return Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            color: Color.lerp(
              const Color(0xFF6366F1).withValues(alpha: 0.3),
              const Color(0xFF6366F1),
              value,
            )!,
            shape: BoxShape.circle,
          ),
        );
      },
    );
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
            IconButton(
              icon: const Icon(Icons.delete_outline, color: Colors.white70),
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: const Text('Clear conversation?'),
                    content: const Text('This will delete all messages in the current conversation.'),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(ctx),
                        child: const Text('Cancel'),
                      ),
                      ElevatedButton(
                        onPressed: () {
                          Navigator.pop(ctx);
                          _bloc.add(const AIChatClearConversation());
                        },
                        child: const Text('Clear'),
                      ),
                    ],
                  ),
                );
              },
              tooltip: 'Clear conversation',
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
                      child:
                          CircularProgressIndicator(color: Color(0xFF6366F1)),
                    );
                  }

                  if (state is AIChatLoaded) {
                    if (state.messages.isEmpty && !state.isSending) {
                      return _buildEmptyState();
                    }

                    return ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      itemCount: state.messages.length + (state.isSending ? 1 : 0),
                      itemBuilder: (context, index) {
                        if (state.isSending && index == state.messages.length) {
                          return _buildTypingIndicator();
                        }
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
              'AI Tutor san sang ho tro!',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            const Text(
              'Hoi ve bai thi, giai thich dap an, hay bat ky cau hoi nao ve kien thuc.',
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
      'Giai thich dap an bai thi',
      'Toi sai o dau?',
      'Lam sao cai thien diem so?',
      'On tap chu de yeu',
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
                    leading:
                        const Icon(Icons.chat, color: Color(0xFF6366F1)),
                    title: Text(
                      conv.examId != null
                          ? 'Exam ${conv.examId}'
                          : 'General Chat',
                      style: const TextStyle(color: Colors.white),
                    ),
                    subtitle: Text(
                      conv.lastMessageAt != null
                          ? _formatDateTime(conv.lastMessageAt!)
                          : 'New conversation',
                      style:
                          const TextStyle(color: Colors.white38, fontSize: 12),
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
