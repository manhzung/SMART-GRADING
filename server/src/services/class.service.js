const mongoose = require('mongoose');
const { Class, User, School, Subject, Exam } = require('../models');
const ApiError = require('../utils/ApiError');
const { parsePagination } = require('../utils/parsePagination');

class ClassService {
  async create(data, requestingUser = null) {
    if (data.homeroomTeacherId === '') data.homeroomTeacherId = null;
    if (data.schoolId === '') data.schoolId = null;

    // Authorization:
    // - admin can create any class
    // - teacher with a schoolId can only create in their own school
    // - teacher without a schoolId can still create a "school-less" class
    if (requestingUser) {
      const userSchoolId = requestingUser.schoolId?.toString();
      const dataSchoolId = data.schoolId?.toString();

      if (requestingUser.role === 'teacher') {
        // Teacher with a school must create within that school
        if (userSchoolId && userSchoolId !== dataSchoolId) {
          throw new ApiError(403, 'You can only create classes in your own school');
        }
        // Teacher without a school cannot create a class tied to a specific school
        if (!userSchoolId && dataSchoolId) {
          throw new ApiError(403, 'You cannot create a class for a school you do not belong to. Leave schoolId empty.');
        }
      }
      if (requestingUser.role !== 'admin' && requestingUser.role !== 'teacher') {
        throw new ApiError(403, 'Only admin and teachers can create classes');
      }
    }

    const existing = await Class.findOne({
      schoolId: data.schoolId,
      code: data.code,
      academicYear: data.academicYear,
    });

    if (existing) {
      throw new ApiError(400, 'Class already exists with this code in this academic year');
    }

    const classData = new Class(data);
    await classData.save();
    return this.getById(classData._id);
  }

  async getById(id, requestingUser = null) {
    const classData = await Class.findById(id)
      .populate('homeroomTeacherId', 'name email')
      .populate('studentIds', 'name email studentCode isActive dateOfBirth')
      .populate('subjectTeachers.teacherId', 'name email')
      .populate('subjectTeachers.subjectId', 'name code color');

    if (!classData) {
      throw new ApiError(404, 'Class not found');
    }

    // Authorization: only users in the same school can view the class
    if (requestingUser && requestingUser.schoolId) {
      if (!classData.schoolId) {
        // Class has no school: only visible to its creator (homeroom teacher) or admin
        const isAdmin = requestingUser.role === 'admin';
        const isHomeroom =
          classData.homeroomTeacherId && classData.homeroomTeacherId.toString() === requestingUser._id?.toString();
        if (!isAdmin && !isHomeroom) {
          throw new ApiError(403, 'You can only view classes in your own school');
        }
      } else if (classData.schoolId.toString() !== requestingUser.schoolId.toString()) {
        throw new ApiError(403, 'You can only view classes in your own school');
      }
    }

    return classData;
  }

  async getBySchool(schoolId, query = {}, requestingUser = null) {
    const { academicYear, gradeLevel, page, limit, ...rest } = query;
    const { page: parsedPage, limit: parsedLimit, skip } = parsePagination(query);

    const userSchoolId = requestingUser?.schoolId?.toString();
    const targetSchoolId = schoolId?.toString();

    // Authorization: enforce school boundary
    // Skip check if: no user, admin bypass, no schoolId on user, or no target schoolId
    if (requestingUser && userSchoolId && targetSchoolId && requestingUser.role !== 'admin') {
      if (targetSchoolId !== userSchoolId) {
        throw new ApiError(403, 'You can only access classes in your own school');
      }
    }

    // Build filter: use targetSchoolId if provided, otherwise fall back to user's school (if not admin)
    const filter = { isActive: true, ...rest };
    const isAdmin = requestingUser?.role === 'admin';
    if (targetSchoolId) {
      filter.schoolId = targetSchoolId;
    } else if (userSchoolId && !isAdmin) {
      filter.schoolId = userSchoolId;
    } else if (requestingUser && requestingUser.role === 'teacher') {
      // School-less teacher: only see classes they are homeroom teacher of.
      const teacherId = requestingUser._id || requestingUser.id;
      filter.schoolId = null;
      filter.homeroomTeacherId = teacherId;
    } else if (isAdmin) {
      // Admin with no school target: fetch all active classes
    } else {
      // No school context at all — return empty result instead of error
      return { results: [], page: parsedPage, limit: parsedLimit, total: 0, pages: 0 };
    }

    if (academicYear) filter.academicYear = academicYear;
    if (gradeLevel) filter.gradeLevel = gradeLevel;

    if (requestingUser && requestingUser.role === 'teacher' && userSchoolId) {
      const teacherId = requestingUser._id || requestingUser.id;
      filter.$or = [{ homeroomTeacherId: teacherId }, { 'subjectTeachers.teacherId': teacherId }];
    }

    const [classes, total] = await Promise.all([
      Class.find(filter)
        .populate('homeroomTeacherId', 'name email')
        .populate('studentIds', 'name email studentCode isActive dateOfBirth')
        .populate('subjectTeachers.teacherId', 'name email')
        .populate('subjectTeachers.subjectId', 'name code color')
        .skip(skip)
        .limit(parsedLimit)
        .sort({ gradeLevel: 1, name: 1 }),
      Class.countDocuments(filter),
    ]);

    return {
      results: classes,
      page: parsedPage,
      limit: parsedLimit,
      total,
      pages: Math.ceil(total / parsedLimit),
    };
  }

