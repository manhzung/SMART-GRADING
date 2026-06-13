# SMART GRADING Web - Completeness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoan thien tat ca cac chuc nang con thieu/hien mock trong web React, dam bao ket noi thuc voi backend API va trai nghiem nguoi dung day du.

**Architecture:** Cac module thieu se duoc tich hop theo kien truc hien tai cua du an (React 19 + Vite + TypeScript + Zustand + TanStack Query). HTTP client dong nhat su dung `ApiService` (fetch-based) thay vi Axios. Cac mock data se duoc thay the bang API calls that su dung `apiService`. UI components giu nguyen CSS Modules.

**Tech Stack:** React 19, Vite, TypeScript, Zustand (state), TanStack Query v5, React Router v7, React Hook Form + Zod, Axios, Sonner toast

---

## Section 1: Xac dinh cac module con thieu

### Priority Matrix

| Module | Kha nang | Tien do hien tai | Priority |
|--------|---------|-----------------|---------|
| OMR Scanning (ScanPage) | HIGH | UI + mock logic | P0 - CRITICAL |
| AI Tutor Chat | MEDIUM | Mock data | P1 - HIGH |
| AI Chat Real API | MEDIUM | Khong co API | P1 - HIGH |
| EditExamPage hoan chinh | MEDIUM | Stub/thieu | P1 - HIGH |
| Analytics real data | HIGH | Co API nhung fallback | P2 - MEDIUM |
| ClassDetail real stats | MEDIUM | Hardcoded | P2 - MEDIUM |
| Social Login | LOW | Placeholder | P3 - LOW |
| WebSocket realtime | LOW | Pull-based | P3 - LOW |
| Unify HTTP client | MEDIUM | Axios + fetch mixed | P3 - LOW |
| Role-based UI hoan chinh | LOW | Partial | P3 - LOW |

Plan nay tien hanh 3 phan chinh:
- **Phase 1** (P0): OMR Scanning Integration
- **Phase 2** (P1): AI Tutor + AI Chat API + EditExam
- **Phase 3** (P2): Analytics data + ClassDetail stats + refinements

---

## Phase 1: OMR Scanning Integration

### Task 1.1: Tao OMR Processing API Service

**Files:**
- Create: `client/web/src/services/omr.service.ts`
- Modify: `client/web/src/pages/ScanPage.tsx`
- Test: `client/web/src/services/omr.service.test.ts`

- [ ] **Step 1: Viet test cho OMR service**

Tao file `client/web/src/services/omr.service.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { omrService } from './omr.service';

describe('omrService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('goi POST /omr/upload voi image data va tra ve result', async () => {
    const mockResponse = {
      success: true,
      data: {
        id: 'sheet-123',
        detectedAnswers: { q1: 'A', q2: 'B', q3: 'C' },
        confidence: 0.95,
        templateId: 'template-1',
      },
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const result = await omrService.uploadAndProcess(file, 'template-1');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/omr/upload'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(result).toEqual(mockResponse.data);
  });

  it('nem loi ApiException khi upload that bai', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ message: 'Invalid image format' }),
    } as Response);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    await expect(omrService.uploadAndProcess(file, 'template-1')).rejects.toThrow();
  });

  it('goi POST /omr/match-exam de match sheet voi exam', async () => {
    const mockResponse = {
      success: true,
      data: {
        examId: 'exam-123',
        title: 'Kiem tra HK1',
        matchScore: 0.9,
      },
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const result = await omrService.matchSheetToExam('sheet-123');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/omr/match-exam'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(result.examId).toBe('exam-123');
  });

  it('goi POST /omr/submit de submit sheet cho grading', async () => {
    const mockResponse = {
      success: true,
      data: { submissionId: 'sub-456', status: 'graded' },
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const answers = { q1: 'A', q2: 'B' };
    const result = await omrService.submitSheet('sheet-123', answers, 'exam-123');

    expect(result.submissionId).toBe('sub-456');
  });

  it('goi GET /omr/templates de lay danh sach template', async () => {
    const mockResponse = {
      success: true,
      data: [
        { id: 't1', name: 'Mau 40 cau', questionCount: 40 },
        { id: 't2', name: 'Mau 50 cau', questionCount: 50 },
      ],
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const result = await omrService.getTemplates();
    expect(result).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Chay test de verify FAIL**

Run: `cd client/web && npm test -- src/services/omr.service.test.ts --run`
Expected: FAIL - file khong ton tai

- [ ] **Step 3: Viet OMR service**

Tao file `client/web/src/services/omr.service.ts`:

```typescript
import { ApiException } from '../core/errors';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export interface OMRUploadResult {
  id: string;
  detectedAnswers: Record<string, string>;
  confidence: number;
  templateId: string;
  imageUrl?: string;
}

