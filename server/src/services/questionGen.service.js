const geminiService = require('./gemini.service');
const ApiError = require('../utils/ApiError');

// In-memory cache to prevent duplicate generations
const generationCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Few-shot examples for better AI output
const FEW_SHOT_EXAMPLES = [
  {
    content: 'Giải phương trình x² - 5x + 6 = 0. Nghiệm của phương trình là?',
    options: [
      { id: 'A', content: 'x = 1 hoặc x = 6', isCorrect: false },
      { id: 'B', content: 'x = 2 hoặc x = 3', isCorrect: true },
      { id: 'C', content: 'x = -2 hoặc x = -3', isCorrect: false },
      { id: 'D', content: 'x = 2 và x = 3', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'Áp dụng công thức nghiệm: Δ = b² - 4ac = 25 - 24 = 1 > 0. Vậy x = (5 ± 1)/2 = 2 hoặc 3.',
  },
  {
    content: 'Hàm số y = 2x + 1 có đạo hàm tại x = 3 bằng bao nhiêu?',
    options: [
      { id: 'A', content: '1', isCorrect: false },
      { id: 'B', content: '2', isCorrect: true },
      { id: 'C', content: '3', isCorrect: false },
      { id: 'D', content: '7', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'Đạo hàm của y = 2x + 1 là y\' = 2. Vậy tại x = 3, đạo hàm bằng 2.',
  },
];

class QuestionGenService {
  /**
   * Generate multiple-choice questions using GenAI with retry and caching
   */
  async generateQuestions({ topicId, topicName, count, difficulty, requirements, gradeLevel, subjectId, createdBy }) {
    // Check cache first
    const cacheKey = this._getCacheKey(topicId, topicName, difficulty, requirements, count);
    const cached = this._getFromCache(cacheKey);
    if (cached) {
      return cached.map(q => ({ ...q, createdBy }));
    }

    const maxRetries = 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const questions = await this._generateWithPrompt({
          topicId,
          topicName,
          count,
          difficulty,
          requirements,
          gradeLevel,
          createdBy,
        });

        if (questions.length > 0) {
          // Cache successful result
          this._setCache(cacheKey, questions);
          return questions;
        }

        // Empty response - retry
        lastError = new ApiError(500, 'AI returned empty questions list');
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain errors
        if (error.message?.includes('API_KEY') || error.message?.includes('quota')) {
          throw error;
        }
      }

      // Exponential backoff before retry
      if (attempt < maxRetries) {
        await this._sleep(attempt * 1000);
      }
    }

    throw lastError || new ApiError(500, 'Failed to generate questions after retries');
  }

  /**
   * Internal generation with structured prompt
   */
  async _generateWithPrompt({ topicId, topicName, count, difficulty, requirements, gradeLevel, createdBy }) {
    const prompt = this.buildQuestionPrompt({
      count,
      difficulty,
      requirements,
      topicName,
      gradeLevel,
    });

    let aiResponse;
    try {
      aiResponse = await geminiService.generateContent(prompt);
    } catch (error) {
      throw new ApiError(503, `AI service unavailable: ${error.message}`);
    }

    const parsedQuestions = this.parseQuestionsFromResponse(aiResponse);

    if (parsedQuestions.length === 0) {
      throw new ApiError(500, 'Failed to parse any questions from AI response');
    }

    return parsedQuestions.map((q) => ({
      content: q.content,
      type: 'single_choice',
      options: q.options,
      correctAnswer: q.correctAnswer,
      difficulty: difficulty || 'medium',
      topicId: topicId || null,
      topicName: topicName || '',
      subjectId: subjectId || null,
      source: 'ai',
      aiPrompt: requirements || '',
      createdBy: createdBy || null,
      usageCount: 0,
      explanation: q.explanation || '',
      tags: [topicName, difficulty].filter(Boolean),
    }));
  }

  /**
   * Build enhanced prompt with system role and few-shot examples
   */
  buildQuestionPrompt({ count, difficulty, requirements, topicName, gradeLevel }) {
    const difficultyConfig = {
      easy: {
        desc: 'cơ bản, dễ hiểu, chủ yếu kiểm tra trí nhớ và khái niệm đơn giản',
        focus: 'nhận biết, thông hiểu',
      },
      medium: {
        desc: 'trung bình, yêu cầu hiểu bài và vận dụng kiến thức',
        focus: 'thông hiểu, vận dụng',
      },
      hard: {
        desc: 'khó, yêu cầu tư duy phân tích, so sánh, đánh giá và vận dụng cao',
        focus: 'vận dụng, phân tích, đánh giá',
      },
    };

    const config = difficultyConfig[difficulty] || difficultyConfig.medium;
    const grade = gradeLevel || 10;
    const topic = topicName || requirements || 'Chủ đề tổng quát';

    let prompt = `<system>
BẠN LÀ MỘT GIÁO VIÊN GIỎI VỚI 15 NĂM KINH NGHIỆM.
- Chuyên tạo câu hỏi trắc nghiệm chất lượng cao cho học sinh Việt Nam
- Câu hỏi phải chính xác về mặt khoa học, rõ ràng về ngôn ngữ
- Đáp án sai phải hợp lý, có thể gây nhầm lẫn nhưng không quá vô nghĩa
- Luôn viết bằng TIẾNG VIỆT, không dùng tiếng Anh
</system>

<task>
Tạo ${count} câu hỏi trắc nghiệm ${config.desc} về chủ đề: ${topic}
Cấp độ nhận thức: ${config.focus}
Lớp: ${grade}
</task>

<requirements>
1. Mỗi câu hỏi có đúng 4 đáp án: A, B, C, D
2. Chỉ có 1 đáp án đúng
3. Nội dung câu hỏi ngắn gọn, rõ ràng (dưới 150 ký tự)
4. Đáp án đúng có thể ở bất kỳ vị trí nào (A, B, C, hoặc D)
5. Đáp án sai phải "gần đúng" - có thể gây nhầm lẫn cho người không hiểu bài
6. Thêm giải thích ngắn gọn cho đáp án đúng
</requirements>

<format>
TRẢ LỜI ĐÚNG ĐỊNH DẠNG JSON SAU, KHÔNG THÊM GIẢI THÍCH:
[
  {
    "content": "Nội dung câu hỏi...",
    "options": [
      {"id": "A", "content": "Đáp án A"},
      {"id": "B", "content": "Đáp án B"},
      {"id": "C", "content": "Đáp án C"},
      {"id": "D", "content": "Đáp án D"}
    ],
    "correctAnswer": "A",
    "explanation": "Giải thích ngắn..."
  }
]
</format>

`;

    if (requirements && requirements.trim()) {
      prompt += `<additional_context>
Yêu cầu bổ sung: ${requirements}
</additional_context>
`;
    }

    prompt += `
<example>
Ví dụ câu hỏi mẫu (để tham khảo cách viết):
${JSON.stringify(FEW_SHOT_EXAMPLES[0], null, 2)}
</example>

Hãy tạo ${count} câu hỏi và trả lời đúng định dạng JSON ở trên. Chỉ trả lời JSON, không thêm gì khác.`;

    return prompt;
  }

  /**
   * Multi-strategy JSON parsing with fallbacks
   */
  parseQuestionsFromResponse(responseText) {
    // Clean up response - remove markdown code blocks if present
    let cleanText = responseText.trim();
    
    // Strategy 1: Direct JSON parse
    try {
      const parsed = JSON.parse(cleanText);
      if (Array.isArray(parsed)) {
        const validated = this._validateAndNormalize(parsed);
        if (validated.length > 0) return validated;
      }
    } catch { /* continue to next strategy */ }

    // Strategy 2: Extract from markdown code blocks
    const codeBlockMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try {
        const parsed = JSON.parse(codeBlockMatch[1].trim());
        if (Array.isArray(parsed)) {
          const validated = this._validateAndNormalize(parsed);
          if (validated.length > 0) return validated;
        }
      } catch { /* continue */ }
    }

    // Strategy 3: Find JSON array pattern anywhere
    const arrayMatch = cleanText.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      try {
        const parsed = JSON.parse(arrayMatch[0]);
        if (Array.isArray(parsed)) {
          const validated = this._validateAndNormalize(parsed);
          if (validated.length > 0) return validated;
        }
      } catch { /* continue */ }
    }

    // Strategy 4: Try to extract questions from text format
    const extracted = this._extractFromText(cleanText);
    if (extracted.length > 0) return extracted;

    throw new ApiError(500, 'Failed to parse AI response - no valid JSON found');
  }

  /**
   * Validate and normalize question structure
   */
  _validateAndNormalize(questions) {
    if (!Array.isArray(questions)) return [];

    return questions
      .filter(q => q && typeof q.content === 'string' && q.content.length > 0)
      .filter(q => Array.isArray(q.options) && q.options.length === 4)
      .map(q => {
        // Normalize options to always have A, B, C, D
        const normalizedOptions = this._normalizeOptions(q.options, q.correctAnswer);
        
        // Find correct answer
        const correctId = this._getCorrectAnswerId(q, normalizedOptions);
        
        return {
          content: q.content?.trim() || '',
          options: normalizedOptions,
          correctAnswer: correctId,
          explanation: q.explanation?.trim() || '',
        };
      })
      .filter(q => q.content.length > 0 && q.correctAnswer);
  }

  /**
   * Normalize options to always have A, B, C, D
   */
  _normalizeOptions(options, correctAnswer) {
    const optionMap = new Map();
    
    options.forEach(opt => {
      const id = (opt.id || opt.letter || opt.key || '').toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(id)) {
        optionMap.set(id, {
          id,
          content: opt.content || opt.text || opt.value || '',
          isCorrect: id === (correctAnswer || '').toUpperCase(),
        });
      }
    });

    // Ensure all 4 options exist
    const result = [];
    for (const id of ['A', 'B', 'C', 'D']) {
      if (optionMap.has(id)) {
        result.push(optionMap.get(id));
      } else {
        // Use first option as fallback (shouldn't happen with good AI)
        const fallback = options[0];
        result.push({
          id,
          content: fallback?.content || fallback?.text || `Option ${id}`,
          isCorrect: id === (correctAnswer || '').toUpperCase(),
        });
      }
    }

    return result;
  }

  /**
   * Get correct answer ID from various formats
   */
  _getCorrectAnswerId(question, normalizedOptions) {
    // Check if correctAnswer is already set
    if (question.correctAnswer && ['A', 'B', 'C', 'D'].includes(question.correctAnswer.toUpperCase())) {
      return question.correctAnswer.toUpperCase();
    }

    // Find option marked as correct
    const correctOption = question.options?.find(
      o => o.isCorrect || o.isCorrectAnswer || o.correct
    );
    if (correctOption) {
      const id = (correctOption.id || correctOption.letter || '').toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(id)) {
        return id;
      }
    }

    // Default to first option if nothing found
    return normalizedOptions[0]?.id || 'A';
  }

  /**
   * Fallback: Extract questions from plain text format
   */
  _extractFromText(text) {
    const questions = [];
    
    // Pattern: Question content followed by options
    const questionPatterns = [
      /Câu\s*(\d+)[.):]\s*(.+?)(?=\s*[A-D][.):]\s|\s*$)/gi,
      /(\d+)[.).]\s*(.+?)(?=\s*[A-D][.):]\s)/gi,
    ];

    // Simple heuristic extraction for malformed responses
    const lines = text.split('\n');
    let currentQuestion = null;
    let currentOptions = [];

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Check if this is an option
      const optionMatch = trimmed.match(/^([A-D])[.):]\s*(.+)/i);
      if (optionMatch) {
        currentOptions.push({
          id: optionMatch[1].toUpperCase(),
          content: optionMatch[2].trim(),
          isCorrect: false,
        });
        continue;
      }

      // Check if this looks like a question
      if (trimmed.length > 10 && trimmed.length < 200 && !optionMatch) {
        if (currentQuestion && currentOptions.length >= 4) {
          questions.push({
            content: currentQuestion,
            options: currentOptions.slice(0, 4),
            correctAnswer: currentOptions[0]?.id || 'A',
            explanation: '',
          });
        }
        currentQuestion = trimmed;
        currentOptions = [];
      }
    }

    // Don't forget last question
    if (currentQuestion && currentOptions.length >= 4) {
      questions.push({
        content: currentQuestion,
        options: currentOptions.slice(0, 4),
        correctAnswer: currentOptions[0]?.id || 'A',
        explanation: '',
      });
    }

    return questions;
  }

  /**
   * Cache key generation
   */
  _getCacheKey(topicId, topicName, difficulty, requirements, count) {
    const key = [
      topicId || '',
      (topicName || requirements || '').toLowerCase().trim(),
      difficulty || '',
      count || 5,
    ].join('|');
    return key;
  }

  /**
   * Get from cache if valid
   */
  _getFromCache(key) {
    const cached = generationCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.questions;
    }
    generationCache.delete(key);
    return null;
  }

  /**
   * Set cache
   */
  _setCache(key, questions) {
    generationCache.set(key, {
      questions,
      timestamp: Date.now(),
    });
  }

  /**
   * Sleep helper for retry delay
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new QuestionGenService();
