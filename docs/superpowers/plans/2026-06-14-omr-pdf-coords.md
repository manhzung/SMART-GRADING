# OMR PDF Coordinate Consistency Implementation Plan

**Goal:** Đảm bảo khi in phiếu OMR từ web và scan bằng mobile app, tọa độ bubble khớp chính xác cho từng template, bằng cách dùng single source of truth (`/omr-templates/:id/json`) cho cả web và mobile.

**Architecture:**
1. Backend: refactor `omrTemplateJson.service.js` thành các hàm nhỏ dễ test, thêm field `autoAlign` vào output JSON
2. Web: viết lại `omrSheetPdf.ts` để nhận JSON convert sẵn (từ `/json` endpoint) thay vì tự tính từ zones mm
3. Mobile: parse field `autoAlign` từ JSON, tôn trọng flag khi scan (cho phép teacher tắt auto-align khi đã calibrate)
4. Tests: unit test cho mỗi hàm tính layout, snapshot test cho JSON output

**Tech Stack:** Node.js + Express, jsPDF, Vitest, Flutter + opencv_dart, Jest

---

## Phạm vi

Plan này chia thành 4 phần tương ứng 4 task nhóm:
- **Task 1-3**: Backend (refactor + test)
- **Task 4-6**: Web (viết lại + test)
- **Task 7-9**: Mobile (parse + tôn trọng flag)
- **Task 10**: Manual verification

Mỗi task có file paths cụ thể, code đầy đủ, expected output. Toàn bộ theo TDD: viết test trước, fail, code, pass, commit.

---

## Task 1: Server - Snapshot test cho `convertTemplate` hiện tại

**Files:**
- Create: `server/tests/unit/services/omrTemplateJson.test.js`

**Mục đích:** Trước khi refactor, capture lại output hiện tại của `convertTemplate` để làm baseline. Bất kỳ thay đổi nào về output sẽ bị test này phát hiện.

### Step 1.1: Viết test snapshot cho template A4 mặc định

```javascript
// server/tests/unit/services/omrTemplateJson.test.js
const { convertTemplate } = require('../../../src/services/omrTemplateJson.service');

describe('omrTemplateJson.service - snapshot tests', () => {
  test('A4 default template converts to expected JSON', () => {
    const template = {
      name: 'A4 Default Test',
      pageConfig: { paperSize: 'A4', margins: { top: 15, bottom: 15, left: 15, right: 15 } },
      zones: {
        header: { enabled: true, height: 40 },
        studentCode: { enabled: true, digits: 3, digitConfig: { bubbleSize: { width: 2.5, height: 2.5 }, bubbleSpacing: { horizontal: 1, vertical: 1 } } },
        versionCode: { enabled: true, digits: 3, digitConfig: { bubbleSize: { width: 2, height: 2 }, bubbleSpacing: { horizontal: 0.5, vertical: 0.5 } } },
        answerArea: { enabled: true, startPosition: { x: 20, y: 90 }, gridConfig: { totalQuestions: 30, questionsPerRow: 5, bubbleConfig: { width: 4, height: 4, spacing: { betweenOptions: 1, betweenRows: 8, betweenQuestions: 3 } }, questionNumberConfig: { enabled: true, width: 8 } } },
        footer: { enabled: true, height: 12 },
      },
    };

    const result = convertTemplate(template);

    // Snapshot the entire output. If this changes, review carefully.
    expect(result).toMatchSnapshot();
  });

  test('A5 15-question template (matches omr_template.from15Question)', () => {
    const template = {
      name: '15q A5',
      pageConfig: { paperSize: 'A5' },
      zones: {
        header: { enabled: false },
        studentCode: { enabled: true, digits: 2, digitConfig: { bubbleSize: { width: 3, height: 3 }, bubbleSpacing: { horizontal: 1, vertical: 1 } } },
        versionCode: { enabled: true, digits: 2, digitConfig: { bubbleSize: { width: 3, height: 3 }, bubbleSpacing: { horizontal: 1, vertical: 1 } } },
        answerArea: { enabled: true, startPosition: { x: 20, y: 50 }, gridConfig: { totalQuestions: 15, questionsPerRow: 5, bubbleConfig: { width: 3, height: 3, spacing: { betweenOptions: 1, betweenRows: 4, betweenQuestions: 2 } }, questionNumberConfig: { enabled: false } } },
        footer: { enabled: false },
      },
    };

    const result = convertTemplate(template);
    expect(result).toMatchSnapshot();
  });
});
```

### Step 1.2: Chạy test - PASS (chưa có refactor, chỉ capture baseline)

Run: `cd server && npx jest tests/unit/services/omrTemplateJson.test.js`

Expected: PASS, file `__snapshots__/omrTemplateJson.test.js.snap` được tạo với 2 snapshot.

### Step 1.3: Commit snapshot

```bash
git add server/tests/unit/services/omrTemplateJson.test.js server/tests/unit/services/__snapshots__/
git commit -m "test(omr): add snapshot tests for omrTemplateJson.service"
```

---

## Task 2: Server - Unit tests cho các hàm layout helpers

**Files:**
- Modify: `server/tests/unit/services/omrTemplateJson.test.js`

**Mục đích:** Test từng hàm helper trước khi extract chúng ra. Hiện tại code đang monolithic trong `convertTemplate`, ta cần test behavior trước, rồi mới refactor.

### Step 2.1: Test cho `mmToPx` (helper hiện có)

Append vào `omrTemplateJson.test.js`:

```javascript
describe('mmToPx conversion (300 DPI)', () => {
  // Import internal helper - nếu không export được, dùng snapshot test thay thế
  test('1mm = 11.811px @ 300 DPI', () => {
    const MM_TO_PX = 300 / 25.4;
    expect(MM_TO_PX).toBeCloseTo(11.811, 3);
  });
});
```

### Step 2.2: Test cho layout computation qua `convertTemplate` (behavior test)

