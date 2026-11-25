#!/usr/bin/env bash
# Kiểm tra các ràng buộc nghiệp vụ của schema trên một database rỗng đã chạy V1-V3.
# Usage: MYSQL="mysql -uroot -p --socket=..." DB=bh_test bash tests/smoke_test.sh
set -u
MYSQL=${MYSQL:-mysql -uroot}
DB=${DB:-bh_test}
pass=0
fail=0

run() { $MYSQL "$DB" -N -e "$1" 2>&1; }

expect_ok() {
  local name=$1 sql=$2 out
  if out=$(run "$sql"); then pass=$((pass + 1)); echo "PASS  $name"
  else fail=$((fail + 1)); echo "FAIL  $name -> $out"; fi
}

expect_error() {
  local name=$1 sql=$2 out
  if out=$(run "$sql"); then fail=$((fail + 1)); echo "FAIL  $name (lệnh lẽ ra phải bị chặn)"
  else pass=$((pass + 1)); echo "PASS  $name -> ${out##*: }"; fi
}

expect_value() {
  local name=$1 sql=$2 expected=$3 out
  out=$(run "$sql")
  if [ "$out" = "$expected" ]; then pass=$((pass + 1)); echo "PASS  $name = $out"
  else fail=$((fail + 1)); echo "FAIL  $name: mong đợi '$expected', nhận '$out'"; fi
}

expect_ok "Dữ liệu nền" "
INSERT INTO users (id, email, password_hash, full_name) VALUES (1,'owner@a.vn','x','Chủ A'),(2,'owner@b.vn','x','Chủ B'),(3,'a@t.vn','x','A'),(4,'b@t.vn','x','B'),(5,'c@t.vn','x','C');
INSERT INTO organizations (id, name, owner_user_id) VALUES (1,'Trọ A',1),(2,'Trọ B',2);
INSERT INTO properties (id, organization_id, code, name, address) VALUES (1,1,'K1','Khu 1','HN'),(2,2,'K1','Khu 1','HCM');
INSERT INTO rooms (id, organization_id, property_id, code, capacity) VALUES (1,1,1,'P101',4),(2,1,1,'P102',2),(3,2,2,'P101',2);
INSERT INTO persons (id, organization_id, user_id, full_name) VALUES (1,1,3,'A'),(2,1,4,'B'),(3,1,5,'C'),(4,1,NULL,'D');
INSERT INTO contracts (id, organization_id, room_id, representative_person_id, code, start_date, end_date, deposit_required, status, created_by)
  VALUES (1,1,1,1,'HD1','2026-11-01','2027-10-31',2000000,'ACTIVE',1);
INSERT INTO occupancies (id, organization_id, contract_id, room_id, person_id, role, move_in_date, status)
  VALUES (1,1,1,1,1,'REPRESENTATIVE','2026-11-01','ACTIVE'),(2,1,1,1,2,'MEMBER','2026-11-01','ACTIVE'),(3,1,1,1,3,'MEMBER','2026-11-01','ACTIVE');
INSERT INTO services (id, organization_id, code, name, unit, calculation_method, person_day_eligible) VALUES (1,1,'ELECTRIC','Điện','kWh','METERED',1);
INSERT INTO billing_periods (id, organization_id, contract_id, period_code, date_from, date_to) VALUES (1,1,1,'2026-11','2026-11-01','2026-11-30');"

