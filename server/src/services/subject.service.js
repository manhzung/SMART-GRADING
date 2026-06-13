const Subject = require('../models/subject.model');
const ApiError = require('../utils/ApiError');
const { parsePagination } = require('../utils/parsePagination');

class SubjectService {
  async create(data) {
    const subject = await Subject.create(data);
    return subject;
  }

  async getAll(query = {}) {
    const { page, limit, skip } = parsePagination(query);
    const filter = {};
    if (query.schoolId) filter.schoolId = query.schoolId;
    if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';

    const [results, total] = await Promise.all([
      Subject.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
      Subject.countDocuments(filter),
    ]);

    return { results, page, limit, total, pages: Math.ceil(total / limit) };
  }

  async getById(id) {
    const subject = await Subject.findById(id);
    if (!subject) throw new ApiError(404, 'Subject not found');
    return subject;
  }

  async update(id, data) {
    const subject = await Subject.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!subject) throw new ApiError(404, 'Subject not found');
    return subject;
  }

  async delete(id) {
    const subject = await Subject.findByIdAndDelete(id);
    if (!subject) throw new ApiError(404, 'Subject not found');
    return subject;
  }
}

module.exports = new SubjectService();
