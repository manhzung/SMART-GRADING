"""
Generate mockup images for Smart Grading system UI design section.
Uses the actual color palette from the codebase.
"""

from PIL import Image, ImageDraw, ImageFont
import os

# ─── Color Palette (from actual code) ────────────────────────────────────────
C = {
    "primary":       (11, 34, 64),      # #0b2240
    "primary_hover": (17, 45, 82),      # #112d52
    "accent":        (170, 59, 255),    # #aa3bff
    "bg":            (255, 255, 255),   # #ffffff
    "surface":       (243, 244, 246),    # #f3f4f6
    "border":        (229, 228, 231),    # #e5e4e7
    "text_h":        (8, 6, 13),         # #08060d
    "text":          (107, 99, 117),    # #6b6375
    "success":       (5, 150, 105),     # #059669
    "warning":       (217, 119, 6),     # #d97706
    "error":         (220, 38, 38),      # #dc2626
    "accent_bg":     (170, 59, 255, 25),# rgba accent bg
    "input_bg":      (255, 255, 255),
    "label":         (55, 65, 81),       # #374151
    "label_light":   (107, 114, 128),    # #6b7280
    "divider":       (229, 231, 235),    # #e5e7eb
    "error_bg":      (254, 242, 242),    # #fef2f2
    "error_border":  (252, 165, 165),    # #fca5a5
    # Role badges
    "badge_admin_bg":    (11, 34, 64),
    "badge_admin_text":  (255, 255, 255),
    "badge_school_bg":   (239, 246, 255),
    "badge_school_text": (30, 64, 175),
    "badge_teacher_bg":  (236, 253, 245),
    "badge_teacher_text":(6, 95, 70),
    "badge_student_bg":  (250, 245, 255),
    "badge_student_text":(107, 33, 168),
}

W, H = 1200, 750   # Web canvas
MW, MH = 400, 800  # Mobile canvas


def rr(draw, xy, r, fill):
    x1, y1, x2, y2 = xy
    draw.rounded_rectangle([x1, y1, x2, y2], radius=r, fill=fill)


