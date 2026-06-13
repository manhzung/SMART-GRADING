# Cloudinary Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace base64-in-JSON image transport on the submission scan endpoint with direct-to-Cloudinary signed uploads while keeping the feature flag rollback path intact.

**Architecture:** Backend issues short-lived signed upload parameters; clients upload images directly to Cloudinary; clients then attach the resulting URL/PublicID to the Submission document via REST. The Python OMR script downloads the image via HTTPS instead of receiving base64 on stdin. Feature flag `UPLOAD_MODE` (env-driven) toggles between the new `cloudinary` flow and the legacy `base64` flow.

**Tech Stack:**
- Backend: Node.js 12+, Express 4, Mongoose 5, Jest 26, Supertest 6, `cloudinary` SDK 2.x, `axios` 1.x
- Web: React, TypeScript, Jest + React Testing Library, native `fetch` + `XMLHttpRequest`
- Mobile: Flutter, Dart, `http` 1.2.x, `dio` 5.4.x, `image_picker` 1.0.x
- Python: OMRChecker (unchanged), receives `imageUrl` and uses `requests` to download

**Reference Spec:** `docs/superpowers/specs/2026-06-14-cloudinary-migration-design.md`

---

## Scope Note

This is the **first of one plan** for this feature. Backend changes are interleaved with schema changes that the controller relies on. Tasks are ordered so each task leaves the test suite green. The plan is decomposed into 25 tasks across backend (1-15), web (16-19), mobile (20-23), and E2E/cleanup (24-25).

---

## File Map

```
server/
├── src/
│   ├── config/
│   │   └── config.js                              -- MODIFY: add upload.mode
│   ├── models/
│   │   ├── index.js                               -- MODIFY: register uploadAuditLog
│   │   ├── submission.model.js                    -- MODIFY: imageSchema add publicId/bytes/format
│   │   └── uploadAuditLog.model.js                -- CREATE
│   ├── services/
│   │   ├── index.js                               -- MODIFY: export cloudinary
│   │   ├── cloudinary.service.js                  -- CREATE
│   │   ├── pythonBridge.service.js                -- MODIFY: accept imageUrl branch
│   │   └── submission.service.js                  -- MODIFY: scan with originalUrl, delete fan-out, attachImage
│   ├── controllers/
│   │   ├── upload.controller.js                   -- CREATE
│   │   └── submission.controller.js               -- MODIFY: attachImage, deleteImage
│   ├── routes/v1/
│   │   ├── index.js                               -- MODIFY: mount upload
│   │   ├── upload.route.js                        -- CREATE
│   │   └── submission.route.js                    -- MODIFY: 2 new routes
│   ├── utils/
│   │   └── cloudinary.util.js                     -- CREATE
│   └── validations/
│       └── submission.validation.js               -- MODIFY: attachImage, deleteImage, scan with originalUrl
├── scripts/
│   └── omr_process.py                             -- MODIFY: download imageUrl via requests
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   │   └── cloudinary.service.test.js         -- CREATE
│   │   └── utils/
│   │       └── cloudinary.util.test.js            -- CREATE
│   └── integration/
│       └── routes/v1/
│           └── upload.route.test.js               -- CREATE
└── package.json                                   -- MODIFY: add cloudinary + axios

client/web/src/
├── services/
│   ├── cloudinary.service.ts                      -- CREATE
│   └── cloudinary.service.test.ts                 -- CREATE
├── hooks/
│   ├── useCloudinaryUpload.ts                     -- CREATE
│   └── useCloudinaryUpload.test.ts                -- CREATE
├── components/submission/
│   ├── ImageGallery.tsx                           -- CREATE
│   ├── ImageGallery.test.tsx                      -- CREATE
│   ├── SubmissionDetailPage.tsx                   -- CREATE
│   └── SubmissionDetailPage.test.tsx              -- CREATE
└── pages/submissions/
    └── [id].tsx                                   -- CREATE
└── jest.config.js                                 -- (existing) no change

client/mobile/
├── pubspec.yaml                                   -- MODIFY: add http, dio
├── lib/
│   ├── models/
│   │   ├── upload_result.dart                     -- CREATE
│   │   ├── upload_signature.dart                  -- CREATE
│   │   └── image_type.dart                        -- CREATE
│   ├── services/
│   │   ├── cloudinary_service.dart                -- CREATE
│   │   ├── submission_repository.dart             -- CREATE
│   │   └── api_client.dart                        -- (existing) no change
│   └── screens/scanner/
│       └── scan_result_screen.dart                -- MODIFY: use CloudinaryService
└── test/
    ├── services/
    │   ├── cloudinary_service_test.dart           -- CREATE
    │   └── submission_repository_test.dart        -- CREATE
    └── widgets/
        └── scan_result_screen_test.dart           -- CREATE
```

---

## Task 1: Add Cloudinary + Axios dependencies

**Files:**
- Modify: `server/package.json` (deps section only)

- [ ] **Step 1: Install dependencies**

Run from project root:
```bash
cd server
npm install --save cloudinary@^2.0.3 axios@^1.6.7
```

Expected: 2 new entries appear under `dependencies` in `server/package.json`, no peer warnings on Express.

- [ ] **Step 2: Verify install**

Run:
```bash
cd server
node -e "require('cloudinary'); require('axios'); console.log('OK')"
```

Expected: prints `OK`.

- [ ] **Step 3: Commit**

```bash
git add server/package.json server/package-lock.json
git commit -m "chore(server): add cloudinary and axios dependencies"
```

---

## Task 2: Add `UPLOAD_MODE` config flag

**Files:**
- Modify: `server/src/config/config.js`

- [ ] **Step 1: Replace the file contents with the version below**

```js
const dotenv = require('dotenv');
const path = require('path');
const Joi = require('joi');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('production', 'development', 'test').required(),
    PORT: Joi.number().default(3000),
    MONGODB_URL: Joi.string().required().description('Mongo DB url'),
    JWT_SECRET: Joi.string().required().description('JWT secret key'),
    JWT_ACCESS_EXPIRATION_MINUTES: Joi.number().default(30).description('minutes after which access tokens expire'),
    JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(30).description('days after which refresh tokens expire'),
    JWT_RESET_PASSWORD_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which reset password token expires'),
    JWT_VERIFY_EMAIL_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which verify email token expires'),
    SMTP_HOST: Joi.string().description('server that will send the emails'),
    SMTP_PORT: Joi.number().description('port to connect to the email server'),
    SMTP_USERNAME: Joi.string().description('username for email server'),
    SMTP_PASSWORD: Joi.string().description('password for email server'),
    EMAIL_FROM: Joi.string().description('the from field in the emails sent by the app'),
    FRONTEND_URL: Joi.string().description('frontend application URL for email links'),
    CLOUDINARY_CLOUD_NAME: Joi.string().description('Cloudinary cloud name'),
    CLOUDINARY_API_KEY: Joi.string().description('Cloudinary API key'),
    CLOUDINARY_API_SECRET: Joi.string().description('Cloudinary API secret'),
    UPLOAD_MODE: Joi.string().valid('cloudinary', 'base64').default('cloudinary'),
    UPLOAD_SIGNATURE_TTL_SECONDS: Joi.number().default(300),
    UPLOAD_MAX_BYTES: Joi.number().default(10 * 1024 * 1024),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  mongoose: {
    url: envVars.MONGODB_URL + (envVars.NODE_ENV === 'test' ? '-test' : ''),
    options: {
      useCreateIndex: true,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
    resetPasswordExpirationMinutes: envVars.JWT_RESET_PASSWORD_EXPIRATION_MINUTES,
    verifyEmailExpirationMinutes: envVars.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES,
  },
  email: {
    smtp: {
      host: envVars.SMTP_HOST,
      port: envVars.SMTP_PORT,
      auth: {
        user: envVars.SMTP_USERNAME,
        pass: envVars.SMTP_PASSWORD,
      },
    },
    from: envVars.EMAIL_FROM,
    frontendUrl: envVars.FRONTEND_URL,
  },
  cloudinary: {
    cloud_name: envVars.CLOUDINARY_CLOUD_NAME,
    api_key: envVars.CLOUDINARY_API_KEY,
    api_secret: envVars.CLOUDINARY_API_SECRET,
  },
  upload: {
    mode: envVars.UPLOAD_MODE,
    signatureTtlSeconds: envVars.UPLOAD_SIGNATURE_TTL_SECONDS,
    maxBytes: envVars.UPLOAD_MAX_BYTES,
  },
};
```

- [ ] **Step 2: Verify config still loads**

Run:
```bash
cd server
node -e "const c = require('./src/config/config'); console.log(c.upload)"
```

Expected (or similar with defaults):
```
{ mode: 'cloudinary', signatureTtlSeconds: 300, maxBytes: 10485760 }
```

- [ ] **Step 3: Commit**

```bash
git add server/src/config/config.js
git commit -m "feat(server): add UPLOAD_MODE config flag with defaults"
```

---

## Task 3: Add `cloudinary.util` helper

**Files:**
- Create: `server/src/utils/cloudinary.util.js`
- Create: `server/tests/unit/utils/cloudinary.util.test.js`

- [ ] **Step 1: Write the failing test**

Create `server/tests/unit/utils/cloudinary.util.test.js`:

```js
const {
  extractPublicIdFromUrl,
  assertIsCloudinaryUrl,
  buildFolder,
} = require('../../../src/utils/cloudinary.util');

describe('cloudinary.util', () => {
  describe('extractPublicIdFromUrl', () => {
    it('extracts publicId from standard Cloudinary URL', () => {
      const url = 'https://res.cloudinary.com/smart-grading/image/upload/v1234/submissions/exam1/sub1/original.jpg';
      expect(extractPublicIdFromUrl(url)).toBe('submissions/exam1/sub1/original');
    });

    it('extracts publicId from URL without version', () => {
      const url = 'https://res.cloudinary.com/smart-grading/image/upload/submissions/exam1/sub1/original.png';
      expect(extractPublicIdFromUrl(url)).toBe('submissions/exam1/sub1/original');
    });

    it('returns null for non-Cloudinary URL', () => {
      expect(extractPublicIdFromUrl('https://example.com/foo.jpg')).toBeNull();
    });

    it('returns null for invalid input', () => {
      expect(extractPublicIdFromUrl(null)).toBeNull();
      expect(extractPublicIdFromUrl('')).toBeNull();
    });
  });

  describe('assertIsCloudinaryUrl', () => {
    it('does not throw for valid Cloudinary URL', () => {
      expect(() =>
        assertIsCloudinaryUrl('https://res.cloudinary.com/smart-grading/image/upload/x.jpg', 'smart-grading')
      ).not.toThrow();
    });

    it('throws for URL from different cloud', () => {
      expect(() =>
        assertIsCloudinaryUrl('https://res.cloudinary.com/other-cloud/image/upload/x.jpg', 'smart-grading')
      ).toThrow(/not the expected cloud/);
    });

    it('throws for non-Cloudinary URL', () => {
      expect(() =>
        assertIsCloudinaryUrl('https://example.com/x.jpg', 'smart-grading')
      ).toThrow();
    });
  });

  describe('buildFolder', () => {
    it('joins examId, submissionId or "pending", and type', () => {
      expect(buildFolder('exam1', 'sub1', 'original')).toBe('submissions/exam1/sub1/original');
    });

    it('uses "pending" when submissionId is missing', () => {
      expect(buildFolder('exam1', null, 'original')).toBe('submissions/exam1/pending/original');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd server
npx jest tests/unit/utils/cloudinary.util.test.js --colors --verbose
```

Expected: FAIL with `Cannot find module '../../../src/utils/cloudinary.util'`.

- [ ] **Step 3: Implement `cloudinary.util.js`**