  async _authorizeClassAccess(classId, requestingUser, action = 'access') {
    const classData = await Class.findById(classId);
    if (!classData) {
      throw new ApiError(404, 'Class not found');
    }
    if (!classData.isActive && action !== 'delete') {
      throw new ApiError(404, 'Class has been deactivated');
    }

    const userSchoolId = requestingUser?.schoolId?.toString();
    const classSchoolId = classData.schoolId?.toString() || null;

    // Admin can access any class
    if (requestingUser?.role === 'admin') {
      return classData;
    }

    // School-less class: only the homeroom teacher (creator) can access it
    if (!classSchoolId) {
      const isHomeroom =
        classData.homeroomTeacherId && classData.homeroomTeacherId.toString() === requestingUser?._id?.toString();
      if (!isHomeroom) {
        throw new ApiError(403, `You can only ${action} classes in your own school`);
      }
      return classData;
    }

    // Must be in the same school
    if (userSchoolId && userSchoolId !== classSchoolId) {
      throw new ApiError(403, `You can only ${action} classes in your own school`);
    }

    // Teacher must be homeroom teacher to modify
    if (requestingUser?.role === 'teacher' && action !== 'view') {
      const teacherId = requestingUser._id?.toString() || requestingUser.id?.toString();
      const isHomeroom = classData.homeroomTeacherId?.toString() === teacherId;
      const isSubjectTeacher = classData.subjectTeachers.some((st) => st.teacherId?.toString() === teacherId);
      if (!isHomeroom && !isSubjectTeacher) {
        throw new ApiError(403, 'Only the homeroom teacher or assigned subject teachers can modify this class');
      }
    }

    return classData;
  }

  async update(id, data, requestingUser = null) {
    if (data.homeroomTeacherId === '') data.homeroomTeacherId = null;
    const classData = await this._authorizeClassAccess(id, requestingUser, 'update');

    if (requestingUser?.role === 'teacher') {
      // Teachers can only update homeroomTeacherId and subjectTeachers
      const allowedFields = ['homeroomTeacherId'];
      const attemptedFields = Object.keys(data);
      const disallowed = attemptedFields.filter((f) => !allowedFields.includes(f));
      if (disallowed.length > 0) {
        throw new ApiError(403, `Teachers cannot modify: ${disallowed.join(', ')}`);
      }
    }

    const updated = await Class.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    return updated;
  }

  async addStudents(classId, studentIds, requestingUser = null) {
    const classData = await this._authorizeClassAccess(classId, requestingUser, 'modify');

    const newStudents = studentIds.filter((id) => !classData.studentIds.includes(id));
    classData.studentIds.push(...newStudents);
    await classData.save();

    await User.updateMany({ _id: { $in: newStudents } }, { $addToSet: { classIds: classId } });

    return this.getById(classId);
  }

  async removeStudents(classId, studentIds, requestingUser = null) {
    const classData = await this._authorizeClassAccess(classId, requestingUser, 'modify');

    classData.studentIds = classData.studentIds.filter((id) => !studentIds.includes(id.toString()));
    await classData.save();

    await User.updateMany({ _id: { $in: studentIds } }, { $pull: { classIds: classId } });

    return this.getById(classId);
  }

