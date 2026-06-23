// Mock child_process module with factory before any imports
const mockSpawn = jest.fn();
jest.mock('child_process', () => ({
  spawn: mockSpawn,
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

const { spawn } = require('child_process');

describe('amcRunnerService', () => {
  let amcRunner;

  beforeEach(() => {
    // Clear all mocks but keep jest.mock factories
    jest.clearAllMocks();
    // Reset spawn mock
    mockSpawn.mockReset();
    // Re-require service to get fresh instance
    jest.isolateModules(() => {
      amcRunner = require('../../src/amc/amcRunner.service');
    });
  });

  describe('validateEnvironment', () => {
    it('should return isValid true when all tools are available', async () => {
      mockSpawn.mockImplementation(() => ({
        stdout: { on: jest.fn((e, cb) => { if (e === 'data') cb('pdfTeX 3.14159265'); }) },
        stderr: { on: jest.fn() },
        on: jest.fn((e, cb) => { if (e === 'close') cb(0); }),
      }));

      const result = await amcRunner.validateEnvironment();

      expect(result.isValid).toBe(true);
      expect(result.tools.texlive).toBe(true);
      expect(result.tools.amc).toBe(true);
      expect(result.tools.ghostscript).toBe(true);
    });

    it('should return isValid false when AMC is not found', async () => {
      mockSpawn.mockImplementation(() => ({
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((e, cb) => { if (e === 'close') cb(127); }),
      }));

      const result = await amcRunner.validateEnvironment();

      expect(result.isValid).toBe(false);
      expect(result.tools.amc).toBe(false);
    });

    it('should call wsl with correct distro name', async () => {
      mockSpawn.mockImplementation(() => ({
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((e, cb) => { if (e === 'close') cb(0); }),
      }));

      await amcRunner.validateEnvironment();

      expect(mockSpawn).toHaveBeenCalledWith(
        'wsl',
        expect.arrayContaining(['Ubuntu', '--', 'bash', '-c', expect.any(String)]),
        expect.any(Object)
      );
    });
  });

  describe('backendScan', () => {
    it('should call wsl amc-check --backend with project dir', async () => {
      mockSpawn.mockImplementation(() => ({
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((e, cb) => { if (e === 'close') cb(0); }),
      }));

      await amcRunner.backendScan('/home/amc/amc-projects/test-exam');

      // Command is passed as single string after -c
      expect(mockSpawn).toHaveBeenCalledWith(
        'wsl',
        expect.arrayContaining(['Ubuntu', '--', 'bash', '-c', expect.stringContaining('amc-check')]),
        expect.any(Object)
      );
    });

    it('should throw when backend scan fails', async () => {
      mockSpawn.mockImplementation(() => ({
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn((e, cb) => { if (e === 'data') cb('Error: bad input'); }) },
        on: jest.fn((e, cb) => { if (e === 'close') cb(1); }),
      }));

      await expect(
        amcRunner.backendScan('/home/amc/amc-projects/test-exam')
      ).rejects.toThrow();
    });
  });

  describe('compileVersions', () => {
    it('should call amc-compile with correct n-copies', async () => {
      mockSpawn.mockImplementation(() => ({
        stdout: { on: jest.fn((e, cb) => { if (e === 'data') cb('Compiling...'); }) },
        stderr: { on: jest.fn() },
        on: jest.fn((e, cb) => { if (e === 'close') cb(0); }),
      }));

      const result = await amcRunner.compileVersions('/home/amc/amc-projects/test', 4, 120);

      expect(result.success).toBe(true);
      expect(result.numVersions).toBe(4);
      // Command is passed as single string after -c
      expect(mockSpawn).toHaveBeenCalledWith(
        'wsl',
        expect.arrayContaining(['Ubuntu', '--', 'bash', '-c', expect.stringContaining('amc-compile')]),
        expect.any(Object)
      );
    });

    it('should include compilationTime in result', async () => {
      mockSpawn.mockImplementation(() => ({
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((e, cb) => { if (e === 'close') cb(0); }),
      }));

      const result = await amcRunner.compileVersions('/path', 2, 60);

      expect(result.compilationTime).toBeDefined();
      expect(typeof result.compilationTime).toBe('number');
    });
  });

  describe('getProjectDir', () => {
    it('should return WSL path with examId', () => {
      const result = amcRunner.getProjectDir('abc123');
      expect(result).toContain('abc123');
      expect(result).toContain('/home/amc/amc-projects');
    });
  });

  describe('cleanup', () => {
    it('should call rm -rf on project dir', async () => {
      mockSpawn.mockImplementation(() => ({
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((e, cb) => { if (e === 'close') cb(0); }),
      }));

      await amcRunner.cleanup('/home/amc/amc-projects/test-exam');

      // Command is passed as single string after -c
      expect(mockSpawn).toHaveBeenCalledWith(
        'wsl',
        expect.arrayContaining(['Ubuntu', '--', 'bash', '-c', expect.stringContaining('rm')]),
        expect.any(Object)
      );
    });
  });
});
