# SMART GRADING - Database Design Specification

**Phiên bản:** 1.2 (Có Multi-class, StudentProgress, ExamReport)
**Ngày:** 2026-05-25
**Database Type:** MongoDB (Document-based)
**ODM:** Mongoose

---

## 1. Tổng quan Kiến trúc Database

### 1.1 Design Philosophy

```
┌─────────────────────────────────────────────────────────────────┐
│                    SMART GRADING ECOSYSTEM                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │   Web App    │     │  Mobile App  │     │   AI Tutor   │    │
│  │   (React)    │     │  (Flutter)  │     │   (LLMs)     │    │
│  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘    │
│         │                    │                    │            │
│         └────────────────────┼────────────────────┘            │
│                              │                                 │
│                     ┌────────▼────────┐                       │
│                     │   Node.js API    │                       │
│                     │   (Express)      │                       │
│                     └────────┬────────┘                       │
│                              │                                 │
│         ┌────────────────────┼────────────────────┐            │
│         │                    │                    │            │
│  ┌──────▼───────┐    ┌──────▼───────┐    ┌──────▼───────┐   │
│  │   MongoDB    │    │ Cloudinary   │    │    Redis     │   │
│  │ (Documents)  │    │  (Images)    │    │   (Cache)    │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Data Strategy: Hybrid Approach

| Loại Dữ liệu | Storage | Lý do |
|-------------|---------|-------|
| **Users, Classes, Subjects** | MongoDB Collection | Cấu trúc cố định, ít thay đổi |
| **Questions, Exams** | MongoDB Collection | Cấu trúc linh hoạt (JSON), dễ mở rộng |
| **Submissions, Results** | MongoDB Collection | Cần lưu chi tiết từng câu, metadata phức tạp |
| **Appeals/Reviews** | MongoDB Collection | Workflow-based, trạng thái phức tạp |
| **OMR Markers** | MongoDB Collection | Tọa độ hình ảnh, dữ liệu không gian |

---

## 2. Entity-Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SMART GRADING - ERD                                 │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
    │   SUBJECT   │         │    USER    │         │   SCHOOL   │
    │─────────────│         │─────────────│         │─────────────│
    │ _id         │         │ _id         │         │ _id         │
    │ name        │◄──────── │ subjectIds[]│         │ name        │
    │ code        │         │ name        │         │ address     │
    │ description │         │ email       │         │ logoUrl     │
    │ gradeLevel  │         │ password    │         │ createdAt   │
    └──────┬──────┘         │ role        │         └──────┬──────┘
           │                │ avatarUrl   │                │
           │                │ phone       │                │
           │                │ isActive    │                │
           │                └──────┬──────┘                │
           │                       │                       │
           │                       │ (1:N)                 │
           │                ┌──────▼──────┐              │
           │                │   CLASS     │◄─────────────┘
           │                │─────────────│
           │                │ _id         │
           └───────────────►│ subjectId   │
                           │ name        │
                           │ code        │
                           │ teacherId   │────┐
                           │ schoolId   │    │
                           │ studentIds[]│    │
                           │ academicYear│    │
                           └──────┬──────┘    │
                                  │           │
                                  │ (1:N)     │
                           ┌──────▼──────┐    │
                           │    EXAM     │    │
                           │─────────────│    │
                           │ _id         │    │
                           │ classId     │◄───┤
                           │ title       │    │
                           │ description │    │
                           │ subjectId   │    │
                           │ date        │    │
                           │ duration    │    │
                           │ totalScore  │    │
                           │ status      │    │
                           │ questionIds[]│   │
                           │ versions[]  │    │
                           └──────┬──────┘    │
                                  │           │
                                  │ (1:N)     │
                           ┌──────▼──────┐    │
                           │  VERSION    │    │
                           │─────────────│    │
                           │ _id         │    │
                           │ examId      │◄───┤
                           │ versionCode │    │
                           │ (101,102..) │    │
                           │ questions[] │    │
                           │ answerKey   │    │
                           └──────┬──────┘    │
                                  │           │
                                  │ (1:N)     │
                           ┌──────▼──────┐    │
                           │ SUBMISSION │    │
                           │─────────────│    │
                           │ _id         │    │
                           │ examId      │◄───┤
                           │ versionId   │    │
                           │ studentId   │    │
                           │ studentCode │    │
                           │ answers[]   │    │
                           │ score       │    │
                           │ imageUrl    │    │
                           │ omrData     │    │
                           │ status      │    │
                           │ scannedAt   │    │
                           └──────┬──────┘    │
                                  │           │
                                  │ (1:N)     │
                           ┌──────▼──────┐    │
                           │   APPEAL    │    │
                           │─────────────│    │
                           │ _id         │    │
                           │ submissionId│◄───┤
                           │ questionId  │    │
                           │ reason      │    │
                           │ status      │    │
                           │ teacherNote │    │
                           │ resolvedAt  │    │
                           └─────────────┘    │

    ┌─────────────┐         ┌─────────────┐
    │  QUESTION   │         │ AI_REPORT   │
    │─────────────│         │─────────────│
    │ _id         │         │ _id         │
    │ content     │         │ studentId   │
    │ type        │         │ examId      │
    │ options[]   │         │ mistakes[]  │
    │ correctAns  │         │ suggestions │
    │ difficulty  │         │ analysis    │
    │ topic       │         │ createdAt   │
    │ explanation │         └──────┬──────┘
    │ imageUrl    │                │
    └─────────────┘                │
                                  │
                           ┌──────▼──────┐
                           │ AI_CHAT     │
                           │─────────────│
                           │ _id         │
                           │ studentId   │
                           │ messages[]  │
                           │ context     │
                           │ createdAt   │
                           └─────────────┘
```

---

## 3. Chi tiết Collections

### 3.0 OMR_TEMPLATE - Mẫu Phiếu OMR (MỚI - QUAN TRỌNG)

Đây là **KEY COLLECTION** - Lưu trữ cấu hình các loại phiếu trả lời OMR khác nhau.