export interface OMRMatchResult {
  examId: string;
  title: string;
  matchScore: number;
}

export interface OMRSubmitResult {
  submissionId: string;
  status: string;
}

export interface OMRTemplate {
  id: string;
  name: string;
  questionCount: number;
  rowCount: number;
}

class OMRService {
  private baseUrl = `${API_BASE}/omr`;

  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new ApiException(errorData.message || 'OMR request failed', response.status);
    }

    const data = await response.json();
    return data.success ? data.data : data;
  }

  async uploadAndProcess(file: File, templateId: string): Promise<OMRUploadResult> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('templateId', templateId);

    return this.request<OMRUploadResult>(`${this.baseUrl}/upload`, {
      method: 'POST',
      body: formData,
    });
  }

  async matchSheetToExam(sheetId: string): Promise<OMRMatchResult> {
    return this.request<OMRMatchResult>(`${this.baseUrl}/match-exam`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheetId }),
    });
  }

  async submitSheet(
    sheetId: string,
    answers: Record<string, string>,
    examId: string
  ): Promise<OMRSubmitResult> {
    return this.request<OMRSubmitResult>(`${this.baseUrl}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheetId, answers, examId }),
    });
  }

  async getTemplates(): Promise<OMRTemplate[]> {
    return this.request<OMRTemplate[]>(`${this.baseUrl}/templates`);
  }

  async getProcessingStatus(sheetId: string): Promise<{ status: string; progress: number }> {
    return this.request<{ status: string; progress: number }>(`${this.baseUrl}/status/${sheetId}`);
  }
}

export const omrService = new OMRService();
```

- [ ] **Step 4: Chay test de verify PASS**

Run: `cd client/web && npm test -- src/services/omr.service.test.ts --run`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add client/web/src/services/omr.service.ts client/web/src/services/omr.service.test.ts
git commit -m "feat(web): add OMR processing API service"
```

---

### Task 1.2: Tich hop OMR service vao ScanPage, thay the mock logic

**Files:**
- Modify: `client/web/src/pages/ScanPage.tsx` (lines 273-350)
- Modify: `client/web/src/pages/ScanPage.module.css` (neu can them trang thai loading)

- [ ] **Step 1: Doc full ScanPage de hieu cau truc**

Doc day du file `client/web/src/pages/ScanPage.tsx` (800+ lines) de xac dinh vi tri mock logic can thay the.

- [ ] **Step 2: Thay the startScanning callback**

Tim ham `startScanning` (dai khoang dong 273), thay the logic mock:

```typescript
// THAY CAU LENH NAY (dong ~273-298):
//   const randomAnswers = SAMPLE_DETECTED_ANSWERS[Math.floor(Math.random() * SAMPLE_DETECTED_ANSWERS.length)];

// BANG:
const selectedTemplate = selectedOMRTemplate;
const file = uploadedFiles.find(f => f.id === sheetId);
if (!file) return;

setScannedSheets(prev => prev.map(s =>
  s.id === sheetId ? { ...s, status: 'scanning' as ScanStatus } : s
));

try {
  // 1. Upload va process OMR
  const uploadResult = await omrService.uploadAndProcess(file.file, selectedTemplate?.id || '');

  // 2. Match voi exam
  const matchResult = await omrService.matchSheetToExam(uploadResult.id);

  // 3. Cap nhat trang thai scanned
  setScannedSheets(prev => prev.map(s =>
    s.id === sheetId ? {
      ...s,
      status: 'scanned' as ScanStatus,
      detectedAnswers: uploadResult.detectedAnswers,
      confidence: uploadResult.confidence,
      matchedExam: matchResult.examId ? { id: matchResult.examId, title: matchResult.title } : undefined,
    } : s
  ));
} catch (error) {
  setScannedSheets(prev => prev.map(s =>
    s.id === sheetId ? { ...s, status: 'error' as ScanStatus } : s
  ));
  toast.error('Loi xu ly OMR: ' + (error instanceof Error ? error.message : 'Unknown error'));
}
```

- [ ] **Step 3: Thay the saveEditedAnswers de submit that**

Tim ham `saveEditedAnswers` (dai khoang dong ~600), thay the mock submit:

```typescript
// THAY:
//   const score = calculateScore(answers, correctAnswers);
// BANG:
const sheet = scannedSheets.find(s => s.id === sheetId);
if (!sheet?.matchedExam?.id) {
  toast.error('Vui long match voi bai thi truoc khi luu');
  return;
}

try {
  const result = await omrService.submitSheet(sheetId, answers, sheet.matchedExam.id);
  if (result.status === 'graded') {
    toast.success('Da cham diem thanh cong!');
  }
  // Cap nhat trang thai tu scanned -> matched
  setScannedSheets(prev => prev.map(s =>
    s.id === sheetId ? { ...s, status: 'matched' as ScanStatus } : s
  ));
} catch (error) {
  toast.error('Loi submit: ' + (error instanceof Error ? error.message : 'Unknown error'));
}
```

- [ ] **Step 4: Thay the batch upload mock trong useEffect**

Tim useEffect xu ly batch upload (dong ~320-350), thay the:

```typescript
// Xoa SAMPLE_DETECTED_ANSWERS imports neu khong con dung
// Sua useEffect goi startScanning thanh async, catch loi:
useEffect(() => {
  if (uploadedFiles.length === 0) return;
  
  const processFiles = async () => {
    for (let i = 0; i < uploadedFiles.length; i++) {
      const sheet = uploadedFiles[i];
      try {
        await startScanning(sheet.id);
      } catch (e) {
        console.error('Loi scan sheet:', sheet.id, e);
      }
    }
  };
  
  processFiles();
}, [uploadedFiles, startScanning]);
```

- [ ] **Step 5: Chay test de verify**

Run: `cd client/web && npm test -- --run`
Expected: Tat ca tests pass, khong co lint errors

- [ ] **Step 6: Commit**

```bash
git add client/web/src/pages/ScanPage.tsx
git commit -m "feat(web): integrate real OMR API into ScanPage, remove mock logic"
```

---

## Phase 2: AI Tutor Integration

### Task 2.1: Tao AI Chat API Service

**Files:**
- Create: `client/web/src/services/ai-chat.service.ts`
- Modify: `client/web/src/features/ai-tutor/AITutorChat.tsx`
- Test: `client/web/src/services/ai-chat.service.test.ts`

- [ ] **Step 1: Viet test cho AI Chat service**

Tao file `client/web/src/services/ai-chat.service.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiChatService } from './ai-chat.service';

describe('aiChatService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gui chat message va nhan phan hoi tu AI', async () => {
    const mockResponse = {
      success: true,
      data: {
        id: 'msg-1',
        content: 'Dap an cua ban cho cau nay la dung!',
        createdAt: new Date().toISOString(),
      },
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const result = await aiChatService.sendMessage({
      message: 'Cau 1 bai nay dap an gi?',
      context: { examId: 'exam-1', questionId: 'q1' },
    });

    expect(result.content).toBe('Dap an cua ban cho cau nay la dung!');
  });

  it('gui tin nhan voi history (multi-turn)', async () => {
    const mockResponse = {
      success: true,
      data: {
        id: 'msg-2',
        content: 'Ban nen xem lai phan bieu thuc.',
        createdAt: new Date().toISOString(),
      },
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const history = [
      { role: 'user', content: 'Cau 1' },
      { role: 'assistant', content: 'Dap an A' },
    ];

    const result = await aiChatService.sendMessage({
      message: 'Giai thich them',
      history,
      context: { examId: 'exam-1' },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/ai-chat'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(expect.objectContaining({
          message: 'Giai thich them',
          history: expect.arrayContaining([
            expect.objectContaining({ role: 'user' }),
          ]),
        })),
      })
    );
  });

  it('nem loi khi API tra ve loi', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ message: 'AI service unavailable' }),
    } as Response);

    await expect(aiChatService.sendMessage({ message: 'Hello' })).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Chay test verify FAIL**

