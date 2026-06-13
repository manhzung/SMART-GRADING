# Cloudinary Migration - Design Specification

## Overview

Replace the current base64-in-JSON upload flow for OMR submission images with a direct-to-Cloudinary upload flow. Backend issues short-lived signed upload parameters; clients upload images directly to Cloudinary; clients then attach the resulting URL/PublicID to the Submission document via existing REST endpoints.

**Problem statement:**
- Current `POST /api/v1/submissions/scan` accepts `image: base64 string`. For a 10MP JPEG, base64 inflates payload by ~33% and forces the Node.js server to buffer 13MB+ in memory per request.
- Local-disk storage on the API host does not scale, has no CDN, no on-the-fly transformation, no automatic format optimization.
- Retry on network failure is impractical (entire 13MB must be re-uploaded).
- The Python OMR script currently re-receives base64 over stdin; the migration lets Python fetch the URL directly (smaller stdin, cached at the edge).

**Platform:** Backend (Node.js/Express), Web (React/TypeScript), Mobile (Flutter/Dart)
**Date:** 2026-06-14
**Status:** Draft, awaiting user review

---

## Goals

1. Eliminate base64-in-JSON for image transport on `POST /scan`.
2. Store Submission images in Cloudinary, not on local disk.
3. Generate URLs suitable for the Python OMR script to fetch via HTTPS (no auth, no local paths).
4. Preserve a clean audit trail of every upload/delete with userId, IP, action.
5. Roll out safely via feature flag with a 4-stage canary (10 → 50 → 100 → cleanup).

## Non-Goals

- Migrating **existing** submissions on local disk to Cloudinary (out of scope; covered by a separate one-time backfill script, if needed).
- Replacing the OMR engine (Python/OMRChecker logic untouched).
- Adding image editing, EXIF stripping, or new transformations beyond what Cloudinary's default `eager` provides.
- Multi-tenant Cloudinary accounts (single cloud_name for the project is fine for now).

---

## Current State (before)

```
[Mobile/Web Client]
      │
      │  POST /api/v1/submissions/scan
      │  body: { examId, image: "<base64, ~13MB>", deviceInfo }
      ▼
[Node.js API] ─── buffers 13MB in memory ───┐
      │                                      │
      │  pythonBridge.processImage({ image: base64, template })
      ▼
[Python omr_process.py] ─── reads base64 from stdin
      │
      ▼
[OMRChecker] → result
      │
      ▼
[Node.js] → response
```

Existing evidence:
- `server/src/validations/submission.validation.js` line 10: `image: Joi.string().required(), // Base64 encoded image`
- `server/src/services/pythonBridge.service.js` lines 41-51: converts `Buffer | base64` to base64 before sending to Python
- `server/src/models/submission.model.js` lines 80-107: `imageSchema` only stores `url`, no `publicId` (cannot be deleted from Cloudinary later)
- `server/src/config/config.js` lines 27-29, 69-73: Cloudinary env vars already defined but **unused** anywhere in the codebase
- `server/src/services/submission.service.js` line 219-222: `delete()` only removes DB record, no image cleanup

---

## Target State (after)

```
[Mobile/Web Client]
      │
      │  ① GET /api/v1/upload/signature?examId=X&type=original
      │     ← { signature, apiKey, cloudName, timestamp, folder, publicId, expiresIn, uploadUrl }
      │
      │  ② POST https://api.cloudinary.com/v1_1/{cloud}/image/upload
      │     body: multipart { file, api_key, timestamp, signature, folder, public_id }
      │     ← { public_id, secure_url, width, height, bytes, format }
      │
      │  ③ POST /api/v1/submissions/:id/attach-image
      │     body: { type: 'original', url, publicId, width, height, bytes, format }
      │     ← Submission document with images[type] populated
      │
      │  ④ POST /api/v1/submissions/scan  (new flow)
      │     body: { examId, originalUrl, originalPublicId, imageMeta, deviceInfo }
      ▼
[Node.js API] ─── signature issuance only, no image buffering
      │
      │  pythonBridge.processImage({ imageUrl: https://res.cloudinary.com/... })
      ▼
[Python omr_process.py] ─── downloads via requests
      │
      ▼
[OMRChecker] → result
      │
      ▼
[Node.js] → response
```