```javascript
// server/src/models/omrTemplate.model.js

const omrTemplateSchema = mongoose.Schema(
  {
    // Tên template (VD: "Phiếu 30 câu - Tiêu chuẩn")
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // Mã template (VD: "OMR_30_STD")
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    // Mô tả
    description: String,
    // ══════════════════════════════════════════════════════════════════
    // CẤU HÌNH GIẤY & KÍCH THƯỚC
    // ══════════════════════════════════════════════════════════════════
    pageConfig: {
      // Kích thước giấy
      paperSize: {
        type: String,
        enum: ['A4', 'A5', 'A3', 'custom'],
        default: 'A4',
      },
      // Kích thước thực tế (mm) - cho custom
      customSize: {
        width: Number,   // mm
        height: Number,  // mm
      },
      // Độ phân giải mặc định khi quét (DPI)
      defaultDPI: {
        type: Number,
        default: 300,
      },
      // Lề (mm)
      margins: {
        top: { type: Number, default: 15 },
        bottom: { type: Number, default: 15 },
        left: { type: Number, default: 15 },
        right: { type: Number, default: 15 },
      },
    },
    // ══════════════════════════════════════════════════════════════════
    // CẤU HÌNH CÁC VÙNG (ZONES) TRÊN PHIẾU
    // ══════════════════════════════════════════════════════════════════
    zones: {
      // ─────────────────────────────────────────────────────────────
      // VÙNG HEADER - Thông tin đầu trang
      // ─────────────────────────────────────────────────────────────
      header: {
        enabled: { type: Boolean, default: true },
        height: { type: Number, default: 40 },  // mm
        // Các element trong header
        elements: [{
          type: {
            type: String,
            enum: ['school_logo', 'school_name', 'exam_title', 'student_name', 
                   'class_name', 'date', 'custom_text', 'image'],
          },
          position: {
            x: Number,  // mm from left
            y: Number,  // mm from top
          },
          width: Number,
          height: Number,
          fontSize: Number,
          fontFamily: String,
          alignment: {
            type: String,
            enum: ['left', 'center', 'right'],
            default: 'center',
          },
          // Nội dung (cho custom_text)
          content: String,
        }],
      },
      // ─────────────────────────────────────────────────────────────
      // VÙNG MÃ ĐỀ - Ô đánh dấu mã đề
      // ─────────────────────────────────────────────────────────────
      versionCode: {
        enabled: { type: Boolean, default: true },
        // Vị trí (mm from top-left of printable area)
        position: {
          x: { type: Number, default: 150 },
          y: { type: Number, default: 50 },
        },
        // Số chữ số mã đề (3 = 101-999, 2 = 01-99)
        digits: {
          type: Number,
          enum: [2, 3],
          default: 3,
        },
        // Cấu hình mỗi ô chữ số
        digitConfig: {
          // Số ô mỗi chữ số (0-9 = 10 ô)
          optionsPerDigit: {
            type: Number,
            default: 10,
          },
          // Kích thước ô (mm)
          bubbleSize: {
            width: { type: Number, default: 6 },
            height: { type: Number, default: 6 },
          },
          // Khoảng cách giữa các ô
          bubbleSpacing: {
            horizontal: { type: Number, default: 2 },
            vertical: { type: Number, default: 2 },
          },
        },
        // Nhãn hiển thị (VD: "Mã đề")
        label: {
          text: String,
          fontSize: Number,
          position: String,  // 'above', 'below', 'left'
        },
      },
      // ─────────────────────────────────────────────────────────────
      // VÙNG SỐ BÁO DANH - Ô đánh dấu SBD
      // ─────────────────────────────────────────────────────────────
      studentCode: {
        enabled: { type: Boolean, default: true },
        position: {
          x: { type: Number, default: 20 },
          y: { type: Number, default: 50 },
        },
        // Số chữ số SBD
        digits: {
          type: Number,
          default: 3,  // 001-999
        },
        digitConfig: {
          optionsPerDigit: { type: Number, default: 10 },
          bubbleSize: {
            width: { type: Number, default: 6 },
            height: { type: Number, default: 6 },
          },
          bubbleSpacing: {
            horizontal: { type: Number, default: 2 },
            vertical: { type: Number, default: 2 },
          },
        },
        label: {
          text: String,
          fontSize: Number,
          position: String,
        },
      },
      // ─────────────────────────────────────────────────────────────
      // VÙNG CÂU TRẢ LỜI - Khu vực tô đáp án
      // ─────────────────────────────────────────────────────────────
      answerArea: {
        enabled: { type: Boolean, default: true },
        // Vị trí bắt đầu
        startPosition: {
          x: { type: Number, default: 20 },
          y: { type: Number, default: 90 },
        },
        // Kích thước vùng trả lời
        dimensions: {
          width: { type: Number, default: 170 },  // mm
          height: { type: Number, default: 200 }, // mm
        },
        // ─────────────────────────────────────────────────────────
        // CẤU HÌNH LƯỚI CÂU HỎI
        // ─────────────────────────────────────────────────────────
        gridConfig: {
          // Số câu hỏi trên mỗi hàng
          questionsPerRow: {
            type: Number,
            default: 5,  // 5 câu = 5x4 = 20 ô A,B,C,D
          },
          // Số hàng trên mỗi trang
          rowsPerPage: {
            type: Number,
            default: 10,
          },
          // Tổng số câu hỏi
          totalQuestions: {
            type: Number,
            default: 50,
          },
          // ─────────────────────────────────────────────────────
          // KÍCH THƯỚC Ô
          // ─────────────────────────────────────────────────────
          bubbleConfig: {
            // Kích thước mỗi ô trả lời (mm)
            width: { type: Number, default: 6 },
            height: { type: Number, default: 6 },
            // Hình dạng
            shape: {
              type: String,
              enum: ['circle', 'oval', 'square', 'rectangle'],
              default: 'circle',
            },
            // Màu viền khi in
            borderColor: {
              type: String,
              default: '#000000',
            },
            borderWidth: { type: Number, default: 0.5 },
            // Màu fill khi tô (cho scan detection)
            fillColor: {
              type: String,
              default: '#000000',
            },
            // Độ đậm tối thiểu để coi là "đã tô" (0-255)
            minFillIntensity: { type: Number, default: 180 },
            // ─────────────────────────────────────────────────
            // KHOẢNG CÁCH
            // ─────────────────────────────────────────────────
            spacing: {
              // Giữa các lựa chọn (A-B-C-D)
              betweenOptions: { type: Number, default: 2 },
              // Giữa các câu hỏi
              betweenQuestions: { type: Number, default: 4 },
              // Giữa các hàng
              betweenRows: { type: Number, default: 8 },
            },
          },
          // ─────────────────────────────────────────────────────
          // SỐ THỨ TỰ CÂU
          // ─────────────────────────────────────────────────────
          questionNumberConfig: {
            // Hiển thị số câu
            enabled: { type: Boolean, default: true },
            // Vị trí số (trước hay sau các ô)
            position: {
              type: String,
              enum: ['left', 'above'],
              default: 'left',
            },
            // Kích thước text
            fontSize: { type: Number, default: 9 },
            fontWeight: { type: String, default: 'normal' },
            // Căn lề số
            alignment: {
              type: String,
              enum: ['left', 'center', 'right'],
              default: 'right',
            },
            // Chiều rộng dành cho số thứ tự
            width: { type: Number, default: 8 },
          },
        },
        // ─────────────────────────────────────────────────────────
        // CHIA TRANG (PAGINATION)
        // ─────────────────────────────────────────────────────────
        pagination: {
          enabled: { type: Boolean, default: true },
          // Số câu mỗi trang
          questionsPerPage: { type: Number, default: 50 },
          // Tổng số trang
          totalPages: { type: Number, default: 1 },
          // Vị trí số trang (VD: "Trang 1/3")
          pageNumberPosition: {
            x: Number,
            y: Number,
          },
        },
      },
      // ─────────────────────────────────────────────────────────────
      // VÙNG FOOTER
      // ─────────────────────────────────────────────────────────────
      footer: {
        enabled: { type: Boolean, default: true },
        height: { type: Number, default: 15 },
        elements: [{
          type: {
            type: String,
            enum: ['page_number', 'copyright', 'custom_text', 'qr_code'],
          },
          position: { x: Number, y: Number },
          content: String,
          fontSize: Number,
        }],
      },
    },
    // ══════════════════════════════════════════════════════════════════
    // CẤU HÌNH MÁY QUÉT (SCANNER)
    // ══════════════════════════════════════════════════════════════════
    scannerConfig: {
      // Hướng giấy
      orientation: {
        type: String,
        enum: ['portrait', 'landscape'],
        default: 'portrait',
      },
      // Ngưỡng nhị phân hóa (0-255)
      // Ảnh dưới ngưỡng = đen (đã tô), trên = trắng
      binarizationThreshold: { type: Number, default: 128 },
      // Xoay ảnh (độ)
      rotation: { type: Number, default: 0 },
      // Làm mịn ảnh trước khi xử lý
      preprocessing: {
        deskew: { type: Boolean, default: true },         // Tự động chỉnh nghiêng
        crop: { type: Boolean, default: true },          // Tự động cắt lề
        denoise: { type: Boolean, default: true },       // Khử nhiễu
        contrastEnhance: { type: Boolean, default: true }, // Tăng contrast
      },
      // Cấu hình detection
      detection: {
        // Tìm vùng câu trả lời tự động
        autoDetectAnswerArea: { type: Boolean, default: true },
        // Chế độ debug (vẽ đè markers)
        debugMode: { type: Boolean, default: false },
        // Sai số cho phép (%)
        tolerance: {
          position: { type: Number, default: 5 },    // Vị trí
          size: { type: Number, default: 10 },       // Kích thước
          intensity: { type: Number, default: 15 },  // Độ đậm
        },
      },
    },
    // ══════════════════════════════════════════════════════════════════
    // CẤU HÌNH XÁC THỰC (VALIDATION)
    // ══════════════════════════════════════════════════════════════════
    validationRules: {
      // Cho phép tô nhiều đáp án?
      allowMultipleAnswers: { type: Boolean, default: false },
      // Cho phép bỏ trống?
      allowEmpty: { type: Boolean, default: true },
      // Cảnh báo tô đúp (2 đáp án cùng câu)
      warnDoubleFill: { type: Boolean, default: true },
      // Ngưỡng cảnh báo tô mờ
      minIntensityWarning: { type: Number, default: 150 },
      // Cảnh báo nếu tổng điểm bất thường
      scoreAnomalyThreshold: { type: Number, default: 0.3 },  // 30% khác trung bình
    },
    // ══════════════════════════════════════════════════════════════════
    // METADATA
    // ══════════════════════════════════════════════════════════════════
    // Người tạo
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Cấp độ
    level: {
      type: String,
      enum: ['system', 'school', 'custom'],
      default: 'system',
    },
    // Áp dụng cho trường nào (nếu school level)
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
    },
    // Trạng thái
    isActive: {
      type: Boolean,
      default: true,
    },
    // Template mặc định?
    isDefault: {
      type: Boolean,
      default: false,
    },
    // Số lần sử dụng
    usageCount: {
      type: Number,
      default: 0,
    },
    // Tags để phân loại
    tags: [String],
    // Preview image URL
    previewImageUrl: String,
  },
  {
    timestamps: true,
  }
);

// Index
omrTemplateSchema.index({ code: 1 }, { unique: true });
omrTemplateSchema.index({ level: 1, isActive: 1 });
omrTemplateSchema.index({ tags: 1 });
omrTemplateSchema.index({ schoolId: 1, isDefault: 1 });

const OMRTemplate = mongoose.model('OMRTemplate', omrTemplateSchema);
module.exports = OMRTemplate;
```

