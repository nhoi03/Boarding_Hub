"""Build the database presentation deck.

Speaker notes are read from docs/kich_ban_thuyet_trinh_luong.md ("## Slide N" sections), so the
printed script and the deck never drift apart.

Usage: python tools/make_slides.py docs/kich_ban_thuyet_trinh_luong.md docs/BoardingHub_database_slides.pptx
"""
import re
import sys

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.util import Inches, Pt

FONT = "Arial"
NAVY = RGBColor(0x1E, 0x29, 0x3B)
BLUE = RGBColor(0x1D, 0x4E, 0xD8)
LIGHT = RGBColor(0xEF, 0xF6, 0xFF)
RED = RGBColor(0xB9, 0x1C, 0x1C)
RED_BG = RGBColor(0xFE, 0xF2, 0xF2)
GREEN_BG = RGBColor(0xF0, 0xFD, 0xF4)
GREEN = RGBColor(0x15, 0x80, 0x3D)
GREY = RGBColor(0x47, 0x55, 0x69)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)

FLOWS = [
    {
        "title": "Luồng 1 — Cho thuê phòng",
        "who": "Nhân viên tiếp nhận khách → ký hợp đồng → nhận cọc → kích hoạt",
        "steps": [
            "Nhập người thuê vào persons",
            "Tạo contracts (Nháp), giá vào rent_rates",
            "Ghi người ở vào occupancies",
            "Nhận cọc: deposit_transactions (tách khỏi doanh thu)",
            "Kích hoạt: hợp đồng → Hiệu lực, phòng → Đang thuê (1 giao dịch)",
        ],
        "guards": [
            "Mỗi phòng chỉ 1 hợp đồng hiệu lực",
            "Mỗi hợp đồng chỉ 1 người đại diện",
            "Không vượt sức chứa phòng (ứng dụng)",
            "Cọc không sửa, không xóa",
        ],
        "chain": ["persons", "contracts", "rent_rates", "occupancies", "deposit_transactions", "rooms"],
        "example": "Phòng 101: 3 người / sức chứa 3 → thêm người thứ 4 bị chặn",
    },
    {
        "title": "Luồng 2 — Lập hóa đơn hằng tháng",
        "who": "Ghi chỉ số điện nước → hệ thống lập hóa đơn → phát hành",
        "steps": [
            "Ghi chỉ số vào meter_readings (OCR chỉ gợi ý)",
            "Người xác nhận chỉ số",
            "Lập invoices (Nháp), mỗi khoản 1 dòng invoice_items",
            "Mỗi dòng lưu công thức tính",
            "Phát hành → kỳ thu bị khóa",
        ],
        "guards": [
            "Chỉ số mới ≥ chỉ số cũ",
            "Mỗi kỳ chỉ 1 hóa đơn định kỳ",
            "Hóa đơn đã phát hành không sửa được",
            "Sửa = phiếu điều chỉnh có lý do",
        ],
        "chain": ["meter_readings", "invoices", "invoice_items", "invoice_adjustments"],
        "example": "Phòng 3.000.000 + điện 120 số × 3.500 + nước + wifi = 3.640.000",
    },
    {
        "title": "Luồng 3 — Thu tiền",
        "who": "Người thuê trả tiền → nhân viên ghi phiếu thu → gán vào hóa đơn",
        "steps": [
            "Tạo payments (có mã chống lặp)",
            "Gán tiền vào hóa đơn: payment_allocations",
            "Công nợ = tổng hóa đơn − tổng đã phân bổ",
            "Hóa đơn → Đã trả một phần / Đã trả đủ",
            "Tiền dư giữ trên phiếu, không tự vào cọc",
        ],
        "guards": [
            "Bấm 2 lần không cộng tiền 2 lần",
            "Phiếu thu không xóa: hủy kèm lý do",
            "Không sửa số tiền đã ghi",
            "Không phân bổ vượt số tiền phiếu",
        ],
        "chain": ["payments", "payment_allocations", "invoices"],
        "example": "Hóa đơn 1.000.000 → trả 600.000 → còn nợ 400.000",
    },
    {
        "title": "Luồng 4 — Trả phòng và quyết toán cọc",
        "who": "Người thuê báo trả → biên bản → khấu trừ → quyết toán → hoàn cọc",
        "steps": [
            "Tạo checkouts, lập biên bản trả phòng",
            "Đề xuất khấu trừ hư hỏng (cần duyệt)",
            "Tổng phải trả = nợ + khấu trừ",
            "Dùng cọc trừ, phần còn lại hoàn",
            "Xác nhận → hợp đồng kết thúc, phòng về Trống",
        ],
        "guards": [
            "4 công thức CHECK: lệch 1 đồng không lưu",
            "Mỗi hợp đồng 1 quyết toán → không hoàn 2 lần",
            "Đã xác nhận thì khóa vĩnh viễn",
            "Khấu trừ chưa duyệt không được trừ",
        ],
        "chain": ["checkouts", "handovers", "checkout_deductions", "deposit_transactions", "rooms"],
        "example": "Nợ 800k + hỏng 300k = 1.100k; cọc 2.000k → hoàn 900k",
    },
    {
        "title": "Luồng 5 — Phân quyền",
        "who": "Chủ trọ phân công nhân viên theo phạm vi, cấp quyền nhạy cảm riêng",
        "steps": [
            "Phân công: user_role_assignments",
            "Phạm vi: toàn tổ chức / một khu / một phòng",
            "Quyền nhạy cảm cấp riêng: assignment_permission_grants",
            "Thu hồi có hiệu lực ngay",
            "Mọi thao tác ghi audit_logs",
        ],
        "guards": [
            "organization_id ở mọi bảng: tách dữ liệu chủ trọ",
            "Nhật ký chỉ thêm, không sửa, không xóa",
            "Thu tiền, hoàn cọc: mặc định chỉ chủ trọ",
        ],
        "chain": ["users", "user_role_assignments", "assignment_permission_grants", "audit_logs"],
        "example": "Nhân viên khu A không thấy dữ liệu khu B",
    },
]