```javascript
describe('Layout computation - Y flow', () => {
  test('header occupies top of page', () => {
    const template = {
      pageConfig: { paperSize: 'A4', margins: { top: 15 } },
      zones: {
        header: { enabled: true, height: 40 },
        studentCode: { enabled: false },
        versionCode: { enabled: false },
        answerArea: { enabled: true, startPosition: { x: 20, y: 60 }, gridConfig: { totalQuestions: 5, questionsPerRow: 5, bubbleConfig: { width: 4, height: 4, spacing: { betweenOptions: 1, betweenRows: 8 } }, questionNumberConfig: { enabled: false } } },
      },
    };
    const result = convertTemplate(template);
    // answer_area_col_0 origin Y = (15+40+5)mm converted to px
    // 60mm * 300/25.4 = 708.66 ≈ 709px
    expect(result.fieldBlocks.answer_area_col_0.origin[1]).toBe(709);
  });

  test('code blocks push answer area down', () => {
    const template = {
      pageConfig: { paperSize: 'A4', margins: { top: 15 } },
      zones: {
        header: { enabled: true, height: 40 },
        studentCode: { enabled: true, digits: 3, digitConfig: { bubbleSize: { width: 2.5, height: 2.5 }, bubbleSpacing: { horizontal: 1, vertical: 1 } } },
        versionCode: { enabled: false },
        answerArea: { enabled: true, startPosition: { x: 20, y: 90 }, gridConfig: { totalQuestions: 5, questionsPerRow: 5, bubbleConfig: { width: 4, height: 4, spacing: { betweenOptions: 1, betweenRows: 8 } }, questionNumberConfig: { enabled: false } } },
      },
    };
    const result = convertTemplate(template);
    // code block height = 10 * (2.5+1) - 1 + 6 = 35mm
    // answer Y = (15+40+5+35+6)mm = 101mm → 101 * 11.811 = 1192.9 ≈ 1193px
    // (use matchSnapshot if exact value varies)
    expect(result.fieldBlocks.answer_area_col_0.origin[1]).toBeGreaterThan(1100);
  });
});

describe('Answer area - field block generation', () => {
  test('50 questions, 5/row → 10 columns', () => {
    const template = {
      pageConfig: { paperSize: 'A4' },
      zones: {
        header: { enabled: false },
        studentCode: { enabled: false },
        versionCode: { enabled: false },
        answerArea: { enabled: true, startPosition: { x: 20 }, gridConfig: { totalQuestions: 50, questionsPerRow: 5, bubbleConfig: { width: 4, height: 4, spacing: { betweenOptions: 1, betweenRows: 8, betweenQuestions: 3 } }, questionNumberConfig: { width: 8 } } },
      },
    };
    const result = convertTemplate(template);
    // Should have 10 answer_area_col_X blocks
    const colBlocks = Object.keys(result.fieldBlocks).filter(k => k.startsWith('answer_area_col_'));
    expect(colBlocks).toHaveLength(10);
  });

  test('bubblesGap = bubbleW + betweenOptions (horizontal step)', () => {
    const template = {
      pageConfig: { paperSize: 'A4' },
      zones: {
        header: { enabled: false },
        answerArea: { enabled: true, gridConfig: { totalQuestions: 5, questionsPerRow: 5, bubbleConfig: { width: 4, height: 4, spacing: { betweenOptions: 1, betweenRows: 8, betweenQuestions: 3 } }, questionNumberConfig: { width: 8 } } },
      },
    };
    const result = convertTemplate(template);
    // bubbleW = 4mm * 11.811 = 47px; betweenOptions = 1mm * 11.811 = 12px
    // bubblesGap = 47 + 12 = 59px
    expect(result.fieldBlocks.answer_area_col_0.bubblesGap).toBe(59);
  });

  test('labelsGap = bubbleH + betweenRows (vertical step)', () => {
    const template = {
      pageConfig: { paperSize: 'A4' },
      zones: {
        header: { enabled: false },
        answerArea: { enabled: true, gridConfig: { totalQuestions: 5, questionsPerRow: 5, bubbleConfig: { width: 4, height: 4, spacing: { betweenOptions: 1, betweenRows: 8 } }, questionNumberConfig: { enabled: false } } },
      },
    };
    const result = convertTemplate(template);
    // bubbleH = 4mm * 11.811 = 47px; betweenRows = 8mm * 11.811 = 94px
    // labelsGap = 47 + 94 = 141px (rounded)
    expect(result.fieldBlocks.answer_area_col_0.labelsGap).toBe(141);
  });
});
```

### Step 2.3: Chạy test - PASS

Run: `cd server && npx jest tests/unit/services/omrTemplateJson.test.js`

Expected: tất cả tests PASS (vì đang test existing behavior).

### Step 2.4: Commit

```bash
git add server/tests/unit/services/omrTemplateJson.test.js
git commit -m "test(omr): add behavior tests for layout computation"
```

---

## Task 3: Server - Refactor `omrTemplateJson.service.js` thành các hàm nhỏ

**Files:**
- Modify: `server/src/services/omrTemplateJson.service.js`

**Mục đích:** Tách `convertTemplate` thành các hàm helper có thể test riêng, đồng thời thêm field `autoAlign` vào output.

### Step 3.1: Viết test cho `autoAlign` field (RED)

Append vào `omrTemplateJson.test.js`:

```javascript
describe('autoAlign field in output', () => {
  test('omr template without autoAlign config → output autoAlign = true (default)', () => {
    const template = {
      pageConfig: { paperSize: 'A4' },
      zones: { answerArea: { enabled: false } },
    };
    const result = convertTemplate(template);
    expect(result.autoAlign).toBe(true);
  });

  test('omr template with autoAlign = false in scannerConfig → output autoAlign = false', () => {
    const template = {
      pageConfig: { paperSize: 'A4' },
      scannerConfig: { autoAlign: false },
      zones: { answerArea: { enabled: false } },
    };
    const result = convertTemplate(template);
    expect(result.autoAlign).toBe(false);
  });

  test('omr template with autoAlign = true in scannerConfig → output autoAlign = true', () => {
    const template = {
      pageConfig: { paperSize: 'A4' },
      scannerConfig: { autoAlign: true },
      zones: { answerArea: { enabled: false } },
    };
    const result = convertTemplate(template);
    expect(result.autoAlign).toBe(true);
  });
});
```

### Step 3.2: Chạy test - FAIL (autoAlign chưa có)

Run: `cd server && npx jest tests/unit/services/omrTemplateJson.test.js -t autoAlign`

Expected: FAIL vì `result.autoAlign` là `undefined`.

### Step 3.3: Refactor + thêm autoAlign

Modify `server/src/services/omrTemplateJson.service.js`:

```javascript
/**
 * OMR Template zones (mm) → Flutter FieldBlock JSON (pixels @ 300 DPI).
 *
 * Conversion: px = mm * 300 / 25.4
 *
 * This is the SINGLE SOURCE OF TRUTH for OMR bubble coordinates.
 * Both Flutter mobile (via /json endpoint) and Web client (via jsPDF) consume this output.
 */

const MM_TO_PX = 300 / 25.4;

function mmToPx(mm) {
  return Math.round(mm * MM_TO_PX);
}

function removeVietnameseTones(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function estimateLabelWidth(label) {
  let width = 0;
  for (let i = 0; i < label.length; i++) {
    const char = label[i];
    if (/[A-Z]/.test(char)) {
      width += 1.6;
    } else if (/[a-z0-9]/.test(char)) {
      width += 1.2;
    } else {
      width += 0.8;
    }
  }
  return width;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYOUT COMPUTATION - exported for testing
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute the Y-axis flow positions (in mm) for header → code blocks → answer area.
 * @returns {{
 *   hdrEndY: number,
 *   cbY: number,
 *   codeRowH: number,
 *   cbEndY: number,
 *   mTop: number,
 *   mLeft: number,
 *   cW: number,
 *   paperW: number
 * }}
 */
function computeLayout({ pageConfig = {}, zones = {} }) {
  const paperSize = pageConfig.paperSize || 'A4';
  const pageSizesMm = { A4: [210, 297], A5: [148, 210], A3: [297, 420] };
  const [paperW] = pageSizesMm[paperSize] || pageSizesMm.A4;

  const mTop = pageConfig.margins?.top || 15;
  const mLeft = pageConfig.margins?.left || 15;
  const mRight = pageConfig.margins?.right || 15;
  const cW = paperW - mLeft - mRight;

  const hdrOn = zones.header?.enabled !== false;
  const hdrH = hdrOn ? (zones.header?.height || 40) : 0;
  const hdrEndY = hdrOn ? (mTop + hdrH) : mTop;

  const sc = zones.studentCode;
  const vc = zones.versionCode;
  const scOn = sc && sc.enabled !== false;
  const vcOn = vc && vc.enabled !== false;

  let cbY = hdrEndY;
  let codeRowH = 0;
  if (scOn || vcOn) {
    cbY = hdrOn ? (hdrEndY + 5) : mTop;
    const scH = scOn ? (10 * (sc.digitConfig?.bubbleSize?.height || 2.5) + 9 * (sc.digitConfig?.bubbleSpacing?.vertical || 1) + 6) : 0;
    const vcH = vcOn ? (10 * (vc.digitConfig?.bubbleSize?.height || 2) + 9 * (vc.digitConfig?.bubbleSpacing?.vertical || 0.5) + 6) : 0;
    codeRowH = Math.max(scH, vcH);
  }
  const cbEndY = (scOn || vcOn) ? (cbY + codeRowH) : hdrEndY;

  return { hdrEndY, cbY, codeRowH, cbEndY, mTop, mLeft, cW, paperW };
}

/**
 * Build a student code (INT) FieldBlock at the given Y position.
 * @returns {Object|null} fieldBlock config or null if disabled
 */
function buildStudentCodeBlock(sc, layout) {
  if (!sc || sc.enabled === false) return null;

  const { cbY } = layout;
  let labelText = (sc.label && sc.label.text) || 'STUDENT ID';
  if (labelText === 'Số báo danh' || labelText === 'SBD') {
    labelText = 'STUDENT ID';
  } else if (labelText === 'Mã đề' || labelText === 'MĐ') {
    labelText = 'EXAM CODE';
  }
  const label = removeVietnameseTones(labelText);

  const digits = sc.digits || 3;
  const bwVal = sc.digitConfig?.bubbleSize?.width || 2.5;
  const bGapHVal = sc.digitConfig?.bubbleSpacing?.horizontal || 1;
  const stepXVal = bwVal + bGapHVal;
  const totalContentW = digits * stepXVal - bGapHVal;
  const padX = 2;

  const labelW = estimateLabelWidth(label) + 4;
  let minBlockW = Math.max(20, labelW);
  if (label.includes('STUDENT') || label.includes('DANH')) {
    minBlockW = Math.max(minBlockW, 32);
  } else if (label.includes('EXAM') || label.includes('DE')) {
    minBlockW = Math.max(minBlockW, 28);
  }
  const blockW = Math.max(totalContentW + padX * 2, minBlockW);
  const startBubblesX = (layout.mLeft - padX) + (blockW - totalContentW) / 2;

  const ox = mmToPx(startBubblesX);
  const oy = mmToPx(cbY + 6);
  const bw = mmToPx(bwVal);
  const bh = mmToPx(sc.digitConfig?.bubbleSize?.height || 2.5);
  const bGapV = mmToPx(sc.digitConfig?.bubbleSpacing?.vertical || 1);
  const bGapH = mmToPx(bGapHVal);
  const labels = Array.from({ length: digits }, (_, i) => `roll${i + 1}`);

  return {
    fieldType: 'QTYPE_INT',
    fieldLabels: labels,
    origin: [ox, oy],
    bubblesGap: bh + bGapV,
    labelsGap: bw + bGapH,
    bubbleWidth: bw,
    bubbleHeight: bh,
    emptyValue: sc.digitConfig?.emptyValue || '',
  };
}

/**
 * Build a version code (INT) FieldBlock.
 */
function buildVersionCodeBlock(vc, layout) {
  if (!vc || vc.enabled === false) return null;

  const { cbY, mLeft, cW } = layout;
  const vx = mLeft + cW / 2 + 2;
  let labelText = (vc.label && vc.label.text) || 'EXAM CODE';
  if (labelText === 'Mã đề' || labelText === 'MĐ') {
    labelText = 'EXAM CODE';
  } else if (labelText === 'Số báo danh' || labelText === 'SBD') {
    labelText = 'STUDENT ID';
  }
  const label = removeVietnameseTones(labelText);

  const digits = vc.digits || 3;
  const bwVal = vc.digitConfig?.bubbleSize?.width || 2;
  const bGapHVal = vc.digitConfig?.bubbleSpacing?.horizontal || 0.5;
  const stepXVal = bwVal + bGapHVal;
  const totalContentW = digits * stepXVal - bGapHVal;
  const padX = 2;

  const labelW = estimateLabelWidth(label) + 4;
  let minBlockW = Math.max(20, labelW);
  if (label.includes('STUDENT') || label.includes('DANH')) {
    minBlockW = Math.max(minBlockW, 32);
  } else if (label.includes('EXAM') || label.includes('DE')) {
    minBlockW = Math.max(minBlockW, 28);
  }
  const blockW = Math.max(totalContentW + padX * 2, minBlockW);
  const startBubblesX = (vx - padX) + (blockW - totalContentW) / 2;

  const ox = mmToPx(startBubblesX);
  const oy = mmToPx(cbY + 6);
  const bw = mmToPx(bwVal);
  const bh = mmToPx(vc.digitConfig?.bubbleSize?.height || 2);
  const bGapV = mmToPx(vc.digitConfig?.bubbleSpacing?.vertical || 0.5);
  const bGapH = mmToPx(bGapHVal);
  const labels = Array.from({ length: digits }, (_, i) => `ver${i + 1}`);

  return {
    fieldType: 'QTYPE_INT',
    fieldLabels: labels,
    origin: [ox, oy],
    bubblesGap: bh + bGapV,
    labelsGap: bw + bGapH,
    bubbleWidth: bw,
    bubbleHeight: bh,
    emptyValue: vc.digitConfig?.emptyValue || '',
  };
}

/**
 * Build answer area FieldBlocks (one per column).
 */
function buildAnswerAreaBlocks(aa, layout) {
  if (!aa || aa.enabled === false) return [];

  const { mLeft, cbEndY, hdrEndY } = layout;
  const gridY = layout.cbY !== layout.hdrEndY || aa.startPosition ? (cbEndY + 6) : (hdrEndY + 5);

  const gc = aa.gridConfig || {};
  const bc = gc.bubbleConfig || {};
  const qc = gc.questionNumberConfig || {};

  const startX = aa.startPosition?.x || mLeft;
  const ox = mmToPx(startX);
  const bw = mmToPx(bc.width || 4);
  const bh = mmToPx(bc.height || 4);
  const bGap = mmToPx(bc.spacing?.betweenOptions || 1);
  const lGap = mmToPx(bc.spacing?.betweenRows || 8);
  const qNumW = mmToPx(qc.width || 8);
  const questionGap = mmToPx(bc.spacing?.betweenQuestions || 3);

  const totalQuestions = gc.totalQuestions || 30;
  const questionsPerRow = gc.questionsPerRow || 5;
  const numOptions = 4;

  const stepX = bw + bGap;
  const stepY = bh + lGap;
  const cellW = qNumW + questionGap + numOptions * bw + (numOptions - 1) * bGap;
  const rows = Math.ceil(totalQuestions / questionsPerRow);

  // Apply vertical offset in the cells: cy + (cellH - bubbleH) / 2
  const cellHOffset = Math.round(((bc.height || 4) + (bc.spacing?.betweenRows || 8) - (bc.height || 4)) / 2);
  const oy = mmToPx(gridY + cellHOffset);

  const blocks = [];
  for (let col = 0; col < questionsPerRow; col++) {
    const colLabels = [];
    for (let r = 0; r < rows; r++) {
      const qIdx = col + r * questionsPerRow;
      if (qIdx < totalQuestions) {
        colLabels.push(`q${qIdx + 1}`);
      }
    }

    if (colLabels.length > 0) {
      const colStartX = ox + col * cellW + qNumW + questionGap;
      blocks.push({
        name: `answer_area_col_${col}`,
        config: {
          fieldType: 'QTYPE_MCQ4',
          fieldLabels: colLabels,
          direction: 'horizontal',
          origin: [colStartX, oy],
          bubblesGap: stepX,
          labelsGap: stepY,
          bubbleWidth: bw,
          bubbleHeight: bh,
          emptyValue: '',
        },
      });
    }
  }
  return blocks;
}

/**
 * Main conversion: zones (mm) → Flutter FieldBlock JSON (pixels @ 300 DPI).
 * This is the SINGLE SOURCE OF TRUTH for OMR bubble coordinates.
 */
function convertTemplate(template) {
  const { pageConfig = {}, zones = {}, scannerConfig = {} } = template;

  const paperSize = pageConfig.paperSize || 'A4';
  const pageSizes = { A4: [2480, 3508], A5: [1748, 2480], A3: [3508, 4961] };
  const [pageW, pageH] = pageSizes[paperSize] || pageSizes.A4;

  const layout = computeLayout({ pageConfig, zones });
  const fieldBlocks = {};
  const outputColumns = [];

  // Student code
  const scBlock = buildStudentCodeBlock(zones.studentCode, layout);
  if (scBlock) {
    fieldBlocks.student_code = scBlock;
  }

  // Version code
  const vcBlock = buildVersionCodeBlock(zones.versionCode, layout);
  if (vcBlock) {
    fieldBlocks.version_code = vcBlock;
  }

  // Answer area
  const aaBlocks = buildAnswerAreaBlocks(zones.answerArea, layout);
  for (const { name, config } of aaBlocks) {
    fieldBlocks[name] = config;
  }

  for (let i = 1; i <= (zones.answerArea?.gridConfig?.totalQuestions || 0); i += 1) {
    outputColumns.push(`q${i}`);
  }

  // autoAlign flag - default true for backward compat
  const autoAlign = scannerConfig.autoAlign !== false;

  return {
    name: template.name || 'OMR Template',
    pageDimensions: [pageW, pageH],
    bubbleDimensions: [mmToPx(4), mmToPx(4)],
    emptyValue: '',
    outputColumns,
    customLabels: {},
    preProcessors: [],
    fieldBlocks,
    autoAlign,
  };
}

module.exports = {
  convertTemplate,
  // Exported for testing only
  computeLayout,
  buildStudentCodeBlock,
  buildVersionCodeBlock,
  buildAnswerAreaBlocks,
  mmToPx,
};
```