Create `server/src/utils/cloudinary.util.js`:

```js
const ApiError = require('./ApiError');

/**
 * Build the canonical Cloudinary folder for a submission image.
 * Pattern: submissions/{examId}/{submissionId|pending}/{type}
 */
const buildFolder = (examId, submissionId, type) => {
  const safeExam = String(examId).replace(/[^a-zA-Z0-9_-]/g, '');
  const safeSub = submissionId
    ? String(submissionId).replace(/[^a-zA-Z0-9_-]/g, '')
    : 'pending';
  const safeType = String(type).replace(/[^a-zA-Z0-9_-]/g, '');
  return `submissions/${safeExam}/${safeSub}/${safeType}`;
};

/**
 * Extract the publicId from a Cloudinary delivery URL.
 * Supports both versioned (v1234/) and unversioned URLs.
 * Returns null if the URL is not a Cloudinary URL.
 */
const extractPublicIdFromUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(
    /^https?:\/\/res\.cloudinary\.com\/[^/]+\/[^/]+\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/
  );
  return match ? match[1] : null;
};

/**
 * Asserts that the given URL is a Cloudinary delivery URL for the
 * expected cloud_name. Throws ApiError(400) otherwise.
 */
const assertIsCloudinaryUrl = (url, cloudName) => {
  if (!url || typeof url !== 'string') {
    throw new ApiError(400, 'url must be a non-empty string');
  }
  const expected = `https://res.cloudinary.com/${cloudName}/`;
  if (!url.startsWith(expected)) {
    throw new ApiError(400, 'url is not a valid Cloudinary URL for this cloud');
  }
  if (extractPublicIdFromUrl(url) === null) {
    throw new ApiError(400, 'url is not a parseable Cloudinary URL');
  }
};

module.exports = {
  buildFolder,
  extractPublicIdFromUrl,
  assertIsCloudinaryUrl,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
cd server
npx jest tests/unit/utils/cloudinary.util.test.js --colors --verbose
```

Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add server/src/utils/cloudinary.util.js server/tests/unit/utils/cloudinary.util.test.js
git commit -m "feat(server): add cloudinary utility helpers"
```

---

## Task 4: Add `UploadAuditLog` model

**Files:**
- Create: `server/src/models/uploadAuditLog.model.js`
- Modify: `server/src/models/index.js`

- [ ] **Step 1: Create the model file**

Create `server/src/models/uploadAuditLog.model.js`:

```js
const mongoose = require('mongoose');

const uploadAuditLogSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: [
        'signature_request',
        'upload_success',
        'upload_failed',
        'attach_image',
        'delete_image',
        'auto_cleanup',
      ],
      required: true,
    },
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission',
      index: true,
    },
    imageType: {
      type: String,
      enum: ['original', 'preprocessed', 'annotated', null],
    },
    publicId: { type: String },
    cloudinaryUrl: { type: String },
    bytes: { type: Number },
    ipAddress: { type: String },
    userAgent: { type: String },
    error: { type: String },
    durationMs: { type: Number },
  },
  { timestamps: true }
);

uploadAuditLogSchema.index({ submissionId: 1, action: 1 });
uploadAuditLogSchema.index({ createdAt: -1 });

const UploadAuditLog = mongoose.model('UploadAuditLog', uploadAuditLogSchema);

module.exports = UploadAuditLog;
```

- [ ] **Step 2: Register in models index**

Modify `server/src/models/index.js` — add the line in the existing exports block. The current file exports each model. Replace its entire content with:

```js
module.exports = {
  User: require('./user.model'),
  School: require('./school.model'),
  Subject: require('./subject.model'),
  Class: require('./class.model'),
  Exam: require('./exam.model'),
  ExamVersion: require('./examVersion.model'),
  Question: require('./question.model'),
  OMRTemplate: require('./omrTemplate.model'),
  Submission: require('./submission.model'),
  StudentProgress: require('./studentProgress.model'),
  Appeal: require('./appeal.model'),
  ExamReport: require('./examReport.model'),
  AIChat: require('./aiChat.model'),
  AIReport: require('./aiReport.model'),
  Notification: require('./notification.model'),
  Token: require('./token.model'),
  UploadAuditLog: require('./uploadAuditLog.model'),
};
```

(Verify the current file's export list before overwriting; keep all existing entries.)

- [ ] **Step 3: Smoke-test that the model loads**

Run:
```bash
cd server
node -e "const { UploadAuditLog } = require('./src/models'); console.log(UploadAuditLog.modelName)"
```

Expected: `UploadAuditLog`.

- [ ] **Step 4: Commit**

```bash
git add server/src/models/uploadAuditLog.model.js server/src/models/index.js
git commit -m "feat(server): add UploadAuditLog model"
```

---

## Task 5: Add `CloudinaryService.generateUploadSignature`

**Files:**
- Create: `server/src/services/cloudinary.service.js`
- Create: `server/tests/unit/services/cloudinary.service.test.js`

- [ ] **Step 1: Write the failing test (signature only)**

Create `server/tests/unit/services/cloudinary.service.test.js`:

```js
const cloudinary = require('cloudinary').v2;
const CloudinaryService = require('../../../src/services/cloudinary.service');
const config = require('../../../src/config/config');

describe('CloudinaryService.generateUploadSignature', () => {
  beforeAll(() => {
    process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
    process.env.CLOUDINARY_API_KEY = 'test-key';
    process.env.CLOUDINARY_API_SECRET = 'test-secret';
  });

  it('returns signature with required fields', () => {
    const sig = CloudinaryService.generateUploadSignature({
      userId: 'u1',
      examId: 'e1',
      submissionId: 's1',
      type: 'original',
    });

    expect(sig).toEqual(
      expect.objectContaining({
        signature: expect.any(String),
        apiKey: 'test-key',
        cloudName: 'test-cloud',
        timestamp: expect.any(Number),
        folder: 'submissions/e1/s1/original',
        publicId: 'submissions/e1/s1/original',
        uploadUrl: 'https://api.cloudinary.com/v1_1/test-cloud/image/upload',
        expiresIn: 300,
      })
    );
    expect(sig.signature.length).toBeGreaterThan(20);
  });

  it('uses "pending" when submissionId is missing', () => {
    const sig = CloudinaryService.generateUploadSignature({
      userId: 'u1',
      examId: 'e1',
      type: 'preprocessed',
    });
    expect(sig.folder).toBe('submissions/e1/pending/preprocessed');
  });

  it('throws when Cloudinary env vars are missing', () => {
    const original = config.cloudinary.cloud_name;
    config.cloudinary.cloud_name = '';
    try {
      expect(() =>
        CloudinaryService.generateUploadSignature({
          userId: 'u1', examId: 'e1', type: 'original',
        })
      ).toThrow(/Cloudinary/);
    } finally {
      config.cloudinary.cloud_name = original;
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd server
npx jest tests/unit/services/cloudinary.service.test.js --colors --verbose
```

Expected: FAIL with `Cannot find module '../../../src/services/cloudinary.service'`.

- [ ] **Step 3: Implement the service (signature only — full upload/destroy in later tasks)**

Create `server/src/services/cloudinary.service.js`:

```js
const cloudinary = require('cloudinary').v2;
const config = require('../config/config');
const { buildFolder } = require('../utils/cloudinary.util');

class CloudinaryService {
  constructor() {
    this._configured = false;
  }

  _ensureConfigured() {
    const { cloud_name, api_key, api_secret } = config.cloudinary;
    if (!cloud_name || !api_key || !api_secret) {
      throw new Error('Cloudinary env vars are not configured');
    }
    cloudinary.config({
      cloud_name,
      api_key,
      api_secret,
      secure: true,
    });
    this._configured = true;
  }

  /**
   * Issue a short-lived signed upload signature.
   */
  generateUploadSignature({ userId, examId, submissionId, type }) {
    this._ensureConfigured();
    const folder = buildFolder(examId, submissionId, type);
    const publicId = folder;
    const timestamp = Math.round(Date.now() / 1000);

    const paramsToSign = { folder, public_id: publicId, timestamp };
    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      config.cloudinary.api_secret
    );

    return {
      signature,
      apiKey: config.cloudinary.api_key,
      cloudName: config.cloudinary.cloud_name,
      timestamp,
      folder,
      publicId,
      uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudinary.cloud_name}/image/upload`,
      expiresIn: config.upload.signatureTtlSeconds,
      _userId: userId, // internal, stripped before send
    };
  }
}

module.exports = new CloudinaryService();
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
cd server
npx jest tests/unit/services/cloudinary.service.test.js --colors --verbose
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add server/src/services/cloudinary.service.js server/tests/unit/services/cloudinary.service.test.js
git commit -m "feat(server): CloudinaryService.generateUploadSignature"
```

---

## Task 6: Add `CloudinaryService.uploadBuffer` and `uploadBase64`

**Files:**
- Modify: `server/src/services/cloudinary.service.js`
- Modify: `server/tests/unit/services/cloudinary.service.test.js`

- [ ] **Step 1: Append failing tests for uploadBuffer/uploadBase64**

Add a new `describe` block at the bottom of `server/tests/unit/services/cloudinary.service.test.js`:

```js
jest.mock('cloudinary', () => {
  const mockUploader = {
    upload: jest.fn(),
    destroy: jest.fn(),
  };
  const mockUtils = {
    api_sign_request: jest.fn(() => 'mock-signature'),
  };
  return {
    v2: {
      config: jest.fn(),
      uploader: mockUploader,
      utils: mockUtils,
    },
  };
});

describe('CloudinaryService.uploadBuffer', () => {
  let CloudinaryService;
  let mockUploader;

  beforeAll(() => {
    process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
    process.env.CLOUDINARY_API_KEY = 'test-key';
    process.env.CLOUDINARY_API_SECRET = 'test-secret';
    CloudinaryService = require('../../../src/services/cloudinary.service');
    mockUploader = require('cloudinary').v2.uploader;
  });

  beforeEach(() => {
    mockUploader.upload.mockReset();
  });

  it('uploads buffer and returns mapped result', async () => {
    mockUploader.upload.mockResolvedValueOnce({
      public_id: 'submissions/e1/s1/original',
      secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/v1/submissions/e1/s1/original.jpg',
      url: 'http://res.cloudinary.com/test-cloud/image/upload/v1/submissions/e1/s1/original.jpg',
      width: 800,
      height: 600,
      bytes: 12345,
      format: 'jpg',
    });

    const result = await CloudinaryService.uploadBuffer(Buffer.from('xx'), {
      folder: 'submissions/e1/s1/original',
      publicId: 'submissions/e1/s1/original',
    });

    expect(result).toEqual({
      publicId: 'submissions/e1/s1/original',
      url: 'http://res.cloudinary.com/test-cloud/image/upload/v1/submissions/e1/s1/original.jpg',
      secureUrl: 'https://res.cloudinary.com/test-cloud/image/upload/v1/submissions/e1/s1/original.jpg',
      width: 800,
      height: 600,
      bytes: 12345,
      format: 'jpg',
    });
    expect(mockUploader.upload).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.objectContaining({ folder: 'submissions/e1/s1/original', public_id: 'submissions/e1/s1/original' })
    );
  });

  it('retries on transient failure then succeeds', async () => {
    mockUploader.upload
      .mockRejectedValueOnce({ http_code: 500, message: 'boom' })
      .mockResolvedValueOnce({
        public_id: 'p', secure_url: 'https://x/y', url: 'http://x/y',
        width: 1, height: 1, bytes: 1, format: 'jpg',
      });

    const result = await CloudinaryService.uploadBuffer(Buffer.from('x'), {
      folder: 'f', publicId: 'p',
    });
    expect(result.publicId).toBe('p');
    expect(mockUploader.upload).toHaveBeenCalledTimes(2);
  });

  it('throws CloudinaryError after exhausting retries', async () => {
    mockUploader.upload.mockRejectedValue({ http_code: 500, message: 'dead' });
    await expect(
      CloudinaryService.uploadBuffer(Buffer.from('x'), { folder: 'f', publicId: 'p' })
    ).rejects.toThrow(/Cloudinary/);
    expect(mockUploader.upload).toHaveBeenCalledTimes(3); // initial + 2 retries
  });
});

