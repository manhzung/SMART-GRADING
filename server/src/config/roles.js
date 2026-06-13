const allRoles = {
  admin: [
    'getUsers',
    'manageUsers',
    'manageSchools',
    'manageSubjects',
    'manageClasses',
    'manageQuestions',
    'manageExams',
    'manageOMRTemplates',
    'exportOMRTemplates',
    'viewReports',
    'manageAI',
  ],
  teacher: [
    'manageClasses',
    'manageQuestions',
    'manageExams',
    'exportOMRTemplates',
    'scanSubmissions',
    'reviewAppeals',
    'viewReports',
  ],
  student: [
    'viewExams',
    'submitAppeals',
    'viewScores',
    'viewAIReports',
    'chatWithAI',
  ],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
};