Run: `cd client/web && npm test -- src/services/ai-chat.service.test.ts --run`
Expected: FAIL

- [ ] **Step 3: Viet AI Chat service**

Tao file `client/web/src/services/ai-chat.service.ts`:

```typescript
import { ApiException } from '../core/errors';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface SendMessageParams {
  message: string;
  history?: ChatMessage[];
  context?: {
    examId?: string;
    questionId?: string;
    subjectId?: string;
    studentId?: string;
  };
}

export interface AIChatResponse {
  id: string;
  content: string;
  createdAt: string;
}

class AIChatService {
  private baseUrl = `${API_BASE}/ai-chat`;

  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new ApiException(errorData.message || 'AI chat request failed', response.status);
    }

    const data = await response.json();
    return data.success ? data.data : data;
  }

  async sendMessage(params: SendMessageParams): Promise<AIChatResponse> {
    return this.request<AIChatResponse>(`${this.baseUrl}/send`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getConversationHistory(conversationId: string): Promise<ChatMessage[]> {
    return this.request<ChatMessage[]>(`${this.baseUrl}/history/${conversationId}`);
  }

  async createConversation(): Promise<{ id: string }> {
    return this.request<{ id: string }>(`${this.baseUrl}/conversations`, {
      method: 'POST',
    });
  }
}

export const aiChatService = new AIChatService();
```

