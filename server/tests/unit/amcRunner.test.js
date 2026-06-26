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
      expect(result.tools.ghostscript).toBe(true);
      expect(result.tools.xvfb).toBe(true);
    });
  });

  describe('backendScan', () => {
    const validProjectDir = '/home/amc/amc-projects/test-exam';

    it('should call amc check --backend with project dir', async () => {
      mockProc.on.mockImplementation((e, cb) => {
        if (e === 'close') cb(0);
      });

      await amcRunner.backendScan(validProjectDir);

      expect(mockSpawn).toHaveBeenCalledWith(
        'wsl',
        expect.arrayContaining(['-d', 'Ubuntu-24.04', '--', 'bash', '-c', expect.stringContaining('amc')]),
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

    it('should call amc compile with correct n-copies', async () => {
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
        expect.arrayContaining(['-d', 'Ubuntu-24.04', '--', 'bash', '-c', expect.stringContaining('compile')]),
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
        expect.arrayContaining(['-d', 'Ubuntu-24.04', '--', 'bash', '-c', expect.stringContaining('rm')]),
        expect.any(Object)
      );
    });

    it('should throw for invalid project path', async () => {
      await expect(
        amcRunner.cleanup('/etc/passwd')
      ).rejects.toThrow('Invalid project path');
    });
  });

  describe('_generateCalageXy', () => {
    const projectDir = '/home/amc/amc-projects/test';

    it('should parse tracepos from aux file and generate calage.xy', async () => {
      // Mock aux file with tracepos entries
      const mockAuxContent = `
\\relax
\\tracepos{1/1:positionHG}{0sp}{51243981sp}{square}
\\tracepos{1/1:case:q1:1,4}{6224078sp}{40365103sp}{square}
\\tracepos{1/1:case:q1:1,4}{6996513sp}{39592668sp}{square}
\\tracepos{1/1:case:q1:1,2}{6224078sp}{39178901sp}{square}
\\tracepos{1/1:case:q1:1,2}{6996513sp}{38406466sp}{square}
\\tracepos{1/1:case:q2:2,1}{6224078sp}{33844269sp}{square}
\\tracepos{1/1:case:q2:2,1}{6996513sp}{33071834sp}{square}
\\boxchar{1/1:case:q1:1,4}{}
\\boxchar{1/1:case:q1:1,2}{}
\\boxchar{1/1:case:q2:2,1}{}
`;

      const mockLogContent = `Page dimensions \\(paper\\)=597pt x 845pt`;

      const mockTexContent = `
\\AMCcodeGrid{q1}{A,B,C,D}
\\AMCcodeGrid{q2}{A,B,C,D}
`;

      mockProc.on.mockImplementation((e, cb) => {
        if (e === 'close') cb(0);
      });
      mockProc.stdout.on.mockImplementation((e, cb) => {
        if (e === 'data') cb('');
      });

      // Track what commands are executed
      const execCommands = [];
      mockSpawn.mockImplementation((cmd, args) => {
        const actualProc = { ...mockProc };
        actualProc.stdout.on = jest.fn((e, cb) => {
          if (e === 'data') {
            // Return different content based on command
            const cmdStr = args ? args.join(' ') : '';
            if (cmdStr.includes('cat') && cmdStr.includes('.aux')) {
              cb(mockAuxContent);
            } else if (cmdStr.includes('cat') && cmdStr.includes('.log')) {
              cb(mockLogContent);
            } else if (cmdStr.includes('cat') && cmdStr.includes('.tex')) {
              cb(mockTexContent);
            } else {
              cb('CALAGE_OK');
            }
          }
        });
        return actualProc;
      });

      await amcRunner._generateCalageXy(projectDir, 'amc-compiled', `${projectDir}/.calage.xy`);

      // Verify spawn was called multiple times (cat aux, cat log, cat tex, printf)
      expect(mockSpawn.mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    it('should skip position markers in tracepos parsing', async () => {
      const mockAuxContent = `
\\tracepos{1/1:positionHG}{0sp}{51243981sp}{square}
\\tracepos{1/1:case:q1:1,1}{6224078sp}{40365103sp}{square}
\\tracepos{1/1:positionBD}{0sp}{3468302sp}{square}
`;

      mockProc.on.mockImplementation((e, cb) => {
        if (e === 'close') cb(0);
      });
      mockProc.stdout.on.mockImplementation((e, cb) => {
        if (e === 'data') cb('');
      });

      mockSpawn.mockImplementation((cmd, args) => {
        const actualProc = { ...mockProc };
        actualProc.stdout.on = jest.fn((e, cb) => {
          if (e === 'data') {
            const cmdStr = args ? args.join(' ') : '';
            if (cmdStr.includes('.aux')) cb(mockAuxContent);
            else if (cmdStr.includes('.log')) cb('');
            else if (cmdStr.includes('.tex')) cb('\\AMCcodeGrid{q1}{A,B,C,D}');
            else cb('CALAGE_OK');
          }
        });
        return actualProc;
      });

      await amcRunner._generateCalageXy(projectDir, 'amc-compiled', `${projectDir}/.calage.xy`);

      // Function should complete without error
      expect(mockSpawn).toHaveBeenCalled();
    });

    it('should handle missing aux file gracefully', async () => {
      mockProc.on.mockImplementation((e, cb) => {
        if (e === 'close') cb(0);
      });
      mockProc.stdout.on.mockImplementation((e, cb) => {
        if (e === 'data') cb('');
      });

      mockSpawn.mockImplementation((cmd, args) => {
        const actualProc = { ...mockProc };
        actualProc.stdout.on = jest.fn((e, cb) => {
          if (e === 'data') {
            const cmdStr = args ? args.join(' ') : '';
            if (cmdStr.includes('.aux')) cb(''); // Empty aux
            else if (cmdStr.includes('.log')) cb('');
            else if (cmdStr.includes('.tex')) cb('\\AMCcodeGrid{q1}{A,B,C,D}');
            else cb('CALAGE_OK');
          }
        });
        return actualProc;
      });

      // Should not throw, just generate skeleton
      await expect(
        amcRunner._generateCalageXy(projectDir, 'amc-compiled', `${projectDir}/.calage.xy`)
      ).resolves.not.toThrow();
    });
  });
});