CORE_TABLES = [
    ("organizations", "Chủ trọ"), ("users", "Tài khoản"), ("properties", "Khu trọ"),
    ("rooms", "Phòng"), ("persons", "Người thuê"), ("contracts", "Hợp đồng ★"),
    ("occupancies", "Ai đang ở"), ("services", "Dịch vụ"), ("meters", "Đồng hồ"),
    ("meter_readings", "Chỉ số"), ("invoices", "Hóa đơn"), ("payments", "Phiếu thu"),
    ("deposit_transactions", "Tiền cọc"), ("checkouts", "Quyết toán"), ("room_funds", "Quỹ phòng"),
]


def read_notes(path):
    text = open(path, encoding="utf-8").read()
    notes = {}
    for m in re.finditer(r"^## Slide (\d+)[^\n]*\n(.*?)(?=^## |\Z)", text, re.S | re.M):
        body = m.group(2)
        lines = []
        for line in body.splitlines():
            line = line.strip()
            if line.startswith(">"):
                line = line.lstrip("> ").strip()
            if line == "---":
                continue
            lines.append(line.replace("**", "").replace("`", ""))
        notes[int(m.group(1))] = "\n".join(lines).strip()
    return notes


def style(run, size, color=NAVY, bold=False):
    run.font.name = FONT
    run.font.size = Pt(size)
    run.font.color.rgb = color
    run.font.bold = bold


def textbox(slide, x, y, w, h, lines, size=16, color=NAVY, bold=False, align=PP_ALIGN.LEFT):
    tf = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h)).text_frame
    tf.word_wrap = True
    for i, line in enumerate(lines if isinstance(lines, list) else [lines]):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        style(p.add_run(), size, color, bold)
        p.runs[0].text = line
    return tf


def box(slide, x, y, w, h, fill, text="", size=14, color=NAVY, bold=False, line=None, shape=MSO_SHAPE.ROUNDED_RECTANGLE):
    s = slide.shapes.add_shape(shape, Inches(x), Inches(y), Inches(w), Inches(h))
    s.fill.solid()
    s.fill.fore_color.rgb = fill
    if line:
        s.line.color.rgb = line
    else:
        s.line.fill.background()
    s.shadow.inherit = False
    tf = s.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    style(p.add_run(), size, color, bold)
    p.runs[0].text = text
    return s