- [ ] **Step 4: Chay test verify PASS**

Run: `cd client/web && npm test -- src/services/ai-chat.service.test.ts --run`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add client/web/src/services/ai-chat.service.ts client/web/src/services/ai-chat.service.test.ts
git commit -m "feat(web): add AI chat API service for tutor integration"
```

---

### Task 2.2: Tich hop AI Chat that vao AITutorChat component

**Files:**
- Modify: `client/web/src/features/ai-tutor/AITutorChat.tsx`

- [ ] **Step 1: Doc AITutorChat.tsx day du**

Doc file `client/web/src/features/ai-tutor/AITutorChat.tsx` (khoang 200+ lines) de xac dinh:
- Vi tri mock responses (dong ~63-117)
- Ham xu ly submit message
- State quan ly conversation

- [ ] **Step 2: Thay the mock responses**

Thay the mock logic (dong ~63-117) bang goi API that:

```typescript
// Them import
import { aiChatService } from '../../services/ai-chat.service';

// Sua ham xu ly submit (tim trong component)
const handleSubmit = async () => {
  if (!input.trim() || isLoading) return;

  const userMessage = input;
  setInput('');
  
  // Them tin nhan user vao history tam
  setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
  setIsLoading(true);
  setError(null);

  try {
    const response = await aiChatService.sendMessage({
      message: userMessage,
      history: messages.filter(m => m.role !== 'system'),
      context: selectedSubject ? { subjectId: selectedSubject.id } : undefined,
    });

    setMessages(prev => [...prev, {
      role: 'assistant',
      content: response.content,
      timestamp: response.createdAt,
    }]);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Loi ket noi AI');
    // Quay lai tin nhan user neu that bai
    setMessages(prev => prev.filter((_, i) => i < prev.length - 1));
  } finally {
    setIsLoading(false);
  }
};
```

- [ ] **Step 3: Xoa mock data neu khong can nua**

Xoa hoac comment out cac hang mock (dong ~24-62) neu khong con su dung lam fallback.

- [ ] **Step 4: Chay test verify**

Run: `cd client/web && npm test -- --run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/web/src/features/ai-tutor/AITutorChat.tsx
git commit -m "feat(web): integrate real AI chat API into AITutorChat"
```

---

### Task 2.3: Tich hop AI Reports API vao AITutorPage

**Files:**
- Modify: `client/web/src/features/ai-tutor/AITutorPage.tsx`
- Modify: `client/web/src/services/ai-chat.service.ts` (them method getReports)

- [ ] **Step 1: Doc AITutorPage.tsx day du**

Doc file `client/web/src/features/ai-tutor/AITutorPage.tsx` de xac dinh vi tri fallbackReports (dong ~18-63).

- [ ] **Step 2: Them method getReports vao ai-chat.service.ts**

Them vao cuoi file `ai-chat.service.ts`:

```typescript
async getReports(params?: {
  subjectId?: string;
  examId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<AIReport[]> {
  const query = new URLSearchParams();
  if (params?.subjectId) query.set('subjectId', params.subjectId);
  if (params?.examId) query.set('examId', params.examId);
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  if (params?.limit) query.set('limit', String(params.limit));

  const queryString = query.toString();
  const url = `${this.baseUrl}/reports${queryString ? `?${queryString}` : ''}`;
  return this.request<AIReport[]>(url);
}
```

- [ ] **Step 3: Thay the mock reports bằng API call**

Trong `AITutorPage.tsx`, thay `fallbackReports` bang useQuery:

```typescript
// THEM import
import { aiChatService } from '../../services/ai-chat.service';
import { useQuery } from '@tanstack/react-query';

// THAY (dong ~63):
//   const reports = useMemo(() => fallbackReports, []);
// BANG:
const { data: reports = [], isLoading } = useQuery({
  queryKey: ['ai-reports'],
  queryFn: () => aiChatService.getReports({ limit: 10 }),
});
```

- [ ] **Step 4: Cap nhat JSX de xu ly loading state**

Them conditional rendering cho `isLoading`:

```tsx
{isLoading ? (
  <div className={styles.loadingContainer}>
    <div className={styles.loadingSpinner} />
    <p>Đang tai bao cao AI...</p>
  </div>
) : reports.length === 0 ? (
  <div className={styles.emptyState}>
    <p>Chua co bao cao AI nao.</p>
  </div>
) : (
  reports.map((report) => (
    // ... render logic hien tai
  ))
)}
```

- [ ] **Step 5: Chay test verify**

Run: `cd client/web && npm test -- --run`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add client/web/src/features/ai-tutor/AITutorPage.tsx client/web/src/services/ai-chat.service.ts
git commit -m "feat(web): integrate AI reports API into AITutorPage"
```

---

### Task 2.4: Hoan chinh EditExamPage

**Files:**
- Modify: `client/web/src/pages/EditExamPage.tsx`
- Modify: `client/web/src/pages/EditExamPage.module.css`

- [ ] **Step 1: Doc EditExamPage.tsx day du**

Doc file `client/web/src/pages/EditExamPage.tsx` de xac dinh:
- Cac field hardcoded (duration, totalScore)
- Logic load questions tu versions
- Preview button voi alert()

- [ ] **Step 2: Sua cac field hardcoded**

Tim va thay the cac gia tri hardcoded trong form:

```typescript
// THAY gia tri default:
//   defaultValues={{ duration: 60, totalScore: 10, ... }}
// BANG gia tri tu API:
const { data: exam } = useQuery({
  queryKey: ['exam', examId],
  queryFn: () => examStore.getExamById(examId!),
});

// Trong form initialization:
useEffect(() => {
  if (exam) {
    reset({
      title: exam.title,
      duration: exam.duration,
      totalScore: exam.totalScore,
      passingScore: exam.passingScore,
      // ... cac field khac
    });
  }
}, [exam, reset]);
```

- [ ] **Step 3: Sua preview button**

Thay `alert()` bang modal preview that:

```typescript
// THEM import
import ExamPreviewModal from '../components/ExamPreviewModal';

// THEM state
const [showPreview, setShowPreview] = useState(false);

// THAY alert() trong nut preview:
<button onClick={() => setShowPreview(true)}>
  Xem truoc
</button>

// THEM modal
{showPreview && (
  <ExamPreviewModal
    exam={exam}
    onClose={() => setShowPreview(false)}
  />
)}
```

Neu ExamPreviewModal chua ton tai, tao component moi.

- [ ] **Step 4: Chay test verify**

Run: `cd client/web && npm test -- --run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/web/src/pages/EditExamPage.tsx
git commit -m "fix(web): complete EditExamPage with real data and preview modal"
```

---

## Phase 3: Analytics & ClassDetail Real Data

### Task 3.1: Loai bo fallback hardcoded trong Analytics

**Files:**
- Modify: `client/web/src/pages/AnalyticsPage.tsx`
- Modify: `client/web/src/presentation/store/analyticsStore.ts`

- [ ] **Step 1: Doc AnalyticsPage va analyticsStore**

Doc ca hai file de hieu cau truc data.

- [ ] **Step 2: Loai bo fallback data trong analyticsStore**

Tim cac gia tri fallback trong `analyticsStore.ts`:

```typescript
// THAY (cac dong co gia tri 0 hoac gia tri co dinh):
const fetchDashboardStats = async () => {
  try {
    const response = await apiService.get('/analytics/dashboard-stats');
    setStats(response.data);
    // XOA fallback trong catch - nem loi len neu API fail
  } catch (error) {
    throw error; // Khong dung fallback nua
  }
};
```

- [ ] **Step 3: Loai bo fallback trong AnalyticsPage chart data**

```typescript
// THAY cac mang hardcoded:
//   const data = [{ month: 'T1', diem: 75 }, { month: 'T2', diem: 80 }, ...];
// BANG lay tu store:
//   const data = useMemo(() => {
//     if (!analyticsData?.monthlyScores) return [];
//     return analyticsData.monthlyScores.map(item => ({
//       month: item.month,
//       diem: item.averageScore,
//     }));
//   }, [analyticsData]);
```

- [ ] **Step 4: Them loading/error states**

Them skeleton loaders cho cac chart:

```tsx
{isLoading ? (
  <div className={styles.chartSkeleton}>
    <Skeleton width="100%" height={300} />
  </div>
) : error ? (
  <div className={styles.chartError}>
    <p>Khong the tai du lieu analytics</p>
    <button onClick={() => refetch()}>Thu lai</button>
  </div>
) : (
  // Render charts
)}
```

- [ ] **Step 5: Chay test verify**

Run: `cd client/web && npm test -- --run`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add client/web/src/pages/AnalyticsPage.tsx client/web/src/presentation/store/analyticsStore.ts
git commit -m "fix(web): remove hardcoded fallbacks in analytics, use real API data"
```

---

### Task 3.2: Loai bo hardcoded stats trong ClassDetailPage

**Files:**
- Modify: `client/web/src/pages/ClassDetailPage.tsx`
- Test: `client/web/src/pages/ClassDetailPage.test.tsx`

- [ ] **Step 1: Doc ClassDetailPage.tsx day du**

Doc file de tim cac gia tri hardcoded nhu `94.2%`, `88.5%`, `12/15`.

- [ ] **Step 2: Tim cac gia tri hardcoded va thay the**

Tim trong JSX:

```tsx
{/* THAY: */}
<div className={styles.statValue}>94.2%</div>
{/* BANG: */}
<div className={styles.statValue}>
  {classStats?.attendanceRate ? `${classStats.attendanceRate}%` : '--'}
</div>
```

Tuong tu voi cac gia tri khac: `88.5%`, `12/15`, v.v.

- [ ] **Step 3: Them API call de lay class statistics**

```typescript
// Trong component:
const { data: classStats, isLoading } = useQuery({
  queryKey: ['class-stats', classId],
  queryFn: () => classStore.getClassStatistics(classId!),
});
```

- [ ] **Step 4: Them vao classStore method moi**

Them vao `client/web/src/presentation/store/classStore.ts`:

```typescript
async getClassStatistics(classId: string): Promise<ClassStatistics> {
  const response = await apiService.get(`/classes/${classId}/statistics`);
  return response.data;
}
```

- [ ] **Step 5: Chay test verify**

Run: `cd client/web && npm test -- --run`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add client/web/src/pages/ClassDetailPage.tsx client/web/src/presentation/store/classStore.ts
git commit -m "fix(web): replace hardcoded class stats with real API data"
```

---

### Task 3.3: Hoan thien QuestionBank real data

**Files:**
- Modify: `client/web/src/pages/QuestionBankPage.tsx`

- [ ] **Step 1: Tim gia tri hardcoded bankIntegrity**

```typescript
// TIM (dac o dong ~63):
const bankIntegrity = 94.2;

// THAY BANG useQuery:
const { data: stats } = useQuery({
  queryKey: ['question-bank-stats'],
  queryFn: () => questionStore.getBankStats(),
});

const bankIntegrity = stats?.integrity ?? 0;
```

- [ ] **Step 2: Them method vao questionStore**

```typescript
async getBankStats(): Promise<{ integrity: number; total: number; approved: number }> {
  const response = await apiService.get('/questions/stats');
  return response.data;
}
```

- [ ] **Step 3: Commit**

```bash
git add client/web/src/pages/QuestionBankPage.tsx client/web/src/presentation/store/questionStore.ts
git commit -m "fix(web): load question bank integrity from API"
```

---

## Phase 4: Cleanup & Polish

### Task 4.1: Don dep HTTP clients

**Files:**
- Modify: `client/web/src/services/analytics.service.ts`
- Modify: `client/web/src/presentation/store/analyticsStore.ts`

- [ ] **Step 1: Kiem tra tat ca file su dung Axios**

```bash
cd client/web && grep -r "axios" src/ --include="*.ts" --include="*.tsx" -l
```

- [ ] **Step 2: Thay Axios bang fetch trong tat ca services**

Duyet tung file, thay `axios.get()` bang `fetch()` voi `apiService` hoac `ApiService` class.

- [ ] **Step 3: Xoa Axios khoi dependencies**

```bash
npm uninstall axios
```

- [ ] **Step 4: Commit**

```bash
git add client/web/src/
git commit -m "refactor(web): unify HTTP client to use fetch-based ApiService, remove Axios"
```

---

### Task 4.2: Them environment config hoan chinh

**Files:**
- Modify: `client/web/.env.example` (da co, xac nhan day du)
- Create: `client/web/src/config/env.ts`

- [ ] **Step 1: Tao env config file**

Tao `client/web/src/config/env.ts`:

```typescript
export const env = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:3000',
  appName: import.meta.env.VITE_APP_NAME || 'Smart Grading',
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  enableDebug: import.meta.env.DEV,
};
```

- [ ] **Step 2: Cap nhat ApiService su dung env config**

```typescript
// Trong src/core/api/index.ts
import { env } from '../config/env';

const BASE_URL = env.apiUrl;
```

- [ ] **Step 3: Commit**

```bash
git add client/web/src/config/env.ts
git commit -m "feat(web): add centralized environment config"
```

---

## Summary: Task Breakdown

| # | Task | Files Touched | Type | Priority |
|---|------|--------------|------|---------|
| 1.1 | OMR API Service + tests | `services/omr.service.ts`, `*.test.ts` | NEW | P0 |
| 1.2 | Integrate OMR into ScanPage | `pages/ScanPage.tsx` | MODIFY | P0 |
| 2.1 | AI Chat API Service + tests | `services/ai-chat.service.ts`, `*.test.ts` | NEW | P1 |
| 2.2 | Integrate AI Chat into AITutorChat | `features/ai-tutor/AITutorChat.tsx` | MODIFY | P1 |
| 2.3 | Integrate AI Reports into AITutorPage | `features/ai-tutor/AITutorPage.tsx` | MODIFY | P1 |
| 2.4 | Complete EditExamPage | `pages/EditExamPage.tsx` | MODIFY | P1 |
| 3.1 | Remove analytics fallbacks | `pages/AnalyticsPage.tsx`, `analyticsStore.ts` | MODIFY | P2 |
| 3.2 | Remove ClassDetail hardcoded stats | `pages/ClassDetailPage.tsx`, `classStore.ts` | MODIFY | P2 |
| 3.3 | QuestionBank real data | `pages/QuestionBankPage.tsx`, `questionStore.ts` | MODIFY | P2 |
| 4.1 | Unify HTTP clients | Multiple service files | REFACTOR | P3 |
| 4.2 | Environment config | `config/env.ts` | REFACTOR | P3 |

**Total: 11 tasks, du tien hanh theo thu tu P0 -> P1 -> P2 -> P3.**
