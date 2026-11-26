# Kịch bản thuyết trình các luồng database — BoardingHub

> In ra để tập nói. Tổng thời gian khoảng **6–7 phút**.
> Mỗi luồng trả lời 4 câu: **Ai làm gì → Dữ liệu vào bảng nào → Trạng thái đổi ra sao → Database chặn sai sót gì.**
> Slide đi kèm: `BoardingHub_database_slides.pptx` (kịch bản này cũng nằm trong phần ghi chú của từng slide).

---

## Slide 1 — Mở đầu (15 giây)

> "Em xin trình bày thiết kế database của BoardingHub, hệ thống quản lý nhà trọ. Database gồm 72 bảng, chia thành 14 nhóm theo các epic trong tài liệu BA. Em sẽ đi qua 5 luồng chính và cách database bảo vệ dữ liệu ở từng luồng."

---

## Slide 2 — Bức tranh tổng thể (45 giây)

> "Toàn bộ hệ thống xoay quanh bảng **contracts**. Phòng có hợp đồng, hợp đồng có người ở, hợp đồng sinh ra hóa đơn, hóa đơn được trả bằng phiếu thu, và kết thúc bằng quyết toán trả phòng.
>
> Thiết kế tuân theo 4 nguyên tắc:
> một, **tiền đã ghi thì không tẩy xóa**: sai thì hủy kèm lý do rồi ghi bản mới;
> hai, **không lưu số dư**: công nợ, cọc, quỹ đều tính lại từ lịch sử giao dịch nên không bao giờ lệch;
> ba, **thay đổi thì tạo phiên bản mới**: gia hạn, đổi giá đều giữ lại bản cũ;
> bốn, **bấm hai lần chỉ tính một lần**: mỗi thao tác tiền có mã chống lặp."

---

## Slide 3 — 15 bảng chính (30 giây)

> "Trong 72 bảng chỉ có khoảng 15 bảng chính: phòng, hợp đồng, người thuê, lượt ở, đồng hồ, chỉ số, hóa đơn, phiếu thu, cọc, quyết toán, quỹ phòng… Các bảng còn lại là bảng chi tiết, lịch sử, cấu hình hoặc hệ thống phục vụ cho bảng chính."

---

## Slide 4 — Luồng 1: Cho thuê phòng (45 giây)

**Chuỗi bảng:** `persons` → `contracts` → `rent_rates` → `occupancies` → `deposit_transactions` → `rooms`

> "Khi có khách muốn thuê, nhân viên nhập thông tin người thuê vào bảng **persons**, rồi tạo **contracts** ở trạng thái Nháp. Giá thuê ghi vào **rent_rates** có ngày hiệu lực, danh sách người ở ghi vào **occupancies**. Khách đặt cọc thì ghi vào **deposit_transactions**. Cọc tách riêng vì đây là tiền của người thuê, không phải doanh thu.
>
> Khi bấm Kích hoạt, hợp đồng chuyển Hiệu lực và phòng chuyển từ Trống sang Đang thuê, tất cả trong một giao dịch.
>
> Database đảm bảo **mỗi phòng chỉ có một hợp đồng hiệu lực**, nên không thể cho hai nhóm thuê cùng một phòng. Ứng dụng kiểm tra số người không vượt sức chứa."

**Nếu bị hỏi:** "Sao tách persons với users?" → "Vì người thuê có thể không có tài khoản. persons là người trong hồ sơ, users là tài khoản đăng nhập."

---

## Slide 5 — Luồng 2: Lập hóa đơn hằng tháng (45 giây)

**Chuỗi bảng:** `meter_readings` → `invoices` → `invoice_items` (→ `invoice_adjustments`)

> "Cuối kỳ, nhân viên ghi chỉ số điện nước vào **meter_readings**. Có thể chụp ảnh để máy đọc, nhưng máy chỉ gợi ý, người phải xác nhận.
>
> Hệ thống lập **invoices** ở trạng thái Nháp. Mỗi khoản là một dòng **invoice_items**: tiền phòng lấy từ rent_rates, điện nước lấy từ chỉ số đã xác nhận, kèm công thức tính. Ví dụ: phòng 3 triệu, điện 120 số nhân 3.500 là 420 nghìn, tổng 3 triệu 640. Kiểm tra xong thì Phát hành.
>
> Database chặn ba điều: chỉ số mới nhỏ hơn chỉ số cũ; một kỳ có hai hóa đơn; sửa hóa đơn đã phát hành. Muốn sửa phải lập **phiếu điều chỉnh** có lý do."

**Nếu bị hỏi:** "Đổi giá giữa tháng thì sao?" → "rent_rates có hai dòng với ngày hiệu lực khác nhau, hóa đơn tự chia hai đoạn."

---

## Slide 6 — Luồng 3: Thu tiền (45 giây)

**Chuỗi bảng:** `payments` → `payment_allocations` → `invoices`

> "Khi người thuê trả tiền, nhân viên tạo **payments**, rồi gán tiền vào hóa đơn qua **payment_allocations**. Tách hai bảng vì một lần chuyển khoản có thể trả nhiều hóa đơn, và một hóa đơn có thể trả nhiều lần.
>
> Công nợ không lưu sẵn mà tính bằng tổng hóa đơn trừ tổng đã phân bổ. Ví dụ hóa đơn 1 triệu, trả 600 nghìn thì còn nợ 400. Trả dư thì phần dư nằm trên phiếu thu, không tự chuyển vào cọc.
>
> Mỗi phiếu có **mã chống lặp**: mạng lag bấm hai lần cũng không cộng tiền hai lần. Ghi sai thì không xóa, mà hủy phiếu kèm lý do rồi tạo phiếu mới."

