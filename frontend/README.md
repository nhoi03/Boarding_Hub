# BoardingHub — Frontend

Giao diện web quản lý nhà trọ (React 19 + TypeScript + Vite + Tailwind CSS v4).
Mặc định chạy bằng **dữ liệu giả lập** lưu trong trình duyệt, áp dụng đúng các quy tắc nghiệp vụ trong tài liệu BA
(chống thu trùng, chặn chỉ số giảm, khóa kỳ đã phát hành, quyết toán cọc không âm, nhật ký không xóa…).

## Chạy thử

```bash
export PATH=~/.local/node/bin:$PATH   # nếu Node cài ở ~/.local/node
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Build bản production: `npm run build` (kết quả trong `dist/`), xem lại bằng `npm run preview`.

## Tài khoản demo (mật khẩu `demo123`)

| Vai trò | Email | Phạm vi |
| --- | --- | --- |
| Chủ trọ | chutro@boardinghub.vn | 2 khu, mọi chức năng, nhật ký, cài đặt |
| Nhân viên | nhanvien@boardinghub.vn | Chỉ khu Cầu Giấy |
| Người thuê | nguoithue@boardinghub.vn | Cổng người thuê phòng CG-101 |

Trên trang đăng nhập có thẻ đăng nhập một chạm. Muốn làm lại từ đầu: menu tài khoản → **Khôi phục dữ liệu demo**.

## Các màn hình chính

- **Tổng quan**: dòng tiền 6 kỳ, tỉ lệ lấp đầy, nhắc việc, người nợ nhiều nhất.
- **Phòng**: sơ đồ theo tầng / bảng, lọc trạng thái, chi tiết phòng, đổi trạng thái.
- **Hợp đồng**: lập hợp đồng 5 bước, kích hoạt, gia hạn, đổi giá theo kỳ, sổ cọc, thêm người ở.
- **Chỉ số điện nước**: nhập nhanh theo dòng (Enter sang dòng kế), OCR mô phỏng, cảnh báo bất thường, xác nhận hàng loạt.
- **Hóa đơn**: lập & phát hành cả kỳ có thanh tiến độ, chi tiết có công thức từng dòng, điều chỉnh, hủy, in, mã QR.
- **Phiếu thu**: thu nhiều lần, phân bổ tự động hoặc chọn tay, hoàn tiền dư, hủy phiếu có lý do.
- **Trả phòng**: bảng quyết toán tính trực tiếp (nợ + khấu trừ → cấn cọc → hoàn / thu thêm).
- **Bảo trì**: Kanban kéo thả theo đúng luồng trạng thái.
- **Nhật ký**, **Cài đặt** (giá dịch vụ có lịch sử), **Cổng người thuê**.

Phím tắt: `⌘K` / `Ctrl+K` mở tìm kiếm nhanh.

## Nối với backend Spring Boot

Toàn bộ giao diện gọi qua interface `BoardingHubApi` (`src/api/contract.ts`), có hai bản cài:

- `src/api/mock` — dữ liệu giả lập (mặc định);
- `src/api/http.ts` — gọi REST `/api/v1`, gửi `Authorization: Bearer <JWT>` và `Idempotency-Key` cho thao tác tiền.

Để chuyển sang API thật, tạo `frontend/.env.local`:

```
VITE_API_MODE=http
```

Vite sẽ proxy `/api` sang `http://localhost:8080` (sửa trong `vite.config.ts` nếu backend chạy cổng khác).
Danh sách endpoint mà frontend cần nằm ngay trong `src/api/http.ts`.
