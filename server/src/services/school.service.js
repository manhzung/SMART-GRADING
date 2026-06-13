const { School } = require('../models');
const { parsePagination } = require('../utils/parsePagination');

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
}

module.exports = new SchoolService();
