import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Upload,
  Camera,
  FileImage,
  Check,
  AlertCircle,
  X,
  Loader2,
  Eye,
  RotateCcw,
  CheckCircle,
  Clock,
  Search,
  RefreshCw,
} from 'lucide-react';
import { useExamStore } from '../presentation/store/examStore';
import { useClassStore } from '../presentation/store/classStore';
import { omrService } from '../services/omr.service';
import { cloudinaryService } from '../services/cloudinary.service';
import styles from './ScanPage.module.css';

// ─── Types ──────────────────────────────────────────────────────────────────────

type ScanStatus = 'pending' | 'scanning' | 'scanned' | 'matched' | 'error';

interface ScannedSheet {
  id: string;
  fileName: string;
  file: File;
  fileUrl: string;
  thumbnailUrl: string;
  status: ScanStatus;
  submissionId?: string;
  detectedAnswers: Record<string, string>;
  matchedStudent?: {
    id: string;
    name: string;
    className: string;
  };
  matchedExam?: {
    id: string;
    title: string;
  };
  versionCode?: string;
  score?: number;
  scannedAt: string;
  processingProgress: number;
  confidence?: number;
}

interface ScanHistoryItem {
  id: string;
  studentName: string;
  examTitle: string;
  className: string;
  status: 'success' | 'failed' | 'pending';
  scannedAt: string;
  score?: number;
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function ScanPage() {
  const { exams, fetchExams } = useExamStore();
  const { classes, fetchClasses } = useClassStore();

  // File upload state
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<ScannedSheet[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Camera state
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Scan state
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [editingAnswers, setEditingAnswers] = useState<Record<string, string>>({});

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSheetForDetail, setSelectedSheetForDetail] = useState<ScannedSheet | null>(null);

  // Exam selection state
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedExamTitle, setSelectedExamTitle] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  // Get selected sheet
  const selectedSheet = uploadedFiles.find(f => f.id === selectedFileId);

  useEffect(() => {
    fetchExams();
    fetchClasses({ limit: 100 });

  }, [fetchExams, fetchClasses]);

  // Auto-select first exam when exams load
  useEffect(() => {
    if (exams.length > 0 && !selectedExamId) {
      setSelectedExamId(exams[0]._id);
      setSelectedExamTitle(exams[0].title);
    }
  }, [exams, selectedExamId]);