  async importStudents(classId, studentsData, requestingUser = null) {
    const classData = await this._authorizeClassAccess(classId, requestingUser, 'modify');

    const results = { success: [], failed: [] };

    for (const studentData of studentsData) {
      try {
        let student = await User.findOne({ email: studentData.email });

        if (student) {
          if (!student.classIds.includes(classId)) {
            student.classIds.push(classId);
            if (studentData.dateOfBirth && !student.dateOfBirth) {
              student.dateOfBirth = studentData.dateOfBirth;
            }
            await student.save();
          }
        } else {
          student = new User({
            name: studentData.name,
            email: studentData.email,
            password: 'student123',
            studentCode: studentData.studentCode,
            phone: studentData.phone,
            dateOfBirth: studentData.dateOfBirth || null,
            role: 'student',
            classIds: [classId],
            schoolId: classData.schoolId,
          });
          await student.save();
        }

        if (!classData.studentIds.includes(student._id)) {
          classData.studentIds.push(student._id);
        }
        results.success.push({ email: studentData.email, studentId: student._id });
      } catch (error) {
        results.failed.push({ email: studentData.email, error: error.message });
      }
    }

    await classData.save();
    return results;
  }

  // ── Available Students (for "Add Students" flow) ──────────────────────────
  async getAvailableStudents(classId, query = {}, requestingUser = null) {
    // 1. Authorize access to class (admin OK; teacher must be homeroom/subject teacher)
    const classData = await this._authorizeClassAccess(classId, requestingUser, 'view');

    // 2. Parse pagination
    const { page, limit, skip } = parsePagination(query);

    // 3. Build filter: students in same school, NOT already in this class
    const filter = {
      role: 'student',
      schoolId: classData.schoolId,
      _id: { $nin: classData.studentIds },
    };

    // 4. Add search filter (case-insensitive, partial match on name/studentCode/email)
    if (query.search && String(query.search).trim().length > 0) {
      const escaped = String(query.search)
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { studentCode: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
      ];
    }

    // 5. Query with select to limit fields
    const [results, total] = await Promise.all([
      User.find(filter).select('name email studentCode avatarUrl isActive').sort({ name: 1 }).skip(skip).limit(limit),
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

  async delete(id, requestingUser = null) {
    const classData = await this._authorizeClassAccess(id, requestingUser, 'delete');

    if (requestingUser?.role === 'teacher') {
      throw new ApiError(403, 'Only admins can delete classes');
    }

    await Class.findByIdAndUpdate(id, { isActive: false }, { new: true });
    return { success: true };
  }

  async getStudentCount(id) {
    const classData = await Class.findById(id).select('studentIds');
    return classData?.studentIds?.length || 0;
  }

  async getStudentsByClass(classId, requestingUser = null) {
    const classData = await Class.findById(classId)
      .select('studentIds schoolId')
      .populate('studentIds', 'name email studentCode avatarUrl isActive dateOfBirth phone gender');

    if (!classData) {
      throw new ApiError(404, 'Class not found');
    }

    // Authorization: enforce school boundary
    if (requestingUser?.schoolId && classData.schoolId) {
      if (classData.schoolId.toString() !== requestingUser.schoolId.toString()) {
        throw new ApiError(403, 'You can only access students in your own school');
      }
    }

    return {
      results: classData.studentIds,
      total: classData.studentIds.length,
    };
  }

  // ── Student Credentials (for admin/homeroom teacher) ─────────────────────────
  async getStudentCredentials(classId, requestingUser = null) {
    await this._authorizeClassAccess(classId, requestingUser, 'view');

    // Only admin or homeroom teacher can access passwords
    if (requestingUser?.role !== 'admin' && requestingUser?.role !== 'teacher') {
      throw new ApiError(403, 'Only admin or homeroom teacher can view student credentials');
    }

    const classData = await Class.findById(classId).select('homeroomTeacherId studentIds schoolId');
    const teacherId = requestingUser._id?.toString() || requestingUser.id?.toString();
    const isHomeroom = classData.homeroomTeacherId?.toString() === teacherId;

    if (requestingUser?.role === 'teacher' && !isHomeroom) {
      throw new ApiError(403, 'Only homeroom teacher can view student credentials');
    }

    // Query students — note: we DO NOT expose the password (bcrypt hash, one-way).
    // We surface a hint to indicate the default password for imported students.
    const students = await User.find({
      _id: { $in: classData.studentIds },
      role: 'student',
    }).select('name email studentCode isActive dateOfBirth');

    const result = students.map((s) => ({
      _id: s._id && s._id.toString ? s._id.toString() : s._id,
      name: s.name,
      email: s.email,
      studentCode: s.studentCode,
      isActive: s.isActive,
      dateOfBirth: s.dateOfBirth,
      // Indicate that this account still uses the default password (set at import).
      // Use the dedicated reset endpoint to set a new password.
      passwordHint: 'student123',
    }));
    return result;
  }

  // ── Update Student Info ─────────────────────────────────────────────────────
  async updateStudent(classId, studentId, updateData, requestingUser = null) {
    await this._authorizeClassAccess(classId, requestingUser, 'view');

    // Only admin or homeroom teacher can update students
    if (requestingUser?.role !== 'admin' && requestingUser?.role !== 'teacher') {
      throw new ApiError(403, 'Only admin or homeroom teacher can update student info');
    }

    const classData = await Class.findById(classId).select('homeroomTeacherId studentIds schoolId');
    if (!classData.studentIds.some((id) => id.toString() === studentId)) {
      throw new ApiError(404, 'Student not found in this class');
    }

    const teacherId = requestingUser._id?.toString() || requestingUser.id?.toString();
    const isHomeroom = classData.homeroomTeacherId?.toString() === teacherId;

    if (requestingUser?.role === 'teacher' && !isHomeroom) {
      throw new ApiError(403, 'Only homeroom teacher can update student info');
    }

    // Allowed fields to update
    const allowedFields = ['name', 'email', 'studentCode', 'dateOfBirth', 'isActive'];
    const sanitizedData = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        sanitizedData[field] = updateData[field];
      }
    }

    const updated = await User.findByIdAndUpdate(studentId, sanitizedData, { new: true, runValidators: true }).select(
      'name email studentCode isActive dateOfBirth'
    );

    if (!updated) {
      throw new ApiError(404, 'Student not found');
    }

    return updated;
  }

  // ── Reset Student Password ──────────────────────────────────────────────────
  async resetStudentPassword(classId, studentId, newPassword, requestingUser = null) {
    if (requestingUser?.role !== 'admin' && requestingUser?.role !== 'teacher') {
      throw new ApiError(403, 'Only admin or homeroom teacher can reset student password');
    }

    const classData = await Class.findById(classId).select('homeroomTeacherId studentIds schoolId');
    if (!classData || !classData.studentIds.some((id) => id.toString() === studentId)) {
      throw new ApiError(404, 'Student not found in this class');
    }

    const teacherId = requestingUser._id?.toString() || requestingUser.id?.toString();
    const isHomeroom = classData.homeroomTeacherId?.toString() === teacherId;

    if (requestingUser?.role === 'teacher' && !isHomeroom) {
      throw new ApiError(403, 'Only homeroom teacher can reset student password');
    }

    // Validate password strength (matches User schema: >=8 chars, letter + digit)
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      throw new ApiError(400, 'Password must be at least 8 characters');
    }
    if (!newPassword.match(/\d/) || !newPassword.match(/[a-zA-Z]/)) {
      throw new ApiError(400, 'Password must contain at least one letter and one number');
    }

    const user = await User.findById(studentId);
    if (!user) {
      throw new ApiError(404, 'Student not found');
    }

    user.password = newPassword;
    await user.save();

    return { _id: user._id, passwordUpdated: true };
  }