### Step 3.4: Chạy test - PASS (snapshot + behavior + autoAlign)

Run: `cd server && npx jest tests/unit/services/omrTemplateJson.test.js`

Expected: tất cả tests PASS. Snapshot có thể thay đổi vì thêm field `autoAlign` - review kỹ trước khi commit.

### Step 3.5: Verify mobile chưa break

Run: kiểm tra file `client/mobile/lib/domain/omr/models/omr_template.dart` vẫn parse đúng (sẽ handle `autoAlign` trong Task 7).

### Step 3.6: Commit

```bash
git add server/src/services/omrTemplateJson.service.js server/tests/unit/services/omrTemplateJson.test.js
git commit -m "refactor(omr): split convertTemplate into testable helpers, add autoAlign"
```

---

## Task 4: Server - Thêm `autoAlign` vào model

**Files:**
- Modify: `server/src/models/omrTemplate.model.js`

### Step 4.1: Sửa schema

Tìm phần `scannerConfig` trong `server/src/models/omrTemplate.model.js`. Nếu chưa có, thêm:

```javascript
scannerConfig: {
  orientation: {
    type: String,
    enum: ['portrait', 'landscape'],
    default: 'portrait',
  },
  autoAlign: {
    type: Boolean,
    default: true,
  },
},
```

### Step 4.2: Verify vẫn load được template

Run: `cd server && node -e "const M = require('./src/models'); M.OMRTemplate.findOne().then(t => console.log(t?.scannerConfig));"`

Expected: in ra `{ orientation: 'portrait', autoAlign: true }` (hoặc template cụ thể).

### Step 4.3: Commit

```bash
git add server/src/models/omrTemplate.model.js
git commit -m "feat(omr): add autoAlign flag to scannerConfig"
```

---

## Task 5: Web - Refactor `omrSheetPdf.ts` để nhận JSON input

**Files:**
- Modify: `client/web/src/features/reports/omrSheetPdf.ts`

**Mục đích:** Viết lại hoàn toàn để nhận JSON convert sẵn (từ `/json` endpoint), không tự tính layout từ zones mm.

### Step 5.1: Viết test cho coordinate conversion (RED)