def pill(draw, xy, fill, text, font, text_color):
    x1, y1, x2, y2 = xy
    draw.rounded_rectangle([x1, y1, x2, y2], radius=999, fill=fill)
    bx = (x1 + x2) // 2
    by = (y1 + y2) // 2
    tw, th = font.getbbox(text)[2], font.getbbox(text)[3]
    draw.text((bx - tw // 2, by - th // 2 - 1), text, fill=text_color, font=font)


def button(draw, xy, fill, text, font, text_color=(255, 255, 255), shadow=False):
    x1, y1, x2, y2 = xy
    if shadow:
        draw.rounded_rectangle([x1 + 2, y1 + 2, x2 + 2, y2 + 2], radius=6, fill=(0, 0, 0, 30))
    draw.rounded_rectangle([x1, y1, x2, y2], radius=6, fill=fill)
    bx = (x1 + x2) // 2
    by = (y1 + y2) // 2
    tw = font.getbbox(text)[2]
    draw.text((bx - tw // 2, by - 8), text, fill=text_color, font=font)


def input_field(draw, xy, label, placeholder="", font_label=None, font_input=None):
    x1, y1, x2, y2 = xy
    # Label
    draw.text((x1, y1 - 18), label, fill=C["label"], font=font_label)
    # Field
    draw.rounded_rectangle([x1, y1, x2, y2], radius=6, outline=C["border"], width=1)
    if placeholder:
        draw.text((x1 + 10, y1 + 8), placeholder, fill=C["label_light"], font=font_input)


def table_row(draw, y, cols, widths, fonts, header=False, stripe=False):
    x = 40
    fill = C["surface"] if (stripe and not header) else C["bg"]
    if header:
        draw.rectangle([40, y, W - 40, y + 34], fill=C["primary"])
        for i, (text, w) in enumerate(zip(cols, widths)):
            draw.text((x + 8, y + 9), text, fill=(255, 255, 255), font=fonts[0])
            x += w
        return y + 34
    draw.rectangle([40, y, W - 40, y + 38], fill=fill)
    draw.rectangle([40, y, W - 40, y + 38], outline=C["border"], width=1)
    for i, (text, w) in enumerate(zip(cols, widths)):
        color = C["text_h"] if i == 0 else C["text"]
        draw.text((x + 8, y + 11), text, fill=color, font=fonts[1])
        x += w
    return y + 38


# ────────────────────────────────────────────────────────────────────────────
#  MOCKUP 1 — Web: Exam Management Interface
# ────────────────────────────────────────────────────────────────────────────
def make_web_exam_page():
    img = Image.new("RGB", (W, H), C["bg"])
    d = ImageDraw.Draw(img)

    # Load fonts
    try:
        fn_title   = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 18)
        fn_bold    = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 16)
        fn_bold_lg = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 22)
        fn_body    = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 13)
        fn_small   = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 11)
        fn_badge   = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 9)
        fn_input   = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 13)
    except:
        fn_title  = ImageFont.load_default()
        fn_bold   = ImageFont.load_default()
        fn_bold_lg= ImageFont.load_default()
        fn_body   = ImageFont.load_default()
        fn_small  = ImageFont.load_default()
        fn_badge  = ImageFont.load_default()
        fn_input  = ImageFont.load_default()

    # Top header bar
    d.rectangle([0, 0, W, 56], fill=C["primary"])
    d.text((24, 16), "Smart Grading", fill=(255, 255, 255), font=fn_bold_lg)
    d.text((W - 200, 18), "Xin chào, Nguyễn Văn A", fill=(200, 210, 230), font=fn_body)

    # Sidebar
    d.rectangle([0, 56, 220, H], fill=C["surface"])
    # Sidebar items
    sidebar = [
        ("🏠", "Tổng quan", True),
        ("📝", "Quản lý đề thi", False),
        ("📋", "Danh sách lớp", False),
        ("📊", "Kết quả thi", False),
        ("🔍", "Quét OMR", False),
        ("📢", "Phúc khảo", False),
        ("⚙️", "Cài đặt", False),
    ]
    sy = 80
    for icon, label, active in sidebar:
        if active:
            d.rounded_rectangle([10, sy, 215, sy + 36], radius=6, fill=C["bg"])
            d.rounded_rectangle([10, sy, 215, sy + 36], outline=C["border"], width=1)
        d.text((24, sy + 9), f"{icon}  {label}", fill=C["text_h"] if active else C["text"], font=fn_body)
        sy += 46

    # Page title
    d.text((244, 72), "Quản lý đề thi", fill=C["text_h"], font=fn_bold_lg)

    # Filter bar
    bx, by = 244, 108
    d.rounded_rectangle([bx, by, bx + 160, by + 34], radius=6, outline=C["border"], width=1)
    d.text((bx + 10, by + 8), "🔍  Tìm kiếm đề thi...", fill=C["label_light"], font=fn_input)
    d.rounded_rectangle([bx + 170, by, bx + 240, by + 34], radius=6, fill=C["primary"])
    d.text((bx + 185, by + 8), "Lọc", fill=(255, 255, 255), font=fn_body)
    d.rounded_rectangle([bx + 250, by, bx + 360, by + 34], radius=6, fill=C["primary"])
    d.text((bx + 262, by + 8), "+ Tạo đề thi", fill=(255, 255, 255), font=fn_body)

    # Stats cards
    cx, cy = 244, 158
    for label, value, color in [
        ("Tổng đề thi", "24", C["primary"]),
        ("Đã phát hành", "18", C["success"]),
        ("Đang chấm", "6", C["warning"]),
    ]:
        rr(d, [cx, cy, cx + 150, cy + 72], 8, C["bg"])
        d.rectangle([cx, cy, cx + 150, cy + 72], outline=C["border"], width=1)
        d.text((cx + 12, cy + 10), label, fill=C["text"], font=fn_small)
        d.text((cx + 12, cy + 34), value, fill=color, font=fn_bold_lg)
        cx += 165

    # Table header
    ty = 248
    cols = ["Tiêu đề", "Môn", "Ngày thi", "Lớp", "Trạng thái", "Hành động"]
    widths = [260, 110, 110, 140, 120, 100]
    ty = table_row(d, ty, cols, widths, (fn_bold, fn_body), header=True)

    # Table rows
    rows = [
        ("Kiểm tra GK - Toán 10", "Toán", "15/06/2026", "10A1, 10A2", "Đã phát hành", "published"),
        ("Thi HK1 - Vật lý 11", "Vật lý", "20/06/2026", "11A1", "Đang chấm", "in_progress"),
        ("Kiểm tra 15p - Hóa 10", "Hóa học", "22/06/2026", "10A1", "Nháp", "draft"),
        ("Kiểm tra HK2 - Sinh 12", "Sinh học", "25/06/2026", "12A1, 12A2", "Đã hoàn thành", "completed"),
    ]
    status_colors = {
        "published":     (C["badge_teacher_bg"], C["badge_teacher_text"]),
        "in_progress":   (C["badge_school_bg"], C["badge_school_text"]),
        "draft":        (C["surface"], C["text"]),
        "completed":    (C["badge_admin_bg"], C["badge_admin_text"]),
    }
    status_texts = {
        "published":    "Đã phát hành",
        "in_progress":  "Đang chấm",
        "draft":       "Nháp",
        "completed":   "Hoàn thành",
    }
    for i, (title, subject, date, cls, status_label, status_key) in enumerate(rows):
        row_cols = [title, subject, date, cls, status_texts[status_key], "👁️ ✏️ 🗑️"]
        bg, tc = status_colors[status_key]
        x = 40
        for j, (text, w) in enumerate(zip(row_cols, widths)):
            fill = C["surface"] if i % 2 == 1 else C["bg"]
            if j == 4:
                # Status pill
                tw2 = fn_small.getbbox(status_texts[status_key])[2]
                px = x + 8
                py = ty + 9
                d.rounded_rectangle([px, py, px + tw2 + 16, py + 20], radius=999, fill=bg)
                d.text((px + 8, py + 4), status_texts[status_key], fill=tc, font=fn_small)
            else:
                d.rectangle([x, ty, x + w, ty + 38], fill=fill)
                d.rectangle([x, ty, x + w, ty + 38], outline=C["border"], width=1)
                color = C["text_h"] if j == 0 else C["text"]
                d.text((x + 8, ty + 11), text, fill=color, font=fn_body)
            x += w
        # Vertical borders
        x = 40
        for w in widths[:-1]:
            d.line([x + w, ty, x + w, ty + 38], fill=C["border"], width=1)
        ty += 38

    # Bottom border
    d.rectangle([40, ty, W - 40, ty], fill=C["border"])

    return img


