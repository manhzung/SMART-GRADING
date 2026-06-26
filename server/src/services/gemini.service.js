const config = require('../config/config');
const axios = require('axios');

class GeminiService {
  constructor() {
    this.provider = config.ai?.provider || 'gemini';
    this.geminiApiKey = config.ai?.geminiApiKey;
    this.geminiModel = config.ai?.geminiModel || 'gemini-2.0-flash';
    this.openaiApiKey = config.ai?.openaiApiKey;
    this.claudeApiKey = config.ai?.claudeApiKey;
    
    // Retry configuration
    this.maxRetries = 3;
    this.retryDelayMs = 1000;
  }

  async sendMessage({ message, history = [], context = {} }) {
    const prompt = this.buildPrompt(message, history, context);
    return this.generateContent(prompt);
  }

  async generateContent(prompt, options = {}) {
    const { maxRetries = this.maxRetries, retryDelayMs = this.retryDelayMs } = options;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        switch (this.provider) {
          case 'gemini':
            return await this.callGemini(prompt);
          case 'openai':
            return await this.callOpenAI(prompt);
          case 'claude':
            return await this.callClaude(prompt);
          default:
            throw new Error(`Unknown AI provider: ${this.provider}`);
        }
      } catch (error) {
        // Don't retry on certain errors
        if (this._isNonRetryableError(error)) {
          throw error;
        }

        if (attempt < maxRetries) {
          const delay = retryDelayMs * attempt; // Exponential backoff
          await this._sleep(delay);
        } else {
          throw error;
        }
      }
    }
  }

  _isNonRetryableError(error) {
    const message = error.message?.toLowerCase() || '';
    const nonRetryablePatterns = [
      'api_key',
      'invalid api key',
      'quota',
      'rate limit',
      'billing',
      'permission denied',
      'unauthorized',
      'invalid key',
    ];
    return nonRetryablePatterns.some(pattern => message.includes(pattern));
  }

  async callGemini(prompt) {
    if (!this.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const url = `https://generativelanguage.googleapis.com/v1/models/${this.geminiModel}:generateContent?key=${this.geminiApiKey}`;
    
    const response = await axios.post(url, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 8192,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      ],
    });

    // Check for blocked content
    if (response.data?.promptFeedback?.blockReason) {
      throw new Error(`Content blocked: ${response.data.promptFeedback.blockReason}`);
    }

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      // Check finish reason
      const finishReason = response.data?.candidates?.[0]?.finishReason;
      if (finishReason === 'SAFETY') {
        throw new Error('Response blocked by safety filters');
      }
      if (finishReason === 'RECITATION') {
        throw new Error('Response blocked by recitation filters');
      }
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
        model: 'gpt-4o-mini', // Using latest efficient model
        messages: [
          { role: 'system', content: 'Bạn là một giáo viên Việt Nam có kinh nghiệm. Trả lời bằng tiếng Việt.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4096,
      },
      {
        headers: {
          Authorization: `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
      }
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
        model: 'claude-3-5-haiku-20241022', // Latest efficient model
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
        system: 'Bạn là một giáo viên Việt Nam có kinh nghiệm. Trả lời bằng tiếng Việt.',
      },
      {
        headers: {
          'x-api-key': this.claudeApiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
      }
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

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate questions using AI with robust JSON parsing
   */
  async generateQuestions({ subject, topic, grade, count = 5, options = {} }) {
    const {
      difficulty = 'mixed',
      language = 'vietnamese',
    } = options;

    const languageInstruction = language === 'vietnamese'
      ? 'Viết câu hỏi bằng tiếng Việt, các đáp án A, B, C, D bằng tiếng Việt.'
      : 'Write questions in English with A, B, C, D options in English.';

    const prompt = 'Bạn là một giáo viên có kinh nghiệm. Tạo ' + count + ' câu hỏi trắc nghiệm.\n\n' +
      'YÊU CẦU:\n' +
      '- Chủ đề: ' + (topic || 'chủ đề chung') + '\n' +
      '- Môn: ' + subject + '\n' +
      '- Lớp: ' + grade + '\n' +
      '- Độ khó: ' + (difficulty === 'mixed' ? 'phân bố đều easy, medium, hard' : difficulty) + '\n' +
      '- ' + languageInstruction + '\n\n' +
      'MỖI CÂU HỎI PHẢI CÓ:\n' +
      '- question: Nội dung câu hỏi (rõ ràng, không mơ hồ)\n' +
      '- options: Array 4 đáp án ["A. ...", "B. ...", "C. ...", "D. ..."]\n' +
      '- correctAnswer: Chỉ chữ cái "A" hoặc "B" hoặc "C" hoặc "D"\n' +
      '- difficulty: "easy" | "medium" | "hard"\n' +
      '- explanation: Giải thích ngắn tại sao đáp án đúng (1-2 câu)\n\n' +
      'TRẢ LỜI CHỈ LÀ JSON, không có text khác:\n\n' +
      '{\n' +
      '  "questions": [\n' +
      '    {\n' +
      '      "question": "...",\n' +
      '      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],\n' +
      '      "correctAnswer": "B",\n' +
      '      "difficulty": "medium",\n' +
      '      "explanation": "..."\n' +
      '    }\n' +
      '  ]\n' +
      '}';

    const response = await this.generateContent(prompt);
    return this.parseJSONResponse(response);
  }

  /**
   * Robust JSON parser that handles common AI output issues
   */
  parseJSONResponse(responseText) {
    if (!responseText || typeof responseText !== 'string') {
      return null;
    }

    let jsonStr = responseText.trim();

    // Remove markdown code blocks
    jsonStr = jsonStr.replace(/```json\s*/gi, '');
    jsonStr = jsonStr.replace(/```\s*/g, '');
    jsonStr = jsonStr.trim();

    // Try direct parse first
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      // Continue to fixes
    }

    // Fix common JSON issues from AI output
    // 1. Remove control characters (except newlines/tabs)
    jsonStr = jsonStr.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // 2. Fix unescaped newlines in strings
    jsonStr = jsonStr.replace(/(?<!\\)"([^"\n]*)"(?=\s*:)/g, (match, p1) => {
      const escaped = p1.replace(/"/g, '\\"').replace(/\n/g, '\\n');
      return `"${escaped}"`;
    });

    // 3. Try to find JSON object or array in the text
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/) || jsonStr.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    // 4. Try to fix trailing commas
    jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');

    // 5. Try parse again
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      // 6. Last resort - try to fix common quote issues
      jsonStr = jsonStr.replace(/'/g, '"');
      try {
        return JSON.parse(jsonStr);
      } catch (e2) {
        console.error('JSON parse failed:', e2.message);
        return null;
      }
    }
  }
}

module.exports = new GeminiService();
