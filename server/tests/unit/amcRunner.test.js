// Mock child_process and fs
jest.mock('child_process');
jest.mock('fs');

const { spawn } = require('child_process');
const mockSpawn = spawn;

describe('amcRunnerService', () => {
  let amcRunner;
  let mockProc;

  beforeEach(() => {
    jest.clearAllMocks();

    mockProc = {
      stdout: { on: jest.fn(), setEncoding: jest.fn() },
      stderr: { on: jest.fn(), setEncoding: jest.fn() },
      on: jest.fn(),
      kill: jest.fn(),
    };
    mockSpawn.mockImplementation(() => mockProc);

    delete require.cache[require.resolve('../../src/amc/amcRunner.service')];
    amcRunner = require('../../src/amc/amcRunner.service');
  });

  describe('validateEnvironment', () => {
    it('should return isValid true when all tools are available', async () => {
      mockProc.on.mockImplementation((e, cb) => {
        if (e === 'close') cb(0);
      });
      mockProc.stdout.on.mockImplementation((e, cb) => {
        if (e === 'data') cb('pdfTeX 3.14159265');
      });

      const result = await amcRunner.validateEnvironment();

      expect(result.isValid).toBe(true);
      expect(result.tools.texlive).toBe(true);
      expect(result.tools.amc).toBe(true);
      expect(result.tools.ghostscript).toBe(true);
    });

    it('should return isValid false when AMC is not found', async () => {
      mockProc.on.mockImplementation((e, cb) => {
        if (e === 'close') cb(127);
      });

      const result = await amcRunner.validateEnvironment();

      expect(result.isValid).toBe(false);
      expect(result.tools.amc).toBe(false);
    });

    it('should call wsl with correct distro name', async () => {
      mockProc.on.mockImplementation((e, cb) => {
        if (e === 'close') cb(0);
      });

      await amcRunner.validateEnvironment();

      expect(mockSpawn).toHaveBeenCalledWith(
        'wsl',
        expect.arrayContaining(['Ubuntu', '--', 'bash', '-c', expect.any(String)]),
        expect.any(Object)
      );
    });
  });

  describe('backendScan', () => {
    const validProjectDir = '/home/amc/amc-projects/test-exam';

    it('should call wsl amc-check --backend with project dir', async () => {
      mockProc.on.mockImplementation((e, cb) => {
        if (e === 'close') cb(0);
      });

      await amcRunner.backendScan(validProjectDir);

      expect(mockSpawn).toHaveBeenCalledWith(
        'wsl',
        expect.arrayContaining(['Ubuntu', '--', 'bash', '-c', expect.stringContaining('amc-check')]),
        expect.any(Object)
      );
    });

    it('should throw when backend scan fails', async () => {
      mockProc.on.mockImplementation((e, cb) => {
        if (e === 'close') cb(1);
      });
      mockProc.stderr.on.mockImplementation((e, cb) => {
        if (e === 'data') cb('Error: bad input');
      });

      await expect(
        amcRunner.backendScan(validProjectDir)
      ).rejects.toThrow();
    });

    it('should throw for invalid project path', async () => {
      await expect(
        amcRunner.backendScan('/etc/passwd')
      ).rejects.toThrow('Invalid project path');
    });
  });

  describe('compileVersions', () => {
    const validProjectDir = '/home/amc/amc-projects/test';

    it('should call amc-compile with correct n-copies', async () => {
      mockProc.on.mockImplementation((e, cb) => {
        if (e === 'close') cb(0);
      });
      mockProc.stdout.on.mockImplementation((e, cb) => {
        if (e === 'data') cb('Compiling...');
      });

      const result = await amcRunner.compileVersions(validProjectDir, 4, 120);

      expect(result.success).toBe(true);
      expect(result.numVersions).toBe(4);
      expect(mockSpawn).toHaveBeenCalledWith(
        'wsl',
        expect.arrayContaining(['Ubuntu', '--', 'bash', '-c', expect.stringContaining('amc-compile')]),
        expect.any(Object)
      );
    });

    it('should include compilationTime in result', async () => {
      mockProc.on.mockImplementation((e, cb) => {
        if (e === 'close') cb(0);
      });

      const result = await amcRunner.compileVersions(validProjectDir, 2, 60);

      expect(result.compilationTime).toBeDefined();
      expect(typeof result.compilationTime).toBe('number');
    });

    it('should throw for invalid project path', async () => {
      await expect(
        amcRunner.compileVersions('/etc/passwd', 1, 60)
      ).rejects.toThrow('Invalid project path');
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
    const validProjectDir = '/home/amc/amc-projects/test-exam';

    it('should call rm -rf on project dir', async () => {
      mockProc.on.mockImplementation((e, cb) => {
        if (e === 'close') cb(0);
      });

      await amcRunner.cleanup(validProjectDir);

      expect(mockSpawn).toHaveBeenCalledWith(
        'wsl',
        expect.arrayContaining(['Ubuntu', '--', 'bash', '-c', expect.stringContaining('rm')]),
        expect.any(Object)
      );
    });

    it('should throw for invalid project path', async () => {
      await expect(
        amcRunner.cleanup('/etc/passwd')
      ).rejects.toThrow('Invalid project path');
    });
  });
});