### 3.0.1 Ví dụ: Các Template có sẵn

```javascript
// ============================================================
// TEMPLATE 1: OMR_30_STD - Phiếu 30 câu tiêu chuẩn
// ============================================================
{
  name: "Phiếu trả lời 30 câu - Tiêu chuẩn",
  code: "OMR_30_STD",
  zones: {
    answerArea: {
      gridConfig: {
        totalQuestions: 30,
        questionsPerRow: 5,
        rowsPerPage: 6,
        bubbleConfig: {
          bubbleSize: { width: 6, height: 6 },
          spacing: {
            betweenOptions: 2,
            betweenQuestions: 4,
            betweenRows: 8
          }
        }
      }
    }
  }
}

// ============================================================
// TEMPLATE 2: OMR_50_LONG - Phiếu 50 câu dài
// ============================================================
{
  name: "Phiếu trả lời 50 câu - Dài",
  code: "OMR_50_LONG",
  zones: {
    answerArea: {
      gridConfig: {
        totalQuestions: 50,
        questionsPerRow: 5,
        rowsPerPage: 10,
        bubbleConfig: {
          bubbleSize: { width: 5, height: 5 },  // Nhỏ hơn để fit
          spacing: {
            betweenOptions: 1.5,
            betweenQuestions: 3,
            betweenRows: 6
          }
        }
      }
    }
  }
}

// ============================================================
// TEMPLATE 3: OMR_15_SHORT - Phiếu ngắn 15 câu
// ============================================================
{
  name: "Phiếu trả lời 15 câu - Ngắn",
  code: "OMR_15_SHORT",
  zones: {
    answerArea: {
      gridConfig: {
        totalQuestions: 15,
        questionsPerRow: 5,
        rowsPerPage: 3,
        bubbleConfig: {
          bubbleSize: { width: 8, height: 8 },  // Lớn hơn cho dễ tô
          spacing: {
            betweenOptions: 3,
            betweenQuestions: 6,
            betweenRows: 10
          }
        }
      }
    }
  }
}

// ============================================================
// TEMPLATE 4: OMR_KTL - Phiếu KT 15 phút (ít câu)
// ============================================================
{
  name: "Phiếu kiểm tra 15 phút",
  code: "OMR_KT15",
  zones: {
    answerArea: {
      gridConfig: {
        totalQuestions: 10,
        questionsPerRow: 5,
        rowsPerPage: 2,
        bubbleConfig: {
          bubbleSize: { width: 10, height: 10 },  // Rất lớn
          spacing: {
            betweenOptions: 4,
            betweenQuestions: 8,
            betweenRows: 12
          }
        }
      }
    }
  }
}
```

### 3.0.2 Cấu trúc tọa độ thực tế khi scan

```javascript
// Khi quét ảnh, hệ thống sẽ tính toán tọa độ thực tế:
// ============================================================
// Chuyển đổi mm -> pixel dựa trên DPI
// ============================================================
const mmToPixels = (mm, dpi = 300) => {
  return Math.round((mm / 25.4) * dpi);
};

// Ví dụ: Vùng câu trả lời cho OMR_30_STD
const answerAreaPixels = {
  startX: mmToPixels(20),    // 236 px
  startY: mmToPixels(90),   // 1063 px
  bubbleWidth: mmToPixels(6),   // 71 px
  bubbleHeight: mmToPixels(6),  // 71 px
  optionSpacing: mmToPixels(2),  // 24 px
  questionSpacing: mmToPixels(4), // 47 px
  
  // Tính tọa độ câu 1, đáp án A
  question1AnswerA: {
    x: startX,  // 236 px
    y: startY,  // 1063 px
  },
  
  // Tính tọa độ câu 1, đáp án B
  question1AnswerB: {
    x: startX + bubbleWidth + optionSpacing,  // 236 + 71 + 24 = 331 px
    y: startY,
  },
  
  // Tính tọa độ câu 2, đáp án A
  question2AnswerA: {
    x: startX + (bubbleWidth * 4 + optionSpacing * 3) + questionSpacing, 
    // = 236 + (71*4 + 24*3) + 47 = 236 + 284 + 47 = 567 px
    y: startY,
  }
};
```

### 3.1 USER - Người dùng

```javascript
// server/src/models/user.model.js (MỞ RỘNG)

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      private: true,
    },
    role: {
      type: String,
      enum: ['admin', 'teacher', 'student'],
      default: 'student',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    // --- THÊM MỚI ---
    avatarUrl: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      default: null,
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    // Liên kết với trường học
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      default: null,
    },
    // Lớp học (cho student)
    classIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
    }],
    // Môn giảng dạy (cho teacher)
    subjectIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
    }],
    // Trạng thái tài khoản
    isActive: {
      type: Boolean,
      default: true,
    },
    // Metadata
    lastLoginAt: {
      type: Date,
      default: null,
    },
    studentCode: {
      type: String,  // Mã học sinh (duy nhất trong trường)
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);
```

### 3.2 SCHOOL - Trường học