echo "--- EP02/EP03 phòng và hợp đồng"
expect_error "AC-002-01 trùng mã phòng trong cùng khu" "INSERT INTO rooms (organization_id, property_id, code, capacity) VALUES (1,1,'P101',2)"
expect_ok    "AC-002-01 cùng mã phòng ở khu khác" "INSERT INTO rooms (organization_id, property_id, code, capacity) VALUES (2,2,'P102',2)"
expect_error "BR-003 sức chứa phải > 0" "INSERT INTO rooms (organization_id, property_id, code, capacity) VALUES (1,1,'P999',0)"
expect_error "BR-004 hai hợp đồng ACTIVE cùng phòng" "INSERT INTO contracts (organization_id, room_id, representative_person_id, code, start_date, end_date, status) VALUES (1,1,2,'HD2','2026-12-01','2027-11-30','ACTIVE')"
expect_ok    "BR-004 hợp đồng DRAFT cho cùng phòng vẫn được" "INSERT INTO contracts (id, organization_id, room_id, representative_person_id, code, start_date, end_date) VALUES (2,1,1,2,'HD2','2027-11-01','2028-10-31')"
expect_error "AC-003-02 ngày ra nhỏ hơn ngày vào" "INSERT INTO occupancies (organization_id, contract_id, room_id, person_id, move_in_date, move_out_date) VALUES (1,1,1,4,'2026-11-10','2026-11-05')"
expect_error "Một người không có 2 lượt ở hiệu lực trong cùng hợp đồng" "INSERT INTO occupancies (organization_id, contract_id, room_id, person_id, move_in_date, status) VALUES (1,1,1,2,'2026-11-01','ACTIVE')"
expect_error "Chỉ một người đại diện" "INSERT INTO occupancies (organization_id, contract_id, room_id, person_id, role, move_in_date, status) VALUES (1,1,1,4,'REPRESENTATIVE','2026-11-01','ACTIVE')"

echo "--- EP03 cọc"
expect_ok    "AC-004-03 nhận cọc thiếu 1.000.000" "INSERT INTO deposit_transactions (organization_id, contract_id, type, amount, occurred_at, idempotency_key, recorded_by) VALUES (1,1,'RECEIVE',1000000,NOW(),'dep-1',1)"
expect_error "Gửi lặp phiếu cọc" "INSERT INTO deposit_transactions (organization_id, contract_id, type, amount, occurred_at, idempotency_key, recorded_by) VALUES (1,1,'RECEIVE',1000000,NOW(),'dep-1',1)"
expect_error "Không xóa giao dịch cọc" "DELETE FROM deposit_transactions WHERE idempotency_key='dep-1'"
expect_error "Không sửa số tiền cọc" "UPDATE deposit_transactions SET amount=2000000 WHERE idempotency_key='dep-1'"

echo "--- EP06 chỉ số"
expect_ok    "Đồng hồ cũ" "INSERT INTO meters (id, organization_id, room_id, service_id, installed_at, status) VALUES (1,1,1,1,'2025-01-01','ACTIVE')"
expect_error "Một đồng hồ ACTIVE mỗi phòng-dịch vụ" "INSERT INTO meters (organization_id, room_id, service_id, installed_at, status) VALUES (1,1,1,'2026-01-01','ACTIVE')"
expect_ok    "AC-008-01 chỉ số 1.000 -> 1.080" "INSERT INTO meter_readings (id, organization_id, meter_id, period_id, previous_value, current_value, read_at, status) VALUES (1,1,1,1,1000,1080,NOW(),'CONFIRMED')"
expect_error "AC-008-02 chỉ số cuối 990 < đầu 1.000" "INSERT INTO meter_readings (organization_id, meter_id, period_id, previous_value, current_value, read_at) VALUES (1,1,1,1000,990,NOW())"
expect_error "Hai chỉ số CONFIRMED cùng đồng hồ-kỳ-loại" "INSERT INTO meter_readings (organization_id, meter_id, period_id, previous_value, current_value, read_at, status) VALUES (1,1,1,1000,1090,NOW(),'CONFIRMED')"

