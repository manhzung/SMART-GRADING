import { useCallback, useState } from 'react';
import {
  cloudinaryService,
  type ImageType,
  type UploadResult,
} from '../services/cloudinary.service';

export interface UseCloudinaryUploadReturn {
  upload: (
    file: File,
    params: { examId: string; submissionId?: string; type: ImageType }
  ) => Promise<UploadResult>;
  progress: number;
  error: string | null;
  isUploading: boolean;
}

export function useCloudinaryUpload(): UseCloudinaryUploadReturn {
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
        const result = await cloudinaryService.uploadAndAttach(
          file,
          params,
          setProgress
        );
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