```javascript
// server/src/models/school.model.js

const schoolSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    address: {
      street: String,
      ward: String,
      district: String,
      city: String,
    },
    logoUrl: {
      type: String,
      default: null,
    },
    phone: String,
    email: String,
    website: String,
    // Cấu hình
    settings: {
      gradingScale: {
        type: Map,
        of: Number,
        default: new Map([
          ['A', 90], ['B', 80], ['C', 70], ['D', 60], ['F', 0]
        ])
      },
      omrConfig: {
        bubbleSize: Number,      // Kích thước bong bóng OMR (px)
        rowHeight: Number,      // Chiều cao mỗi hàng
        colWidth: Number,       // Chiều rộng mỗi cột
        marginTop: Number,      // Lề trên
        marginLeft: Number,     // Lề trái
      }
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

schoolSchema.index({ code: 1 }, { unique: true });

const School = mongoose.model('School', schoolSchema);
module.exports = School;
```

### 3.3 CLASS - Lớp học

```javascript
// server/src/models/class.model.js

const classSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    gradeLevel: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    academicYear: {
      type: String,  // VD: "2025-2026"
      required: true,
    },
    // Giáo viên chủ nhiệm
    homeroomTeacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Giáo viên bộ môn (có thể dạy nhiều lớp)
    subjectTeachers: [{
      subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
      teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    }],
    // Danh sách học sinh
    studentIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    // Trường học
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Composite index để tránh trùng lớp trong cùng trường
classSchema.index({ schoolId: 1, code: 1, academicYear: 1 }, { unique: true });

const Class = mongoose.model('Class', classSchema);
module.exports = Class;
```

### 3.4 SUBJECT - Môn học

```javascript
// server/src/models/subject.model.js

const subjectSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
    },
    description: String,
    gradeLevel: {
      type: Number,
      min: 1,
      max: 12,
    },
    iconUrl: String,
    color: String,  // Màu hiển thị trên UI
    // Danh sách chủ đề
    topics: [{
      name: String,
      code: String,
      parentTopicId: mongoose.Schema.Types.ObjectId,
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

subjectSchema.index({ code: 1 }, { unique: true });

const Subject = mongoose.model('Subject', subjectSchema);
module.exports = Subject;
```

### 3.5 QUESTION - Câu hỏi (Ngân hàng câu hỏi)

```javascript
// server/src/models/question.model.js

const questionSchema = mongoose.Schema(
  {
    // Nội dung câu hỏi
    content: {
      type: String,
      required: true,
    },
    // Loại câu hỏi
    type: {
      type: String,
      enum: ['single_choice', 'multiple_choice'],
      default: 'single_choice',
    },
    // Các lựa chọn
    options: [{
      id: {
        type: String,
        enum: ['A', 'B', 'C', 'D'],
      },
      content: String,  // Có thể chứa text hoặc URL hình ảnh
      isCorrect: Boolean,
    }],
    // Đáp án đúng (cho single choice)
    correctAnswer: {
      type: String,
      enum: ['A', 'B', 'C', 'D'],
      required: function() { return this.type === 'single_choice'; }
    },
    // Đáp án đúng (cho multiple choice)
    correctAnswers: [{
      type: String,
      enum: ['A', 'B', 'C', 'D'],
    }],
    // Điểm số của câu hỏi
    score: {
      type: Number,
      default: 1,
      min: 0.5,
      max: 10,
    },
    // Độ khó
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    // Chủ đề
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject.topics',
    },
    // Metadata
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Nguồn tạo (AI hoặc manual)
    source: {
      type: String,
      enum: ['ai', 'manual', 'imported'],
      default: 'manual',
    },
    // AI prompt đã dùng (nếu có)
    aiPrompt: String,
    // Giải thích đáp án
    explanation: {
      type: String,
      default: null,
    },
    // Hình ảnh đính kèm
    imageUrl: String,
    // Tags
    tags: [String],
    // Trạng thái duyệt
    isApproved: {
      type: Boolean,
      default: function() { return this.createdBy?.role === 'admin'; }
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Thống kê sử dụng
    usageCount: {
      type: Number,
      default: 0,
    },
    correctRate: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

// Index cho tìm kiếm
questionSchema.index({ subjectId: 1, difficulty: 1 });
questionSchema.index({ topicId: 1 });
questionSchema.index({ tags: 1 });
questionSchema.text({ content: 'text' });

const Question = mongoose.model('Question', questionSchema);
module.exports = Question;
```

### 3.6 EXAM - Kỳ thi

```javascript
// server/src/models/exam.model.js

const examSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: String,
    // ══════════════════════════════════════════════════════════════════
    // HỖ TRỢ NHIỀU LỚP (theo yêu cầu tài liệu)
    // "1 bài kiểm tra có thể áp dụng cho nhiều lớp"
    // ══════════════════════════════════════════════════════════════════
    classIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    }],
    primaryClassId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // ══════════════════════════════════════════════════════════════════
    // LIÊN KẾT OMR TEMPLATE
    // ══════════════════════════════════════════════════════════════════
    omrTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OMRTemplate',
      required: true,
    },
    // Override template config (nếu cần customize cho bài thi này)
    omrOverrides: {
      // Số câu hỏi trong bài thi (override template)
      numberOfQuestions: Number,
      // Tùy chỉnh khác
      customBubbleConfig: {
        bubbleSize: {
          width: Number,
          height: Number,
        },
      },
    },
    // Thông tin kỳ thi
    examDate: {
      type: Date,
      required: true,
    },
    startTime: String,  // "07:00"
    duration: {
      type: Number,  // Phút
      required: true,
    },
    // Tổng điểm
    totalScore: {
      type: Number,
      required: true,
    },
    passingScore: {
      type: Number,
      default: 5,
    },
    // Số câu hỏi (lấy từ template hoặc override)
    numberOfQuestions: {
      type: Number,
      required: true,
    },
    // Trạng thái
    status: {
      type: String,
      enum: ['draft', 'published', 'in_progress', 'completed', 'archived'],
      default: 'draft',
    },
    // Cấu hình in ấn
    printConfig: {
      paperSize: {
        type: String,
        enum: ['A4', 'A5'],
        default: 'A4',
      },
      questionsPerPage: {
        type: Number,
        default: 5,
      },
      includeAnswerSheet: {
        type: Boolean,
        default: true,
      },
      schoolHeader: {
        type: Boolean,
        default: true,
      },
    },
    // Số lượng mã đề muốn tạo
    numberOfVersions: {
      type: Number,
      min: 1,
      max: 50,
      default: 4,
    },
    // Mảng ID câu hỏi đã chọn
    questionIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
    }],
    // Danh sách các mã đề đã tạo
    versions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamVersion',
    }],
    // Cấu hình shuffle
    shuffleConfig: {
      shuffleQuestions: {
        type: Boolean,
        default: true,
      },
      shuffleOptions: {
        type: Boolean,
        default: true,
      },
    },
    // Ai đã nhận được thông báo
    notifiedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    // Lịch sử thay đổi
    changeHistory: [{
      changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      changedAt: Date,
      changes: mongoose.Schema.Types.Mixed,
    }],
  },
  {
    timestamps: true,
  }
);

examSchema.index({ classId: 1, examDate: -1 });
examSchema.index({ status: 1 });
examSchema.index({ omrTemplateId: 1 });

const Exam = mongoose.model('Exam', examSchema);
module.exports = Exam;
```

### 3.7 EXAM_VERSION - Mã đề

Đây là **KEY COLLECTION** - Lưu trữ ma trận câu hỏi hoán vị.