**Nếu bị hỏi:** "Hai người cùng thu một hóa đơn?" → "Ứng dụng khóa dòng hóa đơn khi phân bổ; người sau chờ và sẽ thấy hóa đơn đã trả đủ."

---

## Slide 7 — Luồng 4: Trả phòng và quyết toán cọc (60 giây)

**Chuỗi bảng:** `checkouts` → `handovers` → `checkout_deductions` → `deposit_transactions` → `contracts` / `rooms`

> "Khi người thuê báo trả phòng, nhân viên tạo **checkouts**, lập biên bản trả phòng và so với lúc nhận. Hư hỏng thì đề xuất khấu trừ vào **checkout_deductions**, chủ trọ duyệt mới được trừ.
>
> Hệ thống tính: tổng phải trả bằng nợ cộng khấu trừ; dùng cọc để trừ; phần còn lại hoàn cho người thuê. Ví dụ nợ 800 nghìn, hư hỏng 300 nghìn, cọc 2 triệu, thì dùng 1 triệu 100 và hoàn 900 nghìn.
>
> Database có **4 công thức kiểm tra** ngay trên bảng: số liệu lệch một đồng là không lưu được. Mỗi hợp đồng chỉ một quyết toán, nên bấm xác nhận hai lần không hoàn cọc hai lần. Xác nhận xong thì khóa vĩnh viễn. Sau đó hợp đồng kết thúc và phòng về Trống."

**Nếu bị hỏi:** "Hư hỏng đã tính vào hóa đơn rồi thì sao?" → "Khấu trừ được đánh dấu đã nằm trong hóa đơn và không cộng lần hai."

---

## Slide 8 — Luồng 5: Phân quyền (30 giây)

**Chuỗi bảng:** `users` → `user_role_assignments` → `assignment_permission_grants` → `audit_logs`

> "Mỗi người dùng được phân công qua **user_role_assignments**, có phạm vi: toàn tổ chức, một khu hay một phòng. Quyền nhạy cảm như thu tiền, hoàn cọc mặc định chỉ chủ trọ có; nhân viên phải được cấp riêng, thu hồi có hiệu lực ngay.
>
> Mọi bảng đều có **organization_id**, nên chủ trọ này không thấy dữ liệu chủ trọ khác. Mọi thao tác quan trọng ghi vào **audit_logs**, và bảng này không ai sửa hay xóa được."

---

## Slide 9 — Hai tính năng đặc trưng (45 giây)

> "BoardingHub có hai tính năng riêng.
>
> **Ngày Người:** tiền điện nước chia theo số ngày thực sự ở. Ví dụ 4 người ở 16, 20, 30, 30 ngày, tiền 960 nghìn, thì chia ra 160, 200, 300, 300 nghìn. Chỉ ngày vắng được duyệt mới bị trừ, và tổng sau khi chia luôn bằng đúng hóa đơn.
>
> **Quỹ phòng:** người thuê góp quỹ chung. Ai ứng tiền mua đồ chung cần ít nhất 2 người khác xác nhận; người đề nghị không tự duyệt được, database chặn. Sau đó được trừ dần vào phần phải góp tháng sau. Quỹ là tiền của người thuê, tách hẳn khỏi tiền chủ trọ và không bao giờ âm."

---

## Slide 10 — Kiểm chứng (20 giây)

> "Schema đã chạy trên MySQL 8.4 thật: 72 bảng, 236 khóa ngoại, 68 ràng buộc CHECK, 12 ràng buộc duy nhất có điều kiện, 19 trigger. Nhóm viết 68 bài kiểm thử theo đúng các ví dụ trong BA, và tất cả đều đạt."

---

## Slide 11 — Kết (10 giây)

> "Tóm lại, database được thiết kế để tiền không bị sai, không bị mất lịch sử và không bị ghi trùng. Em xin cảm ơn, mời thầy cô đặt câu hỏi."

---

## Phụ lục — Trả lời nhanh các câu hỏi hay gặp

| Câu hỏi | Trả lời ngắn |
|---|---|
| Sao nhiều bảng vậy? | Phạm vi BA có 15 epic; mỗi khái niệm có chỗ riêng. Phần lớn là bảng phụ nhỏ (lịch sử, chi tiết). Cọc, tiền phòng, quỹ khác chủ sở hữu nên phải tách. |
| Sao không lưu số dư? | Số dư lưu sẵn có thể lệch nếu một lần cập nhật lỗi. Tính từ giao dịch luôn đúng và kiểm toán được. |
| Xóa nhầm phòng thì sao? | Không xóa được: mọi khóa ngoại là RESTRICT. Muốn ngừng thì chuyển INACTIVE. |
| Ràng buộc đặt ở đâu? | Một dòng thì dùng CHECK; "chỉ một cái hiệu lực" thì dùng unique trên cột sinh; chống sửa chứng từ thì dùng trigger; cộng nhiều dòng hoặc phân quyền thì để ứng dụng Java xử lý, có khóa dòng. |
| Hai người cùng sửa một bản ghi? | Cột version, tức optimistic locking (JPA @Version): người sau nhận lỗi xung đột, phải tải lại. |
| Chính sách BA chưa chốt (Q01–Q14)? | Lưu ở bảng business_policies có phiên bản. Khách chốt khác thì thêm phiên bản mới, không đổi cấu trúc. |