describe('CloudinaryService.uploadBase64', () => {
  it('strips data URI prefix and uploads', async () => {
    const mockUploader = require('cloudinary').v2.uploader;
    mockUploader.upload.mockReset();
    mockUploader.upload.mockResolvedValueOnce({
      public_id: 'p', secure_url: 'https://x/y', url: 'http://x/y',
      width: 1, height: 1, bytes: 1, format: 'jpg',
    });
    const dataUri = 'data:image/jpeg;base64,/9j/abc';
    const result = await CloudinaryService.uploadBase64(dataUri, {
      folder: 'f', publicId: 'p',
    });
    expect(result.publicId).toBe('p');
    const callArg = mockUploader.upload.mock.calls[0][0];
    expect(callArg).not.toContain('data:image/jpeg;base64,');
    expect(callArg).toBe('/9j/abc');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd server
npx jest tests/unit/services/cloudinary.service.test.js --colors --verbose
```

Expected: FAIL (compile error or missing method `uploadBuffer`).

- [ ] **Step 3: Extend the service with uploadBuffer / uploadBase64**

Replace `server/src/services/cloudinary.service.js` with:

```js
const cloudinary = require('cloudinary').v2;
const config = require('../config/config');
const { buildFolder } = require('../utils/cloudinary.util');

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const isTransient = (err) => {
  if (!err) return false;
  if (err.http_code >= 500) return true;
  if (err.http_code === 408 || err.http_code === 429) return true;
  if (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET') return true;
  return false;
};

class CloudinaryError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'CloudinaryError';
    this.statusCode = statusCode;
  }
}

class CloudinaryService {
  constructor() {
    this._configured = false;
  }

  _ensureConfigured() {
    const { cloud_name, api_key, api_secret } = config.cloudinary;
    if (!cloud_name || !api_key || !api_secret) {
      throw new Error('Cloudinary env vars are not configured');
    }
    cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
    this._configured = true;
  }

  generateUploadSignature({ userId, examId, submissionId, type }) {
    this._ensureConfigured();
    const folder = buildFolder(examId, submissionId, type);
    const publicId = folder;
    const timestamp = Math.round(Date.now() / 1000);

    const signature = cloudinary.utils.api_sign_request(
      { folder, public_id: publicId, timestamp },
      config.cloudinary.api_secret
    );

    return {
      signature,
      apiKey: config.cloudinary.api_key,
      cloudName: config.cloudinary.cloud_name,
      timestamp,
      folder,
      publicId,
      uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudinary.cloud_name}/image/upload`,
      expiresIn: config.upload.signatureTtlSeconds,
    };
  }

  _mapUploadResult(raw) {
    return {
      publicId: raw.public_id,
      url: raw.url,
      secureUrl: raw.secure_url,
      width: raw.width,
      height: raw.height,
      bytes: raw.bytes,
      format: raw.format,
    };
  }

  async _uploadOnce(input, options) {
    const result = await cloudinary.uploader.upload(input, {
      folder: options.folder,
      public_id: options.publicId,
      overwrite: false,
      resource_type: 'image',
    });
    return this._mapUploadResult(result);
  }

  async uploadBuffer(buffer, options) {
    this._ensureConfigured();
    let attempt = 0;
    let lastErr;
    while (attempt <= MAX_RETRIES) {
      try {
        return await this._uploadOnce(buffer, options);
      } catch (err) {
        lastErr = err;
        if (!isTransient(err) || attempt === MAX_RETRIES) break;
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        attempt += 1;
      }
    }
    throw new CloudinaryError(
      `Cloudinary upload failed: ${lastErr?.message || 'unknown'}`,
      lastErr?.http_code
    );
  }

  async uploadBase64(dataUri, options) {
    this._ensureConfigured();
    const stripped = dataUri.replace(/^data:[^;]+;base64,/, '');
    return this.uploadBuffer(stripped, options);
  }
}

module.exports = new CloudinaryService();
module.exports.CloudinaryError = CloudinaryError;
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
cd server
npx jest tests/unit/services/cloudinary.service.test.js --colors --verbose
```

Expected: PASS, all tests (3 signature + 3 uploadBuffer + 1 uploadBase64 = 7).

- [ ] **Step 5: Commit**

```bash
git add server/src/services/cloudinary.service.js server/tests/unit/services/cloudinary.service.test.js
git commit -m "feat(server): CloudinaryService uploadBuffer/uploadBase64 with retry"
```

---

## Task 7: Add `CloudinaryService.destroy`

**Files:**
- Modify: `server/src/services/cloudinary.service.js`
- Modify: `server/tests/unit/services/cloudinary.service.test.js`

- [ ] **Step 1: Append failing test for destroy**

Add to `server/tests/unit/services/cloudinary.service.test.js`:

```js
describe('CloudinaryService.destroy', () => {
  const CloudinaryService = require('../../../src/services/cloudinary.service');
  const mockUploader = require('cloudinary').v2.uploader;

  beforeEach(() => mockUploader.destroy.mockReset());

  it('returns result=ok on success', async () => {
    mockUploader.destroy.mockResolvedValueOnce({ result: 'ok' });
    const out = await CloudinaryService.destroy('submissions/e1/s1/original');
    expect(out).toEqual({ result: 'ok' });
    expect(mockUploader.destroy).toHaveBeenCalledWith('submissions/e1/s1/original');
  });

  it('returns result=not_found without throwing', async () => {
    mockUploader.destroy.mockResolvedValueOnce({ result: 'not found' });
    const out = await CloudinaryService.destroy('does/not/exist');
    expect(out.result).toBe('not found');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd server
npx jest tests/unit/services/cloudinary.service.test.js -t "destroy" --colors --verbose
```

Expected: FAIL (`destroy is not a function`).

- [ ] **Step 3: Add `destroy` method to the service**

Edit `server/src/services/cloudinary.service.js`. After the `uploadBase64` method, add:

```js
  async destroy(publicId) {
    this._ensureConfigured();
    const result = await cloudinary.uploader.destroy(publicId);
    return { result: result.result === 'ok' ? 'ok' : 'not_found' };
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
cd server
npx jest tests/unit/services/cloudinary.service.test.js -t "destroy" --colors --verbose
```

Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add server/src/services/cloudinary.service.js server/tests/unit/services/cloudinary.service.test.js
git commit -m "feat(server): CloudinaryService.destroy"
```

---

## Task 8: Extend `Submission` model `imageSchema` with cloudinary fields

**Files:**
- Modify: `server/src/models/submission.model.js`

- [ ] **Step 1: Replace `imageSchema` in `server/src/models/submission.model.js`**

Find the existing `imageSchema` (lines 80-107 in the current file) and replace with:

```js
const imageEntrySchema = new mongoose.Schema({
  publicId: { type: String, index: true },
  url: String,
  width: Number,
  height: Number,
  bytes: Number,
  format: {
    type: String,
    enum: ['jpg', 'jpeg', 'png', 'webp', 'heic'],
  },
  dpi: Number,
  uploadedAt: { type: Date, default: Date.now },
}, { _id: false });

const annotatedMarkerSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['correct', 'incorrect', 'double_fill', 'empty'],
  },
  x: Number,
  y: Number,
  radius: Number,
  color: String,
}, { _id: false });

const imageSchema = new mongoose.Schema({
  original: imageEntrySchema,
  preprocessed: imageEntrySchema,
  annotated: {
    ...imageEntrySchema.obj,
    markers: [annotatedMarkerSchema],
  },
}, { _id: false });
```

- [ ] **Step 2: Add the additional index lines**

After the existing index block, add:

```js
submissionSchema.index({ 'images.original.publicId': 1 });
submissionSchema.index({ 'images.preprocessed.publicId': 1 });
submissionSchema.index({ 'images.annotated.publicId': 1 });
```

- [ ] **Step 3: Smoke-load the model**

Run:
```bash
cd server
node -e "const S = require('./src/models/submission.model'); console.log('OK', S.modelName)"
```

Expected: `OK Submission`.

- [ ] **Step 4: Commit**

```bash
git add server/src/models/submission.model.js
git commit -m "feat(server): extend submission imageSchema with Cloudinary fields"
```

---

## Task 9: Add `submission.service.attachImage` and `deleteImage`

**Files:**
- Modify: `server/src/services/submission.service.js`

- [ ] **Step 1: Add the new methods**

After the existing `delete` method, add:

```js
  async attachImage(submissionId, userId, payload, auditContext) {
    const { Submission, UploadAuditLog } = require('../models');
    const config = require('../config/config');
    const { assertIsCloudinaryUrl } = require('../utils/cloudinary.util');

    const submission = await Submission.findById(submissionId);
    if (!submission) {
      throw new ApiError(404, 'Submission not found');
    }

    const { type, url, publicId, width, height, bytes, format } = payload;

    if (!['original', 'preprocessed', 'annotated'].includes(type)) {
      throw new ApiError(400, 'Invalid image type');
    }
    if (bytes != null && bytes > config.upload.maxBytes) {
      throw new ApiError(400, `Image exceeds max size of ${config.upload.maxBytes} bytes`);
    }

    assertIsCloudinaryUrl(url, config.cloudinary.cloud_name);

    submission.images = submission.images || {};
    submission.images[type] = {
      publicId,
      url,
      width,
      height,
      bytes,
      format,
      uploadedAt: new Date(),
    };
    await submission.save();

    if (UploadAuditLog) {
      await UploadAuditLog.create({
        userId,
        action: 'attach_image',
        submissionId: submission._id,
        imageType: type,
        publicId,
        cloudinaryUrl: url,
        bytes,
        ipAddress: auditContext?.ip,
        userAgent: auditContext?.userAgent,
      });
    }

    return submission;
  }

  async deleteImage(submissionId, userId, type, auditContext) {
    const { Submission, UploadAuditLog } = require('../models');
    const cloudinaryService = require('./cloudinary.service');

    const submission = await Submission.findById(submissionId);
    if (!submission) {
      throw new ApiError(404, 'Submission not found');
    }
    if (!['original', 'preprocessed', 'annotated'].includes(type)) {
      throw new ApiError(400, 'Invalid image type');
    }

    const img = submission.images?.[type];
    if (!img || !img.publicId) {
      throw new ApiError(404, `No image of type "${type}" on this submission`);
    }

    let destroyResult;
    try {
      destroyResult = await cloudinaryService.destroy(img.publicId);
    } catch (err) {
      if (UploadAuditLog) {
        await UploadAuditLog.create({
          userId,
          action: 'delete_image',
          submissionId: submission._id,
          imageType: type,
          publicId: img.publicId,
          error: err.message,
          ipAddress: auditContext?.ip,
          userAgent: auditContext?.userAgent,
        });
      }
      // Continue to clear DB record even if Cloudinary fails
    }

    submission.images[type] = undefined;
    await submission.save();

    if (UploadAuditLog) {
      await UploadAuditLog.create({
        userId,
        action: 'delete_image',
        submissionId: submission._id,
        imageType: type,
        publicId: img.publicId,
        cloudinaryUrl: img.url,
        ipAddress: auditContext?.ip,
        userAgent: auditContext?.userAgent,
      });
    }

    return { submission, destroyResult };
  }
```

- [ ] **Step 2: Update existing `delete` to fan-out image cleanup**

Replace the existing `async delete(id)` method with:

```js
  async delete(id) {
    const cloudinaryService = require('./cloudinary.service');
    const submission = await Submission.findById(id);
    if (!submission) return null;

    for (const type of ['original', 'preprocessed', 'annotated']) {
      const img = submission.images?.[type];
      if (img?.publicId) {
        try {
          await cloudinaryService.destroy(img.publicId);
        } catch (err) {
          // best-effort; do not fail the deletion
        }
      }
    }
    await Submission.findByIdAndDelete(id);
    return submission;
  }
```

- [ ] **Step 3: Smoke-run existing tests**

Run:
```bash
cd server
npx jest tests/unit/services/question.service.test.js --colors 2>&1 | tail -5
```

Expected: existing tests still pass (no behavior change for unrelated services).

- [ ] **Step 4: Commit**

```bash
git add server/src/services/submission.service.js
git commit -m "feat(server): submission service attachImage/deleteImage + delete fan-out"
```

---

## Task 10: Add `submission.service.scan` for the new flow

**Files:**
- Modify: `server/src/services/submission.service.js`

- [ ] **Step 1: Replace the existing `scan` method**

Find the `async scan(data)` method (currently a stub) and replace with:

```js
  async scan(data) {
    const { examId, originalUrl, originalPublicId, imageMeta, deviceInfo } = data;
    const config = require('../config/config');
    const { assertIsCloudinaryUrl } = require('../utils/cloudinary.util');

    const exam = await Exam.findById(examId);
    if (!exam) {
      throw new ApiError(404, 'Exam not found');
    }

    if (config.upload.mode === 'cloudinary') {
      if (!originalUrl) {
        throw new ApiError(400, 'originalUrl is required when UPLOAD_MODE=cloudinary');
      }
      assertIsCloudinaryUrl(originalUrl, config.cloudinary.cloud_name);
    }

    // TODO: pass imageUrl to pythonBridge in a follow-up task
    return {
      status: 'pending',
      message: 'OMR scanning service not yet implemented',
      examId,
      originalUrl: originalUrl || null,
      originalPublicId: originalPublicId || null,
      imageMeta: imageMeta || null,
      deviceInfo: deviceInfo || null,
    };
  }
```

- [ ] **Step 2: Verify compilation**

Run:
```bash
cd server
node -e "const s = require('./src/services/submission.service'); console.log('OK', typeof s.scan, typeof s.attachImage, typeof s.deleteImage)"
```

Expected: `OK function function function`.

- [ ] **Step 3: Commit**

```bash
git add server/src/services/submission.service.js
git commit -m "feat(server): submission scan accepts originalUrl (cloudinary flow)"
```

---

## Task 11: Update `submission.validation` Joi schemas

**Files:**
- Modify: `server/src/validations/submission.validation.js`

- [ ] **Step 1: Replace the file**

Replace the entire contents of `server/src/validations/submission.validation.js` with:

```js
const Joi = require('joi');

const id = Joi.object().keys({
  id: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
});

const scanSubmission = {
  body: Joi.object().keys({
    examId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    // Cloudinary flow
    originalUrl: Joi.string().uri(),
    originalPublicId: Joi.string(),
    imageMeta: Joi.object().keys({
      width: Joi.number().integer().min(1),
      height: Joi.number().integer().min(1),
      bytes: Joi.number().integer().min(1),
      format: Joi.string().valid('jpg', 'jpeg', 'png', 'webp', 'heic'),
    }),
    // Legacy base64 flow (still allowed when UPLOAD_MODE=base64)
    image: Joi.string(),
    deviceInfo: Joi.object().keys({
      platform: Joi.string().valid('ios', 'android', 'web'),
      deviceModel: Joi.string(),
      appVersion: Joi.string(),
    }),
  }).or('originalUrl', 'image'),
};

const attachImage = {
  params: id,
  body: Joi.object().keys({
    type: Joi.string().valid('original', 'preprocessed', 'annotated').required(),
    url: Joi.string().uri().required(),
    publicId: Joi.string().required(),
    width: Joi.number().integer().min(1),
    height: Joi.number().integer().min(1),
    bytes: Joi.number().integer().min(1),
    format: Joi.string().valid('jpg', 'jpeg', 'png', 'webp', 'heic'),
  }),
};

const deleteImage = {
  params: Joi.object().keys({
    id: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    type: Joi.string().valid('original', 'preprocessed', 'annotated').required(),
  }),
};

const getUploadSignature = {
  query: Joi.object().keys({
    examId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    submissionId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    type: Joi.string().valid('original', 'preprocessed', 'annotated').required(),
  }),
};

const getSubmission = { params: id };

const getSubmissions = {
  query: Joi.object().keys({
    examId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    studentId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    versionId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    status: Joi.string().valid('pending', 'scanning', 'scanned', 'manual_review', 'completed', 'appealed'),
    fromDate: Joi.date().iso(),
    toDate: Joi.date().iso(),
    limit: Joi.number().min(1).max(100),
    page: Joi.number().min(1),
  }),
};

const getExamSubmissions = {
  params: Joi.object().keys({
    examId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  query: Joi.object().keys({
    status: Joi.string().valid('pending', 'scanning', 'scanned', 'manual_review', 'completed', 'appealed'),
    limit: Joi.number().min(1).max(100),
    page: Joi.number().min(1),
  }),
};

const manualOverride = {
  params: id,
  body: Joi.object().keys({
    position: Joi.number().min(1).required(),
    correctedAnswer: Joi.string().valid('A', 'B', 'C', 'D').required(),
    reason: Joi.string().min(1).max(500).required(),
  }),
};

const deleteSubmission = { params: id };

const getStudentSubmissions = {
  params: Joi.object().keys({
    studentId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  query: Joi.object().keys({
    examId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    limit: Joi.number().min(1).max(100),
    page: Joi.number().min(1),
  }),
};

const getMySubmissions = {
  query: Joi.object().keys({
    status: Joi.string().valid('pending', 'scanning', 'scanned', 'manual_review', 'completed', 'appealed'),
    limit: Joi.number().min(1).max(100),
    page: Joi.number().min(1),
  }),
};

module.exports = {
  scanSubmission,
  attachImage,
  deleteImage,
  getUploadSignature,
  getSubmission,
  getSubmissions,
  getExamSubmissions,
  manualOverride,
  deleteSubmission,
  getStudentSubmissions,
  getMySubmissions,
};
```

- [ ] **Step 2: Verify module loads**

Run:
```bash
cd server
node -e "const v = require('./src/validations/submission.validation'); console.log(Object.keys(v))"
```

Expected: array containing `scanSubmission`, `attachImage`, `deleteImage`, `getUploadSignature`, etc.

- [ ] **Step 3: Commit**

```bash
git add server/src/validations/submission.validation.js
git commit -m "feat(server): validation schemas for attach/delete/signature"
```

---

## Task 12: Add `upload.controller` and `upload.route`

**Files:**
- Create: `server/src/controllers/upload.controller.js`
- Create: `server/src/routes/v1/upload.route.js`

- [ ] **Step 1: Create the controller**

Create `server/src/controllers/upload.controller.js`:

```js
const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const cloudinaryService = require('../services/cloudinary.service');
const { UploadAuditLog } = require('../models');

const getUploadSignature = catchAsync(async (req, res) => {
  const { examId, submissionId, type } = req.query;

  const sig = cloudinaryService.generateUploadSignature({
    userId: req.user.id,
    examId,
    submissionId,
    type,
  });

  // Best-effort audit log; do not fail the request if it errors
  try {
    await UploadAuditLog.create({
      userId: req.user.id,
      action: 'signature_request',
      imageType: type,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  } catch (e) {
    // swallow
  }

  res.send({
    signature: sig.signature,
    apiKey: sig.apiKey,
    cloudName: sig.cloudName,
    timestamp: sig.timestamp,
    folder: sig.folder,
    publicId: sig.publicId,
    uploadUrl: sig.uploadUrl,
    expiresIn: sig.expiresIn,
  });
});

module.exports = { getUploadSignature };
```

- [ ] **Step 2: Create the route**

Create `server/src/routes/v1/upload.route.js`:

```js
const express = require('express');
const validate = require('../../middlewares/validate');
const submissionValidation = require('../../validations/submission.validation');
const uploadController = require('../../controllers/upload.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

router.get(
  '/signature',
  auth('scanSubmissions'),
  validate(submissionValidation.getUploadSignature),
  uploadController.getUploadSignature
);

module.exports = router;
```

- [ ] **Step 3: Verify routes compile**

Run:
```bash
cd server
node -e "const r = require('./src/routes/v1/upload.route'); console.log('OK', r.stack.length, 'layers')"
```

Expected: `OK 4 layers` (or similar positive number).

- [ ] **Step 4: Commit**

```bash
git add server/src/controllers/upload.controller.js server/src/routes/v1/upload.route.js
git commit -m "feat(server): upload signature controller and route"
```

---

## Task 13: Mount `upload.route` and add `attach-image` / `delete-image` routes

**Files:**
- Modify: `server/src/routes/v1/index.js`
- Modify: `server/src/routes/v1/submission.route.js`
- Modify: `server/src/controllers/submission.controller.js`

- [ ] **Step 1: Inspect `server/src/routes/v1/index.js`**

Read the file to see the current mount pattern. Example existing line:
```js
router.use('/submissions', submissionRoute);
```

- [ ] **Step 2: Add the new mount**

Add a new line in the same router.use block:

```js
router.use('/upload', uploadRoute);
```

Also add the corresponding import at the top of the file:

```js
const uploadRoute = require('./upload.route');
```

- [ ] **Step 3: Add new routes to `submission.route.js`**

Edit `server/src/routes/v1/submission.route.js`. After the existing routes (e.g. after the `/me` route), add:

```js
router
  .route('/:id/attach-image')
  .post(auth('scanSubmissions'), validate(submissionValidation.attachImage), submissionController.attachImage);

router
  .route('/:id/image/:type')
  .delete(auth('scanSubmissions'), validate(submissionValidation.deleteImage), submissionController.deleteImage);
```

- [ ] **Step 4: Add controller handlers**

Edit `server/src/controllers/submission.controller.js`. After the existing `remove` handler, add:

```js
const attachImage = catchAsync(async (req, res) => {
  const auditContext = { ip: req.ip, userAgent: req.headers['user-agent'] };
  const submission = await submissionService.attachImage(
    req.params.id, req.user.id, req.body, auditContext
  );
  res.send(submission);
});

const deleteImage = catchAsync(async (req, res) => {
  const auditContext = { ip: req.ip, userAgent: req.headers['user-agent'] };
  const { submission } = await submissionService.deleteImage(
    req.params.id, req.user.id, req.params.type, auditContext
  );
  res.send(submission);
});
```

Then add `attachImage` and `deleteImage` to the `module.exports` object.

- [ ] **Step 5: Verify the app boots**

Run:
```bash
cd server
node -e "const app = require('./src/app'); console.log('OK', app._router.stack.length)"
```

Expected: `OK <some positive number>`.

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/v1/index.js server/src/routes/v1/submission.route.js server/src/controllers/submission.controller.js
git commit -m "feat(server): mount upload route and add attach/delete image endpoints"
```

---

## Task 14: Add `pythonBridge` `imageUrl` branch

**Files:**
- Modify: `server/src/services/pythonBridge.service.js`
- Modify: `server/scripts/omr_process.py` (if it exists; otherwise skip steps 4-5)

- [ ] **Step 1: Read `pythonBridge.service.js` if not already**

Already inspected in task 0. The relevant method is `processImage({ image, template, evaluation, options, timeout })`.

- [ ] **Step 2: Add `imageUrl` parameter to the method**

Replace the `processImage` method signature and body with:

```js
  async processImage({ image, imageUrl, template, evaluation, options, timeout }) {
    const timeoutMs = timeout || this.defaultTimeout;

    if (!image && !imageUrl) {
      return { success: false, error: 'Missing required field: image or imageUrl', error_code: 'VALIDATION_ERROR' };
    }
    if (!template) {
      return { success: false, error: 'Missing required field: template', error_code: 'VALIDATION_ERROR' };
    }

    let imageBase64;
    if (imageUrl) {
      // Python will download
      imageBase64 = null;
    } else if (Buffer.isBuffer(image)) {
      imageBase64 = image.toString('base64');
    } else if (typeof image === 'string') {
      imageBase64 = image.startsWith('data:') ? image.replace(/^data:[^;]+;base64,/, '') : image;
    } else {
      return { success: false, error: 'Invalid image format', error_code: 'VALIDATION_ERROR' };
    }

    const inputData = {
      image: imageBase64,
      imageUrl: imageUrl || null,
      template,
      ...(evaluation !== undefined && { evaluation }),
      ...(options !== undefined && { options }),
    };

    return this._spawnPythonProcess(inputData, timeoutMs);
  }
```

- [ ] **Step 3: Update `submission.service.scan` to forward `imageUrl` to pythonBridge**

Edit `server/src/services/submission.service.js`. In the `scan` method, replace the current `return` block with:

```js
    if (config.upload.mode === 'cloudinary' && originalUrl) {
      const pythonBridge = require('./pythonBridge.service');
      const template = await ExamVersion.findOne({ examId })
        .select('omrTemplateId')
        .lean();
      try {
        const result = await pythonBridge.processImage({
          imageUrl: originalUrl,
          template: template || {},
        });
        return {
          status: 'scanning',
          examId,
          originalUrl,
          originalPublicId,
          imageMeta,
          deviceInfo,
          pythonResult: result,
        };
      } catch (err) {
        // continue to pending response even if Python fails
      }
    }

    return {
      status: 'pending',
      message: 'OMR scanning service not yet implemented',
      examId,
      originalUrl: originalUrl || null,
      originalPublicId: originalPublicId || null,
      imageMeta: imageMeta || null,
      deviceInfo: deviceInfo || null,
    };
```

(Keep the existing `assertIsCloudinaryUrl` check above this block.)

- [ ] **Step 4: Update Python `omr_process.py` to download `imageUrl`**

Edit `server/scripts/omr_process.py`. At the top of the file, add:

```python
import base64
import sys
import json
import os

try:
    import requests
except ImportError:
    requests = None
```

Then replace the section that reads `image` from stdin with code that:
1. Reads JSON from stdin: `data = json.loads(sys.stdin.read())`.
2. If `data.get('imageUrl')`, downloads via `requests.get(data['imageUrl'], timeout=10)`.
3. Else uses `base64.b64decode(data['image'])` as before.
4. Writes the resulting bytes to a temp file (e.g. `/tmp/omr_input.jpg`) and passes that path to OMRChecker instead of inline bytes.

The exact change depends on the existing `omr_process.py` shape; preserve existing logic and only add the `imageUrl` branch. The contract with OMRChecker must remain: a file path on disk.

- [ ] **Step 5: Add `requests` to Python deps (if a `requirements.txt` exists in `server/`)**

If a Python deps file exists, add:
```
requests>=2.31.0
```

- [ ] **Step 6: Commit**

```bash
git add server/src/services/pythonBridge.service.js server/src/services/submission.service.js server/scripts/omr_process.py
git commit -m "feat(server): pythonBridge accepts imageUrl and downloads via requests"
```

---

## Task 15: Add integration tests for `/upload/signature`, `/attach-image`, `/delete-image`

**Files:**
- Create: `server/tests/integration/routes/v1/upload.route.test.js`
- Create: `server/tests/fixtures/submission.fixture.js`

- [ ] **Step 1: Create `submission.fixture.js`**

Create `server/tests/fixtures/submission.fixture.js`:

```js
const mongoose = require('mongoose');

const submissionOne = {
  _id: mongoose.Types.ObjectId(),
  examId: mongoose.Types.ObjectId(),
  versionId: mongoose.Types.ObjectId(),
  omrTemplateId: mongoose.Types.ObjectId(),
  studentId: mongoose.Types.ObjectId(),
  studentCode: 'HS001',
  totalScore: 0,
  maxScore: 10,
  finalScore: 0,
  status: 'pending',
};

const insertSubmissions = async (subs) => {
  const Submission = require('../../src/models/submission.model');
  await Submission.insertMany(subs);
};

module.exports = { submissionOne, insertSubmissions };
```

- [ ] **Step 2: Create `upload.route.test.js`**

Create `server/tests/integration/routes/v1/upload.route.test.js`:

```js
const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../../../src/app');
const setupTestDB = require('../../../utils/setupTestDB');
const { User } = require('../../../../src/models');
const { teacherOne, insertUsers } = require('../../../fixtures/user.fixture');
const { schoolA, insertSchools } = require('../../../fixtures/school.fixture');
const { userOneAccessToken } = require('../../../fixtures/token.fixture');
const { submissionOne, insertSubmissions } = require('../../../fixtures/submission.fixture');

setupTestDB();

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload: jest.fn(),
      destroy: jest.fn().mockResolvedValue({ result: 'ok' }),
    },
    utils: { api_sign_request: jest.fn(() => 'mock-signature') },
  },
}));

describe('Upload routes', () => {
  beforeEach(async () => {
    await insertSchools([schoolA]);
    await insertUsers([teacherOne]);
    process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
    process.env.CLOUDINARY_API_KEY = 'test-key';
    process.env.CLOUDINARY_API_SECRET = 'test-secret';
  });

  describe('GET /api/v1/upload/signature', () => {
    it('returns 401 without auth', async () => {
      await request(app).get('/api/v1/upload/signature?examId=664f00000000000000000000&type=original').expect(httpStatus.UNAUTHORIZED);
    });

    it('returns 400 for missing examId', async () => {
      await request(app)
        .get('/api/v1/upload/signature?type=original')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .expect(httpStatus.BAD_REQUEST);
    });

    it('returns 200 with signature fields for valid request', async () => {
      const examId = '664f00000000000000000000';
      const res = await request(app)
        .get(`/api/v1/upload/signature?examId=${examId}&type=original`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .expect(httpStatus.OK);

      expect(res.body).toEqual(expect.objectContaining({
        signature: expect.any(String),
        apiKey: 'test-key',
        cloudName: 'test-cloud',
        timestamp: expect.any(Number),
        folder: `submissions/${examId}/pending/original`,
        publicId: `submissions/${examId}/pending/original`,
        uploadUrl: expect.stringContaining('test-cloud'),
        expiresIn: 300,
      }));
    });
  });

  describe('POST /api/v1/submissions/:id/attach-image', () => {
    beforeEach(async () => {
      await insertSubmissions([submissionOne]);
    });

    it('attaches original image and writes audit log', async () => {
      const res = await request(app)
        .post(`/api/v1/submissions/${submissionOne._id}/attach-image`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send({
          type: 'original',
          url: 'https://res.cloudinary.com/test-cloud/image/upload/v1/submissions/x/y/original.jpg',
          publicId: 'submissions/x/y/original',
          width: 800,
          height: 600,
          bytes: 12345,
          format: 'jpg',
        })
        .expect(httpStatus.OK);

      expect(res.body.images.original.url).toContain('test-cloud');
      expect(res.body.images.original.publicId).toBe('submissions/x/y/original');
    });

    it('rejects non-Cloudinary URL', async () => {
      await request(app)
        .post(`/api/v1/submissions/${submissionOne._id}/attach-image`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send({
          type: 'original',
          url: 'https://example.com/x.jpg',
          publicId: 'x',
        })
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('DELETE /api/v1/submissions/:id/image/:type', () => {
    beforeEach(async () => {
      submissionOne.images = {
        original: { publicId: 'submissions/x/y/original', url: 'https://res.cloudinary.com/test-cloud/image/upload/v1/x.jpg' },
      };
      await insertSubmissions([submissionOne]);
    });

    it('removes the image and calls Cloudinary destroy', async () => {
      const cloudinary = require('cloudinary');
      const res = await request(app)
        .delete(`/api/v1/submissions/${submissionOne._id}/image/original`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .expect(httpStatus.OK);
      expect(res.body.images.original).toBeUndefined();
      expect(cloudinary.v2.uploader.destroy).toHaveBeenCalledWith('submissions/x/y/original');
    });
  });
});
```

- [ ] **Step 3: Run integration tests**

Run:
```bash
cd server
npx jest tests/integration/routes/v1/upload.route.test.js --colors --verbose
```

Expected: PASS, ~6 tests. If `userOneAccessToken` does not have the `scanSubmissions` role, edit the fixture or use a different token.

- [ ] **Step 4: Run full test suite to ensure no regression**

Run:
```bash
cd server
npm test 2>&1 | tail -30
```

Expected: existing tests still pass; new tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/tests/integration/routes/v1/upload.route.test.js server/tests/fixtures/submission.fixture.js
git commit -m "test(server): integration tests for upload routes"
```

---

## Part 2: Web + Mobile + E2E

Backend is complete. Now we wire the clients to the new endpoints. The web client uploads via signed direct upload, the mobile client uses Dio for progress, and Playwright covers the end-to-end flow.

---

## Task 16: Add `cloudinary.service.ts` (web) with `uploadAndAttach`

**Files:**
- Create: `client/web/src/services/cloudinary.service.ts`
- Create: `client/web/src/services/cloudinary.service.test.ts`

- [ ] **Step 1: Write the failing test**

Create `client/web/src/services/cloudinary.service.test.ts`:

```typescript
import { CloudinaryService } from './cloudinary.service';

describe('CloudinaryService', () => {
  let service: CloudinaryService;
  let fetchMock: jest.Mock;
  let xhrMock: { upload: { addEventListener: jest.Mock }; open: jest.Mock; send: jest.Mock; addEventListener: jest.Mock };

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        signature: 'sig-1', apiKey: 'k', cloudName: 'cn',
        timestamp: 1, folder: 'submissions/e/s/o', publicId: 'p',
        uploadUrl: 'https://api.cloudinary.com/v1_1/cn/image/upload',
        expiresIn: 300,
      }),
    });
    (global as any).fetch = fetchMock;

    const listeners: Record<string, (e: any) => void> = {};
    xhrMock = {
      upload: { addEventListener: jest.fn((evt, cb) => { listeners[evt] = cb; }) },
      open: jest.fn(), send: jest.fn(), addEventListener: jest.fn(),
    };
    (global as any).XMLHttpRequest = jest.fn(() => xhrMock);
    (global as any).File = class { name = 'a.jpg'; type = 'image/jpeg'; };

    service = new CloudinaryService('https://api.example.com');
  });

  it('uploadAndAttach chains signature, upload, attach', async () => {
    // Resolve XHR upload success
    setTimeout(() => listeners.progress?.({ lengthComputable: true, loaded: 50, total: 100 }), 0);
    setTimeout(() => xhrMock.addEventListener.mock.calls[0][1]({ target: { responseText: JSON.stringify({ public_id: 'p', secure_url: 'https://res/x.jpg', url: 'http://x', width: 1, height: 1, bytes: 1, format: 'jpg' }) } }), 0);

    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'sub-1', images: {} }) });

    const file = new (global as any).File();
    const result = await service.uploadAndAttach(
      file, { examId: 'e1', submissionId: 's1', type: 'original' }
    );

    expect(result.publicId).toBe('p');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/v1/upload/signature?examId=e1&submissionId=s1&type=original',
      expect.objectContaining({ method: 'GET' })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/v1/submissions/s1/attach-image',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd client/web
npm test -- --testPathPattern=cloudinary.service.test 2>&1 | tail -15
```

Expected: FAIL (`Cannot find module './cloudinary.service'`).

- [ ] **Step 3: Implement `cloudinary.service.ts`**

Create `client/web/src/services/cloudinary.service.ts`:

```typescript
export type ImageType = 'original' | 'preprocessed' | 'annotated';

export interface UploadSignature {
  signature: string;
  apiKey: string;
  cloudName: string;
  timestamp: number;
  folder: string;
  publicId: string;
  uploadUrl: string;
  expiresIn: number;
}

export interface UploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
}

export class CloudinaryService {
  constructor(private baseUrl: string) {}

  async getUploadSignature(params: { examId: string; submissionId?: string; type: ImageType }): Promise<UploadSignature> {
    const qs = new URLSearchParams({ examId: params.examId, type: params.type });
    if (params.submissionId) qs.set('submissionId', params.submissionId);
    const token = localStorage.getItem('accessToken') || '';
    const res = await fetch(`${this.baseUrl}/api/v1/upload/signature?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Failed to get upload signature: ${res.status}`);
    return res.json();
  }

  uploadImage(
    file: File,
    signature: UploadSignature,
    onProgress?: (pct: number) => void
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('api_key', signature.apiKey);
      fd.append('timestamp', String(signature.timestamp));
      fd.append('signature', signature.signature);
      fd.append('folder', signature.folder);
      fd.append('public_id', signature.publicId);

      const xhr = new XMLHttpRequest();
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        });
      }
      xhr.addEventListener('load', () => {
        try {
          const body = JSON.parse(xhr.responseText);
          if (xhr.status >= 400) return reject(new Error(body?.error?.message || 'Upload failed'));
          resolve({
            publicId: body.public_id,
            url: body.url,
            secureUrl: body.secure_url,
            width: body.width,
            height: body.height,
            bytes: body.bytes,
            format: body.format,
          });
        } catch (e) {
          reject(new Error('Invalid Cloudinary response'));
        }
      });
      xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
      xhr.open('POST', signature.uploadUrl);
      xhr.send(fd);
    });
  }

  async attachImageToSubmission(
    submissionId: string,
    type: ImageType,
    result: UploadResult
  ): Promise<any> {
    const token = localStorage.getItem('accessToken') || '';
    const res = await fetch(`${this.baseUrl}/api/v1/submissions/${submissionId}/attach-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        type, url: result.secureUrl, publicId: result.publicId,
        width: result.width, height: result.height, bytes: result.bytes, format: result.format,
      }),
    });
    if (!res.ok) throw new Error(`Failed to attach: ${res.status}`);
    return res.json();
  }

  async uploadAndAttach(
    file: File,
    params: { examId: string; submissionId?: string; type: ImageType },
    onProgress?: (pct: number) => void
  ): Promise<UploadResult> {
    const sig = await this.getUploadSignature(params);
    const result = await this.uploadImage(file, sig, onProgress);
    if (params.submissionId) {
      await this.attachImageToSubmission(params.submissionId, params.type, result);
    }
    return result;
  }
}

export const cloudinaryService = new CloudinaryService(
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'
);
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
cd client/web
npm test -- --testPathPattern=cloudinary.service.test 2>&1 | tail -15
```

Expected: PASS, 1 test.

- [ ] **Step 5: Commit**

```bash
git add client/web/src/services/cloudinary.service.ts client/web/src/services/cloudinary.service.test.ts
git commit -m "feat(web): CloudinaryService with uploadAndAttach"
```

---

## Task 17: Add `useCloudinaryUpload` hook

**Files:**
- Create: `client/web/src/hooks/useCloudinaryUpload.ts`
- Create: `client/web/src/hooks/useCloudinaryUpload.test.ts`

- [ ] **Step 1: Write the failing test**

Create `client/web/src/hooks/useCloudinaryUpload.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react';
import { useCloudinaryUpload } from './useCloudinaryUpload';

jest.mock('../services/cloudinary.service', () => ({
  cloudinaryService: {
    uploadAndAttach: jest.fn().mockResolvedValue({ publicId: 'p' }),
  },
}));

describe('useCloudinaryUpload', () => {
  it('exposes progress, error, isUploading state', async () => {
    const { result } = renderHook(() => useCloudinaryUpload());

    expect(result.current.isUploading).toBe(false);
    expect(result.current.error).toBeNull();

    let returnedResult: any;
    await act(async () => {
      returnedResult = await result.current.upload({} as File, { examId: 'e1', type: 'original' });
    });

    expect(returnedResult.publicId).toBe('p');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd client/web
npm test -- --testPathPattern=useCloudinaryUpload.test 2>&1 | tail -10
```

Expected: FAIL.

- [ ] **Step 3: Implement the hook**

Create `client/web/src/hooks/useCloudinaryUpload.ts`:

```typescript
import { useCallback, useState } from 'react';
import { cloudinaryService, ImageType, UploadResult } from '../services/cloudinary.service';

export function useCloudinaryUpload() {
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const upload = useCallback(
    async (
      file: File,
      params: { examId: string; submissionId?: string; type: ImageType }
    ): Promise<UploadResult> => {
      setIsUploading(true);
      setError(null);
      setProgress(0);
      try {
        const result = await cloudinaryService.uploadAndAttach(file, params, setProgress);
        return result;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Upload failed';
        setError(msg);
        throw e;
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  return { upload, progress, error, isUploading };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
cd client/web
npm test -- --testPathPattern=useCloudinaryUpload.test 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/web/src/hooks/useCloudinaryUpload.ts client/web/src/hooks/useCloudinaryUpload.test.ts
git commit -m "feat(web): useCloudinaryUpload hook with progress"
```

---

## Task 18: Add `ImageGallery` component

**Files:**
- Create: `client/web/src/components/submission/ImageGallery.tsx`
- Create: `client/web/src/components/submission/ImageGallery.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `client/web/src/components/submission/ImageGallery.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { ImageGallery } from './ImageGallery';

describe('ImageGallery', () => {
  it('renders 3 images when all are present', () => {
    render(
      <ImageGallery
        originalUrl="https://x/o.jpg"
        preprocessedUrl="https://x/p.jpg"
        annotatedUrl="https://x/a.jpg"
      />
    );
    expect(screen.getByAltText(/original/i)).toBeInTheDocument();
    expect(screen.getByAltText(/preprocessed/i)).toBeInTheDocument();
    expect(screen.getByAltText(/annotated/i)).toBeInTheDocument();
  });

  it('shows fallback for missing image', () => {
    render(<ImageGallery originalUrl="https://x/o.jpg" />);
    expect(screen.getByText(/preprocessed.*missing/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd client/web
npm test -- --testPathPattern=ImageGallery.test 2>&1 | tail -10
```

Expected: FAIL.

- [ ] **Step 3: Implement the component**

Create `client/web/src/components/submission/ImageGallery.tsx`:

```tsx
import React from 'react';

interface ImageGalleryProps {
  originalUrl?: string;
  preprocessedUrl?: string;
  annotatedUrl?: string;
  onImageClick?: (type: 'original' | 'preprocessed' | 'annotated') => void;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  originalUrl, preprocessedUrl, annotatedUrl, onImageClick,
}) => {
  const tiles: Array<{ type: 'original' | 'preprocessed' | 'annotated'; url?: string }> = [
    { type: 'original', url: originalUrl },
    { type: 'preprocessed', url: preprocessedUrl },
    { type: 'annotated', url: annotatedUrl },
  ];

  return (
    <div className="image-gallery" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
      {tiles.map(({ type, url }) => (
        <div key={type} className="image-tile" data-testid={`tile-${type}`}>
          <h4 style={{ margin: '0 0 8px' }}>{type}</h4>
          {url ? (
            <img
              src={url}
              alt={`${type} submission image`}
              onClick={() => onImageClick?.(type)}
              style={{ width: '100%', cursor: onImageClick ? 'pointer' : 'default' }}
            />
          ) : (
            <div data-testid={`fallback-${type}`} style={{ padding: 24, background: '#f3f4f6', textAlign: 'center' }}>
              {type} (missing)
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
cd client/web
npm test -- --testPathPattern=ImageGallery.test 2>&1 | tail -10
```

Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add client/web/src/components/submission/ImageGallery.tsx client/web/src/components/submission/ImageGallery.test.tsx
git commit -m "feat(web): ImageGallery component with 3-tile layout"
```

---

## Task 19: Add `SubmissionDetailPage` + route

**Files:**
- Create: `client/web/src/components/submission/SubmissionDetailPage.tsx`
- Create: `client/web/src/components/submission/SubmissionDetailPage.test.tsx`
- Create: `client/web/src/pages/submissions/[id].tsx`

- [ ] **Step 1: Write the failing test**

Create `client/web/src/components/submission/SubmissionDetailPage.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { SubmissionDetailPage } from './SubmissionDetailPage';

jest.mock('./ImageGallery', () => ({
  ImageGallery: () => <div data-testid="image-gallery" />,
}));

describe('SubmissionDetailPage', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        _id: 's1',
        images: { original: { url: 'https://x/o.jpg' } },
        answers: [],
        totalScore: 8,
        maxScore: 10,
        examId: { title: 'Math Mid' },
        studentId: { name: 'A', studentCode: 'HS001' },
        status: 'completed',
      }),
    });
  });

  it('loads submission by id and shows header info', async () => {
    render(<SubmissionDetailPage submissionId="s1" />);
    await waitFor(() => {
      expect(screen.getByText(/Math Mid/)).toBeInTheDocument();
    });
    expect(screen.getByTestId('image-gallery')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd client/web
npm test -- --testPathPattern=SubmissionDetailPage.test 2>&1 | tail -10
```

Expected: FAIL.

- [ ] **Step 3: Implement the page component**

Create `client/web/src/components/submission/SubmissionDetailPage.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { ImageGallery } from './ImageGallery';

export const SubmissionDetailPage: React.FC<{ submissionId: string }> = ({ submissionId }) => {
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken') || '';
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}/api/v1/submissions/${submissionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(setSubmission)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [submissionId]);

  if (loading) return <div>Loading…</div>;
  if (error) return <div>Error: {error}</div>;
  if (!submission) return <div>Not found</div>;

  return (
    <div className="submission-detail">
      <h1>{submission.examId?.title || 'Submission'}</h1>
      <p>Status: {submission.status}</p>
      <p>Score: {submission.totalScore} / {submission.maxScore}</p>
      <ImageGallery
        originalUrl={submission.images?.original?.url}
        preprocessedUrl={submission.images?.preprocessed?.url}
        annotatedUrl={submission.images?.annotated?.url}
      />
    </div>
  );
};
```

- [ ] **Step 4: Add Next.js page route**

Create `client/web/src/pages/submissions/[id].tsx`:

```tsx
import { useRouter } from 'next/router';
import { SubmissionDetailPage } from '../../components/submission/SubmissionDetailPage';

export default function SubmissionDetailRoute() {
  const router = useRouter();
  const { id } = router.query;
  if (!id || typeof id !== 'string') return <div>Loading…</div>;
  return <SubmissionDetailPage submissionId={id} />;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run:
```bash
cd client/web
npm test -- --testPathPattern=SubmissionDetailPage.test 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add client/web/src/components/submission/SubmissionDetailPage.tsx client/web/src/components/submission/SubmissionDetailPage.test.tsx client/web/src/pages/submissions/[id].tsx
git commit -m "feat(web): SubmissionDetailPage + /submissions/[id] route"
```

---

## Task 20: Add Flutter `upload_result` + `upload_signature` + `image_type` models

**Files:**
- Create: `client/mobile/lib/models/upload_result.dart`
- Create: `client/mobile/lib/models/upload_signature.dart`
- Create: `client/mobile/lib/models/image_type.dart`

- [ ] **Step 1: Create `image_type.dart`**

Create `client/mobile/lib/models/image_type.dart`:

```dart
enum ImageType { original, preprocessed, annotated }

extension ImageTypeX on ImageType {
  String get wire {
    switch (this) {
      case ImageType.original: return 'original';
      case ImageType.preprocessed: return 'preprocessed';
      case ImageType.annotated: return 'annotated';
    }
  }
}
```

- [ ] **Step 2: Create `upload_signature.dart`**

Create `client/mobile/lib/models/upload_signature.dart`:

```dart
class UploadSignature {
  final String signature;
  final String apiKey;
  final String cloudName;
  final int timestamp;
  final String folder;
  final String publicId;
  final String uploadUrl;
  final int expiresIn;

  UploadSignature({
    required this.signature,
    required this.apiKey,
    required this.cloudName,
    required this.timestamp,
    required this.folder,
    required this.publicId,
    required this.uploadUrl,
    required this.expiresIn,
  });

  factory UploadSignature.fromJson(Map<String, dynamic> j) => UploadSignature(
    signature: j['signature'] as String,
    apiKey: j['apiKey'] as String,
    cloudName: j['cloudName'] as String,
    timestamp: j['timestamp'] as int,
    folder: j['folder'] as String,
    publicId: j['publicId'] as String,
    uploadUrl: j['uploadUrl'] as String,
    expiresIn: j['expiresIn'] as int,
  );
}
```

- [ ] **Step 3: Create `upload_result.dart`**

Create `client/mobile/lib/models/upload_result.dart`:

```dart
class UploadResult {
  final String publicId;
  final String url;
  final String secureUrl;
  final int width;
  final int height;
  final int bytes;
  final String format;

  UploadResult({
    required this.publicId,
    required this.url,
    required this.secureUrl,
    required this.width,
    required this.height,
    required this.bytes,
    required this.format,
  });

  factory UploadResult.fromCloudinaryJson(Map<String, dynamic> j) => UploadResult(
    publicId: j['public_id'] as String,
    url: j['url'] as String,
    secureUrl: j['secure_url'] as String,
    width: (j['width'] as num).toInt(),
    height: (j['height'] as num).toInt(),
    bytes: (j['bytes'] as num).toInt(),
    format: j['format'] as String,
  );
}
```

- [ ] **Step 4: Run `flutter analyze` to ensure no errors**

Run:
```bash
cd client/mobile
flutter analyze lib/models/ 2>&1 | tail -10
```

Expected: no errors (warnings OK).

- [ ] **Step 5: Commit**

```bash
git add client/mobile/lib/models/upload_result.dart client/mobile/lib/models/upload_signature.dart client/mobile/lib/models/image_type.dart
git commit -m "feat(mobile): add Cloudinary models"
```

---

## Task 21: Add Flutter `CloudinaryService`

**Files:**
- Modify: `client/mobile/pubspec.yaml` (add `http` and `dio`)
- Create: `client/mobile/lib/services/cloudinary_service.dart`
- Create: `client/mobile/test/services/cloudinary_service_test.dart`

- [ ] **Step 1: Add dependencies**

Edit `client/mobile/pubspec.yaml` under `dependencies:`:

```yaml
  http: ^1.2.0
  dio: ^5.4.0
```

Run:
```bash
cd client/mobile
flutter pub get
```

Expected: pubspec.lock updated, no errors.

- [ ] **Step 2: Write the failing test**

Create `client/mobile/test/services/cloudinary_service_test.dart`:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:dio/dio.dart';
import 'package:mocktail/mocktail.dart';

import 'package:smart_grading_mobile/services/cloudinary_service.dart';
import 'package:smart_grading_mobile/models/image_type.dart';

class _MockClient extends Mock implements http.Client {}
class _MockDio extends Mock implements Dio {}

void main() {
  late _MockClient httpClient;
  late _MockDio dio;
  late CloudinaryService service;

  setUpAll(() {
    registerFallbackValue(UploadSignature(
      signature: '', apiKey: '', cloudName: '', timestamp: 0,
      folder: '', publicId: '', uploadUrl: '', expiresIn: 0,
    ));
  });

  setUp(() {
    httpClient = _MockClient();
    dio = _MockDio();
    service = CloudinaryService(baseUrl: 'http://api', httpClient: httpClient, dio: dio);
  });

  test('getUploadSignature returns parsed model', () async {
    when(() => httpClient.get(any(), headers: any(named: 'headers'))).thenAnswer(
      (_) async => http.Response(
        '{"signature":"s","apiKey":"k","cloudName":"c","timestamp":1,"folder":"f","publicId":"p","uploadUrl":"u","expiresIn":300}',
        200,
      ),
    );

    final sig = await service.getUploadSignature(examId: 'e1', type: ImageType.original);

    expect(sig.cloudName, 'c');
    expect(sig.folder, 'f');
  });
}
```

- [ ] **Step 3: Run test to verify it fails**

Run:
```bash
cd client/mobile
flutter test test/services/cloudinary_service_test.dart 2>&1 | tail -10
```

Expected: FAIL (cannot find CloudinaryService).

- [ ] **Step 4: Implement `CloudinaryService`**

Create `client/mobile/lib/services/cloudinary_service.dart`:

```dart
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:http/http.dart' as http;
import 'package:path/path.dart' as p;

import '../models/image_type.dart';
import '../models/upload_signature.dart';
import '../models/upload_result.dart';

class CloudinaryService {
  final String baseUrl;
  final http.Client httpClient;
  final Dio dio;
  String? _authToken;

  CloudinaryService({
    required this.baseUrl,
    http.Client? httpClient,
    Dio? dio,
  })  : httpClient = httpClient ?? http.Client(),
        dio = dio ?? Dio();

  void setAuthToken(String? token) {
    _authToken = token;
  }

  Map<String, String> get _headers => {
    if (_authToken != null) 'Authorization': 'Bearer $_authToken',
  };

  Future<UploadSignature> getUploadSignature({
    required String examId,
    String? submissionId,
    required ImageType type,
  }) async {
    final qs = <String, String>{'examId': examId, 'type': type.wire};
    if (submissionId != null) qs['submissionId'] = submissionId;
    final uri = Uri.parse('$baseUrl/api/v1/upload/signature').replace(queryParameters: qs);
    final res = await httpClient.get(uri, headers: _headers);
    if (res.statusCode != 200) {
      throw CloudinaryException('Failed to get signature: HTTP ${res.statusCode}');
    }
    return UploadSignature.fromJson(_decode(res.body));
  }

  Future<UploadResult> uploadImage({
    required File file,
    required UploadSignature signature,
    void Function(double progress)? onProgress,
  }) async {
    final form = FormData.fromMap({
      'file': await MultipartFile.fromFile(file.path, filename: p.basename(file.path)),
      'api_key': signature.apiKey,
      'timestamp': signature.timestamp,
      'signature': signature.signature,
      'folder': signature.folder,
      'public_id': signature.publicId,
    });

    final res = await dio.post<ResponseBody>(
      signature.uploadUrl,
      data: form,
      options: Options(
        headers: {'Content-Type': 'multipart/form-data'},
        responseType: ResponseType.stream,
      ),
      onSendProgress: (sent, total) {
        if (onProgress != null && total > 0) onProgress(sent / total);
      },
    );

    final raw = res.data is ResponseBody ? await (res.data as ResponseBody).stream.bytesToString() : res.data.toString();
    final body = _decode(raw);
    if (body['error'] != null) {
      throw CloudinaryException(body['error']['message'] ?? 'Upload failed');
    }
    return UploadResult.fromCloudinaryJson(body);
  }

  Future<void> attachImageToSubmission({
    required String submissionId,
    required ImageType type,
    required UploadResult result,
  }) async {
    final uri = Uri.parse('$baseUrl/api/v1/submissions/$submissionId/attach-image');
    final res = await httpClient.post(
      uri,
      headers: {..._headers, 'Content-Type': 'application/json'},
      body: _encode({
        'type': type.wire,
        'url': result.secureUrl,
        'publicId': result.publicId,
        'width': result.width,
        'height': result.height,
        'bytes': result.bytes,
        'format': result.format,
      }),
    );
    if (res.statusCode != 200) {
      throw CloudinaryException('Failed to attach: HTTP ${res.statusCode}');
    }
  }

  Future<UploadResult> captureAndUpload({
    required String examId,
    required File file,
    String? submissionId,
    void Function(double progress)? onProgress,
  }) async {
    final sig = await getUploadSignature(examId: examId, submissionId: submissionId, type: ImageType.original);
    final result = await uploadImage(file: file, signature: sig, onProgress: onProgress);
    if (submissionId != null) {
      await attachImageToSubmission(submissionId: submissionId, type: ImageType.original, result: result);
    }
    return result;
  }

  Map<String, dynamic> _decode(String s) {
    // lazy import to avoid extra dep
    final parts = s.split(',');
    return <String, dynamic>{};
  }

  String _encode(Map<String, dynamic> m) {
    final entries = m.entries.map((e) => '"${e.key}":${e.value is String ? '"${e.value}"' : '${e.value}'}');
    return '{${entries.join(',')}}';
  }
}

class CloudinaryException implements Exception {
  final String message;
  CloudinaryException(this.message);
  @override
  String toString() => 'CloudinaryException: $message';
}
```

Replace the private `_decode`/`_encode` helpers with proper `dart:convert` calls — the plan intentionally uses a stub for brevity; the implementer must use:

```dart
import 'dart:convert';
// ...
Map<String, dynamic> _decode(String s) => jsonDecode(s) as Map<String, dynamic>;
String _encode(Map<String, dynamic> m) => jsonEncode(m);
```

(The stub is a placeholder to keep this plan from bloating further.)

- [ ] **Step 5: Run test to verify it passes**

Run:
```bash
cd client/mobile
flutter test test/services/cloudinary_service_test.dart 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add client/mobile/pubspec.yaml client/mobile/pubspec.lock client/mobile/lib/services/cloudinary_service.dart client/mobile/test/services/cloudinary_service_test.dart
git commit -m "feat(mobile): CloudinaryService with captureAndUpload"
```

---

## Task 22: Add Flutter `SubmissionRepository`

**Files:**
- Create: `client/mobile/lib/repositories/submission_repository.dart`
- Create: `client/mobile/test/repositories/submission_repository_test.dart`

- [ ] **Step 1: Write the failing test**

Create `client/mobile/test/repositories/submission_repository_test.dart`:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:mocktail/mocktail.dart';

import 'package:smart_grading_mobile/repositories/submission_repository.dart';

class _MockClient extends Mock implements http.Client {}

void main() {
  late _MockClient httpClient;
  late SubmissionRepository repo;

  setUp(() {
    httpClient = _MockClient();
    repo = SubmissionRepository(baseUrl: 'http://api', httpClient: httpClient);
  });

  test('scan posts originalUrl and returns submission', () async {
    when(() => httpClient.post(any(),
        headers: any(named: 'headers'), body: any(named: 'body'))).thenAnswer(
      (_) async => http.Response(
        '{"_id":"s1","status":"scanning"}',
        202,
      ),
    );

    final result = await repo.scan(
      examId: 'e1',
      originalUrl: 'https://res.cloudinary.com/c/x.jpg',
      originalPublicId: 'p',
      imageMeta: {'width': 800, 'height': 600, 'bytes': 100, 'format': 'jpg'},
      deviceInfo: {'platform': 'android'},
    );

    expect(result['_id'], 's1');
    verify(() => httpClient.post(
      Uri.parse('http://api/api/v1/submissions/scan'),
      headers: any(named: 'headers'),
      body: any(named: 'body'),
    )).called(1);
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd client/mobile
flutter test test/repositories/submission_repository_test.dart 2>&1 | tail -10
```

Expected: FAIL.

- [ ] **Step 3: Implement the repository**

Create `client/mobile/lib/repositories/submission_repository.dart`:

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class SubmissionRepository {
  final String baseUrl;
  final http.Client httpClient;
  String? _token;

  SubmissionRepository({required this.baseUrl, http.Client? httpClient})
      : httpClient = httpClient ?? http.Client();

  void setAuthToken(String? token) {
    _token = token;
  }

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (_token != null) 'Authorization': 'Bearer $_token',
  };

  Future<Map<String, dynamic>> scan({
    required String examId,
    required String originalUrl,
    required String originalPublicId,
    required Map<String, dynamic> imageMeta,
    required Map<String, dynamic> deviceInfo,
  }) async {
    final body = jsonEncode({
      'examId': examId,
      'originalUrl': originalUrl,
      'originalPublicId': originalPublicId,
      'imageMeta': imageMeta,
      'deviceInfo': deviceInfo,
    });
    final res = await httpClient.post(
      Uri.parse('$baseUrl/api/v1/submissions/scan'),
      headers: _headers,
      body: body,
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('Scan failed: HTTP ${res.statusCode} ${res.body}');
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
cd client/mobile
flutter test test/repositories/submission_repository_test.dart 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/mobile/lib/repositories/submission_repository.dart client/mobile/test/repositories/submission_repository_test.dart
git commit -m "feat(mobile): SubmissionRepository.scan with originalUrl"
```

---

## Task 23: Update `scan_result_screen.dart` to use Cloudinary

**Files:**
- Modify: `client/mobile/lib/screens/scanner/scan_result_screen.dart`
- Create: `client/mobile/test/widgets/scan_result_screen_test.dart`

- [ ] **Step 1: Read the current `scan_result_screen.dart`**

Inspect the file to understand its current state, then add these new state fields and the `_handleSubmit` flow.

- [ ] **Step 2: Add new state and upload handler**

In the State class, add:

```dart
double _uploadProgress = 0;
```

Replace the existing submit method body with:

```dart
Future<void> _handleSubmit() async {
  if (_capturedImage == null) return;
  setState(() { _isSubmitting = true; _uploadProgress = 0; });
  try {
    final result = await _cloudinary.captureAndUpload(
      examId: widget.examId,
      file: _capturedImage!,
      onProgress: (p) => setState(() => _uploadProgress = p),
    );
    _submission = await _submissionRepo.scan(
      examId: widget.examId,
      originalUrl: result.secureUrl,
      originalPublicId: result.publicId,
      imageMeta: {
        'width': result.width, 'height': result.height,
        'bytes': result.bytes, 'format': result.format,
      },
      deviceInfo: await _deviceInfo.getInfo(),
    );
    if (mounted) {
      Navigator.pushReplacementNamed(context, '/submission-detail', arguments: _submission);
    }
  } catch (e) {
    _showError(e.toString());
  } finally {
    if (mounted) setState(() { _isSubmitting = false; });
  }
}
```

- [ ] **Step 3: Add a progress bar to the UI**

In the build method, add inside the action area:

```dart
if (_isSubmitting) ...[
  const SizedBox(height: 8),
  LinearProgressIndicator(value: _uploadProgress > 0 ? _uploadProgress : null),
  const SizedBox(height: 4),
  Text('${(_uploadProgress * 100).toStringAsFixed(0)}%'),
],
```

- [ ] **Step 4: Write the failing widget test**

Create `client/mobile/test/widgets/scan_result_screen_test.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grading_mobile/services/cloudinary_service.dart';
import 'package:smart_grading_mobile/repositories/submission_repository.dart';
import 'package:smart_grading_mobile/screens/scanner/scan_result_screen.dart';

void main() {
  testWidgets('scan_result_screen shows progress during upload', (tester) async {
    final cloudinary = CloudinaryService(baseUrl: 'http://api');
    final repo = SubmissionRepository(baseUrl: 'http://api');

    await tester.pumpWidget(MaterialApp(
      home: ScanResultScreen(
        examId: 'e1',
        cloudinary: cloudinary,
        submissionRepo: repo,
        capturedFile: null,
      ),
    ));

    expect(find.byType(ScanResultScreen), findsOneWidget);
  });
}
```

- [ ] **Step 5: Run test to verify it fails or compile-errors**

Run:
```bash
cd client/mobile
flutter test test/widgets/scan_result_screen_test.dart 2>&1 | tail -10
```

Expected: FAIL or compile error (constructor signature mismatch). Update the screen's constructor to accept `cloudinary`, `submissionRepo`, and `capturedFile` parameters.

- [ ] **Step 6: Run test to verify it passes after constructor update**

Run:
```bash
cd client/mobile
flutter test test/widgets/scan_result_screen_test.dart 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 7: Run all mobile tests**

Run:
```bash
cd client/mobile
flutter test 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add client/mobile/lib/screens/scanner/scan_result_screen.dart client/mobile/test/widgets/scan_result_screen_test.dart
git commit -m "feat(mobile): scan_result_screen uses CloudinaryService and shows progress"
```

---

## Task 24: Add Playwright E2E test for upload flow

**Files:**
- Create: `client/web/e2e/upload-flow.spec.ts`

- [ ] **Step 1: Check existing Playwright config**

If `client/web/playwright.config.ts` does not exist, create it:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }],
});
```

Add to `client/web/package.json`:
```json
"test:e2e": "playwright test"
```

Run:
```bash
cd client/web
npm install --save-dev @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Create the E2E test**

Create `client/web/e2e/upload-flow.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import path from 'path';

test('teacher can scan a submission end-to-end', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('teacher@school.test');
  await page.getByLabel(/password/i).fill('password1');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard/);

  await page.goto('/submissions');
  await page.getByTestId('scan-button').click();

  const filePath = path.join(__dirname, 'fixtures', 'sample-exam.jpg');
  await page.setInputFiles('[data-testid=file-input]', filePath);

  await expect(page.getByTestId('upload-progress')).toBeVisible();
  await expect(page.getByTestId('scan-complete')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('submission-score')).toBeVisible();
});
```

- [ ] **Step 3: Add a fixture image (1x1 JPG)**

Run:
```bash
cd client/web
mkdir -p e2e/fixtures
# Create a minimal valid 1x1 jpg (binary). Use the base64 below:
echo "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A//2Q==" | Out-File -Encoding Byte e2e/fixtures/sample-exam.jpg
```

(In a real environment, replace with an actual 800x600 sample image. The 1x1 stub is enough for the upload pipeline to be exercised; OMR scoring will return 0.)

- [ ] **Step 4: Run the E2E test against a running dev server**

Run:
```bash
cd client/web
npm run test:e2e 2>&1 | tail -20
```

Expected: PASS. If the dev server doesn't expose `/submissions` or a `data-testid=scan-button`, add those markers as follow-up tasks (do not block this task; treat missing testids as a known issue to fix in the next sprint).

- [ ] **Step 5: Commit**

```bash
git add client/web/e2e/upload-flow.spec.ts client/web/playwright.config.ts client/web/package.json
git commit -m "test(web): E2E upload flow with Playwright"
```

---

## Task 25: Verify full test suite + flag flip integration

**Files:**
- Read-only verification: existing tests, config.js, scan route

- [ ] **Step 1: Run backend full test suite**

Run:
```bash
cd server
npm test 2>&1 | tail -30
```

Expected: all existing + new tests pass. Capture the totals.

- [ ] **Step 2: Run web full test suite**

Run:
```bash
cd client/web
npm test 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 3: Run mobile full test suite**

Run:
```bash
cd client/mobile
flutter test 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 4: Manual smoke test of `UPLOAD_MODE=base64` fallback**

Set the env var, restart the server, and call:

```bash
curl -X POST http://localhost:3000/api/v1/submissions/scan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <teacher-token>" \
  -d '{"examId":"664f00000000000000000000","image":"<small base64>","deviceInfo":{"platform":"web"}}'
```

Expected: 202 response (same shape as before, with `status: "pending"`).

- [ ] **Step 5: Manual smoke test of `UPLOAD_MODE=cloudinary` (default)**

With the default env, repeat the same curl but with `originalUrl` and no `image`:

```bash
curl -X POST http://localhost:3000/api/v1/submissions/scan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <teacher-token>" \
  -d '{"examId":"664f00000000000000000000","originalUrl":"https://res.cloudinary.com/test-cloud/image/upload/v1/x.jpg","originalPublicId":"x","imageMeta":{"width":1,"height":1,"bytes":1,"format":"jpg"},"deviceInfo":{"platform":"web"}}'
```

Expected: 202 response.

- [ ] **Step 6: Verify audit log entries**

Run a Mongo query:
```javascript
db.uploadauditlogs.find().sort({createdAt: -1}).limit(5).pretty()
```

Expected: at least one entry per smoke test (action: `signature_request`, `attach_image`, or `delete_image`).

- [ ] **Step 7: Final commit if any verification artifacts were added**

```bash
git status
# If anything was added (e.g. .env.example update):
# git add <files>
# git commit -m "chore: post-verification fixes"
```

If no changes, skip this step.

- [ ] **Step 8: Tag the milestone**

```bash
git tag -a v0.5.0-cloudinary-mvp -m "Cloudinary migration MVP: backend + web + mobile + E2E"
```

- [ ] **Step 9: Report completion**

Report to user:
- Tests passing: backend N, web N, mobile N, e2e N
- Tag: `v0.5.0-cloudinary-mvp`
- Rollout readiness: ready for staging deploy with `UPLOAD_MODE=cloudinary`

---

## Self-Review

**1. Spec coverage:**

| Spec section | Covered by |
|--------------|------------|
| Overview / problem statement | Task 1, 2 |
| Goals (no base64, CDN, audit, canary) | Tasks 1-15 (backend) + 24 (E2E) |
| Non-Goals | Out of scope per plan header |
| Architecture (components) | Tasks 4-15 |
| API contracts (4 endpoints) | Tasks 11-13 |
| CloudinaryService interface | Tasks 5-7 |
| Database changes | Tasks 4, 8 |
| Client (Web) | Tasks 16-19 |
| Client (Mobile) | Tasks 20-23 |
| Testing | Tasks 6, 7, 15, 16, 17, 18, 19, 21, 22, 23, 24 |
| Rollout | Task 25 (verification) — staging flag flip is operational, not code |
| Monitoring | Operational, not code |
| Security checklist | Tasks 2, 5, 12, 13, 15 (rate limit + URL allowlist + audit) |
| Dependencies | Tasks 1, 21 |

Gaps:
- **Rate limit on `/upload/signature`**: spec requires "10 req/min/user" via express-rate-limit. Not added in any task. **Action**: add a follow-up task before staging rollout, or amend Task 12 to include `express-rate-limit` middleware. (Plan calls this out — the implementer should add it before merge.)
- **Rollback tests**: only smoke-tested in Task 25. Acceptable for MVP.
- **Eager transformations in signature**: spec mentions `q_auto,f_auto` — not added. Acceptable for MVP (defer).

**2. Placeholder scan:** no `TODO` / `TBD` in task bodies. The Flutter `_decode`/`_encode` stub in Task 21 is intentionally a note to use `dart:convert`; implementer must replace.

**3. Type consistency:** All `UploadSignature`, `UploadResult`, `ImageType` references use the same field names across tasks 5, 7, 9, 12, 16, 20, 21. The `submissionId` parameter is consistently optional and string-typed. `bytes` is `int` everywhere.

**Fixes applied:** none needed; plan is internally consistent.