```javascript
// server/src/models/examVersion.model.js

const examVersionSchema = mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    // Mã đề (101, 102, 103...)
    versionCode: {
      type: String,
      required: true,
    },
    // Cấu hình số câu
    numberOfQuestions: {
      type: Number,
      required: true,
    },
    // ════════════════════════════════════════════════════════
    // MA TRẬN CÂU HỎI - QUAN TRỌNG NHẤT
    // ════════════════════════════════════════════════════════
    // questions[] lưu trữ thứ tự câu hỏi SAU KHI SHUFFLE
    // Mỗi entry chứa:
    //   - originalIndex: Vị trí trong đề gốc (để lấy đáp án)
    //   - shuffledIndex: Vị trí hiển thị trong mã đề này
    //   - questionId: ID câu hỏi gốc
    questions: [{
      // Vị trí trong mã đề này (1, 2, 3...)
      position: {
        type: Number,
        required: true,
      },
      // ID câu hỏi gốc
      questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
        required: true,
      },
      // Thứ tự gốc trong đề mẫu
      originalPosition: {
        type: Number,
        required: true,
      },
      // Shuffled options cho mã đề này
      shuffledOptions: [{
        id: String,        // A, B, C, D
        content: String,
        isCorrect: Boolean,
      }],
    }],
    // ════════════════════════════════════════════════════════
    // ĐÁP ÁN ĐÚNG (theo vị trí SHUFFLED)
    // ════════════════════════════════════════════════════════
    answerKey: {
      type: Map,  // Map<vị trí_sau_shuffle, đáp_án>
      of: String,
      required: true,
    },
    // ════════════════════════════════════════════════════════
    // THÔNG TIN PDF
    // ════════════════════════════════════════════════════════
    pdfUrl: {
      type: String,
      default: null,
    },
    answerSheetPdfUrl: {
      type: String,
      default: null,
    },
    // Số lượng bài đã nộp
    submissionCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index
examVersionSchema.index({ examId: 1, versionCode: 1 }, { unique: true });

const ExamVersion = mongoose.model('ExamVersion', examVersionSchema);
module.exports = ExamVersion;
```

### 3.8 SUBMISSION - Bài nộp

Đây là **KEY COLLECTION** - Lưu trữ chi tiết kết quả chấm OMR.

```javascript
// server/src/models/submission.model.js

const submissionSchema = mongoose.Schema(
  {
    // Liên kết
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    versionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamVersion',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Số báo danh (từ OMR scan)
    studentCode: {
      type: String,
      required: true,
    },
    // ════════════════════════════════════════════════════════
    // ĐÁP ÁN HỌC SINH (CHI TIẾT NHẤT)
    // ════════════════════════════════════════════════════════
    answers: [{
      // Vị trí câu hỏi trong mã đề (1, 2, 3...)
      position: {
        type: Number,
        required: true,
      },
      // ID câu hỏi gốc
      questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
        required: true,
      },
      // Đáp án học sinh đã chọn
      selectedAnswer: {
        type: String,
        enum: ['A', 'B', 'C', 'D', null],
        default: null,
      },
      // Đáp án đúng
      correctAnswer: {
        type: String,
        required: true,
      },
      // Có đúng không?
      isCorrect: {
        type: Boolean,
        required: true,
      },
      // Điểm cho câu này
      score: {
        type: Number,
        required: true,
      },
      // ════════════════════════════════════════════════════
      // DỮ LIỆU OMR - TỌA ĐỘ THỰC TẾ (pixel trong ảnh gốc)
      // ════════════════════════════════════════════════════
      omrData: {
        // ─────────────────────────────────────────────────
        // TỌA ĐỘ TRONG ẢNH GỐC (sau khi align/crop)
        // ─────────────────────────────────────────────────
        position: {
          // Vị trí câu hỏi (hàng, cột trong lưới)
          row: Number,
          col: Number,
        },
        // Tọa độ pixel của ô đã tô
        bubble: {
          x: Number,           // Tọa độ X (pixel)
          y: Number,           // Tọa độ Y (pixel)
          width: Number,       // Chiều rộng (pixel)
          height: Number,      // Chiều cao (pixel)
        },
        // ─────────────────────────────────────────────────
        // ĐỘ ĐẬM & CHẤT LƯỢNG
        // ─────────────────────────────────────────────────
        fillIntensity: {
          type: Number,       // 0-255, độ đậm trung bình
          min: Number,        // Pixel tối thiểu
          max: Number,       // Pixel tối đa
          percentage: Number,  // % diện tích đã tô
        },
        // ─────────────────────────────────────────────────
        // CÁC Ô ĐÃ PHÁT HIỆN (cho phát hiện tô đúp)
        // ─────────────────────────────────────────────────
        detectedAnswers: [{
          optionId: String,    // 'A', 'B', 'C', 'D'
          isSelected: Boolean,
          intensity: Number,
          position: {
            x: Number,
            y: Number,
          },
        }],
        // ─────────────────────────────────────────────────
        // CẢNH BÁO
        // ─────────────────────────────────────────────────
        warnings: [{
          type: {
            type: String,
            enum: ['double_fill', 'empty', 'unclear', 'too_light'],
          },
          message: String,
          severity: {
            type: String,
            enum: ['info', 'warning', 'error'],
            default: 'warning',
          },
        }],
      },
    }],
    // ════════════════════════════════════════════════════════
    // TỔNG ĐIỂM
    // ════════════════════════════════════════════════════════
    totalScore: {
      type: Number,
      required: true,
    },
    maxScore: {
      type: Number,
      required: true,
    },
    // Điểm sau phúc khảo
    finalScore: {
      type: Number,
      required: true,
    },
    // ════════════════════════════════════════════════════════
    // HÌNH ẢNH BÀI THI
    // ════════════════════════════════════════════════════════
    images: {
      // Ảnh gốc chụp được
      original: {
        url: String,
        width: Number,
        height: Number,
        dpi: Number,
      },
      // Ảnh đã tiền xử lý (đã crop, xoay, chỉnh contrast)
      preprocessed: {
        url: String,
        width: Number,
        height: Number,
      },
      // Ảnh đã vẽ đè kết quả (xanh/đỏ)
      annotated: {
        url: String,
        markers: [{
          type: {
            type: String,
            enum: ['correct', 'incorrect', 'double_fill', 'empty'],
          },
          x: Number,
          y: Number,
          radius: Number,
          color: String,
        }],
      },
    },
    // ════════════════════════════════════════════════════════
    // THÔNG TIN QUÉT (SCAN METADATA)
    // ════════════════════════════════════════════════════════
    scanMetadata: {
      // Thiết bị quét
      deviceInfo: {
        platform: String,     // 'ios', 'android', 'web'
        deviceModel: String,
        appVersion: String,
      },
      // Thời gian
      scannedAt: Date,
      processingTimeMs: Number,
      // Kết quả OCR
      ocr: {
        versionCode: {
          detected: String,
          confidence: Number,
          rawText: String,
        },
        studentCode: {
          detected: String,
          confidence: Number,
          rawText: String,
        },
      },
    },
    // ════════════════════════════════════════════════════════
    // TRẠNG THÁI CHẤM
    // ════════════════════════════════════════════════════════
    status: {
      type: String,
      enum: ['pending', 'scanning', 'scanned', 'manual_review', 'completed', 'appealed'],
      default: 'pending',
    },
    // ════════════════════════════════════════════════════════
    // TRẠNG THÁI CHẤM
    // ════════════════════════════════════════════════════════
    status: {
      type: String,
      enum: [
        'pending',      // Chưa quét
        'scanning',     // Đang quét
        'scanned',      // Đã quét, chờ duyệt
        'manual_review', // Cần xem xét thủ công
        'completed',    // Hoàn thành
        'appealed'      // Có khiếu nại
      ],
      default: 'pending',
    },
    // ════════════════════════════════════════════════════════
    // THÔNG TIN OMR TỔNG HỢP
    // ════════════════════════════════════════════════════════
    omrSummary: {
      // Tổng số câu
      totalQuestions: Number,
      // Số câu đúng/sai
      correctCount: Number,
      incorrectCount: Number,
      emptyCount: Number,
      doubleFillCount: Number,
      // Tỷ lệ đúng
      accuracy: Number,        // % đúng
      // Cảnh báo
      warnings: [{
        type: String,
        positions: [Number],  // Các vị trí câu bị cảnh báo
        message: String,
      }],
      // Độ chính xác OCR tổng thể
      ocrConfidence: Number,
    },
    // ════════════════════════════════════════════════════════
    // MANUAL OVERRIDE
    // ════════════════════════════════════════════════════════
    manualOverrides: [{
      position: Number,       // Vị trí câu bị override
      originalAnswer: String,
      correctedAnswer: String,
      reason: String,
      overriddenBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      overriddenAt: Date,
    }],
    // ════════════════════════════════════════════════════════
    // NGƯỜI CHẤM
    // ════════════════════════════════════════════════════════
    scannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    scannedAt: Date,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Index
submissionSchema.index({ examId: 1, studentCode: 1 }, { unique: true });
submissionSchema.index({ studentId: 1, examId: 1 });
submissionSchema.index({ status: 1 });

const Submission = mongoose.model('Submission', submissionSchema);
module.exports = Submission;
```