  async manageSubjectTeachers(classId, action, payload, requestingUser = null) {
    const classData = await this._authorizeClassAccess(classId, requestingUser, 'modify');

    const { subjectId, teacherId } = payload;

    if (action === 'add') {
      const alreadyAssigned = classData.subjectTeachers.some(
        (st) => st.teacherId.toString() === teacherId && (!subjectId || st.subjectId?.toString() === subjectId)
      );
      if (alreadyAssigned) {
        throw new ApiError(400, 'Teacher is already assigned to this subject in this class');
      }
      classData.subjectTeachers.push({ subjectId: subjectId || null, teacherId, addedAt: new Date() });
    } else if (action === 'remove') {
      classData.subjectTeachers = classData.subjectTeachers.filter(
        (st) => !(st.teacherId.toString() === teacherId && (!subjectId || st.subjectId?.toString() === subjectId))
      );
    }

    await classData.save();
    return this.getById(classId);
  }

  async transferHomeroomTeacher(classId, currentTeacherId, newTeacherId, requestingUser = null) {
    const classData = await this._authorizeClassAccess(classId, requestingUser, 'modify');

    if (classData.homeroomTeacherId?.toString() !== currentTeacherId) {
      throw new ApiError(403, 'Only the current homeroom teacher can transfer ownership');
    }

    if (newTeacherId) {
      const newTeacher = await User.findById(newTeacherId);
      if (!newTeacher) {
        throw new ApiError(404, 'New teacher not found');
      }
      // Must be in the same school
      if (requestingUser?.schoolId && newTeacher.schoolId?.toString() !== requestingUser.schoolId.toString()) {
        throw new ApiError(403, 'New homeroom teacher must be in the same school');
      }
      if (newTeacher.role !== 'teacher' && newTeacher.role !== 'admin') {
        throw new ApiError(400, 'New homeroom teacher must be a teacher or admin');
      }
    }

    classData.homeroomTeacherId = newTeacherId || null;
    await classData.save();

    if (newTeacherId) {
      await User.findByIdAndUpdate(newTeacherId, { $addToSet: { classIds: classId } });
    }

    return this.getById(classId);
  }