echo "--- EP07 hóa đơn và thu tiền"
expect_ok    "Hóa đơn nháp kỳ 2026-11" "INSERT INTO invoices (id, organization_id, contract_id, period_id, invoice_no) VALUES (1,1,1,1,'INV-1')"
expect_ok    "Dòng hóa đơn khi DRAFT" "INSERT INTO invoice_items (invoice_id, line_no, item_type, description, amount, calculation_snapshot, source_key) VALUES (1,1,'RENT','Tiền phòng',1000000,JSON_OBJECT(),'RENT:1')"
expect_error "AC-007-03 chạy lại không thêm dòng trùng" "INSERT INTO invoice_items (invoice_id, line_no, item_type, description, amount, calculation_snapshot, source_key) VALUES (1,2,'RENT','Tiền phòng',1000000,JSON_OBJECT(),'RENT:1')"
expect_error "BR-010 hai hóa đơn gốc cùng kỳ" "INSERT INTO invoices (organization_id, contract_id, period_id, invoice_no) VALUES (1,1,1,'INV-2')"
expect_ok    "Phát hành hóa đơn" "UPDATE invoices SET status='ISSUED', subtotal_amount=1000000, issued_at=NOW() WHERE id=1"
expect_error "BR-011 không thêm dòng vào hóa đơn đã phát hành" "INSERT INTO invoice_items (invoice_id, line_no, item_type, description, amount, calculation_snapshot, source_key) VALUES (1,3,'OTHER','Phí',50000,JSON_OBJECT(),'OTHER:1')"
expect_error "BR-011 không sửa tổng hóa đơn đã phát hành" "UPDATE invoices SET subtotal_amount=900000 WHERE id=1"
expect_error "Không xóa hóa đơn đã phát hành" "DELETE FROM invoices WHERE id=1"
expect_ok    "AC-011-01 thu lần 1: 600.000" "INSERT INTO payments (id, organization_id, contract_id, amount, received_at, method, idempotency_key, received_by) VALUES (1,1,1,600000,NOW(),'CASH','pay-1',1); INSERT INTO payment_allocations (payment_id, invoice_id, amount, allocated_by) VALUES (1,1,600000,1)"
expect_value "Công nợ sau lần 1" "SELECT i.subtotal_amount - SUM(a.amount) FROM invoices i JOIN payment_allocations a ON a.invoice_id=i.id AND a.status='ACTIVE' WHERE i.id=1 GROUP BY i.id" "400000.00"
expect_ok    "AC-011-01 thu lần 2: 400.000" "INSERT INTO payments (id, organization_id, contract_id, amount, received_at, method, idempotency_key, received_by) VALUES (2,1,1,400000,NOW(),'BANK_TRANSFER','pay-2',1); INSERT INTO payment_allocations (payment_id, invoice_id, amount, allocated_by) VALUES (2,1,400000,1)"
expect_value "Công nợ sau lần 2" "SELECT i.subtotal_amount - SUM(a.amount) FROM invoices i JOIN payment_allocations a ON a.invoice_id=i.id AND a.status='ACTIVE' WHERE i.id=1 GROUP BY i.id" "0.00"
expect_error "AC-011-02 gửi lặp cùng giao dịch" "INSERT INTO payments (organization_id, contract_id, amount, received_at, method, idempotency_key, received_by) VALUES (1,1,400000,NOW(),'BANK_TRANSFER','pay-2',1)"
expect_error "Không xóa phiếu thu" "DELETE FROM payments WHERE id=1"
expect_error "Không sửa số tiền phiếu thu" "UPDATE payments SET amount=700000 WHERE id=1"
expect_error "Hủy phiếu phải có lý do" "UPDATE payments SET status='VOIDED' WHERE id=1"
expect_error "Hủy hóa đơn phải có lý do" "INSERT INTO billing_periods (id, organization_id, contract_id, period_code, date_from, date_to) VALUES (2,1,1,'2026-12','2026-12-01','2026-12-31'); INSERT INTO invoices (id, organization_id, contract_id, period_id, invoice_no) VALUES (8,1,1,2,'INV-8'); UPDATE invoices SET status='CANCELLED' WHERE id=8"
expect_ok    "Hủy hóa đơn có lý do rồi lập lại cùng kỳ" "UPDATE invoices SET status='CANCELLED', cancel_reason='Sai chỉ số' WHERE id=8; INSERT INTO invoices (organization_id, contract_id, period_id, invoice_no) VALUES (1,1,2,'INV-9')"
expect_error "Hóa đơn PERIODIC phải có kỳ" "INSERT INTO invoices (organization_id, contract_id, invoice_no, invoice_type) VALUES (1,1,'INV-X','PERIODIC')"
expect_error "Điều chỉnh không được bằng 0" "INSERT INTO invoice_adjustments (invoice_id, amount, reason, created_by) VALUES (1,0,'x',1)"