### 3.9 APPEAL - Phúc khảo

```javascript
// server/src/models/appeal.model.js

const appealSchema = mongoose.Schema(
  {
    // Liên kết
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission',
      required: true,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Câu hỏi khiếu nại
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    // Vị trí câu hỏi trong bài thi
    questionPosition: {
      type: Number,
      required: true,
    },
    // Lý do khiếu nại
    reason: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    // Ảnh chụp khu vực câu hỏi (nếu cần)
    evidenceImageUrl: String,
    // ════════════════════════════════════════════════════════
    // TRẠNG THÁI PHÊ DUYỆT
    // ════════════════════════════════════════════════════════
    status: {
      type: String,
      enum: ['pending', 'under_review', 'approved', 'rejected'],
      default: 'pending',
    },
    // Phản hồi từ giáo viên
    teacherResponse: {
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      reviewedAt: Date,
      decision: {
        type: String,
        enum: ['approved', 'rejected'],
      },
      note: String,
      // Nếu chấp nhận, điểm điều chỉnh
      scoreAdjustment: {
        oldScore: Number,
        newScore: Number,
      },
    },
    // Thông báo đã gửi chưa?
    studentNotified: {
      type: Boolean,
      default: false,
    },
    studentNotifiedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Index
appealSchema.index({ submissionId: 1, questionId: 1 }, { unique: true });
appealSchema.index({ status: 1 });
appealSchema.index({ studentId: 1, status: 1 });

const Appeal = mongoose.model('Appeal', appealSchema);
module.exports = Appeal;
```

### 3.10 AI_REPORT - Báo cáo AI Tutor

```javascript
// server/src/models/aiReport.model.js

const aiReportSchema = mongoose.Schema(
  {
    // Sinh viên
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Bài thi
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    // ════════════════════════════════════════════════════════
    // PHÂN TÍCH LỖI SAI
    // ════════════════════════════════════════════════════════
    mistakes: [{
      // Câu hỏi
      questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
      },
      position: Number,
      // Loại lỗi
      mistakeType: {
        type: String,
        enum: [
          'concept_misunderstanding',  // Hiểu sai khái niệm
          'calculation_error',          // Tính toán sai
          'careless_mistake',           // Đọc đề sai, tô nhầm
          'weak_topic',                 // Yếu chủ đề
          'time_pressure',              // Hết giờ
        ],
      },
      // Chủ đề bị yếu
      weakTopics: [{
        topicId: mongoose.Schema.Types.ObjectId,
        topicName: String,
      }],
    }],
    // ════════════════════════════════════════════════════════
    // GỢI Ý TỪ AI
    // ════════════════════════════════════════════════════════
    suggestions: {
      // Văn bản tư vấn tổng hợp
      overallAdvice: String,
      // Các câu hỏi luyện tập gợi ý
      practiceQuestions: [{
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Question',
        },
        reason: String,  // Tại sao gợi ý câu này
      }],
      // Tài liệu tham khảo
      resources: [{
        title: String,
        url: String,
        type: String,  // video, article, exercise
      }],
    },
    // ════════════════════════════════════════════════════════
    // THỐNG KÊ
    // ════════════════════════════════════════════════════════
    statistics: {
      totalQuestions: Number,
      correctCount: Number,
      incorrectCount: Number,
      score: Number,
      weakAreas: [String],
      strongAreas: [String],
    },
    // ════════════════════════════════════════════════════════
    // META
    // ════════════════════════════════════════════════════════
    modelUsed: {
      type: String,
      enum: ['gemini', 'gpt', 'claude'],
    },
    promptTokens: Number,
    responseTokens: Number,
    processingTimeMs: Number,
  },
  {
    timestamps: true,
  }
);

// Index
aiReportSchema.index({ studentId: 1, examId: 1 }, { unique: true });
aiReportSchema.index({ studentId: 1, createdAt: -1 });

const AIReport = mongoose.model('AIReport', aiReportSchema);
module.exports = AIReport;
```

### 3.11 AI_CHAT - Tin nhắn AI Tutor

```javascript
// server/src/models/aiChat.model.js

const aiChatSchema = mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
    },
    // Ngữ cảnh (context) cho AI
    context: {
      recentMistakes: [{
        questionId: mongoose.Schema.Types.ObjectId,
        questionContent: String,
        studentAnswer: String,
        correctAnswer: String,
      }],
      weakTopics: [String],
      gradeLevel: Number,
      subjectId: mongoose.Schema.Types.ObjectId,
    },
    // Tin nhắn
    messages: [{
      role: {
        type: String,
        enum: ['user', 'assistant'],
        required: true,
      },
      content: {
        type: String,
        required: true,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
      // Metadata cho assistant
      metadata: {
        sources: [String],
        relatedQuestionIds: [mongoose.Schema.Types.ObjectId],
      },
    }],
    // Trạng thái
    isActive: {
      type: Boolean,
      default: true,
    },
    lastMessageAt: Date,
  },
  {
    timestamps: true,
  }
);

aiChatSchema.index({ studentId: 1, lastMessageAt: -1 });

const AIChat = mongoose.model('AIChat', aiChatSchema);
module.exports = AIChat;
```

### 3.12 TOKEN - Xác thực

```javascript
// server/src/models/token.model.js (ĐÃ CÓ)

const tokenSchema = mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['refresh', 'resetPassword', 'verifyEmail'],
      required: true,
    },
    expires: {
      type: Date,
      required: true,
    },
    blacklisted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Token = mongoose.model('Token', tokenSchema);
module.exports = Token;
```

### 3.13 NOTIFICATION - Thông báo

```javascript
// server/src/models/notification.model.js

const notificationSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'exam_published',      // Bài thi mới
        'exam_reminder',        // Nhắc nhở
        'score_available',      // Có điểm
        'appeal_submitted',     // Đã gửi phúc khảo
        'appeal_resolved',      // Phúc khảo có kết quả
        'ai_report_ready',     // Báo cáo AI xong
        'system',               // Thông báo hệ thống
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    body: String,
    data: {
      examId: mongoose.Schema.Types.ObjectId,
      submissionId: mongoose.Schema.Types.ObjectId,
      appealId: mongoose.Schema.Types.ObjectId,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
    // Kênh gửi
    channels: [{
      type: String,
      enum: ['in_app', 'email', 'push'],
    }],
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
```

