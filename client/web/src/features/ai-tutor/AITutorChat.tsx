import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  ChevronDown,
  BarChart3,
  Lightbulb,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import type { AIMessage } from '../../types';
import { aiChatService } from '../../services/ai-chat.service';
import styles from './AITutorChat.module.css';

interface ChatMessage extends AIMessage {
  _id: string;
}

interface SubjectOption {
  _id: string;
  name: string;
}

const fallbackSubjects: SubjectOption[] = [
  { _id: 'subj001', name: 'Mathematics' },
  { _id: 'subj002', name: 'Physics' },
  { _id: 'subj003', name: 'Chemistry' },
];

const initialMessages: ChatMessage[] = [
  {
    _id: 'chat-initial',
    role: 'assistant',
    content: 'Hello! I am an AI Tutor. You can request exam analysis, study suggestions, or answer explanations.',
    timestamp: new Date().toISOString(),
  },
];

interface AITutorChatProps {
  onQuickAction?: (action: string) => void;
  selectedSubject?: string;
  onSubjectChange?: (subjectId: string) => void;
}

export default function AITutorChat({
  onQuickAction,
  selectedSubject = 'subj001',
  onSubjectChange,
}: AITutorChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMsg = inputValue.trim();
    setInputValue('');
    setIsTyping(true);
    setError(null);

    const userMessage: ChatMessage = {
      _id: `user_${Date.now()}`,
      role: 'user',
      content: userMsg,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await aiChatService.sendMessage({
        message: userMsg,
        history: messages
          .filter((m) => m.role !== 'system')
          .map((m) => ({ role: m.role, content: m.content })),
        context: selectedSubject ? { subjectId: selectedSubject } : undefined,
      });

      const aiMessage: ChatMessage = {
        _id: `ai_${Date.now()}`,
        role: 'assistant',
        content: response.content,
        timestamp: response.createdAt,
      };
      setMessages((prev) => [...prev, aiMessage]);
      } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect to AI');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickAction = async (action: string) => {
    if (isTyping) return;
    setIsTyping(true);
    setError(null);

    const actionLabels: Record<string, string> = {
      analysis: 'Exam Analysis',
      suggestions: 'Study Suggestions',
      explanation: 'Answer Explanations',
    };

    const userMessage: ChatMessage = {
      _id: `user_${Date.now()}`,
      role: 'user',
      content: actionLabels[action] || action,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await aiChatService.sendMessage({
        message: actionLabels[action] || action,
        history: messages
          .filter((m) => m.role !== 'system')
          .map((m) => ({ role: m.role, content: m.content })),
        context: selectedSubject ? { subjectId: selectedSubject } : undefined,
      });

      const aiMessage: ChatMessage = {
        _id: `ai_${Date.now()}`,
        role: 'assistant',
        content: response.content,
        timestamp: response.createdAt,
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể kết nối AI');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsTyping(false);
    }

    onQuickAction?.(action);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={styles.chatContainer}>
      {/* Chat Header */}
      <div className={styles.chatHeader}>
        <div className={styles.headerInfo}>
          <div className={styles.aiAvatar}>
            <Bot size={20} />
          </div>
          <div>
            <h3 className={styles.headerTitle}>AI Tutor</h3>
            <span className={styles.headerStatus}>
              <span className={styles.statusDot}></span>
              Online
            </span>
          </div>
        </div>
        <div className={styles.subjectSelector}>
          <select
            value={selectedSubject}
            onChange={(e) => onSubjectChange?.(e.target.value)}
            className={styles.subjectSelect}
          >
            {fallbackSubjects.map((subject) => (
              <option key={subject._id} value={subject._id}>
                {subject.name}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className={styles.selectChevron} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className={styles.quickActions}>
        <button
          className={styles.quickActionBtn}
          onClick={() => handleQuickAction('analysis')}
        >
          <BarChart3 size={16} />
          <span>Exam Analysis</span>
        </button>
        <button
          className={styles.quickActionBtn}
          onClick={() => handleQuickAction('suggestions')}
        >
          <Lightbulb size={16} />
          <span>Study Suggestions</span>
        </button>
        <button
          className={styles.quickActionBtn}
          onClick={() => handleQuickAction('explanation')}
        >
          <BookOpen size={16} />
          <span>Answer Explanations</span>
        </button>
      </div>

      {/* Messages Area */}
      <div className={styles.messagesArea}>
        {messages.map((message) => (
          <div
            key={message._id}
            className={`${styles.messageWrapper} ${
              message.role === 'user' ? styles.userMessage : styles.aiMessage
            }`}
          >
            {message.role === 'assistant' && (
              <div className={styles.aiAvatarSmall}>
                <Bot size={16} />
              </div>
            )}
            <div className={styles.messageContent}>
              <div className={styles.messageBubble}>
                {message.content.split('\n').map((line, i) => (
                  <p key={i} className={styles.messageText}>
                    {line.startsWith('**') && line.endsWith('**') ? (
                      <strong>{line.replace(/\*\*/g, '')}</strong>
                    ) : line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.') ? (
                      line
                    ) : (
                      line
                    )}
                  </p>
                ))}
              </div>
              <span className={styles.messageTime}>
                {formatTimestamp(message.timestamp)}
              </span>
            </div>
            {message.role === 'user' && (
              <div className={styles.userAvatarSmall}>
                <User size={16} />
              </div>
            )}
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className={`${styles.messageWrapper} ${styles.aiMessage}`}>
            <div className={styles.aiAvatarSmall}>
              <Bot size={16} />
            </div>
            <div className={styles.messageContent}>
              <div className={`${styles.messageBubble} ${styles.typingBubble}`}>
                <span className={styles.typingDot}></span>
                <span className={styles.typingDot}></span>
                <span className={styles.typingDot}></span>
              </div>
              <span className={styles.messageTime}>Typing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className={styles.errorBanner}>
          {error}
        </div>
      )}

      {/* Input Area */}
      <div className={styles.inputArea}>
        <div className={styles.inputWrapper}>
          <textarea
            className={styles.messageInput}
            placeholder="Type your question..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            rows={1}
          />
          <button
            className={styles.sendButton}
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping}
          >
            <Send size={18} />
          </button>
        </div>
        <p className={styles.inputHint}>
          <Sparkles size={12} />
          Press Enter to send, Shift + Enter for new line
        </p>
      </div>
    </div>
  );
}