def header(slide, title, subtitle=None):
    box(slide, 0, 0, 13.333, 1.1, NAVY, shape=MSO_SHAPE.RECTANGLE)
    textbox(slide, 0.5, 0.2, 12.3, 0.7, title, size=30, color=WHITE, bold=True)
    if subtitle:
        textbox(slide, 0.5, 1.25, 12.3, 0.5, subtitle, size=16, color=GREY)


def bullets(slide, x, y, w, h, title, items, fill, accent, numbered=False):
    box(slide, x, y, w, h, fill, line=accent)
    textbox(slide, x + 0.25, y + 0.15, w - 0.5, 0.45, title, size=17, color=accent, bold=True)
    tf = textbox(slide, x + 0.25, y + 0.65, w - 0.5, h - 0.8, [], size=15)
    for i, item in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.space_after = Pt(6)
        style(p.add_run(), 15)
        p.runs[0].text = f"{i + 1}. {item}" if numbered else f"• {item}"


def chain(slide, tables, y):
    n = len(tables)
    gap = 0.35
    w = min(2.0, (12.3 - gap * (n - 1)) / n)
    x = (13.333 - (w * n + gap * (n - 1))) / 2
    for i, t in enumerate(tables):
        box(slide, x, y, w, 0.6, BLUE, t, size=12 if len(t) < 18 else 10, color=WHITE, bold=True)
        if i < n - 1:
            textbox(slide, x + w, y + 0.05, gap, 0.5, "→", size=20, color=GREY, align=PP_ALIGN.CENTER)
        x += w + gap


def add_slide(prs, notes, no):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    if no in notes:
        slide.notes_slide.notes_text_frame.text = notes[no]
    return slide


