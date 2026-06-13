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

export interface SignatureParams {
  examId: string;
  submissionId?: string;
  type: ImageType;
}

export interface UploadAndAttachParams extends SignatureParams {
  // same as SignatureParams
}

export class CloudinaryService {
  constructor(private baseUrl: string) {}

  async getUploadSignature(params: SignatureParams): Promise<UploadSignature> {
    const qs = new URLSearchParams({ examId: params.examId, type: params.type });
    if (params.submissionId) qs.set('submissionId', params.submissionId);
    const token = localStorage.getItem('accessToken') || '';
    const res = await fetch(
      `${this.baseUrl}/api/v1/upload/signature?${qs.toString()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) {
      throw new Error(`Failed to get upload signature: ${res.status}`);
    }
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
          if (e.lengthComputable) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        });
      }
      xhr.addEventListener('load', () => {
        try {
          const body = JSON.parse(xhr.responseText);
          if (xhr.status >= 400) {
            return reject(
              new Error(body?.error?.message || 'Upload failed')
            );
          }
          resolve({
            publicId: body.public_id,
            url: body.url,
            secureUrl: body.secure_url,
            width: body.width,
            height: body.height,
            bytes: body.bytes,
            format: body.format,
          });
        } catch {
          reject(new Error('Invalid Cloudinary response'));
        }
      });
      xhr.addEventListener('error', () =>
        reject(new Error('Network error during upload'))
      );
      xhr.open('POST', signature.uploadUrl);
      xhr.send(fd);
    });
  }

  async attachImageToSubmission(
    submissionId: string,
    type: ImageType,
    result: UploadResult
  ): Promise<unknown> {
    const token = localStorage.getItem('accessToken') || '';
    const res = await fetch(
      `${this.baseUrl}/api/v1/submissions/${submissionId}/attach-image`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type,
          url: result.secureUrl,
          publicId: result.publicId,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
          format: result.format,
        }),
      }
    );
    if (!res.ok) {
      throw new Error(`Failed to attach: ${res.status}`);
    }
    return res.json();
  }

  async uploadAndAttach(
    file: File,
    params: SignatureParams,
    onProgress?: (pct: number) => void
  ): Promise<UploadResult> {
    const sig = await this.getUploadSignature(params);
    const result = await this.uploadImage(file, sig, onProgress);
    if (params.submissionId) {
      await this.attachImageToSubmission(
        params.submissionId,
        params.type,
        result
      );
    }
    return result;
  }
}

export const cloudinaryService = new CloudinaryService(
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/api\/v1\/?$/, '') ||
    'http://localhost:3000'
);