  async getClassStatistics(classId, requestingUser = null) {
    await this._authorizeClassAccess(classId, requestingUser, 'view');

    const [classData, exams] = await Promise.all([
      Class.findById(classId).select('studentIds').lean(),
      Exam.find({ classIds: classId, status: { $ne: 'archived' } })
        .select('examDate status title')
        .lean(),
    ]);

    const studentIds = classData?.studentIds || [];
    const now = new Date();
    const totalStudents = studentIds.length;

    const upcomingExams = exams.filter((e) => e.examDate && new Date(e.examDate) > now);
    const nextExam =
      upcomingExams.length > 0
        ? upcomingExams.sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime())[0]
        : null;

    const { Submission } = require('../models');
    const examIds = exams.map((e) => e._id);

    let averageScore = 0;
    if (examIds.length > 0) {
      const scoredSubmissions = await Submission.aggregate([
        {
          $match: {
            examId: { $in: examIds },
            score: { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: null,
            avgScore: { $avg: '$score' },
          },
        },
      ]);
      averageScore = scoredSubmissions[0]?.avgScore || 0;
    }

    return {
      totalStudents,
      attendanceRate: 95,
      averageScore: Math.round(averageScore * 10) / 10,
      activeExams: exams.filter((e) => e.status === 'published' || e.status === 'in_progress').length,
      completedAssignments: exams.filter((e) => e.status === 'completed').length,
      totalAssignments: exams.length,
      upcomingExams: upcomingExams.length,
      nextExam: nextExam
        ? {
            title: nextExam.title,
            daysUntil: Math.ceil((new Date(nextExam.examDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
          }
        : null,
    };
  }

  // ── Exam ↔ Class management ─────────────────────────────────────────────────
  async getClassExams(classId, requestingUser = null) {
    await this._authorizeClassAccess(classId, requestingUser, 'view');
    return Exam.find({ classIds: classId, status: { $ne: 'archived' } })
      .populate('primaryClassId', 'name code')
      .populate('createdBy', 'name email')
      .populate('omrTemplateId', 'name code')
      .sort({ examDate: -1 });
  }

  async assignExamsToClass(classId, examIds, requestingUser = null) {
    await this._authorizeClassAccess(classId, requestingUser, 'modify');
    const results = { assigned: [], failed: [] };
    for (const examId of examIds) {
      try {
        const exam = await Exam.findById(examId);
        if (!exam) {
          results.failed.push({ examId, error: 'Exam not found' });
          continue;
        }
        if (exam.status === 'in_progress') {
          results.failed.push({ examId, error: 'Cannot assign an exam that is in progress' });
          continue;
        }
        if (!exam.classIds.some((cid) => cid.toString() === classId)) {
          exam.classIds.push(classId);
          await exam.save();
        }
        results.assigned.push(examId);
      } catch (err) {
        results.failed.push({ examId, error: err.message });
      }
    }
    return results;
  }

  async removeExamFromClass(classId, examId, requestingUser = null) {
    await this._authorizeClassAccess(classId, requestingUser, 'modify');
    const exam = await Exam.findById(examId);
    if (!exam) {
      throw new ApiError(404, 'Exam not found');
    }
    if (exam.status === 'in_progress') {
      throw new ApiError(409, 'Cannot remove class from an exam that is in progress');
    }
    exam.classIds = exam.classIds.filter((id) => id.toString() !== classId.toString());
    await exam.save();
  }
}

module.exports = new ClassService();
