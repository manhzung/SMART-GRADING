import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockUploadAndAttach = vi.fn();

vi.mock('../services/cloudinary.service', () => ({
  cloudinaryService: {
    uploadAndAttach: (...args: unknown[]) => mockUploadAndAttach(...args),
  },
}));

describe('useCloudinaryUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes initial state and an upload function', async () => {
    const { useCloudinaryUpload } = await import('./useCloudinaryUpload');
    const { result } = renderHook(() => useCloudinaryUpload());

    expect(result.current.isUploading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.progress).toBe(0);
    expect(typeof result.current.upload).toBe('function');
  });

  it('updates progress and isUploading during upload, resets on success', async () => {
    const { useCloudinaryUpload } = await import('./useCloudinaryUpload');
    const { result } = renderHook(() => useCloudinaryUpload());

    let resolveUpload: (v: { publicId: string }) => void = () => {};
    mockUploadAndAttach.mockImplementation(
      (
        _file: File,
        _params: unknown,
        onProgress?: (pct: number) => void
      ) =>
        new Promise<{ publicId: string }>((resolve) => {
          resolveUpload = resolve;
          if (onProgress) {
            onProgress(25);
            onProgress(50);
            onProgress(100);
          }
        })
    );

    let returned: { publicId: string } | null = null;
    act(() => {
      result.current
        .upload({} as File, { examId: 'e1', type: 'original' })
        .then((r) => (returned = r));
    });

    expect(result.current.isUploading).toBe(true);
    expect(result.current.progress).toBe(100);

    await act(async () => {
      resolveUpload({ publicId: 'p1' });
    });

    expect(returned?.publicId).toBe('p1');
    expect(result.current.isUploading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('captures error message on failure', async () => {
    const { useCloudinaryUpload } = await import('./useCloudinaryUpload');
    const { result } = renderHook(() => useCloudinaryUpload());

    mockUploadAndAttach.mockRejectedValueOnce(new Error('boom'));

    await act(async () => {
      try {
        await result.current.upload({} as File, {
          examId: 'e1',
          type: 'original',
        });
      } catch {
        // expected
      }
    });

    expect(result.current.error).toBe('boom');
    expect(result.current.isUploading).toBe(false);
  });
});
