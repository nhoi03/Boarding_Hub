-- BoardingHub V3: dữ liệu khởi tạo vai trò, quyền và chính sách mặc định.
-- Người thuê đại diện/ở cùng/người tìm phòng không có role ở đây: quyền suy ra từ occupancies và dữ liệu công khai.

SET NAMES utf8mb4;

INSERT INTO `roles` (`code`, `name`, `scope`) VALUES
  ('OWNER',          'Chủ trọ',             'ORGANIZATION'),
  ('STAFF',          'Nhân viên',           'PROPERTY'),
  ('PLATFORM_ADMIN', 'Quản trị nền tảng',   'PLATFORM'),
  ('OPERATOR',       'Người vận hành',      'PLATFORM');

INSERT INTO `permissions` (`code`, `module`, `description`, `is_sensitive`) VALUES
  ('USER_MANAGE',            'EP01', 'Quản lý tài khoản',                           0),
  ('ASSIGNMENT_MANAGE',      'EP01', 'Phân công nhân viên theo khu/phòng',          1),
  ('PROPERTY_VIEW',          'EP02', 'Xem khu trọ và phòng',                        0),
  ('PROPERTY_MANAGE',        'EP02', 'Tạo/sửa khu trọ',                             0),
  ('ROOM_MANAGE',            'EP02', 'Tạo/sửa phòng, đổi trạng thái',               0),
  ('POLICY_MANAGE',          'EP02', 'Duyệt chính sách tính tiền',                  1),
  ('TENANT_VIEW',            'EP03', 'Xem người thuê',                              0),
  ('TENANT_MANAGE',          'EP03', 'Thêm/sửa người thuê và lượt ở',               0),
  ('CONTRACT_VIEW',          'EP03', 'Xem hợp đồng',                                0),
  ('CONTRACT_MANAGE',        'EP03', 'Lập hợp đồng nháp',                           0),
  ('CONTRACT_ACTIVATE',      'EP03', 'Kích hoạt hợp đồng',                          1),
  ('CONTRACT_RENEW',         'EP04', 'Gia hạn/kết thúc sớm hợp đồng',               1),
  ('RENT_RATE_CHANGE',       'EP04', 'Đổi giá thuê',                                1),
  ('DEPOSIT_RECEIVE',        'EP03', 'Ghi nhận tiền cọc',                           1),
  ('DEPOSIT_REFUND',         'EP08', 'Hoàn cọc',                                    1),
  ('HANDOVER_MANAGE',        'EP05', 'Lập biên bản bàn giao',                       0),
  ('SERVICE_MANAGE',         'EP06', 'Cấu hình dịch vụ và biểu giá',                1),
  ('METER_READING_RECORD',   'EP06', 'Ghi chỉ số',                                  0),
  ('METER_READING_CONFIRM',  'EP06', 'Xác nhận chỉ số và kết quả OCR',              0),
  ('INVOICE_VIEW',           'EP07', 'Xem hóa đơn',                                 0),
  ('INVOICE_DRAFT',          'EP07', 'Lập hóa đơn nháp',                            0),
  ('INVOICE_ISSUE',          'EP07', 'Phát hành hóa đơn',                           1),
  ('INVOICE_ADJUST',         'EP07', 'Điều chỉnh/hủy hóa đơn',                      1),
  ('PAYMENT_RECORD',         'EP07', 'Ghi nhận thu tiền và phân bổ',                1),
  ('PAYMENT_VOID',           'EP07', 'Hủy/sửa phiếu thu',                           1),
  ('OVERPAYMENT_REFUND',     'EP07', 'Hoàn tiền trả dư',                            1),
  ('CHECKOUT_MANAGE',        'EP08', 'Lập quyết toán trả phòng',                    0),
  ('CHECKOUT_CONFIRM',       'EP08', 'Xác nhận quyết toán',                         1),
  ('DEDUCTION_APPROVE',      'EP08', 'Duyệt khấu trừ hư hỏng',                      1),
  ('MAINTENANCE_HANDLE',     'EP09', 'Tiếp nhận và xử lý bảo trì',                  0),
  ('DISPUTE_HANDLE',         'EP09', 'Xử lý tranh chấp',                            1),
  ('ABSENCE_APPROVE',        'EP10', 'Xác nhận lịch vắng (theo Q07)',               0),
  ('PERSON_DAY_CONFIRM',     'EP10', 'Chốt phần chia Ngày Người',                   1),
  ('RESIDENCE_REVIEW',       'EP12', 'Kiểm tra hồ sơ cư trú',                       1),
  ('FILE_DOWNLOAD_PRIVATE',  'EP12', 'Tải tệp riêng tư trong phạm vi',              1),
  ('LISTING_MANAGE',         'EP13', 'Quản lý tin phòng',                           0),
  ('LISTING_MODERATE',       'EP13', 'Kiểm duyệt tin phòng',                        0),
  ('APPOINTMENT_MANAGE',     'EP13', 'Xử lý yêu cầu và lịch xem',                   0),
  ('EXPENSE_MANAGE',         'EP14', 'Ghi chi phí vận hành',                        1),
  ('REPORT_VIEW',            'EP14', 'Xem báo cáo tài chính',                       1),
  ('REMINDER_MANAGE',        'EP14', 'Xử lý nhắc việc',                             0),
  ('AUDIT_VIEW',             'EP15', 'Xem nhật ký nghiệp vụ',                       1),
  ('BACKUP_OPERATE',         'EP15', 'Sao lưu và khôi phục',                        1),
  ('SUPPORT_ACCESS',         'EP15', 'Truy cập hỗ trợ theo hồ sơ được cấp (HT)',    1);