---

## Architecture

### Components

| Component | File (new / modified) | Responsibility |
|-----------|----------------------|----------------|
| **CloudinaryService** | `server/src/services/cloudinary.service.js` (new) | Wrap the `cloudinary` SDK; generate signatures; upload buffer/base64; destroy; extract publicId from URL. |
| **cloudinary.util.js** | `server/src/utils/cloudinary.util.js` (new) | Pure helpers: `extractPublicIdFromUrl`, `assertIsCloudinaryUrl`, `sanitizeFolder`. |
| **UploadAuditLog model** | `server/src/models/uploadAuditLog.model.js` (new) | Persist `userId, action, submissionId, publicId, ipAddress, userAgent, durationMs, error`. |
| **Upload controller** | `server/src/controllers/upload.controller.js` (new) | `getUploadSignature` endpoint. |
| **Upload route** | `server/src/routes/v1/upload.route.js` (new) | Mount under `/api/v1/upload`. |
| **Submission controller (extended)** | `server/src/controllers/submission.controller.js` (modify) | Add `attachImage`, `deleteImage` handlers. |
| **Submission service (extended)** | `server/src/services/submission.service.js` (modify) | Validate Cloudinary URL; write audit log; on `delete`, fan-out to `cloudinaryService.destroy`. |
| **Submission model (extended)** | `server/src/models/submission.model.js` (modify) | Add `publicId`, `bytes`, `format`, `uploadedAt` to each `imageSchema.*`; add indexes. |
| **Submission validation (extended)** | `server/src/validations/submission.validation.js` (modify) | `attachImage`, `deleteImage` Joi schemas; new `scan` schema with `originalUrl` (instead of `image` base64). |
| **scanSubmission (modified)** | `server/src/services/submission.service.js` (modify) | Accept `originalUrl`; pass to `pythonBridge` as `imageUrl`. |
| **Python bridge (modified)** | `server/src/services/pythonBridge.service.js` (modify) | Add branch: if `imageUrl` provided, pass it through; let Python download. |
| **Web `cloudinary.service.ts`** | `client/web/src/services/cloudinary.service.ts` (new) | Client wrapper: get signature, upload, attach. |
| **Web `useCloudinaryUpload`** | `client/web/src/hooks/useCloudinaryUpload.ts` (new) | React hook with progress. |
| **Web `ImageGallery.tsx`** | `client/web/src/components/submission/ImageGallery.tsx` (new) | 3-image side-by-side viewer. |
| **Web `SubmissionDetailPage.tsx`** | `client/web/src/components/submission/SubmissionDetailPage.tsx` (new) + `client/web/src/pages/submissions/[id].tsx` route | Detail view page. |
| **Mobile `cloudinary_service.dart`** | `client/mobile/lib/services/cloudinary_service.dart` (new) | Client wrapper. |
| **Mobile `submission_repository.dart`** | `client/mobile/lib/repositories/submission_repository.dart` (new) | Calls `/scan` with URLs. |
| **Mobile `scan_result_screen.dart`** | `client/mobile/lib/screens/scanner/scan_result_screen.dart` (modify) | Use CloudinaryService. |

### Data flow

1. **Signature issuance** — Client (Web/Mobile) → `GET /api/v1/upload/signature?examId=…&type=original` → `auth` middleware → `uploadController.getUploadSignature` → `cloudinaryService.generateUploadSignature({ userId, examId, type })` → returns `{ signature, apiKey, cloudName, timestamp, folder, publicId, uploadUrl, expiresIn }`.
2. **Direct upload** — Client → `POST https://api.cloudinary.com/v1_1/{cloud}/image/upload` (multipart) → Cloudinary stores the file under `submissions/{examId}/{submissionId or "pending"}/original` with the provided `publicId`.
3. **Attach** — Client → `POST /api/v1/submissions/:id/attach-image` with `{ type, url, publicId, width, height, bytes, format }` → service validates `url` matches `https://res.cloudinary.com/{cloudName}/…` → `Submission.findByIdAndUpdate(id, { $set: { 'images.original': {...} } })` → write `UploadAuditLog` → return updated submission.
4. **Scan** — Client → `POST /api/v1/submissions/scan` with `{ examId, originalUrl, originalPublicId, imageMeta, deviceInfo }` → service passes `imageUrl` to `pythonBridge.processImage` → Python downloads with `requests` (timeout 10s, max-size 20MB, MIME-type check).