echo "--- EP08 quyết toán (AC-012-02, AC-012-03)"
expect_ok    "AC-012-02 nợ 800k + hư 300k, cọc 2.000k -> hoàn 900k" "INSERT INTO checkouts (id, organization_id, contract_id, requested_at, outstanding_debt, extra_deductions, total_obligation, deposit_available, deposit_used, refund_amount, extra_charge) VALUES (1,1,1,NOW(),800000,300000,1100000,2000000,1100000,900000,0)"
expect_error "Sai công thức: hoàn 1.000k thay vì 900k" "INSERT INTO checkouts (organization_id, contract_id, requested_at, outstanding_debt, extra_deductions, total_obligation, deposit_available, deposit_used, refund_amount, extra_charge) VALUES (1,2,NOW(),800000,300000,1100000,2000000,1000000,1000000,100000)"
expect_ok    "AC-012-03 cọc 500k, nợ 800k + hư 100k -> thu thêm 400k" "INSERT INTO checkouts (id, organization_id, contract_id, requested_at, outstanding_debt, extra_deductions, total_obligation, deposit_available, deposit_used, refund_amount, extra_charge) VALUES (2,1,2,NOW(),800000,100000,900000,500000,500000,0,400000)"
expect_error "AC-012-04 quyết toán thứ hai cho cùng hợp đồng" "INSERT INTO checkouts (organization_id, contract_id, requested_at) VALUES (1,1,NOW())"
expect_ok    "Xác nhận quyết toán" "UPDATE checkouts SET status='CONFIRMED', confirmed_at=NOW() WHERE id=1"
expect_error "Quyết toán đã xác nhận không đổi số tiền" "UPDATE checkouts SET status='DRAFT' WHERE id=1"

echo "--- EP10 Ngày Người (GT-01)"
expect_ok    "Phiên chia 960.000 theo 96 Ngày Người" "INSERT INTO allocation_batches (id, organization_id, contract_id, period_id, service_id, eligible_amount, total_person_days) VALUES (1,1,1,1,1,960000,96); INSERT INTO person_day_allocations (batch_id, occupancy_id, days_in_period, absent_days, person_days, raw_share, allocated_amount) VALUES (1,1,30,14,16,160000,160000),(1,2,30,10,20,200000,200000),(1,3,30,0,30,300000,300000)"
expect_error "person_days phải = days_in_period - absent_days" "INSERT INTO person_day_allocations (batch_id, occupancy_id, days_in_period, absent_days, person_days, raw_share, allocated_amount) VALUES (1,1,30,0,16,0,0)"
expect_error "BR-024 không chốt khi tổng Ngày Người = 0" "INSERT INTO allocation_batches (organization_id, contract_id, period_id, service_id, revision_no, eligible_amount, total_person_days, status) VALUES (1,1,1,1,2,960000,0,'CONFIRMED')"
expect_error "Lịch vắng: ngày kết thúc trước ngày bắt đầu" "INSERT INTO absence_requests (organization_id, occupancy_id, date_from, date_to) VALUES (1,1,'2026-11-10','2026-11-05')"

