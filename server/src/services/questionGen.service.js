const geminiService = require('./gemini.service');
const ApiError = require('../utils/ApiError');

class QuestionGenService {
  async generateQuestions({ topicId, topicName, count, difficulty, requirements, gradeLevel, subjectId, createdBy }) {
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

  buildQuestionPrompt({ count, difficulty, requirements, topicName, gradeLevel }) {
    const difficultyDesc = {
      easy: 'co ban, de hieu, chu yeu kiem tra tri nho va khai niem don gian',
      medium: 'trung binh, yeu cau hieu bai va van dung kien thuc',
      hard: 'kho, yeu cau tu duy phan tich, so sanh, danh gia va van dung cao',
    };

    const diff = difficultyDesc[difficulty] || difficultyDesc.medium;
    const grade = gradeLevel || 10;

    let prompt = `Ban la mot giao vien co kinh nghiem. Hay tao ${count} cau hoi trac nghiem ${diff}.\n`;
    prompt += `CHU DE: ${topicName || requirements || 'Chu de tong quat'}\n`;
    prompt += `CAP DO: Lop ${grade}\n`;
    prompt += `DO KHO: ${difficulty || 'medium'}\n`;

    if (requirements && requirements.trim()) {
      prompt += `YEU CAU THEM: ${requirements}\n`;
    }

    prompt += `QUY TAC:\n`;
    prompt += `- Moi cau hoi phai co 4 dap an: A, B, C, D\n`;
    prompt += `- Chi co 1 dap an dung\n`;
    prompt += `- Cac dap an sai phai hop ly, co the gay nham lan nhung khong qua vo nghia\n`;
    prompt += `- Noi dung cau hoi ro rang, ngan gon (duoi 200 ky tu)\n`;
    prompt += `- Dap an dung co the o bat ky vi tri nao (A, B, C, hoac D)\n`;
    prompt += `- Tra loi bang JSON array, moi object co: content, options (array voi id va content), correctAnswer, explanation\n\n`;
    prompt += `Dinh dang JSON:\n`;
    prompt += `[\n`;
    prompt += `  {\n`;
    prompt += `    "content": "Cau hoi o day?",\n`;
    prompt += `    "options": [\n`;
    prompt += `      { "id": "A", "content": "Dap an A" },\n`;
    prompt += `      { "id": "B", "content": "Dap an B" },\n`;
    prompt += `      { "id": "C", "content": "Dap an C" },\n`;
    prompt += `      { "id": "D", "content": "Dap an D" }\n`;
    prompt += `    ],\n`;
    prompt += `    "correctAnswer": "A",\n`;
    prompt += `    "explanation": "Giai thich ngan vi sao dap an nay dung"\n`;
    prompt += `  }\n`;
    prompt += `]\n\n`;
    prompt += `Chi tra loi JSON, khong them giai thich.`;

    return prompt;
  }

  parseQuestionsFromResponse(responseText) {
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found');
      }

      const questions = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(questions)) {
        throw new Error('Response is not an array');
      }

      return questions
        .filter((q) => q.content && q.options && q.options.length === 4 && q.correctAnswer)
        .map((q) => {
          const correctId = q.correctAnswer?.toUpperCase();
          const normalizedOptions = ['A', 'B', 'C', 'D'].map((id) => {
            const existing = q.options.find((o) => o.id === id || o.id === id.toLowerCase());
            if (existing) {
              return { id, content: existing.content || existing.text || '', isCorrect: id === correctId };
            }
            const first = q.options[0];
            return { id, content: first?.content || first?.text || '', isCorrect: false };
          });

          const correctIndex = ['A', 'B', 'C', 'D'].indexOf(correctId);
          const correctOption = normalizedOptions[correctIndex >= 0 ? correctIndex : 0];

          return {
            content: q.content?.trim() || '',
            options: normalizedOptions,
            correctAnswer: correctOption.id,
            explanation: q.explanation || '',
          };
        });
    } catch (e) {
      throw new ApiError(500, `Failed to parse AI response: ${e.message}`);
    }
  }
}

module.exports = new QuestionGenService();
