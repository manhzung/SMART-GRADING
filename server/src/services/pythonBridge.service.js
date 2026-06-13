const { spawn } = require('child_process');
const path = require('path');
const logger = require('../config/logger');

class PythonBridgeService {
  constructor(options = {}) {
    this.scriptPath = options.scriptPath || path.join(__dirname, '../../scripts/omr_process.py');
    this.defaultTimeout = options.timeout || 30000;
  }

  /**
   * Process an OMR image using the Python bridge script
   * @param {Object} params - Processing parameters
   * @param {Buffer|string} params.image - Image data (Buffer or base64 string)
   * @param {Object} params.template - Template configuration
   * @param {Object} [params.evaluation] - Evaluation configuration
   * @param {Object} [params.options] - Processing options
   * @param {number} [params.timeout] - Timeout in milliseconds
   * @returns {Promise<Object>} Processing result
   */
  async processImage({ image, imageUrl, template, evaluation, options, timeout }) {
    const timeoutMs = timeout || this.defaultTimeout;

    // Validate required parameters
    if (!image && !imageUrl) {
      return {
        success: false,
        error: 'Missing required field: image or imageUrl',
        error_code: 'VALIDATION_ERROR',
      };
    }

    if (!template) {
      return {
        success: false,
        error: 'Missing required field: template',
        error_code: 'VALIDATION_ERROR',
      };
    }

    // Convert Buffer to base64 if needed
    let imageBase64;
    if (imageUrl) {
      // Python will download
      imageBase64 = null;
    } else if (Buffer.isBuffer(image)) {
      imageBase64 = image.toString('base64');
    } else if (typeof image === 'string') {
      imageBase64 = image.startsWith('data:') ? image.replace(/^data:[^;]+;base64,/, '') : image;
    } else {
      return {
        success: false,
        error: 'Invalid image format: expected Buffer or base64 string',
        error_code: 'VALIDATION_ERROR',
      };
    }

    // Prepare input data
    const inputData = {
      image: imageBase64,
      imageUrl: imageUrl || null,
      template,
      ...(evaluation !== undefined && { evaluation }),
      ...(options !== undefined && { options }),
    };

    return this._spawnPythonProcess(inputData, timeoutMs);
  }

  /**
   * Spawn Python process and communicate via stdin/stdout
   * @private
   */
  _spawnPythonProcess(inputData, timeoutMs) {
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let isResolved = false;

      const pythonProcess = spawn('python', [this.scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      });

      // Set up timeout
      const timeoutId = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          pythonProcess.kill('SIGTERM');
          logger.warn('PythonBridgeService: Process terminated due to timeout');
          resolve({
            success: false,
            error: `Processing timed out after ${timeoutMs}ms`,
            error_code: 'TIMEOUT',
          });
        }
      }, timeoutMs);

      // Collect stdout
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      // Collect stderr
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle process error
      pythonProcess.on('error', (error) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutId);
          logger.error('PythonBridgeService: Failed to spawn Python process', { error: error.message });
          resolve({
            success: false,
            error: `Failed to spawn Python process: ${error.message}`,
            error_code: 'SPAWN_ERROR',
          });
        }
      });

      // Handle process close
      pythonProcess.on('close', (code) => {
        if (isResolved) return;
        isResolved = true;
        clearTimeout(timeoutId);

        // Log stderr if not empty
        if (stderr.trim()) {
          logger.warn('PythonBridgeService: stderr output', { stderr: stderr.trim() });
        }

        // Parse stdout as JSON
        try {
          const result = JSON.parse(stdout.trim());
          resolve(result);
        } catch (parseError) {
          logger.error('PythonBridgeService: Failed to parse Python output', {
            stdout: stdout.substring(0, 500),
            error: parseError.message,
          });
          resolve({
            success: false,
            error: `Invalid JSON output from Python process: ${parseError.message}`,
            error_code: 'PARSE_ERROR',
          });
        }
      });

      // Send input to Python process
      try {
        pythonProcess.stdin.write(JSON.stringify(inputData));
        pythonProcess.stdin.end();
      } catch (writeError) {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutId);
          logger.error('PythonBridgeService: Failed to write to stdin', { error: writeError.message });
          resolve({
            success: false,
            error: `Failed to write to Python process: ${writeError.message}`,
            error_code: 'WRITE_ERROR',
          });
        }
      }
    });
  }
}

module.exports = PythonBridgeService;