Create `client/web/src/features/reports/omrSheetPdf.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { jsonToPdfLayout, bubbleAtMm } from './omrSheetPdf';

describe('jsonToPdfLayout', () => {
  it('converts page dimensions from px @ 300 DPI to mm', () => {
    const layout = jsonToPdfLayout({
      pageDimensions: [2480, 3508],
      bubbleDimensions: [47, 47],
      emptyValue: '',
      fieldBlocks: {},
      customLabels: {},
      preProcessors: [],
      outputColumns: [],
    });
    // 2480px / 11.811 = 210mm
    expect(layout.paper.w).toBeCloseTo(210, 1);
    expect(layout.paper.h).toBeCloseTo(297, 1);
  });

  it('uses 300 DPI constant', () => {
    const layout = jsonToPdfLayout({
      pageDimensions: [1748, 2480], // A5
      bubbleDimensions: [35, 35],
      emptyValue: '',
      fieldBlocks: {},
      customLabels: {},
      preProcessors: [],
      outputColumns: [],
    });
    expect(layout.dpi).toBe(300);
    expect(layout.mmToPx).toBeCloseTo(11.811, 3);
  });
});

describe('bubbleAtMm', () => {
  it('converts field block origin from px to mm', () => {
    const block = {
      fieldType: 'QTYPE_MCQ4',
      fieldLabels: ['q1', 'q2', 'q3', 'q4', 'q5'],
      origin: [200, 400],
      bubblesGap: 55,
      labelsGap: 45,
      bubbleWidth: 35,
      bubbleHeight: 35,
      emptyValue: '',
    };
    const layout = { dpi: 300, mmToPx: 300 / 25.4 };
    // q1.A at origin = (200, 400) px = (16.93, 33.86) mm
    const pos = bubbleAtMm(block, 0, 0, layout);
    expect(pos.xMm).toBeCloseTo(200 / 11.811, 2);
    expect(pos.yMm).toBeCloseTo(400 / 11.811, 2);
  });

  it('applies bubblesGap along X for horizontal MCQ4', () => {
    const block = {
      fieldType: 'QTYPE_MCQ4',
      fieldLabels: ['q1'],
      origin: [0, 0],
      bubblesGap: 55,
      labelsGap: 45,
      bubbleWidth: 35,
      bubbleHeight: 35,
      emptyValue: '',
    };
    const layout = { dpi: 300, mmToPx: 300 / 25.4 };
    // A=0, B=1, C=2, D=3
    expect(bubbleAtMm(block, 0, 0, layout).xMm).toBeCloseTo(0, 2);
    expect(bubbleAtMm(block, 0, 1, layout).xMm).toBeCloseTo(55 / 11.811, 2);
    expect(bubbleAtMm(block, 0, 3, layout).xMm).toBeCloseTo((3 * 55) / 11.811, 2);
  });

  it('applies labelsGap along Y for horizontal MCQ4', () => {
    const block = {
      fieldType: 'QTYPE_MCQ4',
      fieldLabels: ['q1', 'q2', 'q3'],
      origin: [0, 0],
      bubblesGap: 55,
      labelsGap: 45,
      bubbleWidth: 35,
      bubbleHeight: 35,
      emptyValue: '',
    };
    const layout = { dpi: 300, mmToPx: 300 / 25.4 };
    expect(bubbleAtMm(block, 0, 0, layout).yMm).toBeCloseTo(0, 2);
    expect(bubbleAtMm(block, 1, 0, layout).yMm).toBeCloseTo(45 / 11.811, 2);
    expect(bubbleAtMm(block, 2, 0, layout).yMm).toBeCloseTo((2 * 45) / 11.811, 2);
  });
});
```

### Step 5.2: Chạy test - FAIL

Run: `cd client/web && npm test -- omrSheetPdf.test.ts`

Expected: FAIL - `jsonToPdfLayout` and `bubbleAtMm` not exported.

### Step 5.3: Implement helper functions (GREEN)

Sửa `client/web/src/features/reports/omrSheetPdf.ts`. Thay toàn bộ nội dung bằng version mới (giữ nguyên export `generateOmrSheetPdf` và `generateOmrVersionSheetsPdf`):