# ────────────────────────────────────────────────────────────────────────────
#  MOCKUP 2 — Web: Score Table and Statistics
# ────────────────────────────────────────────────────────────────────────────
def make_web_score_page():
    img = Image.new("RGB", (W, H), C["bg"])
    d = ImageDraw.Draw(img)

    try:
        fn_title   = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 18)
        fn_bold    = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 16)
        fn_bold_lg = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 22)
        fn_body    = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 13)
        fn_small   = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 11)
        fn_stat    = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 28)
        fn_badge   = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 9)
    except:
        fn_title  = ImageFont.load_default()
        fn_bold   = ImageFont.load_default()
        fn_bold_lg= ImageFont.load_default()
        fn_body   = ImageFont.load_default()
        fn_small  = ImageFont.load_default()
        fn_stat   = ImageFont.load_default()
        fn_badge  = ImageFont.load_default()

    # Header
    d.rectangle([0, 0, W, 56], fill=C["primary"])
    d.text((24, 16), "Smart Grading", fill=(255, 255, 255), font=fn_bold_lg)

    # Sidebar (same as before)
    d.rectangle([0, 56, 220, H], fill=C["surface"])
    sidebar = [
        ("🏠", "Tổng quan", False),
        ("📝", "Quản lý đề thi", False),
        ("📋", "Danh sách lớp", False),
        ("📊", "Kết quả thi", True),
        ("🔍", "Quét OMR", False),
        ("📢", "Phúc khảo", False),
    ]
    sy = 80
    for icon, label, active in sidebar:
        if active:
            d.rounded_rectangle([10, sy, 215, sy + 36], radius=6, fill=C["bg"])
            d.rounded_rectangle([10, sy, 215, sy + 36], outline=C["border"], width=1)
        d.text((24, sy + 9), f"{icon}  {label}", fill=C["text_h"] if active else C["text"], font=fn_body)
        sy += 46

    # Page title
    d.text((244, 72), "Kết quả bài thi — Kiểm tra GK Toán 10", fill=C["text_h"], font=fn_bold_lg)

    # Back button
    d.rounded_rectangle([244, 108, 360, 138], radius=6, outline=C["border"], width=1)
    d.text((254, 115), "← Quay lại danh sách đề thi", fill=C["label"], font=fn_body)

    # Stats cards row
    sx, sy = 244, 158
    stats = [
        ("Số bài nộp", "42/45", C["success"], "Tỉ lệ: 93%"),
        ("Điểm trung bình", "7.4", C["primary"], "Trung bình hệ số 10"),
        ("Điểm cao nhất", "9.8", C["success"], "HS: Nguyễn Văn B"),
        ("Điểm thấp nhất", "3.2", C["error"], "HS: Trần Văn C"),
    ]
    for label, value, vc, sub in stats:
        rr(d, [sx, sy, sx + 175, sy + 80], 8, C["bg"])
        d.rectangle([sx, sy, sx + 175, sy + 80], outline=C["border"], width=1)
        d.text((sx + 12, sy + 10), label, fill=C["text"], font=fn_small)
        d.text((sx + 12, sy + 36), value, fill=vc, font=fn_stat)
        d.text((sx + 12, sy + 65), sub, fill=C["text"], font=fn_small)
        sx += 190

    # Grade distribution bar
    bx, by = 244, 255
    d.text((bx, by), "Phân bố điểm", fill=C["text_h"], font=fn_bold)
    by += 30
    grade_bars = [
        ("Giỏi (8-10)", 15, C["success"]),
        ("Khá (6.5-8)", 12, (5, 150, 105)),
        ("Trung bình (5-6.5)", 9, C["warning"]),
        ("Yếu (3-5)", 4, (249, 115, 22)),
        ("Kém (<3)", 2, C["error"]),
    ]
    max_count = 15
    bar_y = by + 4
    for label, count, color in grade_bars:
        bar_w = int((count / max_count) * 200)
        d.text((bx, bar_y + 2), label, fill=C["text"], font=fn_small)
        d.rounded_rectangle([bx + 130, bar_y, bx + 130 + bar_w, bar_y + 18], radius=4, fill=color)
        d.text((bx + 130 + bar_w + 8, bar_y + 2), str(count), fill=C["text_h"], font=fn_small)
        bar_y += 28

    # Score table
    ty = 400
    cols = ["STT", "Họ tên", "Số báo danh", "Điểm", "Xếp loại", "Trạng thái"]
    widths = [50, 200, 120, 80, 100, 120]
    ty = table_row(d, ty, cols, widths, (fn_bold, fn_body), header=True)

    students = [
        ("1", "Nguyễn Văn B", "THPT-2026-001", "9.8", "Giỏi", "completed"),
        ("2", "Trần Thị C", "THPT-2026-002", "9.2", "Giỏi", "completed"),
        ("3", "Lê Văn D", "THPT-2026-003", "8.5", "Giỏi", "completed"),
        ("4", "Phạm Thị E", "THPT-2026-004", "7.8", "Khá", "completed"),
        ("5", "Hoàng Văn F", "THPT-2026-005", "6.4", "TB", "completed"),
        ("6", "Ngô Văn G", "THPT-2026-006", "3.2", "Yếu", "completed"),
    ]
    grade_colors = {
        "Giỏi": (C["badge_teacher_bg"], C["badge_teacher_text"]),
        "Khá": (C["badge_school_bg"], C["badge_school_text"]),
        "TB": ((255, 249, 235), (180, 83, 9)),
        "Yếu": (C["badge_admin_bg"], C["badge_admin_text"]),
    }
    for i, (stt, name, code, score, grade, status) in enumerate(students):
        x = 40
        gc, gtc = grade_colors.get(grade, (C["surface"], C["text"]))
        for j, (text, w) in enumerate(zip([stt, name, code, score, grade, "✓ Hoàn thành"], widths)):
            fill = C["surface"] if i % 2 == 1 else C["bg"]
            if j == 4:
                tw2 = fn_small.getbbox(grade)[2]
                px = x + 6
                py = ty + 8
                d.rounded_rectangle([px, py, px + tw2 + 12, py + 20], radius=999, fill=gc)
                d.text((px + 6, py + 4), grade, fill=gtc, font=fn_small)
            elif j == 5:
                d.rectangle([x, ty, x + w, ty + 38], fill=fill)
                d.rectangle([x, ty, x + w, ty + 38], outline=C["border"], width=1)
                d.text((x + 8, ty + 11), text, fill=C["success"], font=fn_small)
            else:
                d.rectangle([x, ty, x + w, ty + 38], fill=fill)
                d.rectangle([x, ty, x + w, ty + 38], outline=C["border"], width=1)
                color = C["text_h"] if j in (1, 3) else C["text"]
                d.text((x + 8, ty + 11), text, fill=color, font=fn_body)
            x += w
        x = 40
        for w in widths[:-1]:
            d.line([x + w, ty, x + w, ty + 38], fill=C["border"], width=1)
        ty += 38

    d.rectangle([40, ty, W - 40, ty], fill=C["border"])
    return img