---

## 4. Mối quan hệ giữa các Collections

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          RELATIONSHIP SUMMARY                                │
└─────────────────────────────────────────────────────────────────────────────┘

SCHOOL (1) ──────< (N) CLASS
   │
   └───────────────< (N) USER

SUBJECT (1) ─────< (N) QUESTION
   │
   └───────────────< (N) EXAM

CLASS (1) ───────< (N) EXAM
   │
   └───────────────< (N) SUBMISSION
                            │
                            ├────< (N) APPEAL

USER (1) ────────< (N) EXAM (createdBy)
   │
   ├──────────────< (N) SUBMISSION (studentId)
   │
   ├──────────────< (N) SUBMISSION (scannedBy)
   │
   ├──────────────< (N) AI_REPORT
   │
   ├──────────────< (N) AI_CHAT
   │
   └──────────────< (N) APPEAL (reviewedBy)

EXAM (1) ────────< (N) EXAM_VERSION
   │
   ├───────────────< (N) SUBMISSION
   │
   └───────────────< (1) EXAM_REPORT

QUESTION (1) ────< (N) SUBMISSION.answers (questionId)
   │
   └───────────────< (N) APPEAL (questionId)

USER (1) ────────< (N) STUDENT_PROGRESS
```

---

### 3.14 STUDENT_PROGRESS - Tiến độ học tập

**Mới** - Theo yêu cầu: "Biểu đồ đường theo dõi xu hướng điểm số"

```javascript
// server/src/models/studentProgress.model.js

const studentProgressSchema = mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
  },
  scoreHistory: [{
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam' },
    score: Number,
    maxScore: Number,
    percentage: Number,
    grade: String,
    correctCount: Number,
    examDate: Date,
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  }],
  overallAverageScore: Number,
  totalExams: { type: Number, default: 0 },
  totalCorrect: { type: Number, default: 0 },
  totalQuestions: { type: Number, default: 0 },
  subjectPerformance: [{
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    averageScore: Number,
    examCount: Number,
    trend: { type: String, enum: ['up', 'down', 'stable'] },
  }],
  topicPerformance: [{
    topicId: mongoose.Schema.Types.ObjectId,
    correctCount: Number,
    totalCount: Number,
    accuracy: Number,
  }],
  rankings: [{
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam' },
    rank: Number,
    totalStudents: Number,
    percentile: Number,
  }],
});
```

### 3.15 EXAM_REPORT - Báo cáo bài thi

**Mới** - Theo yêu cầu UC5: "Điểm TB, cao nhất, thấp nhất, tỷ lệ Giỏi/Khá/Trung bình/Yếu"

```javascript
// server/src/models/examReport.model.js

const examReportSchema = mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true,
    unique: true,
  },
  statistics: {
    totalStudents: Number,
    submittedCount: Number,
    averageScore: Number,
    averagePercentage: Number,
    highestScore: Number,
    lowestScore: Number,
    standardDeviation: Number,
  },
  scoreDistribution: [{
    range: String,
    count: Number,
    percentage: Number,
  }],
  gradeDistribution: {
    excellent: { count: Number, percentage: Number },
    good: { count: Number, percentage: Number },
    average: { count: Number, percentage: Number },
    poor: { count: Number, percentage: Number },
  },
  questionAnalysis: [{
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    position: Number,
    accuracy: Number,
    correctCount: Number,
    incorrectCount: Number,
  }],
  hardestQuestions: [{
    questionId: mongoose.Schema.Types.ObjectId,
    accuracy: Number,
  }],
  topStudents: [{
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    score: Number,
    rank: Number,
  }],
  bottomStudents: [{ ... }],
  insights: {
    overallAnalysis: String,
    recommendations: [String],
  },
  status: { type: String, enum: ['generating', 'completed', 'failed'] },
  pdfUrl: String,
  excelUrl: String,
});

---

## 5. Ví dụ Data Mẫu

### 5.1 Ví dụ: Submission với Ma trận Hoán vị

Giả sử:
- Đề gốc có 5 câu: Q1, Q2, Q3, Q4, Q5 (đáp án: A, B, C, D, A)
- Mã đề 101 shuffle: Câu 3 → vị trí 1, Câu 1 → vị trí 2, ...

**EXAM_VERSION (Mã đề 101):**

```json
{
  "_id": ObjectId("..."),
  "examId": ObjectId("exam_001"),
  "versionCode": "101",
  "questions": [
    { "position": 1, "questionId": "Q3", "originalPosition": 3, "shuffledOptions": [...] },
    { "position": 2, "questionId": "Q1", "originalPosition": 1, "shuffledOptions": [...] },
    { "position": 3, "questionId": "Q5", "originalPosition": 5, "shuffledOptions": [...] },
    { "position": 4, "questionId": "Q2", "originalPosition": 2, "shuffledOptions": [...] },
    { "position": 5, "questionId": "Q4", "originalPosition": 4, "shuffledOptions": [...] }
  ],
  "answerKey": {
    "1": "C",  // Câu 1 (thực chất là Q3 gốc) đáp án C
    "2": "A",  // Câu 2 (thực chất là Q1 gốc) đáp án A
    "3": "A",  // Câu 3 (thực chất là Q5 gốc) đáp án A
    "4": "B",  // Câu 4 (thực chất là Q2 gốc) đáp án B
    "5": "D"   // Câu 5 (thực chất là Q4 gốc) đáp án D
  }
}
```

**SUBMISSION (Bài nộp của HS):**

```json
{
  "_id": ObjectId("..."),
  "examId": ObjectId("exam_001"),
  "versionId": ObjectId("version_101"),
  "studentId": ObjectId("student_001"),
  "studentCode": "01",
  "answers": [
    {
      "position": 1,
      "questionId": "Q3",
      "selectedAnswer": "C",
      "correctAnswer": "C",
      "isCorrect": true,
      "score": 2,
      "omrData": {
        "bubbleX": 150,
        "bubbleY": 230,
        "fillIntensity": 245,
        "centerX": 165,
        "centerY": 245
      }
    },
    {
      "position": 2,
      "questionId": "Q1",
      "selectedAnswer": "B",
      "correctAnswer": "A",
      "isCorrect": false,
      "score": 0,
      "omrData": {
        "bubbleX": 150,
        "bubbleY": 280,
        "fillIntensity": 238,
        "isDoubleFilled": false
      }
    }
  ],
  "totalScore": 6,
  "maxScore": 10,
  "finalScore": 6,
  "status": "completed",
  "omrResult": {
    "detectedVersionCode": "101",
    "detectedStudentCode": "01",
    "ocrConfidence": 98.5,
    "warnings": []
  }
}
```

---

## 6. Indexing Strategy

### 6.1 Primary Indexes (Tự động)

```javascript
// _id luôn được index
```

### 6.2 Query Optimization Indexes