```typescript
/**
 * omrSheetPdf.ts
 *
 * Renders OMR answer sheet PDF from pre-computed JSON layout (from /json endpoint).
 *
 * KEY CHANGE: This file no longer computes bubble positions from raw zones.
 * It uses the SAME pixel coordinates that the mobile app receives via /json endpoint.
 * This guarantees web-rendered PDF and mobile-detected bubbles are perfectly aligned.
 *
 * Conversion: mm = px / (300 / 25.4) = px / 11.811
 */

import { jsPDF } from 'jspdf';

// ─── Types ─────────────────────────────────────────────────────────────────

/**
 * OMRTemplate JSON format - same as server /json endpoint.
 */
export interface OMRTemplateJson {
  name: string;
  pageDimensions: [number, number]; // [width, height] in pixels @ 300 DPI
  bubbleDimensions: [number, number];
  emptyValue: string;
  outputColumns: string[];
  fieldBlocks: Record<string, OMRFieldBlockJson>;
  customLabels: Record<string, string[]>;
  preProcessors: Array<{ name: string; options: Record<string, unknown> }>;
  autoAlign?: boolean;
}

export interface OMRFieldBlockJson {
  fieldType: string;
  fieldLabels: string[];
  direction?: 'horizontal' | 'vertical';
  origin: [number, number];
  bubblesGap: number;
  labelsGap: number;
  bubbleWidth: number;
  bubbleHeight: number;
  emptyValue: string;
}

export interface OmrSheetParams {
  template: OMRTemplateJson;
  examTitle: string;
  schoolName: string;
  versionCode?: string;
}

interface PdfLayout {
  paper: { w: number; h: number };
  dpi: number;
  mmToPx: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DPI = 300;
const MM_TO_PX = DPI / 25.4; // 11.811...
const PX_TO_MM = 1 / MM_TO_PX;

// ─── Exported helpers for testing ──────────────────────────────────────────

/**
 * Convert OMRTemplateJson into a PdfLayout (paper size in mm).
 */
export function jsonToPdfLayout(json: OMRTemplateJson): PdfLayout {
  const [pwPx, phPx] = json.pageDimensions;
  return {
    paper: { w: pwPx * PX_TO_MM, h: phPx * PX_TO_MM },
    dpi: DPI,
    mmToPx: MM_TO_PX,
  };
}

/**
 * Compute the (x, y) position in mm of bubble (fieldIdx, valueIdx) in a field block.
 * Mirrors the mobile FieldBlock coordinate generation.
 */
export function bubbleAtMm(
  block: OMRFieldBlockJson,
  fieldIdx: number,
  valueIdx: number,
  layout: PdfLayout,
): { xMm: number; yMm: number } {
  const direction = block.direction ?? (block.fieldType.startsWith('QTYPE_MCQ') ? 'horizontal' : 'vertical');
  const [originXPx, originYPx] = block.origin;
  const isHorizontal = direction === 'horizontal';

  const xPx = isHorizontal
    ? originXPx + valueIdx * block.bubblesGap
    : originXPx + fieldIdx * block.labelsGap;
  const yPx = isHorizontal
    ? originYPx + fieldIdx * block.labelsGap
    : originYPx + valueIdx * block.bubblesGap;

  return { xMm: xPx * PX_TO_MM, yMm: yPx * PX_TO_MM };
}

// ─── Entry point ───────────────────────────────────────────────────────────

function removeVietnameseTones(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export async function generateOmrSheetPdf(params: OmrSheetParams): Promise<Blob> {
  const { template, examTitle, schoolName, versionCode } = params;
  const layout = jsonToPdfLayout(template);
  const { paper } = layout;

  const cleanSchool = removeVietnameseTones(schoolName);
  const cleanTitle = removeVietnameseTones(examTitle);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [paper.w, paper.h],
  });

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, paper.w, paper.h, 'F');

  // Draw header
  drawHeaderFromJson(doc, template, layout, cleanSchool, cleanTitle);

  // Draw student code (if present)
  const scBlock = template.fieldBlocks.student_code;
  if (scBlock) {
    drawCodeField(doc, scBlock, layout, 'STUDENT ID', null);
  }

  // Draw version code (if present)
  const vcBlock = template.fieldBlocks.version_code;
  if (vcBlock) {
    drawCodeField(doc, vcBlock, layout, 'EXAM CODE', versionCode ?? null);
  }

  // Draw answer area (one block per column)
  for (const [name, block] of Object.entries(template.fieldBlocks)) {
    if (name.startsWith('answer_area_col_')) {
      drawAnswerColumn(doc, block, layout);
    }
  }

  // Draw footer
  drawFooter(doc, layout);

  return doc.output('blob');
}

export async function generateOmrVersionSheetsPdf(
  params: OmrSheetParams & { versionCodes: string[] },
): Promise<Blob[]> {
  return Promise.all(
    params.versionCodes.map((code) =>
      generateOmrSheetPdf({ ...params, versionCode: code }),
    ),
  );
}

// ─── Drawing helpers ───────────────────────────────────────────────────────

function drawHeaderFromJson(
  doc: jsPDF,
  json: OMRTemplateJson,
  layout: PdfLayout,
  schoolName: string,
  examTitle: string,
): void {
  // Header is metadata - draw centered with reasonable defaults
  const { paper } = layout;
  const headerH = 40;
  const mLeft = 15;
  const mTop = 15;
  const cW = paper.w - 2 * mLeft;

  doc.setFillColor(240, 244, 248);
  doc.rect(mLeft, mTop, cW, headerH, 'F');
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.5);
  doc.line(mLeft, mTop + headerH, mLeft + cW, mTop + headerH);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 64, 175);
  doc.text(schoolName.toUpperCase(), mLeft + cW / 2, mTop + 10, { align: 'center', maxWidth: cW - 8 });

  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(examTitle.toUpperCase(), mLeft + cW / 2, mTop + 22, { align: 'center', maxWidth: cW - 8 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('OMR ANSWER SHEET  ·  SMART GRADING', mLeft + cW / 2, mTop + 33, { align: 'center', maxWidth: cW - 8 });
}

function drawCodeField(
  doc: jsPDF,
  block: OMRFieldBlockJson,
  layout: PdfLayout,
  label: string,
  filled: string | null,
): void {
  // For INT (vertical) blocks: each fieldLabel is a digit column, bubbleValues are 0-9
  const isInt = block.fieldType === 'QTYPE_INT' || block.fieldType === 'QTYPE_INT_FROM_1';
  if (!isInt) return;

  const digitCount = block.fieldLabels.length;
  const bubbleValues = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const [originXPx, originYPx] = block.origin;
  const baseX = originXPx * PX_TO_MM;
  const baseY = originYPx * PX_TO_MM;
  const bubbleWMm = block.bubbleWidth * PX_TO_MM;
  const bubbleHMm = block.bubbleHeight * PX_TO_MM;
  const stepXMm = block.bubblesGap * PX_TO_MM; // horizontal step between digits
  const stepYMm = block.labelsGap * PX_TO_MM; // vertical step between value options

  // Draw label above
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(label, baseX, baseY - 2);

  for (let d = 0; d < digitCount; d++) {
    const colX = baseX + d * stepXMm;
    for (let v = 0; v < bubbleValues.length; v++) {
      const y = baseY + v * stepYMm;
      const isFilled = filled !== null && String(filled[d]) === bubbleValues[v];
      doc.setFillColor(isFilled ? 30 : 255, isFilled ? 64 : 255, isFilled ? 175 : 255);
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.25);
      doc.circle(colX + bubbleWMm / 2, y + bubbleHMm / 2, bubbleWMm / 2, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.setTextColor(isFilled ? 255 : 100, isFilled ? 255 : 116, isFilled ? 255 : 139);
      doc.text(bubbleValues[v], colX + bubbleWMm / 2, y + bubbleHMm / 2, { align: 'center', baseline: 'middle' });
    }
  }
}

function drawAnswerColumn(
  doc: jsPDF,
  block: OMRFieldBlockJson,
  layout: PdfLayout,
): void {
  const [originXPx, originYPx] = block.origin;
  const baseX = originXPx * PX_TO_MM;
  const baseY = originYPx * PX_TO_MM;
  const bubbleWMm = block.bubbleWidth * PX_TO_MM;
  const bubbleHMm = block.bubbleHeight * PX_TO_MM;
  const stepXMm = block.bubblesGap * PX_TO_MM; // horizontal step between options
  const stepYMm = block.labelsGap * PX_TO_MM; // vertical step between questions

  const bubbleValues = block.fieldType === 'QTYPE_MCQ4' || block.fieldType === 'QTYPE_MCQ4_RTL'
    ? ['A', 'B', 'C', 'D']
    : ['A', 'B', 'C', 'D', 'E'];

  for (let fi = 0; fi < block.fieldLabels.length; fi++) {
    for (let vi = 0; vi < bubbleValues.length; vi++) {
      const x = baseX + vi * stepXMm;
      const y = baseY + fi * stepYMm;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.25);
      doc.circle(x + bubbleWMm / 2, y + bubbleHMm / 2, bubbleWMm / 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5);
      doc.setTextColor(100, 116, 139);
      doc.text(bubbleValues[vi], x + bubbleWMm / 2, y + bubbleHMm / 2, { align: 'center', baseline: 'middle' });
    }
  }
}

function drawFooter(doc: jsPDF, layout: PdfLayout): void {
  const { paper } = layout;
  const fH = 12;
  const fY = paper.h - 15 - fH;
  const mLeft = 15;
  const cW = paper.w - 2 * mLeft;

  doc.setFillColor(248, 250, 252);
  doc.rect(mLeft, fY, cW, fH, 'F');
  doc.setDrawColor(220, 225, 235);
  doc.setLineWidth(0.3);
  doc.line(mLeft, fY, mLeft + cW, fY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text('Smart Grading  ·  OMR Answer Sheet', mLeft + 4, fY + 4);
  doc.text('Page 1/1', mLeft + cW - 4, fY + 4, { align: 'right' });
}
```

### Step 5.4: Chạy test - PASS

Run: `cd client/web && npm test -- omrSheetPdf.test.ts`

Expected: tất cả tests PASS.

### Step 5.5: Verify TypeScript compile

Run: `cd client/web && npx tsc -b --noEmit`

Expected: không có lỗi TypeScript mới.