# ────────────────────────────────────────────────────────────────────────────
#  MOCKUP 3 — Mobile: OMR Scanning
# ────────────────────────────────────────────────────────────────────────────
def make_mobile_scan_page():
    img = Image.new("RGB", (MW, MH), C["bg"])
    d = ImageDraw.Draw(img)

    try:
        fn_title  = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 16)
        fn_body   = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 13)
        fn_small  = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 11)
        fn_bold   = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 14)
        fn_large  = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 22)
    except:
        fn_title = fn_body = fn_small = fn_bold = fn_large = ImageFont.load_default()

    # Status bar simulation
    d.rectangle([0, 0, MW, 28], fill=C["primary"])
    d.text((10, 6), "9:41", fill=(255, 255, 255), font=fn_small)

    # App bar
    d.rectangle([0, 28, MW, 80], fill=C["primary"])
    d.text((16, 42), "←", fill=(255, 255, 255), font=fn_large)
    d.text((52, 44), "Quét phiếu OMR", fill=(255, 255, 255), font=fn_title)
    d.text((MW - 52, 44), "📷", fill=(255, 255, 255), font=fn_large)

    # Camera viewfinder frame
    vf_x, vf_y = 40, 100
    vf_w, vf_h = MW - 80, 260
    # Dark overlay corners
    d.rectangle([0, 0, MW, vf_y], fill=(0, 0, 0, 180))
    d.rectangle([0, vf_y + vf_h, MW, MH], fill=(0, 0, 0, 180))
    d.rectangle([0, vf_y, vf_x, vf_y + vf_h], fill=(0, 0, 0, 180))
    d.rectangle([vf_x + vf_w, vf_y, MW, vf_y + vf_h], fill=(0, 0, 0, 180))
    # Viewfinder border
    d.rounded_rectangle([vf_x, vf_y, vf_x + vf_w, vf_y + vf_h], radius=8, outline=(255, 255, 255), width=2)
    # Corner markers
    c = 30
    # Top-left
    d.line([(vf_x, vf_y + c), (vf_x, vf_y), (vf_x + c, vf_y)], fill=(255, 255, 255), width=3)
    # Top-right
    d.line([(vf_x + vf_w - c, vf_y), (vf_x + vf_w, vf_y), (vf_x + vf_w, vf_y + c)], fill=(255, 255, 255), width=3)
    # Bottom-left
    d.line([(vf_x, vf_y + vf_h - c), (vf_x, vf_y + vf_h), (vf_x + c, vf_y + vf_h)], fill=(255, 255, 255), width=3)
    # Bottom-right
    d.line([(vf_x + vf_w - c, vf_y + vf_h), (vf_x + vf_w, vf_y + vf_h), (vf_x + vf_w, vf_y + vf_h - c)], fill=(255, 255, 255), width=3)
    # Center guide text
    d.text((vf_x + 60, vf_y + vf_h // 2 - 10), "Đặt phiếu trong khung", fill=(220, 220, 220), font=fn_body)

    # Template info card
    cx, cy = 20, 375
    rr(d, [cx, cy, MW - 20, cy + 90], 12, C["surface"])
    d.rounded_rectangle([cx, cy, MW - 20, cy + 90], radius=12, outline=C["border"], width=1)
    d.text((cx + 16, cy + 14), "Mẫu OMR:", fill=C["text"], font=fn_small)
    d.text((cx + 16, cy + 34), "Mẫu chuẩn — 50 câu", fill=C["text_h"], font=fn_bold)
    d.rounded_rectangle([cx + 16, cy + 62, cx + 100, cy + 84], radius=999, fill=C["badge_school_bg"])
    d.text((cx + 24, cy + 65), "HD 720p", fill=C["badge_school_text"], font=fn_small)
    d.text((cx + 115, cy + 65), "•", fill=C["text"], font=fn_small)
    d.text((cx + 125, cy + 65), "50 câu hỏi", fill=C["text"], font=fn_small)

    # Scan history
    d.text((20, 482), "Lịch sử quét gần đây", fill=C["text_h"], font=fn_bold)
    hy = 510
    history = [
        ("Toán 10 — 10A1", "3 phút trước", "38/45", C["success"]),
        ("Lý 11 — 11A1", "15 phút trước", "41/45", C["success"]),
        ("Hóa 10 — 10A2", "1 giờ trước", "35/45", C["warning"]),
    ]
    for title, time, score, sc in history:
        rr(d, [20, hy, MW - 20, hy + 52], 8, C["bg"])
        d.rounded_rectangle([20, hy, MW - 20, hy + 52], radius=8, outline=C["border"], width=1)
        d.text((36, hy + 10), title, fill=C["text_h"], font=fn_body)
        d.text((36, hy + 30), time, fill=C["text"], font=fn_small)
        d.text((MW - 90, hy + 18), score, fill=sc, font=fn_bold)
        hy += 62

    # Bottom action bar
    d.rectangle([0, MH - 90, MW, MH], fill=C["bg"])
    d.rectangle([0, MH - 90, MW, MH - 89], fill=C["border"])
    # Gallery button
    rr(d, [30, MH - 76, 90, MH - 32], 24, C["surface"])
    d.rounded_rectangle([30, MH - 76, 90, MH - 32], radius=24, outline=C["border"], width=1)
    d.text((46, MH - 68), "🖼️", fill=C["text"], font=fn_body)
    # Capture button
    d.ellipse([MW // 2 - 40, MH - 82, MW // 2 + 40, MH - 2], fill=C["primary"])
    d.ellipse([MW // 2 - 32, MH - 74, MW // 2 + 32, MH - 10], fill=(255, 255, 255))
    # Flash button
    rr(d, [MW - 90, MH - 76, MW - 30, MH - 32], 24, C["surface"])
    d.rounded_rectangle([MW - 90, MH - 76, MW - 30, MH - 32], radius=24, outline=C["border"], width=1)
    d.text((MW - 74, MH - 68), "⚡", fill=C["warning"], font=fn_body)

    # Bottom nav
    d.rectangle([0, MH - 24, MW, MH], fill=C["surface"])
    nav_items = ["🏠", "📝", "🔍", "📊", "👤"]
    labels = ["Trang chủ", "Đề thi", "Quét", "Kết quả", "Cá nhân"]
    nx = 10
    for icon, label in zip(nav_items, labels):
        is_center = icon == "🔍"
        if is_center:
            rr(d, [nx - 4, MH - 44, nx + 64, MH - 16], 12, C["primary"])
        d.text((nx + 16, MH - 38 if is_center else MH - 18), icon, fill=(255, 255, 255) if is_center else C["text"], font=fn_small)
        nx += 80

    return img


# ────────────────────────────────────────────────────────────────────────────
#  MOCKUP 4 — Mobile: Teacher Dashboard
# ────────────────────────────────────────────────────────────────────────────
def make_mobile_dashboard():
    img = Image.new("RGB", (MW, MH), C["bg"])
    d = ImageDraw.Draw(img)

    try:
        fn_title  = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 16)
        fn_body   = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 13)
        fn_small  = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 11)
        fn_bold   = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 14)
        fn_large  = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 22)
        fn_stat   = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 26)
    except:
        fn_title = fn_body = fn_small = fn_bold = fn_large = fn_stat = ImageFont.load_default()

    # Status bar
    d.rectangle([0, 0, MW, 28], fill=C["primary"])
    d.text((10, 6), "9:41", fill=(255, 255, 255), font=fn_small)

    # Header
    d.rectangle([0, 28, MW, 120], fill=C["primary"])
    d.text((16, 38), "Xin chào!", fill=(180, 200, 230), font=fn_small)
    d.text((16, 56), "Nguyễn Văn Giáo Viên", fill=(255, 255, 255), font=fn_large)
    d.text((16, 84), "THPT Chuyên Khoa Học", fill=(180, 200, 230), font=fn_small)
    # Avatar circle
    d.ellipse([MW - 70, 38, MW - 20, 88], fill=(100, 140, 200))
    d.text((MW - 58, 52), "GV", fill=(255, 255, 255), font=fn_bold)
    # Notification bell
    rr(d, [MW - 110, 42, MW - 76, 76], 16, (255, 255, 255, 30))
    d.text((MW - 100, 50), "🔔", fill=(255, 255, 255), font=fn_body)

    # Stats row
    sy = 135
    stats = [
        ("📝", "24", "Đề thi", C["primary"]),
        ("📋", "12", "Lớp", C["accent"]),
        ("📊", "156", "Bài chấm", C["success"]),
        ("📢", "3", "Phúc khảo", C["warning"]),
    ]
    for icon, val, label, color in stats:
        sx = 16
        rr(d, [sx, sy, sx + 86, sy + 72], 10, C["bg"])
        d.rounded_rectangle([sx, sy, sx + 86, sy + 72], radius=10, outline=C["border"], width=1)
        d.text((sx + 8, sy + 10), icon, fill=color, font=fn_body)
        d.text((sx + 8, sy + 34), val, fill=color, font=fn_stat)
        d.text((sx + 8, sy + 56), label, fill=C["text"], font=fn_small)
        sx += 96

    # Upcoming exams
    d.text((16, 224), "📅 Đề thi sắp tới", fill=C["text_h"], font=fn_bold)
    ey = 250
    exams = [
        ("Kiểm tra GK — Toán 10", "10A1, 10A2", "16/06/2026", "published"),
        ("Thi HK1 — Vật lý 11", "11A1", "20/06/2026", "draft"),
        ("Kiểm tra 15p — Hóa 10", "10A1", "22/06/2026", "draft"),
    ]
    status_labels = {
        "published": ("Đã phát hành", C["badge_teacher_bg"], C["badge_teacher_text"]),
        "draft": ("Nháp", C["surface"], C["text"]),
    }
    for title, cls, date, status in exams:
        rr(d, [16, ey, MW - 16, ey + 64], 10, C["bg"])
        d.rounded_rectangle([16, ey, MW - 16, ey + 64], radius=10, outline=C["border"], width=1)
        d.text((28, ey + 10), title, fill=C["text_h"], font=fn_body)
        d.text((28, ey + 32), f"📁 {cls}  •  {date}", fill=C["text"], font=fn_small)
        slabel, sbg, stc = status_labels[status]
        tw2 = fn_small.getbbox(slabel)[2]
        d.rounded_rectangle([MW - tw2 - 42, ey + 22, MW - 28, ey + 42], radius=999, fill=sbg)
        d.text((MW - tw2 - 36, ey + 24), slabel, fill=stc, font=fn_small)
        ey += 74

    # Recent activity
    d.text((16, ey + 10), "🕐 Hoạt động gần đây", fill=C["text_h"], font=fn_bold)
    ay = ey + 38
    activities = [
        ("📊", "Chấm xong 38 bài — Toán 10", "5 phút trước"),
        ("📢", "Nhận đơn phúc khảo — Hóa 12", "20 phút trước"),
        ("📝", "Tạo đề thi mới — Lý 11", "1 giờ trước"),
    ]
    for icon, text, time in activities:
        rr(d, [16, ay, MW - 16, ay + 44], 8, C["surface"])
        d.text((28, ay + 10), icon, fill=C["primary"], font=fn_body)
        d.text((56, ay + 8), text, fill=C["text_h"], font=fn_body)
        d.text((56, ay + 26), time, fill=C["text"], font=fn_small)
        ay += 54

    # Bottom nav
    d.rectangle([0, MH - 24, MW, MH], fill=C["surface"])
    nav_items = ["🏠", "📝", "🔍", "📊", "👤"]
    labels = ["Trang chủ", "Đề thi", "Quét", "Kết quả", "Cá nhân"]
    nx = 10
    for icon, label in zip(nav_items, labels):
        is_home = icon == "🏠"
        if is_home:
            rr(d, [nx - 4, MH - 44, nx + 64, MH - 16], 12, C["primary"])
        d.text((nx + 16, MH - 38 if is_home else MH - 18), icon, fill=(255, 255, 255) if is_home else C["text"], font=fn_small)
        nx += 80

    return img


