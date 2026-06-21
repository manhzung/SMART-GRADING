const config = require('../config/config');
const axios = require('axios');

class GeminiService {
  constructor() {
    this.provider = config.ai?.provider || 'gemini';
    this.geminiApiKey = config.ai?.geminiApiKey;
    this.geminiModel = config.ai?.geminiModel || 'gemini-2.0-flash';
    this.openaiApiKey = config.ai?.openaiApiKey;
    this.claudeApiKey = config.ai?.claudeApiKey;
  }

  async sendMessage({ message, history = [], context = {} }) {
    const prompt = this.buildPrompt(message, history, context);
    return this.generateContent(prompt);
  }

  async generateContent(prompt) {
    switch (this.provider) {
      case 'gemini':
        return this.callGemini(prompt);
      case 'openai':
        return this.callOpenAI(prompt);
      case 'claude':
        return this.callClaude(prompt);
      default:
        throw new Error(`Unknown AI provider: ${this.provider}`);
    }
  }

  async callGemini(prompt) {
    if (!this.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.geminiModel}:generateContent?key=${this.geminiApiKey}`;
    const response = await axios.post(url, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });
    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Gemini returned empty response');
    }
    return text;
  }

  async callOpenAI(prompt) {
    if (!this.openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2048,
      },
      {
        headers: {
          Authorization: `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );
    return response.data.choices[0].message.content;
  }

  async callClaude(prompt) {
    if (!this.claudeApiKey) {
      throw new Error('CLAUDE_API_KEY is not configured');
    }
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-haiku-20240307',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'x-api-key': this.claudeApiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
      },
    );
    return response.data.content[0].text;
  }

  buildPrompt(message, history, context) {
    let prompt = 'Bạn là một gia sư thông minh, nhiệt tình và kiên nhẫn. ';
    prompt += 'Hãy giúp học sinh hiểu bài, giải thích các khái niệm một cách rõ ràng, dễ hiểu. ';
    prompt += 'Nếu học sinh hỏi về một câu hỏi cụ thể, hãy giải thích lý do đáp án đúng và sai. ';
    prompt += 'Trả lời bằng tiếng Việt, ngắn gọn và có ý nghĩa.\n\n';

    if (context.recentMistakes && context.recentMistakes.length > 0) {
      prompt += 'Ngữ cảnh về các lỗi gần đây của học sinh:\n';
      context.recentMistakes.forEach((m, i) => {
        prompt += `${i + 1}. Câu hỏi: ${m.questionContent || 'Không có nội dung'}\n`;
        prompt += `   Đáp án của học sinh: ${m.studentAnswer}\n`;
        prompt += `   Đáp án đúng: ${m.correctAnswer}\n\n`;
      });
      prompt += '\n';
    }

    if (history.length > 0) {
      prompt += 'Lịch sử cuộc trò chuyện:\n';
      history.slice(-6).forEach((msg) => {
        prompt += `${msg.role === 'user' ? 'Học sinh' : 'Gia sư'}: ${msg.content}\n`;
      });
      prompt += '\n';
    }

    prompt += `Học sinh: ${message}\nGia sư:`;
    return prompt;
  }
}

module.exports = new GeminiService();
