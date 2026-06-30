const { Question } = require('../models');
const ApiError = require('../utils/ApiError');
const { parsePagination } = require('../utils/parsePagination');

class QuestionService {
  /**
   * Get user ID string from user object (handles both id and _id fields).
   */
  getUserId(user) {
    if (!user) return null;
    if (user.id) return String(user.id);
    if (user._id) return String(user._id);
    return null;
  }

  /**
   * Build MongoDB filter based on user role and schoolId.
   * @param {Object} user - Express req.user object
   * @returns {Object} MongoDB filter object
   */
  buildRoleFilter(user) {
    const filter = {};

    switch (user.role) {
      case 'admin':
        // Admin thấy tất cả câu hỏi
        break;
      case 'teacher':
        // Teacher chỉ thấy câu hỏi của trường mình
        if (user.schoolId) {
          filter.schoolId = user.schoolId;
        }
        break;
      case 'student':
        // Student chỉ thấy câu hỏi đã duyệt của trường mình
        if (user.schoolId) {
          filter.schoolId = user.schoolId;
        }
        filter.isApproved = true;
        break;
      default:
        if (user.schoolId) {
          filter.schoolId = user.schoolId;
        }
        filter.isApproved = true;
    }

    return filter;
  }

  async create(data, userId = null, userSchoolId = null, userRole = 'teacher') {
    // Auto-set correctAnswer for single choice
    if (data.type === 'single_choice') {
      const correctOption = data.options.find(opt => opt.isCorrect);
      data.correctAnswer = correctOption?.id || null;
    }

    // Gán schoolId và createdBy từ user
    data.schoolId = userSchoolId;
    data.createdBy = userId;

    // Teacher: cần duyệt. Admin: auto approve
    data.isApproved = userRole === 'admin';
    if (userId) {
      const uid = userId.toString ? userId.toString() : String(userId);
      data.approvedBy = uid;
      data.approvedAt = userRole === 'admin' ? new Date() : null;
    }

    const question = new Question(data);
    await question.save();
    return question;
  }

  async getById(id, user = null) {
    const question = await Question.findById(id)
      .populate('topicId', 'name code')
      .populate('createdBy', 'name schoolId')
      .lean();

    if (!question) return null;

    // Filter correct answer based on role
    if (user && user.role === 'student') {
      // Student không thấy đáp án đúng
      question.options = question.options.map((opt) => {
        const { isCorrect, ...rest } = opt;
        return rest;
      });
      question.correctAnswer = undefined;
      question.correctAnswers = undefined;
    }

    return question;
  }

  async getAll(query = {}, user = null) {
    const {
      topicId,
      difficulty,
      isApproved,
      source,
      tags,
      search,
      sortBy = 'createdAt',
      order = 'desc',
      page,
      limit: queryLimit,
      ...extraFilters
    } = query;
    const { page: pageNum, limit, skip } = parsePagination(query);

    // IMPORTANT: filter must start empty - spread extraFilters AFTER,
    // not before. The ...rest was putting page/limit INTO the filter,
    // causing Mongoose to search for documents with page=1, limit=20 fields.
    const filter = { ...extraFilters };

    // Apply role-based access control
    if (user) {
      const roleFilter = this.buildRoleFilter(user);
      Object.assign(filter, roleFilter);
    }

    if (topicId) filter.topicId = topicId;

    if (query.bankId) filter.bankId = query.bankId;

    // Case-insensitive difficulty filter (accepts single "easy" or comma-separated "easy,medium,hard")
    if (difficulty) {
      const levels = difficulty.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);
      if (levels.length === 1) {
        filter.difficulty = new RegExp(`^${levels[0]}$`, 'i');
      } else if (levels.length > 1) {
        filter.difficulty = { $in: levels };
      }
    }

    // Parse isApproved from string "true"/"false" to boolean
    if (isApproved !== undefined) {
      if (isApproved === true || isApproved === 'true') {
        filter.isApproved = true;
      } else if (isApproved === false || isApproved === 'false') {
        filter.isApproved = false;
      }
    }

    if (source) filter.source = source;
    if (tags) filter.tags = { $in: tags.split(',') };

