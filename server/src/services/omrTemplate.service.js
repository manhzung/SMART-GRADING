const { OMRTemplate } = require('../models');
const { parsePagination } = require('../utils/parsePagination');

class OMRTemplateService {
  async create(data) {
    // Check if template already exists
    const existing = await OMRTemplate.findOne({ code: data.code });
    if (existing) {
      throw new Error('Template with this code already exists');
    }

    const template = new OMRTemplate(data);
    await template.save();
    return template;
  }

  async getById(id) {
    return OMRTemplate.findById(id);
  }

  async getByCode(code) {
    return OMRTemplate.findOne({ code: code.toUpperCase() });
  }

  async getAll(query = {}) {
    const {
      level,
      isActive = true,
      tags,
      sortBy = 'createdAt',
      order = 'desc',
      page: _page,
      limit: _limit,
      ...rest
    } = query;
    const { page, limit, skip } = parsePagination(query);

    const filter = { ...rest };
    if (level) filter.level = level;
    if (isActive !== undefined) filter.isActive = isActive;
    if (tags) filter.tags = { $in: tags.split(',') };

    const sortOrder = order === 'asc' ? 1 : -1;

    const [results, total] = await Promise.all([
      OMRTemplate.find(filter)
        .select('-zones -scannerConfig -validationRules')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit),
      OMRTemplate.countDocuments(filter),
    ]);

    return {
      results,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async getFullById(id) {
    return OMRTemplate.findById(id);
  }

  async update(id, data) {
    const template = await OMRTemplate.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    return template;
  }

  async delete(id) {
    const template = await OMRTemplate.findByIdAndUpdate(id, { isActive: false }, { new: true });
    return template;
  }

  async getDefault() {
    return OMRTemplate.findOne({ isDefault: true, isActive: true });
  }

  async getByLevel(level, schoolId = null) {
    const filter = { level, isActive: true };
    if (level === 'school' && schoolId) {
      filter.schoolId = schoolId;
    }
    return OMRTemplate.find(filter);
  }

  async incrementUsageCount(id) {
    return OMRTemplate.findByIdAndUpdate(id, { $inc: { usageCount: 1 } });
  }

  async duplicate(id, newCode, newName) {
    const original = await OMRTemplate.findById(id);
    if (!original) {
      throw new Error('Template not found');
    }

    const duplicate = new OMRTemplate({
      ...original.toObject(),
      _id: undefined,
      code: newCode,
      name: newName,
      level: 'custom',
      isDefault: false,
      usageCount: 0,
    });

    await duplicate.save();
    return duplicate;
  }
}

module.exports = new OMRTemplateService();