-- OWNER: toàn bộ quyền nghiệp vụ trong tổ chức, trừ quyền nền tảng
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.`id`, p.`id` FROM `roles` r JOIN `permissions` p
WHERE r.`code` = 'OWNER'
  AND p.`code` NOT IN ('USER_MANAGE', 'LISTING_MODERATE', 'BACKUP_OPERATE', 'SUPPORT_ACCESS');

-- STAFF: quyền vận hành không nhạy cảm; quyền nhạy cảm cấp riêng qua assignment_permission_grants
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.`id`, p.`id` FROM `roles` r JOIN `permissions` p
WHERE r.`code` = 'STAFF'
  AND p.`code` IN ('PROPERTY_VIEW', 'TENANT_VIEW', 'TENANT_MANAGE', 'CONTRACT_VIEW', 'CONTRACT_MANAGE',
                   'HANDOVER_MANAGE', 'METER_READING_RECORD', 'METER_READING_CONFIRM', 'INVOICE_VIEW',
                   'INVOICE_DRAFT', 'CHECKOUT_MANAGE', 'MAINTENANCE_HANDLE', 'APPOINTMENT_MANAGE',
                   'LISTING_MANAGE', 'REMINDER_MANAGE');

INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.`id`, p.`id` FROM `roles` r JOIN `permissions` p
WHERE r.`code` = 'PLATFORM_ADMIN' AND p.`code` IN ('USER_MANAGE', 'LISTING_MODERATE', 'SUPPORT_ACCESS');

INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.`id`, p.`id` FROM `roles` r JOIN `permissions` p
WHERE r.`code` = 'OPERATOR' AND p.`code` = 'BACKUP_OPERATE';

-- Chính sách mặc định toàn hệ thống (organization_id NULL). Đây là giả định của đồ án cho Q chưa chốt.
INSERT INTO `business_policies` (`organization_id`, `policy_code`, `revision_no`, `value_json`, `decision_ref`, `effective_from`, `status`) VALUES
  (NULL, 'ROUNDING',           1, JSON_OBJECT('unit', 1, 'mode', 'LARGEST_REMAINDER', 'tie_break', 'OCCUPANCY_ID_ASC'), 'Q04', '2026-01-01', 'APPROVED'),
  (NULL, 'PRORATION',          1, JSON_OBJECT('default', 'NOT_SET', 'day_counting', 'INCLUSIVE'),                   'Q02', '2026-01-01', 'APPROVED'),
  (NULL, 'BILLING_CYCLE',      1, JSON_OBJECT('default', 'CALENDAR_MONTH', 'payment_due_days', 5),                  'Q03', '2026-01-01', 'APPROVED'),
  (NULL, 'PAYMENT_ALLOCATION', 1, JSON_OBJECT('mode', 'MANUAL_SELECT_INVOICE'),                                     'Q05', '2026-01-01', 'APPROVED'),
  (NULL, 'OVERPAYMENT',        1, JSON_OBJECT('mode', 'HOLD_UNALLOCATED', 'auto_apply_next_period', FALSE),         'Q05', '2026-01-01', 'APPROVED'),
  (NULL, 'BUSINESS_TIMEZONE',  1, JSON_OBJECT('timezone', 'Asia/Ho_Chi_Minh'),                                      'Q07', '2026-01-01', 'APPROVED'),
  (NULL, 'ABSENCE_APPROVAL',   1, JSON_OBJECT('approver', 'REPRESENTATIVE_OR_LANDLORD', 'count_only_approved', TRUE), 'Q07', '2026-01-01', 'APPROVED'),
  (NULL, 'FUND_LIFECYCLE',     1, JSON_OBJECT('min_other_approvers', 2, 'on_member_leave', 'HOLD_ENTITLEMENT'),     'Q09', '2026-01-01', 'APPROVED'),
  (NULL, 'BACKUP',             1, JSON_OBJECT('schedule', 'DAILY', 'rpo_hours', 24, 'rto_hours', 4),                'Q12', '2026-01-01', 'APPROVED');