    // Text search (requires text index on content field)
    if (search) {
      filter.$text = { $search: search };
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const sort = sortBy === 'score'
      ? { difficulty: sortOrder === 1 ? 1 : -1 }
      : { [sortBy]: sortOrder };

    const [results, total] = await Promise.all([
      Question.find(filter)
        .populate('createdBy', 'name')
        .populate('topicId', 'name code')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Question.countDocuments(filter),
    ]);

    return {
      results,
      page: pageNum,
      limit,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async update(id, data, user = null) {
    const question = await Question.findById(id);
    if (!question) {
      throw new ApiError(404, 'Question not found');
    }

    // Ownership check: chỉ owner hoặc admin được sửa
    if (user) {
      const userId = this.getUserId(user);
      const isOwner = question.createdBy && String(question.createdBy) === userId;
      const isAdmin = user.role === 'admin';
      if (!isOwner && !isAdmin) {
        throw new ApiError(403, 'Bạn không có quyền sửa câu hỏi này');
      }
    }

    // Auto-update correctAnswer if options changed
    if (data.options) {
      if (data.type === 'single_choice' || !data.type) {
        const correctOption = data.options.find(opt => opt.isCorrect);
        data.correctAnswer = correctOption?.id || null;
      }
    }

    // Không cho sửa schoolId và createdBy
    delete data.schoolId;
    delete data.createdBy;

    const updated = await Question.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    return updated;
  }

  async approve(id, approverId, approverSchoolId, approverRole) {
    const question = await Question.findById(id);
    if (!question) {
      throw new ApiError(404, 'Question not found');
    }

    // Chỉ admin hoặc teacher cùng trường được duyệt
    if (approverRole !== 'admin') {
      if (!approverSchoolId || question.schoolId?.toString() !== approverSchoolId.toString()) {
        throw new ApiError(403, 'Bạn không có quyền duyệt câu hỏi này');
      }
    }

    const uid = approverId ? (approverId.toString ? approverId.toString() : String(approverId)) : null;
    const updated = await Question.findByIdAndUpdate(
      id,
      { isApproved: true, approvedBy: uid, approvedAt: new Date() },
      { new: true }
    );
    return updated;
  }

  async reject(id, rejecterId, rejecterSchoolId, rejecterRole, reason = null) {
    const question = await Question.findById(id);
    if (!question) {
      throw new ApiError(404, 'Question not found');
    }

    // Chỉ admin hoặc teacher cùng trường được từ chối
    if (rejecterRole !== 'admin') {
      if (!rejecterSchoolId || question.schoolId?.toString() !== rejecterSchoolId.toString()) {
        throw new ApiError(403, 'Bạn không có quyền từ chối câu hỏi này');
      }
    }

    const uid = rejecterId ? (rejecterId.toString ? rejecterId.toString() : String(rejecterId)) : null;
    const updated = await Question.findByIdAndUpdate(
      id,
      { isApproved: false, rejectedReason: reason, rejectedBy: uid, rejectedAt: new Date() },
      { new: true }
    );
    return updated;
  }

  async delete(id, user = null) {
    const question = await Question.findById(id);
    if (!question) {
      throw new ApiError(404, 'Question not found');
    }

    // Ownership check: chỉ owner hoặc admin được xóa
    if (user) {
      const userId = this.getUserId(user);
      const isOwner = question.createdBy && String(question.createdBy) === userId;
      const isAdmin = user.role === 'admin';
      if (!isOwner && !isAdmin) {
        throw new ApiError(403, 'Bạn không có quyền xóa câu hỏi này');
      }
      // Không cho xóa câu hỏi đã dùng trong exam
      if (question.usageCount > 0 && !isAdmin) {
        throw new ApiError(400, 'Không thể xóa câu hỏi đã được sử dụng trong đề thi');
      }
    }

    const updated = await Question.findByIdAndUpdate(id, { isActive: false }, { new: true });
    return updated;
  }

  async incrementUsageCount(id) {
    return Question.findByIdAndUpdate(id, { $inc: { usageCount: 1 } });
  }

  async updateDifficultyStats(id, isCorrect) {
    const question = await Question.findById(id);
    if (!question) return;

    // Update correct rate based on usage
    const newUsageCount = question.usageCount + 1;
    let newCorrectRate = question.correctRate || 50;

    if (newUsageCount > 0) {
      newCorrectRate = ((question.correctRate || 50) * (newUsageCount - 1) + (isCorrect ? 100 : 0)) / newUsageCount;
    }

    await Question.findByIdAndUpdate(id, {
      usageCount: newUsageCount,
      correctRate: Math.round(newCorrectRate * 100) / 100
    });
  }

  async getBankStats(user = null) {
    const filter = {};
    if (user) {
      Object.assign(filter, this.buildRoleFilter(user));
    }

    const [total, approved, pending] = await Promise.all([
      Question.countDocuments(filter),
      Question.countDocuments({ ...filter, isApproved: true }),
      Question.countDocuments({ ...filter, isApproved: false }),
    ]);

    return {
      total,
      approved,
      pending,
      integrity: total > 0 ? Math.round((approved / total) * 1000) / 10 : 100,
    };
  }
}

module.exports = new QuestionService();