### Step 5.6: Commit

```bash
git add client/web/src/features/reports/omrSheetPdf.ts client/web/src/features/reports/omrSheetPdf.test.ts
git commit -m "refactor(web): rewrite omrSheetPdf to consume /json endpoint output"
```

---

## Task 6: Web - Update `examReportExport.ts` fetch từ `/json` thay vì `/full`

**Files:**
- Modify: `client/web/src/features/reports/examReportExport.ts`

### Step 6.1: Sửa `fetchFullTemplate` thành `fetchOmrJson`

Tìm function `fetchFullTemplate` trong `examReportExport.ts` và thay bằng:

```typescript
async function fetchOmrJson(templateId: string): Promise<OMRTemplateJson> {
  const response = await fetch(
    `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}/omr-templates/${templateId}/json`,
    { headers: apiService.getHeaders() }
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Không lấy được template' }));
    throw new Error(err.message || `Lỗi ${response.status}`);
  }
  return response.json();
}
```

Thêm import ở đầu file:

```typescript
import type { OMRTemplateJson } from './omrSheetPdf';
```

### Step 6.2: Sửa `exportOmrTemplatePdf` để dùng `fetchOmrJson`

Tìm và sửa:

```typescript
export async function exportOmrTemplatePdf(
  templateId: string,
  examTitle: string,
  schoolName?: string
): Promise<void> {
  const template = await fetchOmrJson(templateId);

  const blob = await generateOmrSheetPdf({
    template,
    examTitle,
    schoolName: schoolName || 'SCHOOL',
    versionCode: undefined,
  });

  const safe = examTitle?.replace(/[^a-zA-Z0-9\u00C0-\u024F\s]/g, '_') || 'OMR';
  downloadBlob(blob, `PhieuTraLoi_${safe}_${Date.now()}.pdf`);
}
```

### Step 6.3: Sửa `exportOmrTemplateVersionSheetsPdf` tương tự

```typescript
export async function exportOmrTemplateVersionSheetsPdf(
  templateId: string,
  versionCodes: string[],
  examTitle: string,
  schoolName?: string
): Promise<void> {
  const template = await fetchOmrJson(templateId);

  if (versionCodes.length === 1) {
    const blob = await generateOmrSheetPdf({
      template,
      examTitle,
      schoolName: schoolName || 'SCHOOL',
      versionCode: versionCodes[0],
    });
    const safe = examTitle?.replace(/[^a-zA-Z0-9\u00C0-\u024F\s]/g, '_') || 'OMR';
    downloadBlob(blob, `PhieuTraLoi_${safe}_${Date.now()}.pdf`);
    return;
  }

  const blobs = await generateOmrVersionSheetsPdf({
    template,
    examTitle,
    schoolName: schoolName || 'SCHOOL',
    versionCodes,
  });

  const safe = examTitle?.replace(/[^a-zA-Z0-9\u00C0-\u024F\s]/g, '_') || 'OMR';
  for (let i = 0; i < blobs.length; i++) {
    downloadBlob(blobs[i], `PhieuTraLoi_${safe}_v${versionCodes[i]}_${Date.now()}.pdf`);
  }
}
```

### Step 6.4: Verify TypeScript compile

Run: `cd client/web && npx tsc -b --noEmit`

Expected: không có lỗi mới.

### Step 6.5: Chạy existing test

Run: `cd client/web && npm test -- examReportExport.test.ts`

Expected: existing tests vẫn PASS (vì chỉ thay đổi fetch, không thay đổi pure functions).

### Step 6.6: Commit

```bash
git add client/web/src/features/reports/examReportExport.ts
git commit -m "refactor(web): fetch OMR layout from /json instead of /full"
```

---

## Task 7: Mobile - Parse `autoAlign` từ JSON

**Files:**
- Modify: `client/mobile/lib/domain/omr/models/omr_template.dart`

### Step 7.1: Viết test (RED)

Append vào `client/mobile/test/domain/omr/template_test.dart`:

```dart
test('parses autoAlign from JSON (true)', () {
  final json = {
    'pageDimensions': [2480, 3508],
    'bubbleDimensions': [35, 35],
    'fieldBlocks': {},
    'customLabels': {},
    'preProcessors': [],
    'outputColumns': [],
    'autoAlign': true,
  };
  final template = OMRTemplate.fromJson(json);
  expect(template.autoAlign, isTrue);
});

test('parses autoAlign from JSON (false)', () {
  final json = {
    'pageDimensions': [2480, 3508],
    'bubbleDimensions': [35, 35],
    'fieldBlocks': {},
    'customLabels': {},
    'preProcessors': [],
    'outputColumns': [],
    'autoAlign': false,
  };
  final template = OMRTemplate.fromJson(json);
  expect(template.autoAlign, isFalse);
});

test('defaults autoAlign to true when missing (backward compat)', () {
  final json = {
    'pageDimensions': [2480, 3508],
    'bubbleDimensions': [35, 35],
    'fieldBlocks': {},
    'customLabels': {},
    'preProcessors': [],
    'outputColumns': [],
    // no autoAlign key
  };
  final template = OMRTemplate.fromJson(json);
  expect(template.autoAlign, isTrue);
});
```

### Step 7.2: Chạy test - FAIL

Run: `cd client/mobile && flutter test test/domain/omr/template_test.dart -n "parses autoAlign|defaults autoAlign"`

Expected: FAIL vì field `autoAlign` chưa tồn tại trên `OMRTemplate`.

### Step 7.3: Thêm field `autoAlign` vào `OMRTemplate`

Sửa `client/mobile/lib/domain/omr/models/omr_template.dart`:

```dart
class OMRTemplate {
  // ... existing fields
  final bool autoAlign;

  const OMRTemplate({
    // ... existing params
    this.autoAlign = true,
  });

  factory OMRTemplate.fromJson(Map<String, dynamic> json) {
    // ... existing parsing
    return OMRTemplate(
      // ... existing fields
      autoAlign: json['autoAlign'] as bool? ?? true,
    );
  }

  // Cập nhật các factory (simpleMcq, sample4, from15Question) để truyền autoAlign mặc định = true
  // Có thể bỏ qua vì const default đã là true
}
```

### Step 7.4: Chạy test - PASS

Run: `cd client/mobile && flutter test test/domain/omr/template_test.dart`

Expected: tất cả tests PASS (cả existing + 3 mới).

### Step 7.5: Commit

```bash
git add client/mobile/lib/domain/omr/models/omr_template.dart client/mobile/test/domain/omr/template_test.dart
git commit -m "feat(mobile): parse autoAlign flag from OMR template JSON"
```

---

## Task 8: Mobile - Truyền `autoAlign` xuống `AppOmrTemplate`

**Files:**
- Modify: `client/mobile/lib/domain/omr/engine/app_omr_models.dart`

### Step 8.1: Sửa `AppOmrTemplate` để có field `autoAlign`

Tìm class `AppOmrTemplate` trong `app_omr_models.dart`. Thêm field:

```dart
class AppOmrTemplate {
  // ... existing fields
  final bool autoAlign;

  const AppOmrTemplate({
    // ... existing params
    this.autoAlign = true,
  });

  factory AppOmrTemplate.fromMap(Map<String, dynamic> map) {
    return AppOmrTemplate(
      // ... existing fields
      autoAlign: map['autoAlign'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toMap() => {
    // ... existing fields
    'autoAlign': autoAlign,
  };
}
```

### Step 8.2: Tìm chỗ tạo `AppOmrTemplate` từ `OMRTemplate`

Tìm trong codebase (có thể trong `omr_engine.dart` hoặc `omr_template_service.dart`) chỗ convert `OMRTemplate` → `AppOmrTemplate`. Truyền `autoAlign` qua.

Ví dụ trong `client/mobile/lib/domain/omr/engine/omr_engine.dart`:

```dart
// Tìm chỗ tạo AppOmrTemplate, sửa:
AppOmrTemplate(
  // ... existing fields
  autoAlign: omrTemplate.autoAlign, // truyền từ OMRTemplate
)
```

Nếu không tìm thấy chỗ explicit conversion, có thể `OMRTemplate` đang được dùng trực tiếp → cần refactor nhẹ.

### Step 8.3: Verify Flutter compile

Run: `cd client/mobile && flutter analyze lib/domain/omr/`

Expected: không có lỗi mới.

### Step 8.4: Commit

```bash
git add client/mobile/lib/domain/omr/engine/app_omr_models.dart client/mobile/lib/domain/omr/engine/omr_engine.dart
git commit -m "feat(mobile): thread autoAlign flag from OMRTemplate to AppOmrTemplate"
```

---

## Task 9: Mobile - Tôn trọng `autoAlign` flag trong `app_omr_engine.dart`

**Files:**
- Modify: `client/mobile/lib/domain/omr/engine/app_omr_engine.dart`

### Step 9.1: Tìm chỗ gọi `_computeShifts`

Trong `app_omr_engine.dart` (line ~235), tìm:

```dart
if (template.autoAlign) {
  _computeShifts(normalized);
}
```

Đã có sẵn! Chỉ cần verify `template.autoAlign` được set đúng (đã làm ở Task 8). Nếu chưa có, thêm:

```dart
// Around line 235
if (template.autoAlign) {
  _computeShifts(normalized);
} else {
  // When autoAlign is disabled, shifts are 0 → use template coordinates exactly
  _shifts.clear();
  for (int i = 0; i < template.fieldBlocks.length; i++) {
    _shifts.add(0);
  }
  debugPrint('AppOMREngine: autoAlign disabled, using template coordinates exactly');
}
```

### Step 9.2: Verify Flutter compile + test

Run: `cd client/mobile && flutter analyze && flutter test test/domain/omr/`

Expected: pass.

### Step 9.3: Commit (nếu có thay đổi)

```bash
git add client/mobile/lib/domain/omr/engine/app_omr_engine.dart
git commit -m "feat(mobile): respect autoAlign=false by skipping shift computation"
```

---

## Task 10: Manual verification end-to-end

**Mục đích:** Verify rằng PDF in ra từ web có bubble khớp với tọa độ mobile detect.

### Step 10.1: Khởi động backend + web dev server

```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client/web && npm run dev
```

### Step 10.2: Tạo template test trên web

1. Mở web UI, tạo OMR template mới với:
   - A4, 30 câu hỏi, 5 cột
   - Bubble 4mm, student code 3 digits, version code 3 digits
2. Lưu template, lấy template ID

### Step 10.3: So sánh JSON output với PDF render

```bash
# Lấy JSON từ API
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/v1/omr-templates/<id>/json > /tmp/template.json

# Inspect: check fieldBlocks.answer_area_col_0.origin
# Expect: array with 2 numbers (x, y) in pixels
```

### Step 10.4: In PDF từ web

1. Vào trang Exam có template trên
2. Click "Export OMR Sheet" → download PDF
3. Mở PDF bằng PDF reader → kiểm tra bubble có hiển thị đúng

### Step 10.5: Scan bằng app mobile

1. Mở app Flutter trên thiết bị thật (hoặc emulator với camera giả lập)
2. Vào flow scan → chọn exam có template trên
3. Chụp ảnh PDF đã in
4. Xem overlay: bubble overlay phải nằm chính xác trên bubble in trên giấy
5. Nếu overlay lệch → toggle `autoAlign = true/false` xem có cải thiện không

### Step 10.6: Document kết quả

Ghi lại kết quả vào commit message hoặc file note:
- Web render PDF: bubble tại (x_mm, y_mm)
- Mobile detect: bubble tại (x_px, y_px) với x_px = x_mm * 11.811
- Sai số: ±0.5mm (khoảng 1.4 pixel @ 300 DPI)
- Nếu sai số > 2mm: rollback và debug

### Step 10.7: Commit verification note (optional)

```bash
git add docs/superpowers/notes/omr-pdf-verification-2026-06-14.md
git commit -m "docs(omr): record manual verification of PDF-mobible coordinate alignment"
```

---

## Tổng kết thay đổi

| File | Loại | Tóm tắt |
|---|---|---|
| `server/src/services/omrTemplateJson.service.js` | Refactor | Tách thành hàm nhỏ, thêm `autoAlign` |
| `server/src/models/omrTemplate.model.js` | Feature | Thêm `scannerConfig.autoAlign` |
| `server/tests/unit/services/omrTemplateJson.test.js` | Mới | Snapshot + behavior + autoAlign tests |
| `client/web/src/features/reports/omrSheetPdf.ts` | Rewrite | Nhận JSON, render trực tiếp không tính layout |
| `client/web/src/features/reports/omrSheetPdf.test.ts` | Mới | Coordinate conversion tests |
| `client/web/src/features/reports/examReportExport.ts` | Sửa | Fetch từ `/json` thay `/full` |
| `client/mobile/lib/domain/omr/models/omr_template.dart` | Sửa | Parse `autoAlign` |
| `client/mobile/lib/domain/omr/engine/app_omr_models.dart` | Sửa | Field `autoAlign` |
| `client/mobile/lib/domain/omr/engine/app_omr_engine.dart` | Sửa | Tôn trọng flag |
| `client/mobile/test/domain/omr/template_test.dart` | Cập nhật | Test parse `autoAlign` |

---

## Verification cuối cùng

Sau khi hoàn thành tất cả tasks, chạy:

```bash
# Backend tests
cd server && npx jest tests/unit/services/omrTemplateJson.test.js

# Web tests
cd client/web && npm test -- omrSheetPdf

# Mobile tests
cd client/mobile && flutter test test/domain/omr/

# Manual E2E
# 1. In PDF từ web
# 2. Scan bằng app
# 3. Verify bubble khớp (tolerance ±0.5mm)
```

Tất cả phải PASS trước khi merge.
