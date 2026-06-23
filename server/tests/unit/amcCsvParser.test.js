const AmcCsvParser = require('../../src/amc/amcCsvParser');

describe('AmcCsvParser', () => {
  describe('parse', () => {
    it('should parse student ID zone coordinates', () => {
      const csv = `type,name,page,x1,y1,x2,y2
zone,student_id,1,72,200,90,218
zone,student_id,1,90,200,108,218`;
      const parser = new AmcCsvParser();
      const result = parser.parse(csv);
      expect(result.studentId).toBeDefined();
      expect(result.studentId.coords.length).toBeGreaterThan(0);
    });

    it('should parse version code coordinates', () => {
      const csv = `type,name,page,x1,y1,x2,y2
zone,version_code,1,72,230,90,248
zone,version_code,1,90,230,108,248`;
      const parser = new AmcCsvParser();
      const result = parser.parse(csv);
      expect(result.versionCode).toBeDefined();
    });

    it('should parse answer bubble coordinates', () => {
      const csv = `type,name,page,x1,y1,x2,y2
answer,q01_a,1,120,300,135,315
answer,q01_b,1,140,300,155,315`;
      const parser = new AmcCsvParser();
      const result = parser.parse(csv);
      expect(result.answers).toBeDefined();
      expect(result.answers.q01).toBeDefined();
      expect(result.answers.q01.A).toBeDefined();
    });

    it('should return width/height computed from coords', () => {
      const csv = `type,name,page,x1,y1,x2,y2
answer,q01_a,1,120,300,135,315`;
      const parser = new AmcCsvParser();
      const result = parser.parse(csv);
      const bubble = result.answers.q01.A;
      expect(bubble.w).toBe(15);
      expect(bubble.h).toBe(15);
    });

    it('should handle empty CSV gracefully', () => {
      const parser = new AmcCsvParser();
      const result = parser.parse('');
      expect(result.studentId).toBeDefined();
      expect(result.answers).toEqual({});
    });
  });
});
