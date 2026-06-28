const { School, User } = require('../models');
const { parsePagination } = require('../utils/parsePagination');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');

class SchoolService {
  async create(data) {
    const school = new School(data);
    await school.save();
    return school;
  }

  async getById(id) {
    return School.findById(id);
  }

  async getByName(name) {
    return School.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });
  }

  async getAll(query) {
    const { sortBy = 'createdAt', order = 'desc', page = 1, limit = 20 } = query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;
    const sortOrder = order === 'asc' ? 1 : -1;

    const [results, total] = await Promise.all([
      School.find({})
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limitNum),
      School.countDocuments({}),
    ]);

    return {
      results,
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    };
  }

  async update(id, data) {
    const school = await School.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    return school;
  }

  async delete(id) {
    const school = await School.findByIdAndDelete(id);
    return school;
  }

  async getGradeDistribution(id, scores) {
    const school = await School.findById(id);
    if (!school) return null;
    return school.calculateGradeDistribution(scores);
  }

  async getGradingScale(id) {
    const school = await School.findById(id).select('settings.gradingScale');
    return school?.settings?.gradingScale;
  }

  // ── Available Teachers (for teacher dropdown in class form) ──────────────
  async getAvailableTeachers(schoolId, query = {}, requestingUser = null) {
    // 1. Verify school exists
    const school = await School.findById(schoolId);
    if (!school) {
      throw new ApiError(httpStatus.NOT_FOUND, 'School not found');
    }

    // 2. Authorize: admin can access any school; teacher/student must be in same school
    if (requestingUser) {
      const isAdmin = requestingUser.role === 'admin';
      if (!isAdmin) {
        const userSchoolId = requestingUser.schoolId?.toString() || requestingUser.schoolId;
        if (userSchoolId !== schoolId.toString()) {
          throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden: you can only access teachers in your own school');
        }
      }
    }

    // 3. Parse pagination
    const { page, limit, skip } = parsePagination(query);

    // 4. Build filter: teachers in this school
    const filter = {
      role: 'teacher',
      schoolId,
    };

    // 5. Add search filter (case-insensitive, partial match on name/email/teacherCode)
    if (query.search && String(query.search).trim().length > 0) {
      const escaped = String(query.search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { teacherCode: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
      ];
    }

    // 6. Query with select to limit fields
    const [results, total] = await Promise.all([
      User.find(filter)
        .select('name email teacherCode avatarUrl isActive')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    return {
      results,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  // ── School Approval Methods ──────────────────────────────────────────────────

  async getPendingSchools(options = {}) {
    const { page = 1, limit = 20, sortBy = 'createdAt', order = 'desc' } = options;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;
    const sortOrder = order === 'asc' ? 1 : -1;

    const filter = { registrationStatus: 'pending' };

    const [results, total] = await Promise.all([
      School.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limitNum),
      School.countDocuments(filter),
    ]);

    return {
      results,
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    };
  }

  async approveSchool(schoolId, adminId) {
    const school = await School.findById(schoolId);
    if (!school) {
      throw new ApiError(httpStatus.NOT_FOUND, 'School not found');
    }

    if (school.registrationStatus !== 'pending') {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Trường không trong trạng thái chờ duyệt');
    }

    school.registrationStatus = 'approved';
    school.approvedBy = adminId;
    school.isActive = true;
    await school.save();
    return school;
  }

  async rejectSchool(schoolId, reason = null, adminId = null) {
    const school = await School.findById(schoolId);
    if (!school) {
      throw new ApiError(httpStatus.NOT_FOUND, 'School not found');
    }

    if (school.registrationStatus !== 'pending') {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Trường không trong trạng thái chờ duyệt');
    }

    school.registrationStatus = 'rejected';
    school.rejectedReason = reason;
    await school.save();
    return school;
  }
}

module.exports = new SchoolService();