```javascript
// USER queries
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ schoolId: 1, studentCode: 1 });
userSchema.index({ classIds: 1 });

// CLASS queries
classSchema.index({ schoolId: 1, code: 1, academicYear: 1 }, { unique: true });
classSchema.index({ studentIds: 1 });

// EXAM queries
examSchema.index({ classId: 1, examDate: -1 });
examSchema.index({ status: 1, createdBy: 1 });
examSchema.index({ examDate: 1, status: 1 });  // Cho reminder job

// EXAM_VERSION queries
examVersionSchema.index({ examId: 1, versionCode: 1 }, { unique: true });

// SUBMISSION queries
submissionSchema.index({ examId: 1, studentCode: 1 }, { unique: true });
submissionSchema.index({ studentId: 1, examId: 1 });
submissionSchema.index({ status: 1 });  // Cho pending queue
submissionSchema.index({ scannedAt: -1 });  // Cho dashboard

// APPEAL queries
appealSchema.index({ submissionId: 1, questionId: 1 }, { unique: true });
appealSchema.index({ status: 1, createdAt: -1 });
appealSchema.index({ studentId: 1, status: 1 });

// QUESTION queries
questionSchema.index({ subjectId: 1, difficulty: 1 });
questionSchema.index({ tags: 1 });
questionSchema.index({ content: 'text' });  // Full-text search
questionSchema.index({ isApproved: 1, subjectId: 1 });

// AI_REPORT queries
aiReportSchema.index({ studentId: 1, examId: 1 }, { unique: true });
aiReportSchema.index({ studentId: 1, createdAt: -1 });

// NOTIFICATION queries
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
```

### 6.3 Compound Indexes cho Aggregation

```javascript
// Thống kê điểm theo lớp
submissionSchema.index({ examId: 1, 'answers.isCorrect': 1 });

// Top students
submissionSchema.index({ examId: 1, totalScore: -1 });

// AI Report generation
submissionSchema.index({ examId: 1, status: 1 });
```

---

## 7. Data Migration & Seeding

### 7.1 Seeding Subjects (Mẫu)

```javascript
const subjects = [
  { name: 'Toán', code: 'MATH', gradeLevel: [1,2,3,4,5,6,7,8,9,10,11,12], color: '#4F46E5' },
  { name: 'Ngữ văn', code: 'LIT', gradeLevel: [1,2,3,4,5,6,7,8,9,10,11,12], color: '#059669' },
  { name: 'Tiếng Anh', code: 'ENG', gradeLevel: [3,4,5,6,7,8,9,10,11,12], color: '#D97706' },
  { name: 'Vật lý', code: 'PHY', gradeLevel: [6,7,8,9,10,11,12], color: '#7C3AED' },
  { name: 'Hóa học', code: 'CHEM', gradeLevel: [8,9,10,11,12], color: '#0891B2' },
  { name: 'Sinh học', code: 'BIO', gradeLevel: [6,7,8,9,10,11,12], color: '#16A34A' },
  { name: 'Lịch sử', code: 'HIS', gradeLevel: [4,5,6,7,8,9,10,11,12], color: '#DC2626' },
  { name: 'Địa lý', code: 'GEO', gradeLevel: [4,5,6,7,8,9,10,11,12], color: '#65A30D' },
  { name: 'GDCD', code: 'CIVIC', gradeLevel: [8,9,10,11,12], color: '#EC4899' },
];
```

---

## 8. Backup & Recovery Strategy

### 8.1 Backup Schedule

| Loại | Tần suất | Giữ lại |
|------|----------|---------|
| Full Backup | Hàng ngày (00:00) | 30 ngày |
| Incremental | Mỗi 6 giờ | 7 ngày |
| Config Backup | Mỗi lần deploy | 10 bản |

### 8.2 Collections cần backup đặc biệt

```javascript
// Priority 1: Không thể khôi phục
// - SUBMISSION (bài thi gốc)
// - APPEAL (quyết định phúc khảo)

// Priority 2: Có thể tái tạo
// - QUESTION (từ AI prompt)
// - EXAM (từ cấu hình)

// Priority 3: Cached/generated
// - AI_REPORT (tái tạo từ SUBMISSION)
// - AI_CHAT (lịch sử có thể mất)
```

---

## 9. Security Considerations

### 9.1 Data Privacy

```javascript
// Mã hóa các trường nhạy cảm
userSchema.plugin(require('./plugins/encrypt'), {
  fields: ['phone', 'dateOfBirth']
});

// Ẩn thông tin học sinh khỏi giáo viên không dạy lớp
submissionSchema.statics.checkAccess = async function(submissionId, userId) {
  const submission = await this.findById(submissionId).populate({
    path: 'examId',
    match: { classId: { $in: user.classIds } }
  });
  return submission && submission.examId;
};
```

### 9.2 Audit Log

```javascript
// Collection để log tất cả thay đổi
const auditLogSchema = mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  action: String,  // CREATE, UPDATE, DELETE
  collection: String,
  documentId: mongoose.Schema.Types.ObjectId,
  changes: mongoose.Schema.Types.Mixed,
  ip: String,
  timestamp: { type: Date, default: Date.now }
});
```

---

## 10. Performance Optimization

### 10.1 Population Strategy

```javascript
// Chỉ populate cần thiết
const submission = await Submission.findById(id)
  .select('studentCode totalScore answers')  // Chỉ lấy field cần
  .populate('answers.questionId', 'content difficulty');  // Partial populate

// Không populate toàn bộ exam
```

### 10.2 Aggregation Pipelines

```javascript
// Dashboard: Thống kê nhanh
Submission.aggregate([
  { $match: { examId: ObjectId(examId) } },
  { $group: {
      _id: null,
      avgScore: { $avg: '$totalScore' },
      maxScore: { $max: '$totalScore' },
      minScore: { $min: '$totalScore' },
      totalSubmissions: { $sum: 1 }
    }
  }
]);
```

---

## 11. File Structure

```
server/src/models/
├── index.js                    # Export tất cả models
├── plugins/
│   ├── index.js
│   ├── paginate.plugin.js
│   ├── toJSON.plugin.js
│   └── encrypt.plugin.js
│
├── user.model.js               # Người dùng (MỞ RỘNG)
├── token.model.js              # Token xác thực
├── school.model.js             # Trường học
├── class.model.js              # Lớp học
├── subject.model.js            # Môn học
├── omrTemplate.model.js       # Mẫu phiếu OMR
├── question.model.js          # Câu hỏi
├── exam.model.js              # Kỳ thi (MỞ RỘNG - multi-class)
├── examVersion.model.js      # Mã đề (MA TRẬN)
├── submission.model.js        # Bài nộp (OMR)
├── appeal.model.js            # Phúc khảo
├── aiReport.model.js         # Báo cáo AI
├── aiChat.model.js           # Chat AI
├── notification.model.js      # Thông báo
├── studentProgress.model.js  # Tiến độ HS (MỚI)
└── examReport.model.js       # Báo cáo thi (MỚI)
```

---

## 12. Mermaid ERD (Copy vào docs)

```mermaid
erDiagram
    SCHOOL ||--o{ CLASS : "has"
    SCHOOL ||--o{ USER : "belongs to"
    
    CLASS ||--o{ USER : "students"
    CLASS ||--o{ USER : "homeroom"
    CLASS ||--o{ EXAM : "hosts"
    
    SUBJECT ||--o{ QUESTION : "contains"
    SUBJECT ||--o{ EXAM : "for"
    
    EXAM ||--o{ EXAM_VERSION : "generates"
    EXAM ||--o{ SUBMISSION : "receives"
    
    EXAM_VERSION ||--o{ SUBMISSION : "answered by"
    
    USER ||--o{ EXAM : "creates"
    USER ||--o{ SUBMISSION : "submits"
    USER ||--o{ SUBMISSION : "scans"
    USER ||--o{ APPEAL : "appeals"
    USER ||--o{ AI_REPORT : "receives"
    
    SUBMISSION ||--o{ APPEAL : "has"
    
    QUESTION ||--o{ APPEAL : "about"
    QUESTION ||--o{ SUBMISSION.answers : "answered in"
```

---

**Tài liệu này sẽ được cập nhật khi hệ thống phát triển.**