# ────────────────────────────────────────────────────────────────────────────
#  MOCKUP 5 — Mobile: Score View & Appeal
# ────────────────────────────────────────────────────────────────────────────
def make_mobile_appeal_page():
    img = Image.new("RGB", (MW, MH), C["bg"])
    d = ImageDraw.Draw(img)

    try:
        fn_title  = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 16)
        fn_body   = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 13)
        fn_small  = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 11)
        fn_bold   = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 14)
        fn_large  = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 22)
        fn_stat   = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 32)
    except:
        fn_title = fn_body = fn_small = fn_bold = fn_large = fn_stat = ImageFont.load_default()

    # Status bar
    d.rectangle([0, 0, MW, 28], fill=C["primary"])
    d.text((10, 6), "9:41", fill=(255, 255, 255), font=fn_small)

    # App bar
    d.rectangle([0, 28, MW, 80], fill=C["primary"])
    d.text((16, 42), "←", fill=(255, 255, 255), font=fn_large)
    d.text((52, 44), "Kết quả bài thi", fill=(255, 255, 255), font=fn_title)
    d.text((MW - 52, 44), "📤", fill=(255, 255, 255), font=fn_large)

    # Exam info card
    cx, cy = 16, 95
    rr(d, [cx, cy, MW - cx, cy + 88], 12, C["surface"])
    d.rounded_rectangle([cx, cy, MW - cx, cy + 88], radius=12, outline=C["border"], width=1)
    d.text((cx + 16, cy + 14), "Kiểm tra GK — Toán 10", fill=C["text_h"], font=fn_bold)
    d.text((cx + 16, cy + 36), "📁 10A1  •  15/06/2026  •  50 câu", fill=C["text"], font=fn_small)
    # Score circle
    d.ellipse([MW - 90, cy + 14, MW - 20, cy + 84], fill=C["primary"])
    d.text((MW - 72, cy + 30), "7.8", fill=(255, 255, 255), font=fn_stat)
    d.text((MW - 74, cy + 60), "/10", fill=(180, 200, 230), font=fn_small)
    # Score bar below
    bar_x, bar_y = cx + 16, cy + 64
    d.rounded_rectangle([bar_x, bar_y, bar_x + 200, bar_y + 8], radius=4, fill=C["border"])
    d.rounded_rectangle([bar_x, bar_y, bar_x + 156, bar_y + 8], radius=4, fill=C["success"])

    # Question-level breakdown
    d.text((16, 198), "Chi tiết theo câu", fill=C["text_h"], font=fn_bold)
    d.text((280, 198), "Lọc theo:", fill=C["text"], font=fn_small)
    rr(d, [336, 192, MW - 16, 214], 999, C["surface"])
    d.rounded_rectangle([336, 192, MW - 16, 214], radius=999, outline=C["border"], width=1)
    d.text((344, 194), "Tất cả  ▼", fill=C["text_h"], font=fn_small)

    qy = 222
    questions = [
        ("Câu 1", "A", "A", True,  "Hàm số bậc nhất"),
        ("Câu 2", "B", "C", False, "Phương trình bậc 2"),
        ("Câu 3", "C", "C", True,  "Hệ phương trình"),
        ("Câu 4", "A", "D", False, "Bất phương trình"),
        ("Câu 5", "B", "B", True,  "Giá trị tuyệt đối"),
    ]
    for qnum, selected, correct, is_right, topic in questions:
        rr(d, [16, qy, MW - 16, qy + 54], 8, C["bg"])
        d.rounded_rectangle([16, qy, MW - 16, qy + 54], radius=8, outline=C["border"], width=1)
        # Question number badge
        pill(d, [22, qy + 10, 62, qy + 34], C["surface"] if is_right else C["error_bg"], qnum, fn_small, C["text"])
        # Topic
        d.text((72, qy + 10), topic, fill=C["text_h"], font=fn_body)
        # Answers
        d.text((72, qy + 30), f"Đáp án: {correct}", fill=C["text"], font=fn_small)
        if not is_right:
            d.text((160, qy + 30), f"(Bạn chọn: {selected})", fill=C["error"], font=fn_small)
            # Appeal button
            rr(d, [MW - 80, qy + 14, MW - 16, qy + 36], 999, C["accent"])
            d.text((MW - 74, qy + 16), "Phúc khảo", fill=(255, 255, 255), font=fn_small)
        else:
            # Correct indicator
            d.text((MW - 50, qy + 20), "✓", fill=C["success"], font=fn_bold)
        qy += 62

    # Summary bar
    d.rectangle([0, MH - 130, MW, MH - 90], fill=C["surface"])
    d.rectangle([0, MH - 130, MW, MH - 129], fill=C["border"])
    summary = [
        ("✓ Đúng", "38", C["success"]),
        ("✗ Sai", "7", C["error"]),
        ("— Bỏ trống", "5", C["text"]),
    ]
    sx = 20
    for label, val, color in summary:
        d.text((sx, MH - 118), label, fill=C["text"], font=fn_small)
        d.text((sx, MH - 100), val, fill=color, font=fn_stat)
        sx += 130

    # Bottom CTA
    d.rectangle([0, MH - 90, MW, MH - 24], fill=C["bg"])
    d.rectangle([0, MH - 90, MW, MH - 89], fill=C["border"])
    d.rounded_rectangle([16, MH - 78, MW - 16, MH - 36], radius=10, fill=C["primary"])
    d.text((MW // 2 - 50, MH - 66), "📢 Gửi yêu cầu phúc khảo", fill=(255, 255, 255), font=fn_bold)

    # Bottom nav
    d.rectangle([0, MH - 24, MW, MH], fill=C["surface"])
    nav_items = ["🏠", "📝", "🔍", "📊", "👤"]
    nx = 10
    for icon in nav_items:
        is_result = icon == "📊"
        if is_result:
            rr(d, [nx - 4, MH - 44, nx + 64, MH - 16], 12, C["primary"])
        d.text((nx + 16, MH - 38 if is_result else MH - 18), icon, fill=(255, 255, 255) if is_result else C["text"], font=fn_small)
        nx += 80

    return img


# ────────────────────────────────────────────────────────────────────────────
#  MAIN
# ────────────────────────────────────────────────────────────────────────────
def main():
    out_dir = r"c:\TAILIEU\DATN\SMART GRADING\SOICT_DATN_Application_VIE_Template\Hinhve"
    os.makedirs(out_dir, exist_ok=True)

    print("Generating mockup 1: Web Exam Management...")
    make_web_exam_page().save(os.path.join(out_dir, "mockup_web_1.png"))

    print("Generating mockup 2: Web Score Table...")
    make_web_score_page().save(os.path.join(out_dir, "mockup_web_2.png"))

    print("Generating mockup 3: Mobile OMR Scanning...")
    make_mobile_scan_page().save(os.path.join(out_dir, "mockup_mobile_1.png"))

    print("Generating mockup 4: Mobile Teacher Dashboard...")
    make_mobile_dashboard().save(os.path.join(out_dir, "mockup_mobile_2.png"))

    print("Generating mockup 5: Mobile Score & Appeal...")
    make_mobile_appeal_page().save(os.path.join(out_dir, "mockup_mobile_3.png"))

    print("Done! All mockups saved to:", out_dir)


if __name__ == "__main__":
    main()