  const scanHistory: ScanHistoryItem[] = useMemo(
    () => uploadedFiles
      .filter((sheet) => sheet.status !== 'pending' && sheet.status !== 'scanning')
      .map((sheet): ScanHistoryItem => ({
        id: sheet.id,
        studentName: sheet.matchedStudent?.name || 'No student matched',
        examTitle: sheet.matchedExam?.title || 'No exam matched',
        className: sheet.matchedStudent?.className || 'Unassigned',
        status: sheet.status === 'error' ? 'failed' : sheet.status === 'matched' ? 'success' : 'pending',
        scannedAt: sheet.scannedAt,
        score: sheet.score,
      }))
      .sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()),
    [uploadedFiles]
  );


  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const processFiles = useCallback((files: FileList | null) => {
    if (!files) return;

    const newSheets: ScannedSheet[] = Array.from(files).map((file, index) => {
      const objectUrl = URL.createObjectURL(file);
      return {
        id: `sheet_${Date.now()}_${index}`,
        fileName: file.name,
        file,
        fileUrl: objectUrl,
        thumbnailUrl: objectUrl,
        status: 'pending',
        detectedAnswers: {},
        scannedAt: new Date().toISOString(),
        processingProgress: 0,
      };
    });

    setUploadedFiles(prev => [...prev, ...newSheets]);
    if (newSheets.length > 0 && !selectedFileId) {
      setSelectedFileId(newSheets[0].id);
    }
  }, [selectedFileId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    const validFiles = Array.from(files).filter(file =>
      file.type.match(/image\/(jpg|jpeg|png|pdf)/)
    );

    if (validFiles.length > 0) {
      processFiles(validFiles as unknown as FileList);
    }
  }, [processFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles]);

  const removeFile = useCallback((id: string) => {
    setUploadedFiles(prev => {
      const removed = prev.find(f => f.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.fileUrl);
      }
      const remaining = prev.filter(f => f.id !== id);
      if (selectedFileId === id && remaining.length > 0) {
        setSelectedFileId(remaining[0].id);
      } else if (remaining.length === 0) {
        setSelectedFileId(null);
      }
      return remaining;
    });
  }, [selectedFileId]);

  // ─── Camera Handling ─────────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setCameraStream(stream);
      setShowCamera(true);
    } catch (err) {
      setCameraError('Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.');
      console.error('Camera error:', err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
    setCapturedImage(null);
  }, [cameraStream]);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(imageUrl);
      }
    }
  }, []);

  const useCapturedImage = useCallback(() => {
    if (capturedImage) {
      // Convert data URL to File object
      const dataUrlToFile = (dataUrl: string, filename: string): File => {
        const arr = dataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
      };

      const file = dataUrlToFile(capturedImage, `scan_${new Date().toISOString().slice(0, 10)}.jpg`);
      const newSheet: ScannedSheet = {
        id: `sheet_${Date.now()}`,
        fileName: `scan_${new Date().toISOString().slice(0, 10)}.jpg`,
        file,
        fileUrl: capturedImage,
        thumbnailUrl: capturedImage,
        status: 'pending',
        detectedAnswers: {},
        scannedAt: new Date().toISOString(),
        processingProgress: 0,
      };
      setUploadedFiles(prev => [...prev, newSheet]);
      if (!selectedFileId) {
        setSelectedFileId(newSheet.id);
      }
      stopCamera();
    }
  }, [capturedImage, selectedFileId, stopCamera]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // ─── OMR Processing ─────────────────────────────────────────────────────────

  const processSheet = useCallback(async (sheetId: string) => {
    const sheet = uploadedFiles.find(s => s.id === sheetId);
    if (!sheet) return;

    if (!selectedExamId) {
      toast.error('Please select an exam before scanning.');
      setUploadedFiles(prev => prev.map(s =>
        s.id === sheetId ? { ...s, status: 'error' as ScanStatus, processingProgress: 0 } : s
      ));
      return;
    }

    setIsScanning(true);
    setScanProgress(0);

    // Update sheet status to scanning
    setUploadedFiles(prev => prev.map(s =>
      s.id === sheetId ? { ...s, status: 'scanning' as ScanStatus, processingProgress: 0 } : s
    ));

    // Progress simulation
    const progressInterval = setInterval(() => {
      setScanProgress(prev => {
        const next = Math.min(prev + 10, 85);
        setUploadedFiles(files => files.map(f =>
          f.id === sheetId ? { ...f, processingProgress: next } : f
        ));
        return next;
      });
    }, 300);

    try {
      // Step 1: Upload image to Cloudinary first
      let cloudinaryUrl = sheet.fileUrl;
      let cloudinaryPublicId = '';

      if (sheet.fileUrl.startsWith('blob:') || sheet.fileUrl.startsWith('data:')) {
        // Local blob/data URL — need to upload to Cloudinary
        try {
          const signature = await cloudinaryService.getUploadSignature({
            examId: selectedExamId,
            type: 'original',
          });
          const uploadResult = await cloudinaryService.uploadImage(sheet.file, signature);
          cloudinaryUrl = uploadResult.secureUrl;
          cloudinaryPublicId = uploadResult.publicId;
        } catch (uploadErr) {
          console.warn('Cloudinary upload failed, using local URL:', uploadErr);
        }
      }

      // Step 2: Call BE scan endpoint
      const uploadResult = await omrService.scanSheet({
        examId: selectedExamId,
        classId: selectedClassId || undefined,
        imageUrl: cloudinaryUrl,
        originalPublicId: cloudinaryPublicId || undefined,
      });

      clearInterval(progressInterval);
      setScanProgress(100);

      // Build detected answers from scan result
      const detectedAnswers: Record<string, string> = {};
      if (uploadResult.detectedAnswers) {
        Object.assign(detectedAnswers, uploadResult.detectedAnswers);
      }

      // Extract exam title
      const matchedExamObj = exams.find(e => e._id === selectedExamId);

      // Update sheet with results
      setUploadedFiles(prev => prev.map(s => {
        if (s.id !== sheetId) return s;
        return {
          ...s,
          status: 'scanned' as ScanStatus,
          submissionId: uploadResult.submissionId,
          detectedAnswers,
          processingProgress: 100,
          confidence: uploadResult.confidence,
          matchedExam: {
            id: selectedExamId,
            title: matchedExamObj?.title || selectedExamTitle,
          },
          score: uploadResult.totalScore,
          scannedAt: new Date().toISOString(),
        };
      }));

      setEditingAnswers(detectedAnswers);
    } catch (error) {
      clearInterval(progressInterval);
      setUploadedFiles(prev => prev.map(s =>
        s.id === sheetId ? { ...s, status: 'error' as ScanStatus, processingProgress: 0 } : s
      ));
      toast.error('OMR processing error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsScanning(false);
    }
  }, [uploadedFiles, selectedExamId, selectedExamTitle, selectedClassId, exams]);

  const startScanning = useCallback((sheetId: string) => {
    processSheet(sheetId);
  }, [processSheet]);

  const processAllPending = useCallback(() => {
    if (!selectedExamId) {
      toast.error('Please select an exam before scanning.');
      return;
    }
    const pendingSheets = uploadedFiles.filter(s => s.status === 'pending');
    pendingSheets.forEach((sheet, index) => {
      setTimeout(() => processSheet(sheet.id), index * 500);
    });
  }, [uploadedFiles, selectedExamId, processSheet]);

  // Auto-process newly uploaded sheets
  useEffect(() => {
    if (uploadedFiles.length === 0) return;

    const pendingSheets = uploadedFiles.filter(s => s.status === 'pending');
    if (pendingSheets.length === 0) return;

    const processAll = async () => {
      for (let i = 0; i < pendingSheets.length; i++) {
        try {
          await processSheet(pendingSheets[i].id);
        } catch (e) {
          console.error('Lỗi scan:', pendingSheets[i].id, e);
        }
      }
    };

    processAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedFiles.length, processSheet]);

  // ─── Answer Editing ──────────────────────────────────────────────────────────

  const updateAnswer = useCallback((questionId: string, answer: string) => {
    setEditingAnswers(prev => ({ ...prev, [questionId]: answer }));
  }, []);

  const saveEditedAnswers = useCallback((sheetId: string) => {
    const sheet = uploadedFiles.find(s => s.id === sheetId);
    if (!sheet?.matchedExam?.id) {
      toast.error('Please match with an exam before saving');
      return;
    }
    if (!sheet.submissionId) {
      toast.error('No scan results yet. Please scan first.');
      return;
    }

    // Update with edited answers first
    setUploadedFiles(prev => prev.map(s =>
      s.id === sheetId ? {
        ...s,
        detectedAnswers: editingAnswers,
      } : s
    ));

    omrService.submitCorrectedAnswers({
      submissionId: sheet.submissionId,
      answers: editingAnswers,
    })
      .then((result) => {
        setUploadedFiles(prev => prev.map(s =>
          s.id === sheetId ? {
            ...s,
            status: 'matched' as ScanStatus,
            score: result.totalScore,
          } : s
        ));
        toast.success('Saved and graded successfully!');
      })
      .catch((error) => {
        toast.error('Submit error: ' + (error instanceof Error ? error.message : 'Unknown error'));
      });
  }, [uploadedFiles, editingAnswers]);

  const resetSheet = useCallback((sheetId: string) => {
    setUploadedFiles(prev => prev.map(sheet =>
      sheet.id === sheetId ? {
        ...sheet,
        status: 'pending' as ScanStatus,
        submissionId: undefined,
        detectedAnswers: {},
        processingProgress: 0,
      } : sheet
    ));
    setEditingAnswers({});
  }, []);

  // ─── Detail Modal ────────────────────────────────────────────────────────────

  const openDetailModal = useCallback((sheet: ScannedSheet) => {
    setSelectedSheetForDetail(sheet);
    setShowDetailModal(true);
    setEditingAnswers(sheet.detectedAnswers);
  }, []);

  const closeDetailModal = useCallback(() => {
    setShowDetailModal(false);
    setSelectedSheetForDetail(null);
  }, []);

  // ─── Filter History ──────────────────────────────────────────────────────────

  const filteredHistory = scanHistory.filter(item => {
    const matchesSearch = searchQuery === '' ||
      item.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.examTitle.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // ─── Format Date ─────────────────────────────────────────────────────────────

  const formatRelativeTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    return `${diffDays} ngày trước`;
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1>Scan OMR Answer Sheets</h1>
        <p>Quản lý và xử lý các phiếu trả lời trắc nghiệm</p>
      </div>

      {/* Main Content Grid */}
      <div className={styles.mainGrid}>
        {/* Left Column: Upload & Scan Area */}
        <div className={styles.leftColumn}>
          {/* Upload Zone */}
          <div
            className={`${styles.uploadZone} ${isDragOver ? styles.uploadZoneDragOver : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/jpg,application/pdf"
              multiple
              onChange={handleFileSelect}
              className={styles.fileInput}
              id="file-upload"
            />
            <label htmlFor="file-upload" className={styles.uploadLabel}>
              <div className={styles.uploadIcon}>
                <Upload size={32} />
              </div>
              <h3>Kéo thả file vào đây</h3>
              <p>hoặc nhấn để chọn file</p>
              <span className={styles.uploadHint}>Hỗ trợ: JPG, PNG, PDF</span>
            </label>

            {/* Exam selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
            <label htmlFor="scan-exam-select" style={{ fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>
              Bài thi để quét <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              id="scan-exam-select"
              value={selectedExamId}
              onChange={(e) => {
                const exam = exams.find(ex => ex._id === e.target.value);
                setSelectedExamId(e.target.value);
                setSelectedExamTitle(exam?.title || '');
              }}
              style={{
                padding: '8px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '0.875rem',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              <option value="">-- Chọn bài thi --</option>
              {exams.map(ex => (
                <option key={ex._id} value={ex._id}>{ex.title}</option>
              ))}
            </select>
          </div>

          {/* Class selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
            <label htmlFor="scan-class-select" style={{ fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>
              Lớp <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>(tùy chọn)</span>
            </label>
            <select
              id="scan-class-select"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '0.875rem',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              <option value="">-- Tất cả lớp --</option>
              {classes.map(cls => (
                <option key={cls._id} value={cls._id}>{cls.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.uploadActions}>
              <button
                className={styles.actionBtn}
                onClick={() => fileInputRef.current?.click()}
              >
                <FileImage size={18} />
                Upload files
              </button>
              <button
                className={`${styles.actionBtn} ${styles.cameraBtn}`}
                onClick={startCamera}
              >
                <Camera size={18} />
                Mở camera
              </button>
            </div>
          </div>

          {/* Uploaded Sheets Grid */}
          {uploadedFiles.length > 0 && (
            <div className={styles.sheetsSection}>
              <div className={styles.sectionHeader}>
                <h3>Phiếu đã tải lên ({uploadedFiles.length})</h3>
                <div className={styles.sectionActions}>
                  <button
                    className={styles.smallBtn}
                    onClick={processAllPending}
                    disabled={isScanning || uploadedFiles.every(s => s.status !== 'pending')}
                  >
                    <RefreshCw size={14} />
                    Scan all
                  </button>
                </div>
              </div>

              <div className={styles.sheetsGrid}>
                {uploadedFiles.map(sheet => (
                  <div
                    key={sheet.id}
                    className={`${styles.sheetCard} ${selectedFileId === sheet.id ? styles.sheetCardSelected : ''}`}
                    onClick={() => setSelectedFileId(sheet.id)}
                  >
                    <div className={styles.sheetThumbnail}>
                      <img src={sheet.thumbnailUrl} alt={sheet.fileName} />
                      {sheet.status === 'scanning' && (
                        <div className={styles.scanOverlay}>
                          <div className={styles.scanProgressRing}>
                            <Loader2 size={24} className={styles.spinner} />
                          </div>
                          <span>{sheet.processingProgress}%</span>
                        </div>
                      )}
                      {sheet.status === 'scanned' && (
                        <div className={styles.statusOverlay}>
                          <CheckCircle size={20} className={styles.successIcon} />
                        </div>
                      )}
                      <button
                        className={styles.removeBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(sheet.id);
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className={styles.sheetInfo}>
                      <span className={styles.sheetName}>{sheet.fileName}</span>
                      <span className={`${styles.sheetStatus} ${styles[`status_${sheet.status}`]}`}>
                        {sheet.status === 'pending' && 'Chờ quét'}
                        {sheet.status === 'scanning' && 'Scanning...'}
                        {sheet.status === 'scanned' && 'Đã quét'}
                        {sheet.status === 'matched' && 'Đã khớp'}
                        {sheet.status === 'error' && 'Lỗi'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Sheet Details */}
          {selectedSheet && (
            <div className={styles.detailSection}>
              <div className={styles.sectionHeader}>
                <h3>Chi tiết phiếu</h3>
                <div className={styles.sectionActions}>
                  <button
                    className={styles.smallBtn}
                    onClick={() => openDetailModal(selectedSheet)}
                    disabled={selectedSheet.status === 'pending'}
                  >
                    <Eye size={14} />
                    Xem chi tiết
                  </button>
                  {selectedSheet.status === 'pending' ? (
                    <button
                      className={`${styles.smallBtn} ${styles.primaryBtn}`}
                      onClick={() => {
                        if (!selectedExamId) {
                          toast.error('Please select an exam before scanning.');
                          return;
                        }
                        startScanning(selectedSheet.id);
                      }}
                      disabled={isScanning}
                    >
                      <Search size={14} />
                      Bắt đầu quét
                    </button>
                  ) : (
                    <button
                      className={styles.smallBtn}
                      onClick={() => resetSheet(selectedSheet.id)}
                    >
                      <RotateCcw size={14} />
                      Rescan
                    </button>
                  )}
                </div>
              </div>

              {/* Sheet Preview */}
              <div className={styles.sheetPreview}>
                <img src={selectedSheet.fileUrl} alt="Preview" />
              </div>

              {/* Scan Results */}
              {(selectedSheet.status === 'scanned' || selectedSheet.status === 'matched') && (
                <div className={styles.scanResults}>
                  <h4>Kết quả nhận diện</h4>

                  {selectedSheet.matchedStudent && (
                    <div className={styles.resultCard}>
                      <span className={styles.resultLabel}>Học sinh</span>
                      <span className={styles.resultValue}>{selectedSheet.matchedStudent.name}</span>
                      <span className={styles.resultSub}>{selectedSheet.matchedStudent.className}</span>
                    </div>
                  )}

                  {selectedSheet.matchedExam && (
                    <div className={styles.resultCard}>
                      <span className={styles.resultLabel}>Bài thi</span>
                      <span className={styles.resultValue}>{selectedSheet.matchedExam.title}</span>
                    </div>
                  )}

                  <div className={styles.answersPreview}>
                    <span className={styles.resultLabel}>Câu trả lời đã nhận diện</span>
                    <div className={styles.answersGrid}>
                      {Object.entries(selectedSheet.detectedAnswers).map(([q, a]) => (
                        <div key={q} className={styles.answerChip}>
                          <span className={styles.questionId}>{q.replace('q', 'Câu ')}</span>
                          <span className={styles.answerId}>{a}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedSheet.status === 'scanned' && (
                    <button
                      className={`${styles.actionBtn} ${styles.fullWidth}`}
                      onClick={() => saveEditedAnswers(selectedSheet.id)}
                    >
                      <Check size={18} />
                      Xác nhận & Lưu
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: History */}
        <div className={styles.rightColumn}>
          <div className={styles.historySection}>
            <h3>Lịch sử quét gần đây</h3>

            {/* Search & Filter */}
            <div className={styles.historyFilters}>
              <div className={styles.searchBox}>
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="all">Tất cả</option>
                <option value="success">Thành công</option>
                <option value="failed">Thất bại</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {/* History List */}
            <div className={styles.historyList}>
              {filteredHistory.length === 0 ? (
                <div className={styles.emptyHistory}>
                  <Clock size={32} />
                  <p>Không có lịch sử quét</p>
                </div>
              ) : (
                filteredHistory.map(item => (
                  <div key={item.id} className={styles.historyItem}>
                    <div className={styles.historyIcon}>
                      {item.status === 'success' && <CheckCircle size={18} className={styles.iconSuccess} />}
                      {item.status === 'failed' && <AlertCircle size={18} className={styles.iconError} />}
                      {item.status === 'pending' && <Clock size={18} className={styles.iconPending} />}
                    </div>
                    <div className={styles.historyContent}>
                      <span className={styles.historyStudent}>{item.studentName}</span>
                      <span className={styles.historyExam}>{item.examTitle}</span>
                      <div className={styles.historyMeta}>
                        <span>{item.className}</span>
                        <span>{formatRelativeTime(item.scannedAt)}</span>
                      </div>
                    </div>
                    {item.score !== undefined && (
                      <div className={styles.historyScore}>
                        <span className={styles.scoreValue}>{item.score}</span>
                        <span className={styles.scoreMax}>/10</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <div className={styles.modal}>
          <div className={styles.cameraModal}>
            <div className={styles.modalHeader}>
              <h3>Chụp ảnh phiếu trả lời</h3>
              <button className={styles.closeBtn} onClick={stopCamera}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.cameraPreview}>
              {cameraError ? (
                <div className={styles.cameraError}>
                  <AlertCircle size={48} />
                  <p>{cameraError}</p>
                  <button className={styles.actionBtn} onClick={startCamera}>
                    Thử lại
                  </button>
                </div>
              ) : capturedImage ? (
                <img src={capturedImage} alt="Captured" />
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={styles.cameraVideo}
                />
              )}
              <canvas ref={canvasRef} className={styles.hiddenCanvas} />
            </div>

            <div className={styles.cameraControls}>
              {capturedImage ? (
                <>
                  <button
                    className={`${styles.actionBtn} ${styles.cameraActionBtn}`}
                    onClick={() => setCapturedImage(null)}
                  >
                    <RotateCcw size={18} />
                    Chụp lại
                  </button>
                  <button
                    className={`${styles.actionBtn} ${styles.primaryBtn} ${styles.cameraActionBtn}`}
                    onClick={useCapturedImage}
                  >
                    <Check size={18} />
                    Sử dụng ảnh
                  </button>
                </>
              ) : (
                <button
                  className={`${styles.captureBtn}`}
                  onClick={capturePhoto}
                  disabled={!!cameraError}
                >
                  <Camera size={24} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedSheetForDetail && (
        <div className={styles.modal} onClick={closeDetailModal}>
          <div className={styles.detailModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Chi tiết phiếu quét</h3>
              <button className={styles.closeBtn} onClick={closeDetailModal}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalContent}>
              {/* Image Preview */}
              <div className={styles.modalImagePreview}>
                <img src={selectedSheetForDetail.fileUrl} alt="Sheet" />
              </div>

              {/* Info & Answers */}
              <div className={styles.modalDetails}>
                <div className={styles.modalInfo}>
                  {selectedSheetForDetail.matchedStudent && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Học sinh:</span>
                      <span className={styles.infoValue}>{selectedSheetForDetail.matchedStudent.name}</span>
                    </div>
                  )}
                  {selectedSheetForDetail.matchedExam && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Bài thi:</span>
                      <span className={styles.infoValue}>{selectedSheetForDetail.matchedExam.title}</span>
                    </div>
                  )}
                </div>

                {/* Answer Correction */}
                <div className={styles.answerCorrection}>
                  <h4>Sửa đổi câu trả lời</h4>
                  <div className={styles.answerList}>
                    {Object.entries(selectedSheetForDetail.detectedAnswers).map(([questionId]) => (
                      <div key={questionId} className={styles.answerRow}>
                        <span className={styles.questionLabel}>
                          {questionId.replace('q', 'Câu ')}
                        </span>
                        <div className={styles.answerOptions}>
                          {['A', 'B', 'C', 'D'].map(opt => (
                            <button
                              key={opt}
                              className={`${styles.answerOption} ${editingAnswers[questionId] === opt ? styles.answerSelected : ''}`}
                              onClick={() => updateAnswer(questionId, opt)}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.modalActions}>
                  <button className={styles.actionBtn} onClick={closeDetailModal}>
                    Đóng
                  </button>
                  <button
                    className={`${styles.actionBtn} ${styles.primaryBtn}`}
                    onClick={() => {
                      saveEditedAnswers(selectedSheetForDetail.id);
                      closeDetailModal();
                    }}
                  >
                    <Check size={18} />
                    Lưu thay đổi
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scanning Overlay */}
      {isScanning && selectedSheet?.status === 'scanning' && (
        <div className={styles.scanningOverlay}>
          <div className={styles.scanningContent}>
            <Loader2 size={48} className={styles.spinner} />
            <h3>Scanning sheets...</h3>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${scanProgress}%` }} />
            </div>
            <span>{scanProgress}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