### Folder structure on Cloudinary

```
submissions/
└── {examId}/
    └── {submissionId|pending}/
        ├── original
        ├── preprocessed
        └── annotated
```

`pending` is used when client uploads *before* the submission document exists (e.g. retry mid-flow); on successful `attach-image` the publicId is kept (Cloudinary doesn't support rename cheaply) but the DB stores it under the canonical submissionId via a service that re-tags with `add_tag` (out of MVP; acceptable trade-off).

### Feature flag

Add to `config.js`:
```js
upload: {
  mode: envVars.UPLOAD_MODE || 'cloudinary', // 'cloudinary' | 'base64' (legacy)
}
```
The `/scan` controller dispatches based on this flag. Web/Mobile build embeds the same flag at build time (env var `NEXT_PUBLIC_UPLOAD_MODE` / `--dart-define=UPLOAD_MODE=cloudinary`).

---

## API Contracts

### 1. `GET /api/v1/upload/signature`

**Auth:** required (`scanSubmissions` permission).

**Query:**

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `examId` | string (ObjectId) | yes | Used to scope the `folder`. |
| `submissionId` | string (ObjectId) | no | If omitted, use `pending` placeholder. |
| `type` | enum: `original` \| `preprocessed` \| `annotated` | yes | Determines eager transformations. |

**Response 200:**
```json
{
  "signature": "abc1234...",
  "apiKey": "1234567890abcdef",
  "cloudName": "smart-grading",
  "timestamp": 1718342400,
  "folder": "submissions/664f.../664f...",
  "publicId": "submissions/664f.../664f.../original",
  "uploadUrl": "https://api.cloudinary.com/v1_1/smart-grading/image/upload",
  "expiresIn": 300
}
```

**Errors:**
- `400` invalid `examId` / `type`
- `401` no auth
- `403` not allowed to scan this exam (RBAC)
- `500` Cloudinary env vars missing

### 2. `POST /api/v1/submissions/:id/attach-image`

**Auth:** required.

**Body:**
```json
{
  "type": "original",
  "url": "https://res.cloudinary.com/smart-grading/image/upload/v1234/submissions/.../original.jpg",
  "publicId": "submissions/664f.../664f.../original",
  "width": 4032,
  "height": 3024,
  "bytes": 2485760,
  "format": "jpg"
}
```

**Response 200:** updated `Submission` document.

**Errors:**
- `400` invalid `type` / `url` (non-Cloudinary domain) / `bytes` > 10MB
- `404` submission not found
- `403` not owner

### 3. `DELETE /api/v1/submissions/:id/image/:type`

**Auth:** required.

**Response 204** (image cleared from DB and Cloudinary).

**Errors:**
- `404` no image of that type
- `502` Cloudinary destroy failed (DB record still cleared, audit log captures failure)

### 4. `POST /api/v1/submissions/scan` (modified)

**Body (new flow):**
```json
{
  "examId": "664f...",
  "originalUrl": "https://res.cloudinary.com/.../original.jpg",
  "originalPublicId": "submissions/664f.../664f.../original",
  "imageMeta": {
    "width": 4032,
    "height": 3024,
    "bytes": 2485760,
    "format": "jpg"
  },
  "deviceInfo": { "platform": "android", "deviceModel": "...", "appVersion": "1.0.0" }
}
```

The legacy `image: base64` field is still accepted when `UPLOAD_MODE=base64` (for rollback / local dev without Cloudinary account).

**Response 202** (unchanged contract): `{ status, message, examId, ... }`.

---

## CloudinaryService Interface

```js
class CloudinaryService {
  /**
   * Issue a signed upload signature.
   * @param {Object} params
   * @param {string} params.userId
   * @param {string} params.examId
   * @param {string} [params.submissionId]
   * @param {'original'|'preprocessed'|'annotated'} params.type
   * @returns {Promise<{signature, apiKey, cloudName, timestamp, folder, publicId, uploadUrl, expiresIn}>}
   */
  async generateUploadSignature({ userId, examId, submissionId, type }) { ... }

  /**
   * Upload a buffer to Cloudinary.
   * @param {Buffer} buffer
   * @param {Object} options - { folder, publicId, eager, resourceType }
   * @returns {Promise<{publicId, url, secureUrl, width, height, bytes, format}>}
   */
  async uploadBuffer(buffer, options) { ... }

  /**
   * Upload a base64 data URI to Cloudinary.
   * @param {string} dataUri - 'data:image/jpeg;base64,...'
   * @param {Object} options
   */
  async uploadBase64(dataUri, options) { ... }

  /**
   * Delete a single image by publicId.
   * @param {string} publicId
   * @returns {Promise<{result: 'ok'|'not_found'}>}
   */
  async destroy(publicId) { ... }

  /**
   * Delete all images under a folder (best-effort, paginated).
   * @param {string} folder
   */
  async destroyFolder(folder) { ... }
}
```

Internal retries: 2 attempts on transient errors (5xx, ETIMEDOUT) with 500ms backoff. Permanent errors (4xx except 408/429) propagate as `CloudinaryError`.

---

## Database changes

### `submission.model.js` — `imageSchema` rewrite

```js
const imageSchema = new mongoose.Schema({
  original: {
    publicId: { type: String, index: true },
    url: String,
    width: Number,
    height: Number,
    bytes: Number,
    format: { type: String, enum: ['jpg','jpeg','png','webp','heic'] },
    dpi: Number,
    uploadedAt: { type: Date, default: Date.now },
  },
  preprocessed: { /* same shape */ },
  annotated: {
    /* same shape + */
    markers: [{
      type: { type: String, enum: ['correct','incorrect','double_fill','empty'] },
      x: Number, y: Number, radius: Number, color: String,
    }],
  },
});
```

### `omrSummarySchema` additions

```js
imageProcessingDurationMs: Number,
uploadDurationMs: Number,
```

### New indexes

```js
submissionSchema.index({ 'images.original.publicId': 1 });
submissionSchema.index({ 'images.preprocessed.publicId': 1 });
submissionSchema.index({ 'images.annotated.publicId': 1 });
```

### New `UploadAuditLog` model

```js
{
  userId: ObjectId (ref User, indexed),
  action: 'signature_request' | 'upload_success' | 'upload_failed'
        | 'attach_image' | 'delete_image' | 'auto_cleanup',
  submissionId: ObjectId (indexed),
  imageType: 'original' | 'preprocessed' | 'annotated',
  publicId: String,
  cloudinaryUrl: String,
  bytes: Number,
  ipAddress: String,
  userAgent: String,
  error: String,
  durationMs: Number,
  timestamps: true,
}
```

Compound index: `{ submissionId: 1, action: 1 }`. Time index: `{ createdAt: -1 }`.

### `submission.service.delete()` rewrite

```js
async delete(id) {
  const submission = await Submission.findById(id);
  if (!submission) return null;

  for (const type of ['original','preprocessed','annotated']) {
    const img = submission.images?.[type];
    if (img?.publicId) {
      try {
        await cloudinaryService.destroy(img.publicId);
        await UploadAuditLog.create({ /* ...action: 'delete_image' */ });
      } catch (err) {
        logger.warn(`Failed to delete ${type} ${img.publicId}: ${err.message}`);
        // continue: don't fail the delete
      }
    }
  }
  await Submission.findByIdAndDelete(id);
  return submission;
}
```

---

## Client (Web) — interface

```ts
// client/web/src/services/cloudinary.service.ts
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
  getUploadSignature(params: { examId: string; submissionId?: string;
                               type: 'original'|'preprocessed'|'annotated' }): Promise<UploadSignature>;
  uploadImage(file: File, sig: UploadSignature,
              onProgress?: (pct: number) => void): Promise<UploadResult>;
  attachImageToSubmission(submissionId: string,
                          type: 'original'|'preprocessed'|'annotated',
                          result: UploadResult): Promise<Submission>;
  uploadAndAttach(file: File,
                  params: { examId: string; submissionId?: string;
                            type: 'original'|'preprocessed'|'annotated' },
                  onProgress?: (pct: number) => void): Promise<UploadResult>;
}
```

```ts
// client/web/src/hooks/useCloudinaryUpload.ts
export function useCloudinaryUpload() {
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const upload = useCallback(async (file, params) => { ... }, []);
  return { upload, progress, error, isUploading };
}
```

`SubmissionDetailPage.tsx` layout (3-image gallery + answer table).

---

## Client (Mobile) — interface

```dart
// client/mobile/lib/services/cloudinary_service.dart
class CloudinaryService {
  final ApiClient _api;
  final Dio _dio;
  CloudinaryService(this._api, this._dio);

  Future<UploadSignature> getUploadSignature({
    required String examId,
    String? submissionId,
    required ImageType type,           // enum
  });

  Future<UploadResult> uploadImage({
    required File file,
    required UploadSignature signature,
    void Function(double progress)? onProgress,
  });

  Future<void> attachImageToSubmission({
    required String submissionId,
    required ImageType type,
    required UploadResult result,
  });

  Future<UploadResult> captureAndUpload({
    required String examId,
    required ImageSource source,
    String? submissionId,
    void Function(double progress)? onProgress,
  });
}
```

`scan_result_screen.dart` flow:
1. Validate `_capturedImage != null`.
2. Set `_isSubmitting = true`, `_uploadProgress = 0`.
3. `cloudinaryService.captureAndUpload(...)` updates progress via callback.
4. `submissionRepository.scan(examId, originalUrl, originalPublicId, imageMeta, deviceInfo)`.
5. Navigate to `/submission-detail` on success.
6. Show error snackbar on failure (preserves current image for retry).

Additional `pubspec.yaml` deps: `http: ^1.2.0`, `dio: ^5.4.0` (progress).

---

## Testing Strategy

### Backend (Jest + Supertest)

| File | Tests | Coverage |
|------|-------|----------|
| `tests/unit/services/cloudinary.service.test.js` | 12 | generateUploadSignature, uploadBuffer (retry), uploadBase64 (strip data URI), destroy, extractPublicIdFromUrl |
| `tests/unit/utils/cloudinary.util.test.js` | 5 | extract publicId from standard/versioned URL, null for non-Cloudinary |
| `tests/integration/routes/v1/upload.route.test.js` | 8 | auth, validation, audit log, attach, delete, RBAC |

### Mobile (Flutter)

| File | Tests |
|------|-------|
| `test/services/cloudinary_service_test.dart` | 6: get signature, upload (progress), attach, error handling, retry, cancel |
| `test/widgets/scan_result_screen_test.dart` | 4: progress bar, success nav, error snackbar, disabled submit |

### Web (React/Jest + RTL)

| File | Tests |
|------|-------|
| `src/__tests__/services/cloudinary.service.test.ts` | 5: chain, size/MIME validation, progress, cleanup on failure |
| `src/__tests__/hooks/useCloudinaryUpload.test.ts` | 3: state, retry, abort |
| `src/__tests__/components/ImageGallery.test.tsx` | 3: render 3, fallback, lightbox |

### E2E (Playwright)

`upload-flow.spec.ts`: teacher scans a sample image, sees progress, lands on detail page with score.

---

## Rollout Plan

| Phase | Duration | Action | Flag |
|-------|----------|--------|------|
| 1. Dev | Week 1 | Local development with mocked Cloudinary | `UPLOAD_MODE=cloudinary` |
| 2. Staging | Week 2 | Real Cloudinary account, 3-5 teachers | `cloudinary` |
| 3. Canary 10% | Week 3 | 10% of real traffic | `cloudinary` |
| 4. Canary 50% | Week 4 | 50% traffic, watch P95 latency | `cloudinary` |
| 5. Full | Week 5 | 100% traffic, monitor error rate | `cloudinary` |
| 6. Cleanup | Week 6 | Remove base64 path from code, free disk | n/a |

Rollback: flip `UPLOAD_MODE=base64` and redeploy (≤ 5 min). Cloudinary assets stay; no data loss.

---

## Monitoring

| Metric | Threshold | Alert |
|--------|-----------|-------|
| `upload.failed.rate` | > 5% / 5min | Slack |
| `upload.duration.p95` | > 8s | Warn |
| `cloudinary.api.errors.4xx` | > 10/min | Slack |
| `cloudinary.api.errors.5xx` | > 3/min | Page on-call |
| `orphaned_images.count` | > 0 after 24h | Email |
| `upload_audit_log.gap` | any | Daily job |

Dashboards: Datadog board `smart-grading / uploads`.
Error tracking: Sentry tag `feature:cloudinary-upload`.

---

## Security Checklist

- [x] Cloudinary API secret only on backend
- [x] Signed requests with timestamp (5-min expiry)
- [x] Folder restricted to `submissions/{examId}/{submissionId}/...` — no client-controlled path
- [x] URL allowlist: only `https://res.cloudinary.com/{cloudName}/...`
- [x] Rate limit `/upload/signature` 10 req/min/user (express-rate-limit)
- [x] File size limit 10MB enforced client + server
- [x] MIME-type allowlist: jpg/jpeg/png/webp/heic
- [x] Audit log: every upload/delete with IP + User-Agent
- [x] HTTPS-only delivery URL
- [x] No client-side access to API secret

---

## Dependencies

**Backend `server/package.json` (add):**

```json
"cloudinary": "^2.0.3",
"axios": "^1.6.7"
```

**Mobile `client/mobile/pubspec.yaml` (add):**

```yaml
http: ^1.2.0
dio: ^5.4.0
image_picker: ^1.0.7   # if not already
path_provider: ^2.1.2
```

**Web `client/web/package.json`:** no new deps (use `fetch` + `XMLHttpRequest` for progress).

---

## Open Questions

- [x] Image source: Camera/Gallery (existing pattern) — keep.
- [x] Folder structure: `submissions/{examId}/{submissionId}/...` — keep.
- [x] Delete cascade on submission delete — yes, fan-out best-effort.
- [x] Migration of existing local-disk images — **deferred**; current data has no `images.url` populated in dev, so no backfill needed for MVP.
- [ ] Eager transformations (e.g. auto-orient, q_auto) — apply by default in `generateUploadSignature`; revisit if bandwidth costs spike.
- [ ] Webhook for Cloudinary async operations (e.g. eager transformations) — **not needed** for MVP (we don't use eager async).

---

## Files Summary

| Type | Count | Examples |
|------|-------|----------|
| New backend | 5 | `cloudinary.service.js`, `cloudinary.util.js`, `upload.controller.js`, `upload.route.js`, `uploadAuditLog.model.js` |
| Modified backend | 4 | `submission.model.js`, `submission.service.js`, `submission.controller.js`, `submission.validation.js`, `pythonBridge.service.js`, `config.js` |
| New web | 4 | `cloudinary.service.ts`, `useCloudinaryUpload.ts`, `ImageGallery.tsx`, `SubmissionDetailPage.tsx` |
| Modified web | 0–2 | (depends on whether `/scan` callers are also touched) |
| New mobile | 3 | `cloudinary_service.dart`, `submission_repository.dart`, models |
| Modified mobile | 1 | `scan_result_screen.dart` |
| New tests | ~6 files, ~45 cases | unit + integration + widget + E2E |
| **Total estimated effort** | **5–6 weeks, 1 dev FTE** | |

---

## Approval Checklist

- [ ] User has reviewed each section (Overview → Files Summary)
- [ ] Folder structure agreed (`submissions/{examId}/{submissionId}/...`)
- [ ] Feature flag default value agreed (`cloudinary` for prod, `base64` for dev without Cloudinary account)
- [ ] Rollback strategy acceptable (5-min redeploy)
- [ ] No outstanding Open Questions blocking implementation