echo "--- EP11 quỹ phòng (GT-05)"
expect_ok    "Quỹ và đề nghị mua chung của A" "INSERT INTO room_funds (id, organization_id, room_id, contract_id, name, opened_at) VALUES (1,1,1,1,'Quỹ P101',NOW()); INSERT INTO shared_purchases (id, fund_id, requested_by_occupancy_id, status) VALUES (1,1,1,'PENDING_APPROVAL'); INSERT INTO shared_purchase_revisions (purchase_id, revision_no, title, amount, created_by) VALUES (1,1,'Nồi cơm',120000,3)"
expect_error "BR-025 A tự xác nhận" "INSERT INTO purchase_approvals (purchase_id, revision_no, approver_occupancy_id, decision) VALUES (1,1,1,'APPROVE')"
expect_ok    "B xác nhận" "INSERT INTO purchase_approvals (purchase_id, revision_no, approver_occupancy_id, decision) VALUES (1,1,2,'APPROVE')"
expect_error "B xác nhận lặp" "INSERT INTO purchase_approvals (purchase_id, revision_no, approver_occupancy_id, decision) VALUES (1,1,2,'APPROVE')"
expect_ok    "C xác nhận" "INSERT INTO purchase_approvals (purchase_id, revision_no, approver_occupancy_id, decision) VALUES (1,1,3,'APPROVE')"
expect_value "Đủ 2 người khác xác nhận" "SELECT COUNT(*) FROM purchase_approvals WHERE purchase_id=1 AND revision_no=1 AND decision='APPROVE'" "2"
expect_ok    "BR-026 đổi số tiền tạo revision 2" "INSERT INTO shared_purchase_revisions (purchase_id, revision_no, title, amount, created_by) VALUES (1,2,'Nồi cơm',150000,3); UPDATE shared_purchases SET current_revision_no=2 WHERE id=1"
expect_error "Xác nhận vào revision cũ bị chặn" "INSERT INTO purchase_approvals (purchase_id, revision_no, approver_occupancy_id, decision) VALUES (1,1,3,'REJECT')"
expect_value "Revision 2 chưa có xác nhận nào" "SELECT COUNT(*) FROM purchase_approvals WHERE purchase_id=1 AND revision_no=2" "0"
expect_ok    "Giữ chỗ quỹ" "INSERT INTO fund_reservations (id, fund_id, purchase_id, revision_no, amount, created_by) VALUES (1,1,1,2,150000,1)"
expect_error "BR-027 giữ chỗ lần 2 cho cùng đề nghị" "INSERT INTO fund_reservations (fund_id, purchase_id, revision_no, amount, created_by) VALUES (1,1,2,150000,1)"
expect_error "Giải phóng vượt số giữ chỗ" "UPDATE fund_reservations SET released_amount=200000 WHERE id=1"
expect_ok    "GT-06 nghĩa vụ 200k, quyền hoàn 120k -> bù 120k" "INSERT INTO fund_obligations (id, fund_id, occupancy_id, period_code, amount_due) VALUES (1,1,1,'2026-12',200000); INSERT INTO fund_refund_entitlements (id, fund_id, purchase_id, occupancy_id, amount, remaining_amount) VALUES (1,1,1,1,120000,0); INSERT INTO fund_offsets (entitlement_id, obligation_id, reservation_id, amount, idempotency_key) VALUES (1,1,1,120000,'off-1')"
expect_error "AC-019-03 chạy lại bù trừ" "INSERT INTO fund_offsets (entitlement_id, obligation_id, reservation_id, amount, idempotency_key) VALUES (1,1,1,120000,'off-1')"
expect_error "Quyền hoàn còn lại không âm" "UPDATE fund_refund_entitlements SET remaining_amount=-1 WHERE id=1"
expect_error "Đóng quỹ phải có người đóng" "INSERT INTO fund_transactions (fund_id, type, amount, occurred_at, idempotency_key, created_by) VALUES (1,'CONTRIBUTION',80000,NOW(),'ft-1',1)"

echo "--- EP15 nhật ký"
expect_ok    "Ghi nhật ký" "INSERT INTO audit_logs (organization_id, actor_user_id, entity_type, entity_id, action) VALUES (1,1,'INVOICE',1,'ISSUE')"
expect_error "AC-028-02 sửa nhật ký" "UPDATE audit_logs SET action='X'"
expect_error "AC-028-02 xóa nhật ký" "DELETE FROM audit_logs"

echo "--- Khóa ngoại RESTRICT"
expect_error "Không xóa phòng đã có hợp đồng (AC-002-02)" "DELETE FROM rooms WHERE id=1"

echo
echo "Kết quả: $pass đạt, $fail lỗi"
[ "$fail" -eq 0 ]