def build(notes, out):
    prs = Presentation()
    prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)

    s = add_slide(prs, notes, 1)
    box(s, 0, 0, 13.333, 7.5, NAVY, shape=MSO_SHAPE.RECTANGLE)
    textbox(s, 0.8, 2.4, 11.7, 1.2, "BoardingHub", size=54, color=WHITE, bold=True)
    textbox(s, 0.8, 3.5, 11.7, 0.8, "Thiết kế database và các luồng nghiệp vụ chính", size=26, color=WHITE)
    textbox(s, 0.8, 4.5, 11.7, 0.6, "72 bảng · 14 nhóm theo epic · MySQL 8 · Spring Boot", size=18, color=RGBColor(0xCB, 0xD5, 0xE1))

    s = add_slide(prs, notes, 2)
    header(s, "Bức tranh tổng thể", "Mọi thứ xoay quanh bảng contracts")
    flow = ["rooms", "contracts", "invoices", "payments", "checkouts"]
    labels = ["Phòng", "Hợp đồng", "Hóa đơn", "Phiếu thu", "Trả phòng"]
    x = 0.9
    for i, (t, lb) in enumerate(zip(flow, labels)):
        box(s, x, 2.0, 2.0, 0.9, BLUE if t != "contracts" else NAVY, f"{lb}\n{t}", size=14, color=WHITE, bold=True)
        if i < len(flow) - 1:
            textbox(s, x + 2.0, 2.15, 0.5, 0.6, "→", size=26, color=GREY, align=PP_ALIGN.CENTER)
        x += 2.5
    box(s, 3.4, 3.15, 2.0, 0.7, LIGHT, "occupancies\n(ai đang ở)", size=13, line=BLUE)
    textbox(s, 4.15, 2.85, 0.5, 0.4, "↓", size=20, color=GREY, align=PP_ALIGN.CENTER)
    principles = [
        ("1. Tiền không tẩy xóa", "Sai thì hủy kèm lý do, ghi bản mới"),
        ("2. Không lưu số dư", "Công nợ, cọc, quỹ tính lại từ lịch sử"),
        ("3. Thay đổi = phiên bản mới", "Gia hạn, đổi giá đều giữ bản cũ"),
        ("4. Bấm 2 lần = tính 1 lần", "Mã chống lặp trên mọi thao tác tiền"),
    ]
    for i, (t, d) in enumerate(principles):
        bx = 0.6 + i * 3.1
        box(s, bx, 4.4, 2.9, 2.4, GREEN_BG, line=GREEN)
        textbox(s, bx + 0.2, 4.6, 2.5, 0.8, t, size=17, color=GREEN, bold=True)
        textbox(s, bx + 0.2, 5.5, 2.5, 1.2, d, size=14, color=GREY)

    s = add_slide(prs, notes, 3)
    header(s, "15 bảng chính", "57 bảng còn lại là bảng chi tiết, lịch sử, cấu hình hoặc hệ thống")
    for i, (t, lb) in enumerate(CORE_TABLES):
        r, c = divmod(i, 5)
        fill = NAVY if t == "contracts" else BLUE
        box(s, 0.6 + c * 2.45, 2.0 + r * 1.55, 2.25, 1.25, fill, f"{lb}\n{t}", size=13, color=WHITE, bold=True)

    for idx, f in enumerate(FLOWS):
        s = add_slide(prs, notes, 4 + idx)
        header(s, f["title"], f["who"])
        bullets(s, 0.5, 1.9, 7.2, 3.6, "Dữ liệu đi qua", f["steps"], LIGHT, BLUE, numbered=True)
        bullets(s, 7.95, 1.9, 4.9, 3.6, "Database chặn", f["guards"], RED_BG, RED)
        chain(s, f["chain"], 5.75)
        textbox(s, 0.5, 6.6, 12.3, 0.5, "Ví dụ: " + f["example"], size=15, color=GREEN, bold=True, align=PP_ALIGN.CENTER)

    s = add_slide(prs, notes, 9)
    header(s, "Hai tính năng đặc trưng")
    bullets(s, 0.5, 1.5, 6.0, 5.4, "Ngày Người — chia điện nước theo ngày ở", [
        "absence_requests → allocation_batches → person_day_allocations",
        "Chỉ ngày vắng được duyệt mới bị trừ",
        "Khoảng vắng chồng nhau được gộp",
        "Tổng sau chia luôn = hóa đơn",
        "Ví dụ: 16/20/30/30 ngày, 960k → 160k/200k/300k/300k",
    ], LIGHT, BLUE)
    bullets(s, 6.85, 1.5, 6.0, 5.4, "Quỹ phòng — tiền chung của người thuê", [
        "room_funds, fund_obligations, shared_purchases, fund_offsets",
        "Mua chung cần ≥ 2 người khác xác nhận",
        "Người đề nghị không tự duyệt (trigger chặn)",
        "Ứng tiền được trừ vào phần góp kỳ sau",
        "Tách khỏi tiền chủ trọ, quỹ không bao giờ âm",
    ], GREEN_BG, GREEN)

    s = add_slide(prs, notes, 10)
    header(s, "Kiểm chứng trên MySQL 8.4 thật")
    stats = [("72", "bảng"), ("236", "khóa ngoại"), ("68", "CHECK"), ("12", "unique có điều kiện"), ("19", "trigger"), ("68/68", "bài kiểm thử đạt")]
    for i, (num, lb) in enumerate(stats):
        r, c = divmod(i, 3)
        bx, by = 0.9 + c * 4.0, 1.8 + r * 2.6
        box(s, bx, by, 3.6, 2.2, GREEN_BG if num == "68/68" else LIGHT, line=GREEN if num == "68/68" else BLUE)
        textbox(s, bx, by + 0.3, 3.6, 1.0, num, size=44, color=GREEN if num == "68/68" else BLUE, bold=True, align=PP_ALIGN.CENTER)
        textbox(s, bx, by + 1.35, 3.6, 0.6, lb, size=18, color=GREY, align=PP_ALIGN.CENTER)

    s = add_slide(prs, notes, 11)
    box(s, 0, 0, 13.333, 7.5, NAVY, shape=MSO_SHAPE.RECTANGLE)
    textbox(s, 0.8, 2.3, 11.7, 1.0, "Tiền không sai · Lịch sử không mất · Không ghi trùng", size=32, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
    textbox(s, 0.8, 3.8, 11.7, 0.8, "Cảm ơn thầy cô — mời đặt câu hỏi", size=24, color=RGBColor(0xCB, 0xD5, 0xE1), align=PP_ALIGN.CENTER)

    prs.save(out)
    print(f"slides={len(prs.slides)} notes={len(notes)} -> {out}")


if __name__ == "__main__":
    build(read_notes(sys.argv[1]), sys.argv[2])
