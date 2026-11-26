-- BoardingHub V1: schema generated from boardinghub.dbml by tools/dbml_to_mysql.py. Do not edit by hand.
-- MySQL 8.0+, InnoDB, utf8mb4.
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE `users` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(190) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'BCrypt/Argon2; không lưu mật khẩu rõ',
  `full_name` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(30) NULL,
  `status` ENUM('ACTIVE', 'LOCKED', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
  `is_platform_admin` TINYINT(1) NOT NULL DEFAULT 0,
  `last_login_at` DATETIME(6) NULL,
  `failed_login_count` INT NOT NULL DEFAULT 0,
  `version` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tài khoản đăng nhập. Người thuê có tài khoản được liên kết qua persons.user_id (US-001).';

CREATE TABLE `roles` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL COMMENT 'OWNER, STAFF, PLATFORM_ADMIN, OPERATOR',
  `name` VARCHAR(120) NOT NULL,
  `scope` ENUM('PLATFORM', 'ORGANIZATION', 'PROPERTY', 'ROOM') NOT NULL,
  `is_system` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_roles_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Vai trò gán theo phạm vi. Người thuê đại diện/ở cùng KHÔNG gán ở đây mà suy ra từ occupancies đang hiệu lực.';

CREATE TABLE `permissions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(100) NOT NULL COMMENT 'Ví dụ PAYMENT_RECORD, DEPOSIT_REFUND, INVOICE_ISSUE',
  `module` VARCHAR(40) NOT NULL COMMENT 'EP01..EP15',
  `description` VARCHAR(255) NULL,
  `is_sensitive` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Quyền phải cấp riêng (PC riêng)',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_permissions_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `role_permissions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `role_id` BIGINT NOT NULL,
  `permission_id` BIGINT NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_role_permissions` (`role_id`, `permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Quyền mặc định của vai trò. Quyền nhạy cảm (is_sensitive) chỉ OWNER có mặc định; nhân viên được cấp riêng qua assignment_permission_grants.';

CREATE TABLE `user_role_assignments` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `role_id` BIGINT NOT NULL,
  `organization_id` BIGINT NOT NULL,
  `property_id` BIGINT NULL COMMENT 'NULL = toàn tổ chức',
  `room_id` BIGINT NULL COMMENT 'NULL = toàn khu',
  `granted_by` BIGINT NULL,
  `granted_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `revoked_at` DATETIME(6) NULL COMMENT 'Thu hồi có hiệu lực ngay ở request kế tiếp (AC-001-03)',
  `revoked_by` BIGINT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_ura_user_active` (`user_id`, `revoked_at`),
  KEY `idx_ura_scope` (`organization_id`, `property_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Phân công chủ trọ/nhân viên theo tổ chức, khu hoặc phòng (BR-001).';

CREATE TABLE `assignment_permission_grants` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `assignment_id` BIGINT NOT NULL,
  `permission_id` BIGINT NOT NULL,
  `granted_by` BIGINT NOT NULL,
  `granted_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `revoked_at` DATETIME(6) NULL,
  `revoked_by` BIGINT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_apg_assignment_permission` (`assignment_id`, `permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Quyền cấp riêng cho một lượt phân công: thu tiền, hoàn cọc, xem nhật ký... (ma trận quyền "PC riêng").';

CREATE TABLE `support_access_grants` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `admin_user_id` BIGINT NOT NULL,
  `organization_id` BIGINT NOT NULL,
  `entity_type` VARCHAR(60) NOT NULL,
  `entity_id` BIGINT NOT NULL,
  `reason` VARCHAR(500) NOT NULL,
  `granted_by` BIGINT NOT NULL COMMENT 'Chủ trọ hoặc người có thẩm quyền theo Q14',
  `valid_from` DATETIME(6) NOT NULL,
  `valid_to` DATETIME(6) NOT NULL,
  `revoked_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_sag_admin_entity` (`admin_user_id`, `entity_type`, `entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Quyền HT: quản trị nền tảng chỉ xem hồ sơ riêng khi được cấp theo từng hồ sơ, có thời hạn.';

CREATE TABLE `organizations` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `owner_user_id` BIGINT NOT NULL,
  `phone` VARCHAR(30) NULL,
  `email` VARCHAR(190) NULL,
  `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `version` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Chủ thể chủ trọ. Mọi dữ liệu riêng gắn organization_id để cô lập giữa các chủ trọ (AC-001-02).';

CREATE TABLE `properties` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL,
  `code` VARCHAR(30) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `address` VARCHAR(255) NOT NULL,
  `ward` VARCHAR(100) NULL,
  `district` VARCHAR(100) NULL,
  `city` VARCHAR(100) NULL,
  `timezone` VARCHAR(64) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `version` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_properties_org_code` (`organization_id`, `code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rooms` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL,
  `property_id` BIGINT NOT NULL,
  `code` VARCHAR(30) NOT NULL,
  `floor_no` INT NULL,
  `capacity` INT NOT NULL COMMENT 'CHECK > 0',
  `area_m2` DECIMAL(10,2) NULL,
  `listed_rent` DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT 'Giá niêm yết; không ảnh hưởng hợp đồng đã ký',
  `status` ENUM('VACANT', 'OCCUPIED', 'MAINTENANCE', 'INACTIVE') NOT NULL DEFAULT 'VACANT',
  `description` TEXT NULL,
  `version` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rooms_property_code` (`property_id`, `code`),
  KEY `idx_rooms_org_status` (`organization_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BR-003. Không xóa phòng đã có lịch sử; chuyển INACTIVE (AC-002-02).';

CREATE TABLE `room_status_history` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `room_id` BIGINT NOT NULL,
  `from_status` ENUM('VACANT', 'OCCUPIED', 'MAINTENANCE', 'INACTIVE') NULL,
  `to_status` ENUM('VACANT', 'OCCUPIED', 'MAINTENANCE', 'INACTIVE') NOT NULL,
  `reason` VARCHAR(255) NULL,
  `changed_by` BIGINT NULL,
  `changed_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_rsh_room_time` (`room_id`, `changed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `business_policies` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NULL COMMENT 'NULL = mặc định toàn hệ thống',
  `policy_code` VARCHAR(60) NOT NULL COMMENT 'ROUNDING, PRORATION, PAYMENT_ALLOCATION, OVERPAYMENT, BILLING_CYCLE, BUSINESS_TIMEZONE, ABSENCE_APPROVAL, FUND_LIFECYCLE, RETENTION, BACKUP',
  `revision_no` INT NOT NULL,
  `value_json` JSON NOT NULL,
  `decision_ref` VARCHAR(20) NULL COMMENT 'Mã câu hỏi Q01..Q14',
  `effective_from` DATE NOT NULL,
  `status` ENUM('DRAFT', 'APPROVED', 'RETIRED') NOT NULL DEFAULT 'DRAFT',
  `approved_by` BIGINT NULL,
  `approved_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_policies_org_code_rev` (`organization_id`, `policy_code`, `revision_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lưu quyết định Q01-Q14 có phiên bản và ngày hiệu lực. Chứng từ lưu policy_id đã dùng.';

CREATE TABLE `persons` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL,
  `user_id` BIGINT NULL COMMENT 'NULL nếu người thuê chưa có tài khoản',
  `full_name` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(30) NULL,
  `email` VARCHAR(190) NULL,
  `date_of_birth` DATE NULL,
  `identity_number` VARCHAR(255) NULL COMMENT 'Tùy chọn; mã hóa ở tầng ứng dụng; không ghi vào log',
  `permanent_address` VARCHAR(255) NULL,
  `created_by` BIGINT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_persons_org_user` (`organization_id`, `user_id`),
  KEY `idx_persons_org_phone` (`organization_id`, `phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Người thuê tách khỏi lượt ở để giữ lịch sử. Chỉ bắt buộc dữ liệu cần thiết (luồng tiếp nhận bước 2).';

CREATE TABLE `contracts` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL,
  `room_id` BIGINT NOT NULL,
  `representative_person_id` BIGINT NOT NULL,
  `code` VARCHAR(60) NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL COMMENT 'Ngày kết thúc hiện hành; lịch sử ở contract_versions',
  `billing_cycle` ENUM('CALENDAR_MONTH', 'CONTRACT_ANNIVERSARY') NOT NULL DEFAULT 'CALENDAR_MONTH',
  `billing_anchor_day` TINYINT NOT NULL DEFAULT 1 COMMENT '1..28; ngày bắt đầu kỳ thu',
  `payment_due_days` INT NOT NULL DEFAULT 5 COMMENT 'Hạn đóng = ngày phát hành + N ngày',
  `proration_policy` ENUM('NOT_SET', 'ACTUAL_DAYS_INCLUSIVE', 'FIXED_30_INCLUSIVE', 'FULL_MONTH') NOT NULL DEFAULT 'NOT_SET' COMMENT 'Q02, BR-012',
  `rounding_policy_id` BIGINT NULL COMMENT 'Q04, BR-013',
  `deposit_required` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `status` ENUM('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `activated_at` DATETIME(6) NULL,
  `activated_by` BIGINT NULL,
  `terminated_at` DATETIME(6) NULL,
  `termination_reason` VARCHAR(255) NULL,
  `cancelled_reason` VARCHAR(255) NULL,
  `created_by` BIGINT NULL,
  `version` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_contracts_org_code` (`organization_id`, `code`),
  KEY `idx_contracts_room_status` (`room_id`, `status`),
  KEY `idx_contracts_end_date` (`end_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BR-004: một phòng tối đa một hợp đồng ACTIVE/EXPIRED (unique trên cột sinh active_room_key ở V2). Hết hạn chuyển EXPIRED, không tự kết thúc lượt ở hay hoàn cọc. Giá thuê lấy từ rent_rates.';

CREATE TABLE `contract_versions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `contract_id` BIGINT NOT NULL,
  `revision_no` INT NOT NULL,
  `change_type` ENUM('CREATE', 'RENEW', 'EARLY_TERMINATE', 'PRICE_CHANGE', 'TERMS_CHANGE') NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `effective_from` DATE NOT NULL,
  `terms_json` JSON NOT NULL COMMENT 'Snapshot điều khoản: dịch vụ, chính sách, ghi chú',
  `change_reason` VARCHAR(255) NULL,
  `status` ENUM('DRAFT', 'APPROVED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `created_by` BIGINT NULL,
  `approved_by` BIGINT NULL,
  `approved_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_contract_versions_rev` (`contract_id`, `revision_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BR-005, US-005: gia hạn, kết thúc sớm, đổi điều khoản có phiên bản; truy xuất được bản trước.';

CREATE TABLE `rent_rates` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `contract_id` BIGINT NOT NULL,
  `contract_version_id` BIGINT NULL,
  `effective_from` DATE NOT NULL,
  `effective_to` DATE NULL COMMENT 'NULL = đến khi có giá mới',
  `monthly_rent` DECIMAL(18,2) NOT NULL,
  `reason` VARCHAR(255) NULL,
  `created_by` BIGINT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rent_rates_contract_from` (`contract_id`, `effective_from`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Nguồn duy nhất của giá thuê theo ngày hiệu lực. Đổi giá giữa kỳ -> hóa đơn chia đoạn (AC-005-03).';

CREATE TABLE `contract_services` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `contract_id` BIGINT NOT NULL,
  `service_id` BIGINT NOT NULL,
  `quantity` DECIMAL(12,2) NOT NULL DEFAULT 1 COMMENT 'Ví dụ số người với phí PER_PERSON',
  `unit_price_override` DECIMAL(18,2) NULL COMMENT 'NULL = dùng service_prices',
  `effective_from` DATE NOT NULL,
  `effective_to` DATE NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_contract_services` (`contract_id`, `service_id`, `effective_from`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Dịch vụ áp dụng cho hợp đồng (luồng tiếp nhận bước 3).';

CREATE TABLE `occupancies` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL,
  `contract_id` BIGINT NOT NULL,
  `room_id` BIGINT NOT NULL COMMENT 'Phi chuẩn hóa để kiểm sức chứa và quyền nhanh',
  `person_id` BIGINT NOT NULL,
  `role` ENUM('REPRESENTATIVE', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
  `move_in_date` DATE NOT NULL,
  `move_out_date` DATE NULL COMMENT 'CHECK >= move_in_date',
  `status` ENUM('PLANNED', 'ACTIVE', 'ENDED', 'CANCELLED') NOT NULL DEFAULT 'PLANNED',
  `end_reason` VARCHAR(255) NULL,
  `created_by` BIGINT NULL,
  `version` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_occupancies_contract_status` (`contract_id`, `status`),
  KEY `idx_occupancies_room_status` (`room_id`, `status`),
  KEY `idx_occupancies_person` (`person_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lượt cư trú. Kiểm sức chứa khi thêm (BR-003). Là căn cứ quyền người thuê và Ngày Người (BR-021).';

CREATE TABLE `deposit_transactions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL,
  `contract_id` BIGINT NOT NULL,
  `type` ENUM('RECEIVE', 'APPLY_TO_DEBT', 'REFUND') NOT NULL,
  `amount` DECIMAL(18,2) NOT NULL COMMENT 'CHECK > 0',
  `occurred_at` DATETIME(6) NOT NULL,
  `method` ENUM('CASH', 'BANK_TRANSFER', 'E_WALLET', 'OTHER') NULL,
  `checkout_id` BIGINT NULL COMMENT 'Bắt buộc với APPLY_TO_DEBT và REFUND khi trả phòng',
  `reverses_transaction_id` BIGINT NULL COMMENT 'Bút toán đảo khi ghi sai',
  `idempotency_key` VARCHAR(100) NOT NULL,
  `reference_code` VARCHAR(100) NULL,
  `note` VARCHAR(255) NULL,
  `recorded_by` BIGINT NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_deposit_transactions_idempotency_key` (`idempotency_key`),
  KEY `idx_deposit_txn_contract_type` (`contract_id`, `type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BR-006: cọc theo dõi riêng. Cọc khả dụng = RECEIVE - APPLY_TO_DEBT - REFUND, không âm (khóa dòng contracts khi ghi). Nhận cọc thiếu vẫn ghi (AC-004-03). Không cộng vào tiền thuê thực thu.';

CREATE TABLE `room_assets` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL,
  `room_id` BIGINT NOT NULL,
  `asset_code` VARCHAR(50) NOT NULL,
  `asset_name` VARCHAR(150) NOT NULL,
  `unit` VARCHAR(30) NULL,
  `quantity` DECIMAL(12,2) NOT NULL DEFAULT 1,
  `reference_value` DECIMAL(18,2) NULL COMMENT 'Giá trị tham khảo, không tự áp làm tiền bồi thường (BR-018)',
  `status` ENUM('IN_USE', 'BROKEN', 'REMOVED') NOT NULL DEFAULT 'IN_USE',
  `note` VARCHAR(255) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_room_assets_code` (`room_id`, `asset_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `handovers` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL,
  `contract_id` BIGINT NOT NULL,
  `type` ENUM('CHECK_IN', 'CHECK_OUT') NOT NULL,
  `revision_no` INT NOT NULL DEFAULT 1,
  `supersedes_handover_id` BIGINT NULL COMMENT 'Sửa bản đã xác nhận tạo bản mới (AC-006-02)',
  `status` ENUM('DRAFT', 'CONFIRMED', 'SUPERSEDED') NOT NULL DEFAULT 'DRAFT',
  `handed_at` DATETIME(6) NOT NULL,
  `recorded_by` BIGINT NULL,
  `landlord_confirmed_by` BIGINT NULL,
  `tenant_confirmed_person_id` BIGINT NULL,
  `confirmed_at` DATETIME(6) NULL,
  `note` TEXT NULL,
  `version` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_handovers_rev` (`contract_id`, `type`, `revision_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Biên bản nhận/trả phòng. Ảnh qua file_links(entity_type=HANDOVER_ITEM).';

CREATE TABLE `handover_items` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `handover_id` BIGINT NOT NULL,
  `asset_id` BIGINT NOT NULL,
  `quantity` DECIMAL(12,2) NOT NULL,
  `item_condition` ENUM('GOOD', 'WORN', 'DAMAGED', 'MISSING') NOT NULL DEFAULT 'GOOD',
  `condition_note` VARCHAR(255) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_handover_items` (`handover_id`, `asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Không lưu tiền hư hỏng ở đây; khấu trừ nằm ở checkout_deductions để chỉ có một nguồn (BR-017).';

CREATE TABLE `services` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL,
  `code` VARCHAR(50) NOT NULL COMMENT 'ELECTRIC, WATER, WIFI, TRASH...',
  `name` VARCHAR(150) NOT NULL,
  `unit` VARCHAR(30) NOT NULL COMMENT 'kWh, m3, phòng, người, tháng',
  `calculation_method` ENUM('METERED', 'TIERED_METERED', 'PER_ROOM', 'PER_PERSON', 'FIXED') NOT NULL,
  `person_day_eligible` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Được chọn chia theo Ngày Người (BR-023)',
  `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_services_org_code` (`organization_id`, `code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `service_prices` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `service_id` BIGINT NOT NULL,
  `property_id` BIGINT NULL COMMENT 'NULL = toàn tổ chức',
  `room_id` BIGINT NULL COMMENT 'NULL = toàn khu',
  `effective_from` DATE NOT NULL,
  `effective_to` DATE NULL,
  `unit_price` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `tiers_json` JSON NULL COMMENT 'Bậc giá cho TIERED_METERED: [{from,to,price}]',
  `created_by` BIGINT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_service_prices_scope_from` (`service_id`, `property_id`, `room_id`, `effective_from`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BR-009: giá có ngày hiệu lực; ứng dụng kiểm khoảng hiệu lực không chồng trong cùng phạm vi.';

CREATE TABLE `meters` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL,
  `room_id` BIGINT NOT NULL,
  `service_id` BIGINT NOT NULL,
  `serial_number` VARCHAR(80) NULL,
  `installed_at` DATE NOT NULL,
  `initial_value` DECIMAL(18,4) NOT NULL DEFAULT 0,
  `removed_at` DATE NULL,
  `final_value` DECIMAL(18,4) NULL,
  `replaced_meter_id` BIGINT NULL COMMENT 'Đồng hồ cũ mà đồng hồ này thay thế',
  `status` ENUM('ACTIVE', 'REPLACED', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_meters_room_service_status` (`room_id`, `service_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BR-007: thay đồng hồ giữ chuỗi cũ và mới, không sửa đè.';

CREATE TABLE `meter_readings` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL,
  `meter_id` BIGINT NOT NULL,
  `period_id` BIGINT NULL COMMENT 'NULL cho CHECK_IN trước kỳ đầu',
  `reading_type` ENUM('REGULAR', 'CHECK_IN', 'CHECK_OUT', 'REPLACEMENT_CLOSE') NOT NULL DEFAULT 'REGULAR',
  `previous_value` DECIMAL(18,4) NOT NULL,
  `current_value` DECIMAL(18,4) NOT NULL COMMENT 'CHECK >= previous_value (AC-008-02)',
  `read_at` DATETIME(6) NOT NULL,
  `source` ENUM('MANUAL', 'OCR') NOT NULL DEFAULT 'MANUAL',
  `ocr_job_id` BIGINT NULL,
  `photo_file_id` BIGINT NULL,
  `is_anomaly` TINYINT(1) NOT NULL DEFAULT 0,
  `anomaly_note` VARCHAR(255) NULL,
  `status` ENUM('DRAFT', 'CONFIRMED', 'SUPERSEDED') NOT NULL DEFAULT 'DRAFT',
  `supersedes_reading_id` BIGINT NULL,
  `recorded_by` BIGINT NULL,
  `confirmed_by` BIGINT NULL,
  `confirmed_at` DATETIME(6) NULL,
  `version` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_meter_readings_meter_period` (`meter_id`, `period_id`),
  KEY `idx_meter_readings_period_status` (`period_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Mỗi dòng là một đoạn chỉ số của một đồng hồ. Thay đồng hồ giữa kỳ = 2 dòng (cũ REPLACEMENT_CLOSE + mới REGULAR), tổng = 80 + 20 (AC-008-03). Tối đa 1 bản CONFIRMED cho (meter, period, reading_type) qua cột sinh ở V2. Chỉ CONFIRMED mới dùng lập hóa đơn (BR-008).';

CREATE TABLE `ocr_jobs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL,
  `file_id` BIGINT NOT NULL,
  `meter_id` BIGINT NULL,
  `provider` VARCHAR(60) NULL,
  `suggested_value` DECIMAL(18,4) NULL,
  `confidence` DECIMAL(5,4) NULL,
  `raw_result` JSON NULL,
  `status` ENUM('PENDING', 'SUCCEEDED', 'FAILED', 'REVIEWED') NOT NULL DEFAULT 'PENDING',
  `error_message` VARCHAR(500) NULL,
  `requested_by` BIGINT NULL,
  `reviewed_by` BIGINT NULL,
  `reviewed_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_ocr_jobs_meter_status` (`meter_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BR-008: kết quả OCR chỉ là gợi ý; lỗi OCR không tự nhập số 0 (AC-009-03).';

CREATE TABLE `billing_periods` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL,
  `contract_id` BIGINT NOT NULL,
  `period_code` VARCHAR(20) NOT NULL COMMENT 'Ví dụ 2026-11',
  `date_from` DATE NOT NULL,
  `date_to` DATE NOT NULL COMMENT 'CHECK >= date_from; tính cả 2 đầu',
  `status` ENUM('OPEN', 'LOCKED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
  `locked_at` DATETIME(6) NULL,
  `locked_by` BIGINT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_billing_periods_contract_from` (`contract_id`, `date_from`),
  UNIQUE KEY `uq_billing_periods_contract_code` (`contract_id`, `period_code`),
  KEY `idx_billing_periods_org_status` (`organization_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Kỳ thu của một hợp đồng (định nghĩa "Kỳ thu" trong BA). Kỳ LOCKED thì dữ liệu tính tiền chỉ sửa qua điều chỉnh.';

CREATE TABLE `invoices` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL,
  `contract_id` BIGINT NOT NULL,
  `period_id` BIGINT NULL COMMENT 'Bắt buộc với PERIODIC',
  `invoice_no` VARCHAR(60) NOT NULL,
  `invoice_type` ENUM('PERIODIC', 'CHECKOUT', 'ONE_OFF') NOT NULL DEFAULT 'PERIODIC',
  `status` ENUM('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `subtotal_amount` DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT 'Tổng invoice_items, cập nhật cùng transaction',
  `due_date` DATE NULL,
  `issued_at` DATETIME(6) NULL,
  `issued_by` BIGINT NULL,
  `cancelled_at` DATETIME(6) NULL,
  `cancelled_by` BIGINT NULL,
  `cancel_reason` VARCHAR(255) NULL,
  `generation_key` VARCHAR(120) NULL COMMENT 'Khóa chống lặp khi chạy lại tác vụ lập hóa đơn (BR-010)',
  `policy_snapshot` JSON NULL COMMENT 'Chính sách và giá đã dùng khi lập',
  `created_by` BIGINT NULL,
  `version` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_invoices_generation_key` (`generation_key`),
  UNIQUE KEY `uq_invoices_org_no` (`organization_id`, `invoice_no`),
  KEY `idx_invoices_contract_status` (`contract_id`, `status`),
  KEY `idx_invoices_org_due_status` (`organization_id`, `due_date`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BR-009..BR-011, BR-015. Phải thu hiệu lực = subtotal + tổng invoice_adjustments APPROVED. Công nợ = phải thu hiệu lực - tổng payment_allocations ACTIVE. Quá hạn là cờ tính (due_date < hôm nay và còn nợ), không lưu. Hóa đơn ISSUED không sửa dòng; sửa qua invoice_adjustments.';

CREATE TABLE `invoice_items` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `invoice_id` BIGINT NOT NULL,
  `line_no` INT NOT NULL,
  `item_type` ENUM('RENT', 'UTILITY', 'SERVICE', 'DAMAGE', 'MAINTENANCE_RECHARGE', 'OTHER') NOT NULL,
  `service_id` BIGINT NULL,
  `rent_rate_id` BIGINT NULL,
  `meter_reading_id` BIGINT NULL,
  `description` VARCHAR(255) NOT NULL,
  `date_from` DATE NULL COMMENT 'Đoạn ngày áp dụng khi chia đoạn giá',
  `date_to` DATE NULL,
  `quantity` DECIMAL(18,4) NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `amount` DECIMAL(18,2) NOT NULL,
  `calculation_snapshot` JSON NOT NULL COMMENT 'Công thức, đơn giá, số ngày, nguồn dữ liệu (AC-010-01)',
  `source_key` VARCHAR(120) NOT NULL COMMENT 'Ví dụ RENT:rate42:2026-11-01, chống thêm dòng trùng khi chạy lại (AC-007-03)',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_invoice_items_line` (`invoice_id`, `line_no`),
  UNIQUE KEY `uq_invoice_items_source` (`invoice_id`, `source_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `invoice_adjustments` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `invoice_id` BIGINT NOT NULL,
  `amount` DECIMAL(18,2) NOT NULL COMMENT 'Âm = giảm, dương = tăng; CHECK <> 0',
  `reason` VARCHAR(255) NOT NULL,
  `dispute_id` BIGINT NULL,
  `allocation_batch_id` BIGINT NULL COMMENT 'Điều chỉnh do chia Ngày Người phiên bản mới',
  `status` ENUM('DRAFT', 'APPROVED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `created_by` BIGINT NOT NULL,
  `approved_by` BIGINT NULL,
  `approved_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_invoice_adjustments_invoice_status` (`invoice_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BR-011: sửa sau phát hành bằng chứng từ điều chỉnh có lý do. Giảm phải thu dưới số đã phân bổ phải đối soát trước.';

CREATE TABLE `payments` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL,
  `contract_id` BIGINT NOT NULL COMMENT 'Chủ thể sở hữu tiền dư (BR-016)',
  `payer_person_id` BIGINT NULL,
  `amount` DECIMAL(18,2) NOT NULL COMMENT 'CHECK > 0',
  `received_at` DATETIME(6) NOT NULL,
  `method` ENUM('CASH', 'BANK_TRANSFER', 'E_WALLET', 'OTHER') NOT NULL,
  `idempotency_key` VARCHAR(100) NOT NULL COMMENT 'Gửi lặp không cộng tiền lần 2 (AC-011-02)',
  `external_reference` VARCHAR(100) NULL COMMENT 'Mã giao dịch ngân hàng',
  `status` ENUM('CONFIRMED', 'VOIDED') NOT NULL DEFAULT 'CONFIRMED',
  `corrects_payment_id` BIGINT NULL COMMENT 'Phiếu này thay cho phiếu ghi sai (AC-011-04)',
  `voided_at` DATETIME(6) NULL,
  `voided_by` BIGINT NULL,
  `void_reason` VARCHAR(255) NULL,
  `note` VARCHAR(255) NULL,
  `received_by` BIGINT NOT NULL,
  `version` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payments_idempotency_key` (`idempotency_key`),
  KEY `idx_payments_contract_status` (`contract_id`, `status`),
  KEY `idx_payments_org_received` (`organization_id`, `received_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BR-014. Phiếu thu tiền thuê/điện nước/dịch vụ; cọc ghi ở deposit_transactions, quỹ ở fund_transactions. Phiếu sai: chuyển VOIDED (đảo hết phân bổ) và tạo phiếu mới corrects_payment_id. Báo cáo chỉ cộng CONFIRMED. Tiền chưa phân bổ = amount - phân bổ ACTIVE - overpayment_refunds.';

CREATE TABLE `payment_allocations` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `payment_id` BIGINT NOT NULL,
  `invoice_id` BIGINT NOT NULL,
  `amount` DECIMAL(18,2) NOT NULL COMMENT 'CHECK > 0',
  `status` ENUM('ACTIVE', 'REVERSED') NOT NULL DEFAULT 'ACTIVE',
  `allocated_by` BIGINT NOT NULL,
  `allocated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `reversed_by` BIGINT NULL,
  `reversed_at` DATETIME(6) NULL,
  `reverse_reason` VARCHAR(255) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_payment_alloc_payment_status` (`payment_id`, `status`),
  KEY `idx_payment_alloc_invoice_status` (`invoice_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tổng phân bổ ACTIVE của một phiếu không vượt amount; của một hóa đơn không vượt phải thu hiệu lực (khóa dòng khi ghi).';

CREATE TABLE `overpayment_refunds` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `payment_id` BIGINT NOT NULL,
  `amount` DECIMAL(18,2) NOT NULL COMMENT 'CHECK > 0',
  `refunded_at` DATETIME(6) NOT NULL,
  `method` ENUM('CASH', 'BANK_TRANSFER', 'E_WALLET', 'OTHER') NOT NULL,
  `idempotency_key` VARCHAR(100) NOT NULL,
  `reason` VARCHAR(255) NULL,
  `approved_by` BIGINT NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_overpayment_refunds_idempotency_key` (`idempotency_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BR-016, Q05: hoàn lại phần tiền dư chưa phân bổ. Dùng cho kỳ sau = tạo phân bổ sang hóa đơn kỳ sau.';

CREATE TABLE `payment_reconciliations` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `payment_id` BIGINT NOT NULL,
  `statement_reference` VARCHAR(100) NULL,
  `status` ENUM('PENDING', 'MATCHED', 'MISMATCHED') NOT NULL DEFAULT 'PENDING',
  `note` VARCHAR(255) NULL,
  `reconciled_by` BIGINT NULL,
  `reconciled_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_payment_recon_payment` (`payment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Đối soát với sao kê ngân hàng (Q08).';

CREATE TABLE `checkouts` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL,
  `contract_id` BIGINT NOT NULL,
  `requested_at` DATETIME(6) NOT NULL,
  `requested_by` BIGINT NULL,
  `planned_date` DATE NULL,
  `checkout_date` DATE NULL COMMENT 'Ngày ra đã chốt',
  `checkout_handover_id` BIGINT NULL,
  `final_invoice_id` BIGINT NULL,
  `outstanding_debt` DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT 'Nợ chưa thanh toán sau phân bổ',
  `extra_deductions` DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT 'Khấu trừ APPROVED chưa nằm trong nợ',
  `total_obligation` DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT '= outstanding_debt + extra_deductions',
  `deposit_available` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `deposit_used` DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT '= MIN(deposit_available, total_obligation)',
  `refund_amount` DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT '= deposit_available - deposit_used',
  `extra_charge` DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT '= total_obligation - deposit_used',
  `status` ENUM('DRAFT', 'PENDING_CONFIRMATION', 'CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `confirmed_by` BIGINT NULL,
  `confirmed_at` DATETIME(6) NULL,
  `tenant_acknowledged_at` DATETIME(6) NULL,
  `cancel_reason` VARCHAR(255) NULL,
  `version` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_checkouts_contract_status` (`contract_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BR-017, US-012. Tối đa 1 quyết toán chưa hủy mỗi hợp đồng (cột sinh ở V2) -> xác nhận lặp không hoàn cọc 2 lần (AC-012-04). Ví dụ AC-012-02: nợ 800k + hư hỏng 300k = 1.100k; cọc 2.000k -> dùng 1.100k, hoàn 900k.';

CREATE TABLE `checkout_deductions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `checkout_id` BIGINT NOT NULL,
  `handover_item_id` BIGINT NULL,
  `maintenance_request_id` BIGINT NULL,
  `reason` VARCHAR(255) NOT NULL,
  `amount` DECIMAL(18,2) NOT NULL COMMENT 'CHECK >= 0',
  `included_in_invoice_item_id` BIGINT NULL COMMENT 'Đã nằm trong nợ -> không cộng vào extra_deductions (BR-017)',
  `status` ENUM('PROPOSED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PROPOSED',
  `approved_by` BIGINT NULL,
  `approved_at` DATETIME(6) NULL,
  `created_by` BIGINT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_checkout_deductions_status` (`checkout_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BR-018: khấu trừ có căn cứ (ảnh qua file_links) và xác nhận; PROPOSED/REJECTED không trừ cọc (AC-006-03).';

CREATE TABLE `maintenance_requests` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL,
  `room_id` BIGINT NOT NULL,
  `contract_id` BIGINT NULL,
  `reported_by` BIGINT NULL,
  `assigned_to` BIGINT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NULL,
  `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
  `status` ENUM('NEW', 'ACCEPTED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED') NOT NULL DEFAULT 'NEW',
  `blocks_room` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Khóa không cho chuyển phòng về trống/kích hoạt hợp đồng',
  `resolution_note` TEXT NULL,
  `resolved_at` DATETIME(6) NULL,
  `recharge_invoice_item_id` BIGINT NULL COMMENT 'Phần thu lại người thuê đã duyệt (BR-019)',
  `version` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_maintenance_org_status` (`organization_id`, `status`),
  KEY `idx_maintenance_room_status` (`room_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Chi phí sửa ghi ở operating_expenses.maintenance_request_id (một lần), không lưu cost ở đây.';

CREATE TABLE `maintenance_status_history` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `request_id` BIGINT NOT NULL,
  `from_status` ENUM('NEW', 'ACCEPTED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED') NULL,
  `to_status` ENUM('NEW', 'ACCEPTED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED') NOT NULL,
  `note` VARCHAR(500) NULL,
  `changed_by` BIGINT NOT NULL,
  `changed_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_msh_request_time` (`request_id`, `changed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AC-013-02: mỗi lần chuyển trạng thái lưu người, thời điểm, kết quả.';

CREATE TABLE `disputes` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL,
  `contract_id` BIGINT NOT NULL,
  `entity_type` VARCHAR(60) NOT NULL COMMENT 'INVOICE, HANDOVER, CHECKOUT, DEPOSIT, OTHER',
  `entity_id` BIGINT NULL,
  `subject` VARCHAR(200) NOT NULL,
  `details` TEXT NULL,
  `status` ENUM('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
  `resolution` TEXT NULL,
  `resolved_by` BIGINT NULL,
  `resolved_at` DATETIME(6) NULL,
  `opened_by` BIGINT NOT NULL,
  `version` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_disputes_contract_status` (`contract_id`, `status`),
  KEY `idx_disputes_entity` (`entity_type`, `entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BR-020: mở tranh chấp không tự xóa nợ; thay đổi tiền qua invoice_adjustments.dispute_id (AC-014-03).';

CREATE TABLE `dispute_parties` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `dispute_id` BIGINT NOT NULL,
  `user_id` BIGINT NOT NULL,
  `role` ENUM('OPENER', 'RESPONDENT', 'HANDLER', 'OBSERVER') NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_dispute_parties` (`dispute_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Chỉ các bên liên quan được đọc tranh chấp (AC-014-02).';

CREATE TABLE `dispute_events` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `dispute_id` BIGINT NOT NULL,
  `author_user_id` BIGINT NOT NULL,
  `event_type` VARCHAR(40) NOT NULL COMMENT 'COMMENT, EVIDENCE, STATUS_CHANGE, RESOLUTION',
  `content` TEXT NULL,
  `from_status` ENUM('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED', 'CLOSED') NULL,
  `to_status` ENUM('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED', 'CLOSED') NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_dispute_events_time` (`dispute_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `absence_requests` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL,
  `occupancy_id` BIGINT NOT NULL,
  `date_from` DATE NOT NULL,
  `date_to` DATE NOT NULL COMMENT 'CHECK >= date_from; phải nằm trong thời gian cư trú (AC-015-03)',
  `reason` VARCHAR(255) NULL COMMENT 'Riêng tư: thành viên khác không xem (BR-002)',
  `residence_document_id` BIGINT NULL COMMENT 'Đề nghị từ hồ sơ tạm vắng (AC-020-03)',
  `revision_no` INT NOT NULL DEFAULT 1,
  `supersedes_request_id` BIGINT NULL COMMENT 'Sửa sau chốt tạo bản mới',
  `status` ENUM('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'SUPERSEDED') NOT NULL DEFAULT 'DRAFT',
  `submitted_by` BIGINT NULL,
  `submitted_at` DATETIME(6) NULL,
  `decided_by` BIGINT NULL,
  `decided_at` DATETIME(6) NULL,
  `reject_reason` VARCHAR(255) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_absence_occupancy_status` (`occupancy_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BR-022: chỉ APPROVED mới bị trừ; các khoảng chồng nhau được gộp khi tính.';

CREATE TABLE `allocation_batches` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL,
  `contract_id` BIGINT NOT NULL,
  `period_id` BIGINT NOT NULL,
  `service_id` BIGINT NOT NULL,
  `invoice_id` BIGINT NULL COMMENT 'Hóa đơn phòng chứa số tiền được chia',
  `revision_no` INT NOT NULL DEFAULT 1,
  `supersedes_batch_id` BIGINT NULL,
  `eligible_amount` DECIMAL(18,2) NOT NULL COMMENT 'CHECK >= 0',
  `total_person_days` INT NOT NULL DEFAULT 0,
  `rounding_policy_id` BIGINT NULL,
  `status` ENUM('DRAFT', 'PENDING_ZERO_WEIGHT', 'CONFIRMED', 'SUPERSEDED') NOT NULL DEFAULT 'DRAFT',
  `zero_weight_resolution` VARCHAR(500) NULL COMMENT 'Lý do và quyết định khi tổng = 0 (BR-024)',
  `confirmed_by` BIGINT NULL,
  `confirmed_at` DATETIME(6) NULL,
  `version` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_allocation_batches_rev` (`period_id`, `service_id`, `revision_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BR-023: phần người = eligible_amount x person_days / total_person_days. Không đổi tổng hóa đơn phòng.';

CREATE TABLE `person_day_allocations` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `batch_id` BIGINT NOT NULL,
  `occupancy_id` BIGINT NOT NULL,
  `days_in_period` INT NOT NULL COMMENT 'Số ngày giao giữa kỳ và thời gian cư trú, tính cả 2 đầu (BR-021)',
  `absent_days` INT NOT NULL DEFAULT 0 COMMENT 'Ngày vắng APPROVED sau khi gộp chồng lấn',
  `person_days` INT NOT NULL COMMENT '= days_in_period - absent_days, CHECK >= 0',
  `raw_share` DECIMAL(20,6) NOT NULL COMMENT 'Trước làm tròn',
  `allocated_amount` DECIMAL(18,2) NOT NULL,
  `remainder_rank` INT NULL COMMENT 'Thứ tự nhận phần dư (Q04)',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_person_day_alloc` (`batch_id`, `occupancy_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='GT-01: A16 B20 C30 D30, 960.000 -> 160k/200k/300k/300k. Tổng allocated_amount = eligible_amount.';

CREATE TABLE `room_funds` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL,
  `room_id` BIGINT NOT NULL,
  `contract_id` BIGINT NOT NULL COMMENT 'Quỹ của nhóm người thuê dưới hợp đồng này',
  `name` VARCHAR(150) NOT NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'VND',
  `status` ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
  `opened_at` DATETIME(6) NOT NULL,
  `closed_at` DATETIME(6) NULL,
  `close_note` VARCHAR(500) NULL COMMENT 'Xử lý quyền hoàn còn lại khi đóng quỹ (Q09)',
  `version` INT NOT NULL DEFAULT 0 COMMENT 'Khóa dòng khi giữ chỗ để 2 yêu cầu không dùng chung số dư (BR-027)',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_room_funds_contract_status` (`contract_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Quỹ thuộc người thuê, chủ trọ không mặc nhiên sở hữu. Tách hoàn toàn với tiền chủ trọ (BR-036, BR-037). Tiền thực có = CONTRIBUTION + ADJUSTMENT_IN - CASH_EXPENSE - ADJUSTMENT_OUT. Khả dụng = tiền thực có - tổng (amount - released_amount) của reservations HELD. Không âm.';

CREATE TABLE `fund_managers` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `fund_id` BIGINT NOT NULL,
  `occupancy_id` BIGINT NOT NULL,
  `assigned_by` BIGINT NULL,
  `valid_from` DATETIME(6) NOT NULL,
  `valid_to` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_fund_managers_active` (`fund_id`, `valid_to`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Người thuê được phân công quản lý quỹ (Q09).';

CREATE TABLE `fund_obligations` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `fund_id` BIGINT NOT NULL,
  `occupancy_id` BIGINT NOT NULL,
  `period_code` VARCHAR(20) NOT NULL COMMENT 'Ví dụ 2026-11',
  `due_date` DATE NULL,
  `amount_due` DECIMAL(18,2) NOT NULL COMMENT 'CHECK >= 0',
  `status` ENUM('OPEN', 'SETTLED', 'WAIVED') NOT NULL DEFAULT 'OPEN',
  `version` INT NOT NULL DEFAULT 0,
  `created_by` BIGINT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_fund_obligations` (`fund_id`, `occupancy_id`, `period_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Nghĩa vụ đóng quỹ mỗi kỳ. Còn phải nộp = amount_due - CONTRIBUTION gắn obligation - fund_offsets (AC-019-01).';

CREATE TABLE `fund_transactions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `fund_id` BIGINT NOT NULL,
  `type` ENUM('CONTRIBUTION', 'CASH_EXPENSE', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT') NOT NULL,
  `amount` DECIMAL(18,2) NOT NULL COMMENT 'CHECK > 0',
  `occurred_at` DATETIME(6) NOT NULL,
  `occupancy_id` BIGINT NULL COMMENT 'Người đóng với CONTRIBUTION',
  `obligation_id` BIGINT NULL,
  `purchase_id` BIGINT NULL COMMENT 'Chỉ khi chi tiền mặt thật từ quỹ',
  `reverses_transaction_id` BIGINT NULL,
  `idempotency_key` VARCHAR(100) NOT NULL COMMENT 'Tăng quỹ đúng 1 lần (AC-017-01)',
  `reference_code` VARCHAR(100) NULL,
  `note` VARCHAR(255) NULL,
  `created_by` BIGINT NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_fund_transactions_idempotency_key` (`idempotency_key`),
  KEY `idx_fund_txn_fund_type` (`fund_id`, `type`),
  KEY `idx_fund_txn_obligation` (`obligation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Sổ tiền thực của quỹ. Giữ chỗ và duyệt quyền hoàn KHÔNG tạo dòng ở đây (BR-030, AC-017-02).';

CREATE TABLE `shared_purchases` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `fund_id` BIGINT NOT NULL,
  `requested_by_occupancy_id` BIGINT NOT NULL,
  `current_revision_no` INT NOT NULL DEFAULT 1,
  `status` ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'WAITING_FUNDS', 'RESERVED', 'PARTIALLY_OFFSET', 'COMPLETED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `cancel_reason` VARCHAR(255) NULL,
  `version` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_shared_purchases_fund_status` (`fund_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Đề nghị mua chung bằng tiền ứng cá nhân. Nội dung (số tiền, chứng từ) nằm ở shared_purchase_revisions.';

CREATE TABLE `shared_purchase_revisions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `purchase_id` BIGINT NOT NULL,
  `revision_no` INT NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NULL,
  `amount` DECIMAL(18,2) NOT NULL COMMENT 'CHECK > 0',
  `purchased_at` DATE NULL,
  `created_by` BIGINT NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_purchase_revisions` (`purchase_id`, `revision_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BR-026: đổi số tiền/chứng từ = revision mới; chứng từ qua file_links(entity_type=PURCHASE_REVISION).';

CREATE TABLE `purchase_approvals` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `purchase_id` BIGINT NOT NULL,
  `revision_no` INT NOT NULL,
  `approver_occupancy_id` BIGINT NOT NULL,
  `decision` ENUM('APPROVE', 'REJECT') NOT NULL,
  `decided_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_purchase_approvals` (`purchase_id`, `revision_no`, `approver_occupancy_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BR-025: cần >= 2 APPROVE của revision hiện tại từ người KHÁC người đề nghị (trigger V2 chặn tự duyệt). Xác nhận lặp bị unique chặn.';

CREATE TABLE `fund_reservations` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `fund_id` BIGINT NOT NULL,
  `purchase_id` BIGINT NOT NULL,
  `revision_no` INT NOT NULL,
  `amount` DECIMAL(18,2) NOT NULL COMMENT 'CHECK > 0',
  `released_amount` DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT 'CHECK 0 <= released <= amount',
  `status` ENUM('HELD', 'RELEASED', 'CANCELLED') NOT NULL DEFAULT 'HELD',
  `created_by` BIGINT NOT NULL,
  `version` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_fund_reservations_fund_status` (`fund_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BR-027: tối đa 1 giữ chỗ HELD mỗi đề nghị (cột sinh V2). Kiểm quỹ + giữ chỗ trong cùng transaction có khóa room_funds.';

CREATE TABLE `fund_refund_entitlements` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `fund_id` BIGINT NOT NULL,
  `purchase_id` BIGINT NOT NULL,
  `occupancy_id` BIGINT NOT NULL COMMENT 'Người đã ứng tiền',
  `amount` DECIMAL(18,2) NOT NULL COMMENT 'CHECK > 0',
  `remaining_amount` DECIMAL(18,2) NOT NULL COMMENT 'CHECK 0 <= remaining <= amount',
  `status` ENUM('ACTIVE', 'EXHAUSTED', 'ON_HOLD', 'CLOSED') NOT NULL DEFAULT 'ACTIVE',
  `version` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_fund_refund_entitlements_purchase_id` (`purchase_id`),
  KEY `idx_entitlements_occupancy_status` (`occupancy_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Quyền hoàn; phần chưa dùng chuyển kỳ (BR-029). Rời phòng/đóng quỹ -> ON_HOLD chờ xử lý theo Q09, không tự xóa.';

CREATE TABLE `fund_offsets` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `entitlement_id` BIGINT NOT NULL,
  `obligation_id` BIGINT NOT NULL COMMENT 'Chỉ bù vào nghĩa vụ đóng quỹ, KHÔNG vào hóa đơn chủ trọ (BR-028)',
  `reservation_id` BIGINT NOT NULL COMMENT 'Giải phóng phần giữ chỗ tương ứng',
  `amount` DECIMAL(18,2) NOT NULL COMMENT 'CHECK > 0; <= remaining_amount và <= nghĩa vụ còn phải nộp',
  `idempotency_key` VARCHAR(100) NOT NULL COMMENT 'Chạy lại không bù lần 2 (AC-019-03)',
  `approved_by` BIGINT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_fund_offsets_idempotency_key` (`idempotency_key`),
  KEY `idx_fund_offsets_entitlement` (`entitlement_id`),
  KEY `idx_fund_offsets_obligation` (`obligation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='GT-06: nghĩa vụ 200k, quyền hoàn 120k -> bù 120k, nộp 80k. GT-07: nghĩa vụ 100k, quyền 120k -> bù 100k, còn 20k.';

CREATE TABLE `stored_files` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NULL COMMENT 'NULL chỉ với tệp hệ thống',
  `storage_key` VARCHAR(500) NOT NULL COMMENT 'Khóa lưu trữ nội bộ, không phải URL công khai',
  `original_name` VARCHAR(255) NOT NULL,
  `mime_type` VARCHAR(120) NOT NULL,
  `size_bytes` BIGINT NOT NULL COMMENT 'CHECK >= 0',
  `sha256` CHAR(64) NOT NULL,
  `visibility` ENUM('PRIVATE', 'PUBLIC') NOT NULL DEFAULT 'PRIVATE',
  `uploaded_by` BIGINT NULL,
  `retention_until` DATE NULL COMMENT 'Theo Q13',
  `deleted_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_stored_files_storage_key` (`storage_key`),
  KEY `idx_stored_files_org` (`organization_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BR-032, NFR09: tải tệp luôn kiểm quyền qua đối tượng liên kết; biết storage_key không có quyền.';

CREATE TABLE `file_links` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `file_id` BIGINT NOT NULL,
  `entity_type` VARCHAR(60) NOT NULL COMMENT 'HANDOVER_ITEM, METER_READING, PAYMENT, PURCHASE_REVISION, CHECKOUT_DEDUCTION, MAINTENANCE, DISPUTE, LISTING, EXPENSE...',
  `entity_id` BIGINT NOT NULL,
  `purpose` VARCHAR(60) NOT NULL COMMENT 'PHOTO, RECEIPT, EVIDENCE, PDF',
  `created_by` BIGINT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_file_links_entity` (`entity_type`, `entity_id`),
  KEY `idx_file_links_file` (`file_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `file_access_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `file_id` BIGINT NOT NULL,
  `user_id` BIGINT NULL,
  `action` ENUM('VIEW', 'DOWNLOAD', 'EXPORT') NOT NULL,
  `result` ENUM('ALLOWED', 'DENIED') NOT NULL,
  `ip_address` VARCHAR(45) NULL,
  `occurred_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_file_access_file_time` (`file_id`, `occurred_at`),
  KEY `idx_file_access_user_time` (`user_id`, `occurred_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BR-032: nhật ký tải tệp, kể cả lần bị từ chối (GT-14).';

CREATE TABLE `residence_form_templates` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(60) NOT NULL,
  `version_label` VARCHAR(30) NOT NULL,
  `document_type` ENUM('TEMPORARY_RESIDENCE', 'TEMPORARY_ABSENCE') NOT NULL,
  `name` VARCHAR(200) NOT NULL,
  `schema_json` JSON NOT NULL COMMENT 'Danh sách trường và trường bắt buộc',
  `effective_from` DATE NOT NULL,
  `status` ENUM('DRAFT', 'ACTIVE', 'RETIRED') NOT NULL DEFAULT 'DRAFT',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_residence_templates` (`code`, `version_label`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Mẫu hồ sơ theo Q10.';

CREATE TABLE `residence_documents` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL,
  `person_id` BIGINT NOT NULL,
  `contract_id` BIGINT NULL,
  `document_type` ENUM('TEMPORARY_RESIDENCE', 'TEMPORARY_ABSENCE') NOT NULL,
  `current_revision_no` INT NOT NULL DEFAULT 1,
  `status` ENUM('DRAFT', 'SUBMITTED', 'NEEDS_REVISION', 'VERIFIED') NOT NULL DEFAULT 'DRAFT',
  `created_by` BIGINT NULL,
  `version` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_residence_docs_person_status` (`person_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BR-031: VERIFIED chỉ là đã kiểm tra trong hệ thống, KHÔNG phải đã hoàn tất thủ tục với cơ quan (AC-021-03).';

CREATE TABLE `residence_document_versions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `document_id` BIGINT NOT NULL,
  `revision_no` INT NOT NULL,
  `template_id` BIGINT NOT NULL,
  `form_data` JSON NOT NULL,
  `submitted_by` BIGINT NULL,
  `submitted_at` DATETIME(6) NULL,
  `review_decision` VARCHAR(20) NULL COMMENT 'VERIFIED hoặc NEEDS_REVISION',
  `review_comment` TEXT NULL COMMENT 'Ý kiến kiểm tra của phiên bản này (AC-020-02)',
  `reviewed_by` BIGINT NULL,
  `reviewed_at` DATETIME(6) NULL,
  `pdf_file_id` BIGINT NULL COMMENT 'PDF gắn đúng phiên bản (AC-021-01)',
  `pdf_exported_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_residence_doc_versions` (`document_id`, `revision_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `room_listings` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL,
  `room_id` BIGINT NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NULL,
  `listed_price` DECIMAL(18,2) NOT NULL COMMENT 'CHECK >= 0',
  `public_address` VARCHAR(255) NOT NULL COMMENT 'Chỉ dữ liệu chủ trọ cho phép công khai',
  `city` VARCHAR(100) NULL,
  `district` VARCHAR(100) NULL,
  `area_m2` DECIMAL(10,2) NULL,
  `max_occupants` INT NULL,
  `amenities_json` JSON NULL,
  `status` ENUM('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'HIDDEN', 'CLOSED') NOT NULL DEFAULT 'DRAFT',
  `submitted_at` DATETIME(6) NULL,
  `moderated_by` BIGINT NULL,
  `moderated_at` DATETIME(6) NULL,
  `reject_reason` VARCHAR(500) NULL COMMENT 'AC-022-02',
  `published_at` DATETIME(6) NULL,
  `closed_at` DATETIME(6) NULL,
  `created_by` BIGINT NOT NULL,
  `version` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_listings_search` (`status`, `city`, `district`, `listed_price`),
  KEY `idx_listings_room` (`room_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BR-033: chỉ PUBLISHED được tìm công khai; đăng tin không đổi trạng thái phòng. Ảnh qua file_links (PUBLIC).';

CREATE TABLE `rental_inquiries` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `listing_id` BIGINT NOT NULL,
  `seeker_user_id` BIGINT NULL COMMENT 'NULL nếu khách không đăng nhập',
  `contact_name` VARCHAR(150) NOT NULL,
  `contact_phone` VARCHAR(30) NULL,
  `contact_email` VARCHAR(190) NULL,
  `message` TEXT NULL,
  `status` ENUM('NEW', 'CONTACTED', 'SCHEDULED', 'CLOSED', 'SPAM') NOT NULL DEFAULT 'NEW',
  `handled_by` BIGINT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_inquiries_listing_status` (`listing_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tin CLOSED không nhận yêu cầu mới (AC-023-03, kiểm ở ứng dụng).';

CREATE TABLE `viewing_appointments` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `inquiry_id` BIGINT NOT NULL,
  `scheduled_at` DATETIME(6) NOT NULL,
  `duration_minutes` INT NOT NULL DEFAULT 30,
  `status` ENUM('PROPOSED', 'CONFIRMED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED') NOT NULL DEFAULT 'PROPOSED',
  `assigned_to` BIGINT NULL,
  `confirmed_by` BIGINT NULL,
  `confirmed_at` DATETIME(6) NULL,
  `cancel_reason` VARCHAR(255) NULL,
  `version` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_appointments_staff_time` (`assigned_to`, `scheduled_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BR-034: COMPLETED không tự tạo hợp đồng hay thu cọc (AC-024-03).';

CREATE TABLE `appointment_history` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `appointment_id` BIGINT NOT NULL,
  `from_status` ENUM('PROPOSED', 'CONFIRMED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED') NULL,
  `to_status` ENUM('PROPOSED', 'CONFIRMED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED') NOT NULL,
  `old_scheduled_at` DATETIME(6) NULL,
  `new_scheduled_at` DATETIME(6) NULL,
  `note` VARCHAR(255) NULL,
  `changed_by` BIGINT NULL,
  `changed_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_appt_history_time` (`appointment_id`, `changed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AC-024-02: đổi hoặc hủy lịch lưu lịch sử.';

CREATE TABLE `operating_expenses` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL,
  `property_id` BIGINT NOT NULL,
  `room_id` BIGINT NULL,
  `maintenance_request_id` BIGINT NULL,
  `category` ENUM('REPAIR', 'CLEANING', 'COMMON_ELECTRICITY', 'COMMON_WATER', 'INTERNET', 'OTHER') NOT NULL,
  `amount` DECIMAL(18,2) NOT NULL COMMENT 'CHECK > 0',
  `expense_date` DATE NOT NULL,
  `description` VARCHAR(255) NULL,
  `vendor` VARCHAR(150) NULL,
  `document_ref` VARCHAR(100) NULL COMMENT 'Số chứng từ chi; unique trong tổ chức để không ghi trùng (AC-025-02)',
  `status` ENUM('RECORDED', 'VOIDED') NOT NULL DEFAULT 'RECORDED',
  `replaces_expense_id` BIGINT NULL COMMENT 'Điều chỉnh giữ bản gốc (AC-025-03)',
  `voided_at` DATETIME(6) NULL,
  `voided_by` BIGINT NULL,
  `void_reason` VARCHAR(255) NULL,
  `recorded_by` BIGINT NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_expenses_org_docref` (`organization_id`, `document_ref`),
  KEY `idx_expenses_property_date` (`property_id`, `expense_date`),
  KEY `idx_expenses_maintenance` (`maintenance_request_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BR-037: chi của chủ trọ; không lấy từ quỹ người thuê, không trộn cọc.';

CREATE TABLE `reminders` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL,
  `reminder_key` VARCHAR(200) NOT NULL COMMENT 'loại:đối tượng:id:mốc, ví dụ INVOICE_OVERDUE:INVOICE:15:2026-11-10 (BR-035)',
  `reminder_type` VARCHAR(60) NOT NULL COMMENT 'MISSING_READING, MISSING_INVOICE, INVOICE_OVERDUE, CONTRACT_EXPIRING, BACKUP_FAILED...',
  `entity_type` VARCHAR(60) NOT NULL,
  `entity_id` BIGINT NOT NULL,
  `due_at` DATETIME(6) NOT NULL,
  `assignee_user_id` BIGINT NULL,
  `status` ENUM('OPEN', 'DONE', 'DISMISSED') NOT NULL DEFAULT 'OPEN',
  `resolved_at` DATETIME(6) NULL,
  `resolved_by` BIGINT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reminders_reminder_key` (`reminder_key`),
  KEY `idx_reminders_org_status_due` (`organization_id`, `status`, `due_at`),
  KEY `idx_reminders_entity` (`entity_type`, `entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Việc cần làm; trước khi gửi phải kiểm lại điều kiện (hóa đơn đã trả đủ thì không nhắc, AC-027-02).';

CREATE TABLE `notifications` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `reminder_id` BIGINT NULL,
  `channel` ENUM('IN_APP', 'EMAIL', 'SMS') NOT NULL DEFAULT 'IN_APP',
  `title` VARCHAR(200) NOT NULL,
  `body` TEXT NULL,
  `dedupe_key` VARCHAR(200) NOT NULL COMMENT 'Không gửi lặp khi tác vụ chạy lại (AC-027-03)',
  `status` ENUM('PENDING', 'SENT', 'FAILED', 'READ') NOT NULL DEFAULT 'PENDING',
  `attempt_count` INT NOT NULL DEFAULT 0,
  `last_error` VARCHAR(500) NULL,
  `sent_at` DATETIME(6) NULL,
  `read_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_notifications_dedupe_key` (`dedupe_key`),
  KEY `idx_notifications_user_status` (`user_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Kênh gửi theo Q11.';

CREATE TABLE `audit_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NULL,
  `actor_user_id` BIGINT NULL,
  `entity_type` VARCHAR(80) NOT NULL,
  `entity_id` BIGINT NOT NULL,
  `action` VARCHAR(60) NOT NULL COMMENT 'CREATE, UPDATE, ISSUE, VOID, APPROVE, GRANT, REVOKE, LOGIN...',
  `before_json` JSON NULL COMMENT 'Không chứa mật khẩu, secret, số giấy tờ đầy đủ',
  `after_json` JSON NULL,
  `reason` VARCHAR(500) NULL,
  `request_id` VARCHAR(64) NULL COMMENT 'Mã tra cứu lỗi (NFR07)',
  `ip_address` VARCHAR(45) NULL,
  `occurred_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_audit_entity_time` (`entity_type`, `entity_id`, `occurred_at`),
  KEY `idx_audit_org_time` (`organization_id`, `occurred_at`),
  KEY `idx_audit_actor_time` (`actor_user_id`, `occurred_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BR-038: chỉ thêm. Trigger V2 chặn UPDATE/DELETE (AC-028-02).';

CREATE TABLE `backup_jobs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `backup_type` VARCHAR(30) NOT NULL DEFAULT 'FULL',
  `started_at` DATETIME(6) NOT NULL,
  `finished_at` DATETIME(6) NULL,
  `status` ENUM('RUNNING', 'SUCCEEDED', 'FAILED') NOT NULL DEFAULT 'RUNNING',
  `manifest_file_id` BIGINT NULL COMMENT 'Danh mục tệp kèm checksum',
  `database_checksum` CHAR(64) NULL,
  `files_count` INT NULL,
  `total_bytes` BIGINT NULL,
  `error_message` VARCHAR(1000) NULL,
  `triggered_by` BIGINT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_backup_jobs_status_time` (`status`, `started_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BR-039, AC-029-01: thất bại phải ghi nhận và tạo reminder cho người phụ trách.';

CREATE TABLE `restore_tests` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `backup_job_id` BIGINT NOT NULL,
  `environment` VARCHAR(60) NOT NULL COMMENT 'Môi trường tách biệt',
  `started_at` DATETIME(6) NOT NULL,
  `finished_at` DATETIME(6) NULL,
  `status` ENUM('RUNNING', 'PASSED', 'FAILED') NOT NULL DEFAULT 'RUNNING',
  `target_rpo_minutes` INT NULL,
  `target_rto_minutes` INT NULL,
  `measured_rpo_minutes` INT NULL,
  `measured_rto_minutes` INT NULL,
  `checks_json` JSON NULL COMMENT 'Kết quả đối chiếu số dư, số hợp đồng, PDF, ảnh (AC-029-02)',
  `verified_by` BIGINT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AC-029-03: không đánh dấu PASSED chỉ vì có tệp sao lưu.';

CREATE TABLE `idempotency_keys` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `scope` VARCHAR(60) NOT NULL COMMENT 'ISSUE_INVOICE, CONFIRM_CHECKOUT, RESERVE_FUND...',
  `idem_key` VARCHAR(100) NOT NULL,
  `user_id` BIGINT NULL,
  `request_hash` CHAR(64) NOT NULL,
  `status` ENUM('IN_PROGRESS', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'IN_PROGRESS',
  `response_entity_type` VARCHAR(60) NULL,
  `response_entity_id` BIGINT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `expires_at` DATETIME(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_idempotency_scope_key` (`scope`, `idem_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='NFR03: gửi lại cùng yêu cầu trả về kết quả cũ thay vì tạo bản ghi mới.';

-- Foreign keys
ALTER TABLE `role_permissions` ADD CONSTRAINT `fk_role_permissions_role_id` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `role_permissions` ADD CONSTRAINT `fk_role_permissions_permission_id` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `user_role_assignments` ADD CONSTRAINT `fk_user_role_assignments_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `user_role_assignments` ADD CONSTRAINT `fk_user_role_assignments_role_id` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `user_role_assignments` ADD CONSTRAINT `fk_user_role_assignments_organization_id` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `user_role_assignments` ADD CONSTRAINT `fk_user_role_assignments_property_id` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `user_role_assignments` ADD CONSTRAINT `fk_user_role_assignments_room_id` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `user_role_assignments` ADD CONSTRAINT `fk_user_role_assignments_granted_by` FOREIGN KEY (`granted_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `user_role_assignments` ADD CONSTRAINT `fk_user_role_assignments_revoked_by` FOREIGN KEY (`revoked_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `assignment_permission_grants` ADD CONSTRAINT `fk_assignment_permission_grants_assignment_id` FOREIGN KEY (`assignment_id`) REFERENCES `user_role_assignments` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `assignment_permission_grants` ADD CONSTRAINT `fk_assignment_permission_grants_permission_id` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `assignment_permission_grants` ADD CONSTRAINT `fk_assignment_permission_grants_granted_by` FOREIGN KEY (`granted_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `assignment_permission_grants` ADD CONSTRAINT `fk_assignment_permission_grants_revoked_by` FOREIGN KEY (`revoked_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `support_access_grants` ADD CONSTRAINT `fk_support_access_grants_admin_user_id` FOREIGN KEY (`admin_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `support_access_grants` ADD CONSTRAINT `fk_support_access_grants_organization_id` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `support_access_grants` ADD CONSTRAINT `fk_support_access_grants_granted_by` FOREIGN KEY (`granted_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `organizations` ADD CONSTRAINT `fk_organizations_owner_user_id` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `properties` ADD CONSTRAINT `fk_properties_organization_id` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `rooms` ADD CONSTRAINT `fk_rooms_organization_id` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `rooms` ADD CONSTRAINT `fk_rooms_property_id` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `room_status_history` ADD CONSTRAINT `fk_room_status_history_room_id` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `room_status_history` ADD CONSTRAINT `fk_room_status_history_changed_by` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `business_policies` ADD CONSTRAINT `fk_business_policies_organization_id` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `business_policies` ADD CONSTRAINT `fk_business_policies_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `persons` ADD CONSTRAINT `fk_persons_organization_id` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `persons` ADD CONSTRAINT `fk_persons_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `persons` ADD CONSTRAINT `fk_persons_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `contracts` ADD CONSTRAINT `fk_contracts_organization_id` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `contracts` ADD CONSTRAINT `fk_contracts_room_id` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `contracts` ADD CONSTRAINT `fk_contracts_representative_person_id` FOREIGN KEY (`representative_person_id`) REFERENCES `persons` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `contracts` ADD CONSTRAINT `fk_contracts_rounding_policy_id` FOREIGN KEY (`rounding_policy_id`) REFERENCES `business_policies` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `contracts` ADD CONSTRAINT `fk_contracts_activated_by` FOREIGN KEY (`activated_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `contracts` ADD CONSTRAINT `fk_contracts_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `contract_versions` ADD CONSTRAINT `fk_contract_versions_contract_id` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `contract_versions` ADD CONSTRAINT `fk_contract_versions_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `contract_versions` ADD CONSTRAINT `fk_contract_versions_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `rent_rates` ADD CONSTRAINT `fk_rent_rates_contract_id` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `rent_rates` ADD CONSTRAINT `fk_rent_rates_contract_version_id` FOREIGN KEY (`contract_version_id`) REFERENCES `contract_versions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `rent_rates` ADD CONSTRAINT `fk_rent_rates_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `contract_services` ADD CONSTRAINT `fk_contract_services_contract_id` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `contract_services` ADD CONSTRAINT `fk_contract_services_service_id` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `occupancies` ADD CONSTRAINT `fk_occupancies_organization_id` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `occupancies` ADD CONSTRAINT `fk_occupancies_contract_id` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `occupancies` ADD CONSTRAINT `fk_occupancies_room_id` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `occupancies` ADD CONSTRAINT `fk_occupancies_person_id` FOREIGN KEY (`person_id`) REFERENCES `persons` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `occupancies` ADD CONSTRAINT `fk_occupancies_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `deposit_transactions` ADD CONSTRAINT `fk_deposit_transactions_organization_id` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `deposit_transactions` ADD CONSTRAINT `fk_deposit_transactions_contract_id` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `deposit_transactions` ADD CONSTRAINT `fk_deposit_transactions_checkout_id` FOREIGN KEY (`checkout_id`) REFERENCES `checkouts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `deposit_transactions` ADD CONSTRAINT `fk_deposit_transactions_reverses_transaction_id` FOREIGN KEY (`reverses_transaction_id`) REFERENCES `deposit_transactions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `deposit_transactions` ADD CONSTRAINT `fk_deposit_transactions_recorded_by` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `room_assets` ADD CONSTRAINT `fk_room_assets_organization_id` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `room_assets` ADD CONSTRAINT `fk_room_assets_room_id` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `handovers` ADD CONSTRAINT `fk_handovers_organization_id` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `handovers` ADD CONSTRAINT `fk_handovers_contract_id` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `handovers` ADD CONSTRAINT `fk_handovers_supersedes_handover_id` FOREIGN KEY (`supersedes_handover_id`) REFERENCES `handovers` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `handovers` ADD CONSTRAINT `fk_handovers_recorded_by` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `handovers` ADD CONSTRAINT `fk_handovers_landlord_confirmed_by` FOREIGN KEY (`landlord_confirmed_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `handovers` ADD CONSTRAINT `fk_handovers_tenant_confirmed_person_id` FOREIGN KEY (`tenant_confirmed_person_id`) REFERENCES `persons` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `handover_items` ADD CONSTRAINT `fk_handover_items_handover_id` FOREIGN KEY (`handover_id`) REFERENCES `handovers` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `handover_items` ADD CONSTRAINT `fk_handover_items_asset_id` FOREIGN KEY (`asset_id`) REFERENCES `room_assets` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `services` ADD CONSTRAINT `fk_services_organization_id` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `service_prices` ADD CONSTRAINT `fk_service_prices_service_id` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `service_prices` ADD CONSTRAINT `fk_service_prices_property_id` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `service_prices` ADD CONSTRAINT `fk_service_prices_room_id` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `service_prices` ADD CONSTRAINT `fk_service_prices_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `meters` ADD CONSTRAINT `fk_meters_organization_id` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `meters` ADD CONSTRAINT `fk_meters_room_id` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `meters` ADD CONSTRAINT `fk_meters_service_id` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `meters` ADD CONSTRAINT `fk_meters_replaced_meter_id` FOREIGN KEY (`replaced_meter_id`) REFERENCES `meters` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `meter_readings` ADD CONSTRAINT `fk_meter_readings_organization_id` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `meter_readings` ADD CONSTRAINT `fk_meter_readings_meter_id` FOREIGN KEY (`meter_id`) REFERENCES `meters` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `meter_readings` ADD CONSTRAINT `fk_meter_readings_period_id` FOREIGN KEY (`period_id`) REFERENCES `billing_periods` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `meter_readings` ADD CONSTRAINT `fk_meter_readings_ocr_job_id` FOREIGN KEY (`ocr_job_id`) REFERENCES `ocr_jobs` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `meter_readings` ADD CONSTRAINT `fk_meter_readings_photo_file_id` FOREIGN KEY (`photo_file_id`) REFERENCES `stored_files` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `meter_readings` ADD CONSTRAINT `fk_meter_readings_supersedes_reading_id` FOREIGN KEY (`supersedes_reading_id`) REFERENCES `meter_readings` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `meter_readings` ADD CONSTRAINT `fk_meter_readings_recorded_by` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `meter_readings` ADD CONSTRAINT `fk_meter_readings_confirmed_by` FOREIGN KEY (`confirmed_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `ocr_jobs` ADD CONSTRAINT `fk_ocr_jobs_organization_id` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `ocr_jobs` ADD CONSTRAINT `fk_ocr_jobs_file_id` FOREIGN KEY (`file_id`) REFERENCES `stored_files` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `ocr_jobs` ADD CONSTRAINT `fk_ocr_jobs_meter_id` FOREIGN KEY (`meter_id`) REFERENCES `meters` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `ocr_jobs` ADD CONSTRAINT `fk_ocr_jobs_requested_by` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `ocr_jobs` ADD CONSTRAINT `fk_ocr_jobs_reviewed_by` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `billing_periods` ADD CONSTRAINT `fk_billing_periods_organization_id` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `billing_periods` ADD CONSTRAINT `fk_billing_periods_contract_id` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `billing_periods` ADD CONSTRAINT `fk_billing_periods_locked_by` FOREIGN KEY (`locked_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `invoices` ADD CONSTRAINT `fk_invoices_organization_id` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `invoices` ADD CONSTRAINT `fk_invoices_contract_id` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `invoices` ADD CONSTRAINT `fk_invoices_period_id` FOREIGN KEY (`period_id`) REFERENCES `billing_periods` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `invoices` ADD CONSTRAINT `fk_invoices_issued_by` FOREIGN KEY (`issued_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `invoices` ADD CONSTRAINT `fk_invoices_cancelled_by` FOREIGN KEY (`cancelled_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `invoices` ADD CONSTRAINT `fk_invoices_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `invoice_items` ADD CONSTRAINT `fk_invoice_items_invoice_id` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `invoice_items` ADD CONSTRAINT `fk_invoice_items_service_id` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `invoice_items` ADD CONSTRAINT `fk_invoice_items_rent_rate_id` FOREIGN KEY (`rent_rate_id`) REFERENCES `rent_rates` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `invoice_items` ADD CONSTRAINT `fk_invoice_items_meter_reading_id` FOREIGN KEY (`meter_reading_id`) REFERENCES `meter_readings` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `invoice_adjustments` ADD CONSTRAINT `fk_invoice_adjustments_invoice_id` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `invoice_adjustments` ADD CONSTRAINT `fk_invoice_adjustments_dispute_id` FOREIGN KEY (`dispute_id`) REFERENCES `disputes` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `invoice_adjustments` ADD CONSTRAINT `fk_invoice_adjustments_allocation_batch_id` FOREIGN KEY (`allocation_batch_id`) REFERENCES `allocation_batches` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `invoice_adjustments` ADD CONSTRAINT `fk_invoice_adjustments_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `invoice_adjustments` ADD CONSTRAINT `fk_invoice_adjustments_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `payments` ADD CONSTRAINT `fk_payments_organization_id` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `payments` ADD CONSTRAINT `fk_payments_contract_id` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `payments` ADD CONSTRAINT `fk_payments_payer_person_id` FOREIGN KEY (`payer_person_id`) REFERENCES `persons` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `payments` ADD CONSTRAINT `fk_payments_corrects_payment_id` FOREIGN KEY (`corrects_payment_id`) REFERENCES `payments` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `payments` ADD CONSTRAINT `fk_payments_voided_by` FOREIGN KEY (`voided_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `payments` ADD CONSTRAINT `fk_payments_received_by` FOREIGN KEY (`received_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `payment_allocations` ADD CONSTRAINT `fk_payment_allocations_payment_id` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `payment_allocations` ADD CONSTRAINT `fk_payment_allocations_invoice_id` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `payment_allocations` ADD CONSTRAINT `fk_payment_allocations_allocated_by` FOREIGN KEY (`allocated_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `payment_allocations` ADD CONSTRAINT `fk_payment_allocations_reversed_by` FOREIGN KEY (`reversed_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `overpayment_refunds` ADD CONSTRAINT `fk_overpayment_refunds_payment_id` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `overpayment_refunds` ADD CONSTRAINT `fk_overpayment_refunds_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `payment_reconciliations` ADD CONSTRAINT `fk_payment_reconciliations_payment_id` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `payment_reconciliations` ADD CONSTRAINT `fk_payment_reconciliations_reconciled_by` FOREIGN KEY (`reconciled_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `checkouts` ADD CONSTRAINT `fk_checkouts_organization_id` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `checkouts` ADD CONSTRAINT `fk_checkouts_contract_id` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `checkouts` ADD CONSTRAINT `fk_checkouts_requested_by` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `checkouts` ADD CONSTRAINT `fk_checkouts_checkout_handover_id` FOREIGN KEY (`checkout_handover_id`) REFERENCES `handovers` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `checkouts` ADD CONSTRAINT `fk_checkouts_final_invoice_id` FOREIGN KEY (`final_invoice_id`) REFERENCES `invoices` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `checkouts` ADD CONSTRAINT `fk_checkouts_confirmed_by` FOREIGN KEY (`confirmed_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `checkout_deductions` ADD CONSTRAINT `fk_checkout_deductions_checkout_id` FOREIGN KEY (`checkout_id`) REFERENCES `checkouts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `checkout_deductions` ADD CONSTRAINT `fk_checkout_deductions_handover_item_id` FOREIGN KEY (`handover_item_id`) REFERENCES `handover_items` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `checkout_deductions` ADD CONSTRAINT `fk_checkout_deductions_maintenance_request_id` FOREIGN KEY (`maintenance_request_id`) REFERENCES `maintenance_requests` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `checkout_deductions` ADD CONSTRAINT `fk_checkout_deductions_included_in_invoice_item_id` FOREIGN KEY (`included_in_invoice_item_id`) REFERENCES `invoice_items` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `checkout_deductions` ADD CONSTRAINT `fk_checkout_deductions_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `checkout_deductions` ADD CONSTRAINT `fk_checkout_deductions_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `maintenance_requests` ADD CONSTRAINT `fk_maintenance_requests_organization_id` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `maintenance_requests` ADD CONSTRAINT `fk_maintenance_requests_room_id` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `maintenance_requests` ADD CONSTRAINT `fk_maintenance_requests_contract_id` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `maintenance_requests` ADD CONSTRAINT `fk_maintenance_requests_reported_by` FOREIGN KEY (`reported_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `maintenance_requests` ADD CONSTRAINT `fk_maintenance_requests_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `maintenance_requests` ADD CONSTRAINT `fk_maintenance_requests_recharge_invoice_item_id` FOREIGN KEY (`recharge_invoice_item_id`) REFERENCES `invoice_items` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `maintenance_status_history` ADD CONSTRAINT `fk_maintenance_status_history_request_id` FOREIGN KEY (`request_id`) REFERENCES `maintenance_requests` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `maintenance_status_history` ADD CONSTRAINT `fk_maintenance_status_history_changed_by` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `disputes` ADD CONSTRAINT `fk_disputes_organization_id` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `disputes` ADD CONSTRAINT `fk_disputes_contract_id` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `disputes` ADD CONSTRAINT `fk_disputes_resolved_by` FOREIGN KEY (`resolved_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `disputes` ADD CONSTRAINT `fk_disputes_opened_by` FOREIGN KEY (`opened_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `dispute_parties` ADD CONSTRAINT `fk_dispute_parties_dispute_id` FOREIGN KEY (`dispute_id`) REFERENCES `disputes` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `dispute_parties` ADD CONSTRAINT `fk_dispute_parties_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `dispute_events` ADD CONSTRAINT `fk_dispute_events_dispute_id` FOREIGN KEY (`dispute_id`) REFERENCES `disputes` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `dispute_events` ADD CONSTRAINT `fk_dispute_events_author_user_id` FOREIGN KEY (`author_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `absence_requests` ADD CONSTRAINT `fk_absence_requests_organization_id` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `absence_requests` ADD CONSTRAINT `fk_absence_requests_occupancy_id` FOREIGN KEY (`occupancy_id`) REFERENCES `occupancies` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `absence_requests` ADD CONSTRAINT `fk_absence_requests_residence_document_id` FOREIGN KEY (`residence_document_id`) REFERENCES `residence_documents` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `absence_requests` ADD CONSTRAINT `fk_absence_requests_supersedes_request_id` FOREIGN KEY (`supersedes_request_id`) REFERENCES `absence_requests` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `absence_requests` ADD CONSTRAINT `fk_absence_requests_submitted_by` FOREIGN KEY (`submitted_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `absence_requests` ADD CONSTRAINT `fk_absence_requests_decided_by` FOREIGN KEY (`decided_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `allocation_batches` ADD CONSTRAINT `fk_allocation_batches_organization_id` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `allocation_batches` ADD CONSTRAINT `fk_allocation_batches_contract_id` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `allocation_batches` ADD CONSTRAINT `fk_allocation_batches_period_id` FOREIGN KEY (`period_id`) REFERENCES `billing_periods` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `allocation_batches` ADD CONSTRAINT `fk_allocation_batches_service_id` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `allocation_batches` ADD CONSTRAINT `fk_allocation_batches_invoice_id` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `allocation_batches` ADD CONSTRAINT `fk_allocation_batches_supersedes_batch_id` FOREIGN KEY (`supersedes_batch_id`) REFERENCES `allocation_batches` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `allocation_batches` ADD CONSTRAINT `fk_allocation_batches_rounding_policy_id` FOREIGN KEY (`rounding_policy_id`) REFERENCES `business_policies` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `allocation_batches` ADD CONSTRAINT `fk_allocation_batches_confirmed_by` FOREIGN KEY (`confirmed_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `person_day_allocations` ADD CONSTRAINT `fk_person_day_allocations_batch_id` FOREIGN KEY (`batch_id`) REFERENCES `allocation_batches` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `person_day_allocations` ADD CONSTRAINT `fk_person_day_allocations_occupancy_id` FOREIGN KEY (`occupancy_id`) REFERENCES `occupancies` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `room_funds` ADD CONSTRAINT `fk_room_funds_organization_id` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `room_funds` ADD CONSTRAINT `fk_room_funds_room_id` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `room_funds` ADD CONSTRAINT `fk_room_funds_contract_id` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `fund_managers` ADD CONSTRAINT `fk_fund_managers_fund_id` FOREIGN KEY (`fund_id`) REFERENCES `room_funds` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `fund_managers` ADD CONSTRAINT `fk_fund_managers_occupancy_id` FOREIGN KEY (`occupancy_id`) REFERENCES `occupancies` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `fund_managers` ADD CONSTRAINT `fk_fund_managers_assigned_by` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `fund_obligations` ADD CONSTRAINT `fk_fund_obligations_fund_id` FOREIGN KEY (`fund_id`) REFERENCES `room_funds` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `fund_obligations` ADD CONSTRAINT `fk_fund_obligations_occupancy_id` FOREIGN KEY (`occupancy_id`) REFERENCES `occupancies` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `fund_obligations` ADD CONSTRAINT `fk_fund_obligations_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `fund_transactions` ADD CONSTRAINT `fk_fund_transactions_fund_id` FOREIGN KEY (`fund_id`) REFERENCES `room_funds` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `fund_transactions` ADD CONSTRAINT `fk_fund_transactions_occupancy_id` FOREIGN KEY (`occupancy_id`) REFERENCES `occupancies` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `fund_transactions` ADD CONSTRAINT `fk_fund_transactions_obligation_id` FOREIGN KEY (`obligation_id`) REFERENCES `fund_obligations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `fund_transactions` ADD CONSTRAINT `fk_fund_transactions_purchase_id` FOREIGN KEY (`purchase_id`) REFERENCES `shared_purchases` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `fund_transactions` ADD CONSTRAINT `fk_fund_transactions_reverses_transaction_id` FOREIGN KEY (`reverses_transaction_id`) REFERENCES `fund_transactions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `fund_transactions` ADD CONSTRAINT `fk_fund_transactions_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `shared_purchases` ADD CONSTRAINT `fk_shared_purchases_fund_id` FOREIGN KEY (`fund_id`) REFERENCES `room_funds` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `shared_purchases` ADD CONSTRAINT `fk_shared_purchases_requested_by_occupancy_id` FOREIGN KEY (`requested_by_occupancy_id`) REFERENCES `occupancies` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `shared_purchase_revisions` ADD CONSTRAINT `fk_shared_purchase_revisions_purchase_id` FOREIGN KEY (`purchase_id`) REFERENCES `shared_purchases` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `shared_purchase_revisions` ADD CONSTRAINT `fk_shared_purchase_revisions_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `purchase_approvals` ADD CONSTRAINT `fk_purchase_approvals_purchase_id` FOREIGN KEY (`purchase_id`) REFERENCES `shared_purchases` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `purchase_approvals` ADD CONSTRAINT `fk_purchase_approvals_approver_occupancy_id` FOREIGN KEY (`approver_occupancy_id`) REFERENCES `occupancies` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `fund_reservations` ADD CONSTRAINT `fk_fund_reservations_fund_id` FOREIGN KEY (`fund_id`) REFERENCES `room_funds` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `fund_reservations` ADD CONSTRAINT `fk_fund_reservations_purchase_id` FOREIGN KEY (`purchase_id`) REFERENCES `shared_purchases` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `fund_reservations` ADD CONSTRAINT `fk_fund_reservations_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `fund_refund_entitlements` ADD CONSTRAINT `fk_fund_refund_entitlements_fund_id` FOREIGN KEY (`fund_id`) REFERENCES `room_funds` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `fund_refund_entitlements` ADD CONSTRAINT `fk_fund_refund_entitlements_purchase_id` FOREIGN KEY (`purchase_id`) REFERENCES `shared_purchases` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `fund_refund_entitlements` ADD CONSTRAINT `fk_fund_refund_entitlements_occupancy_id` FOREIGN KEY (`occupancy_id`) REFERENCES `occupancies` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `fund_offsets` ADD CONSTRAINT `fk_fund_offsets_entitlement_id` FOREIGN KEY (`entitlement_id`) REFERENCES `fund_refund_entitlements` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `fund_offsets` ADD CONSTRAINT `fk_fund_offsets_obligation_id` FOREIGN KEY (`obligation_id`) REFERENCES `fund_obligations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `fund_offsets` ADD CONSTRAINT `fk_fund_offsets_reservation_id` FOREIGN KEY (`reservation_id`) REFERENCES `fund_reservations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `fund_offsets` ADD CONSTRAINT `fk_fund_offsets_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `stored_files` ADD CONSTRAINT `fk_stored_files_organization_id` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `stored_files` ADD CONSTRAINT `fk_stored_files_uploaded_by` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `file_links` ADD CONSTRAINT `fk_file_links_file_id` FOREIGN KEY (`file_id`) REFERENCES `stored_files` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `file_links` ADD CONSTRAINT `fk_file_links_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `file_access_logs` ADD CONSTRAINT `fk_file_access_logs_file_id` FOREIGN KEY (`file_id`) REFERENCES `stored_files` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `file_access_logs` ADD CONSTRAINT `fk_file_access_logs_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `residence_documents` ADD CONSTRAINT `fk_residence_documents_organization_id` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `residence_documents` ADD CONSTRAINT `fk_residence_documents_person_id` FOREIGN KEY (`person_id`) REFERENCES `persons` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `residence_documents` ADD CONSTRAINT `fk_residence_documents_contract_id` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `residence_documents` ADD CONSTRAINT `fk_residence_documents_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `residence_document_versions` ADD CONSTRAINT `fk_residence_document_versions_document_id` FOREIGN KEY (`document_id`) REFERENCES `residence_documents` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `residence_document_versions` ADD CONSTRAINT `fk_residence_document_versions_template_id` FOREIGN KEY (`template_id`) REFERENCES `residence_form_templates` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `residence_document_versions` ADD CONSTRAINT `fk_residence_document_versions_submitted_by` FOREIGN KEY (`submitted_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `residence_document_versions` ADD CONSTRAINT `fk_residence_document_versions_reviewed_by` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `residence_document_versions` ADD CONSTRAINT `fk_residence_document_versions_pdf_file_id` FOREIGN KEY (`pdf_file_id`) REFERENCES `stored_files` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `room_listings` ADD CONSTRAINT `fk_room_listings_organization_id` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `room_listings` ADD CONSTRAINT `fk_room_listings_room_id` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `room_listings` ADD CONSTRAINT `fk_room_listings_moderated_by` FOREIGN KEY (`moderated_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `room_listings` ADD CONSTRAINT `fk_room_listings_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `rental_inquiries` ADD CONSTRAINT `fk_rental_inquiries_listing_id` FOREIGN KEY (`listing_id`) REFERENCES `room_listings` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `rental_inquiries` ADD CONSTRAINT `fk_rental_inquiries_seeker_user_id` FOREIGN KEY (`seeker_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `rental_inquiries` ADD CONSTRAINT `fk_rental_inquiries_handled_by` FOREIGN KEY (`handled_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `viewing_appointments` ADD CONSTRAINT `fk_viewing_appointments_inquiry_id` FOREIGN KEY (`inquiry_id`) REFERENCES `rental_inquiries` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `viewing_appointments` ADD CONSTRAINT `fk_viewing_appointments_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `viewing_appointments` ADD CONSTRAINT `fk_viewing_appointments_confirmed_by` FOREIGN KEY (`confirmed_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `appointment_history` ADD CONSTRAINT `fk_appointment_history_appointment_id` FOREIGN KEY (`appointment_id`) REFERENCES `viewing_appointments` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `appointment_history` ADD CONSTRAINT `fk_appointment_history_changed_by` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `operating_expenses` ADD CONSTRAINT `fk_operating_expenses_organization_id` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `operating_expenses` ADD CONSTRAINT `fk_operating_expenses_property_id` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `operating_expenses` ADD CONSTRAINT `fk_operating_expenses_room_id` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `operating_expenses` ADD CONSTRAINT `fk_operating_expenses_maintenance_request_id` FOREIGN KEY (`maintenance_request_id`) REFERENCES `maintenance_requests` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `operating_expenses` ADD CONSTRAINT `fk_operating_expenses_replaces_expense_id` FOREIGN KEY (`replaces_expense_id`) REFERENCES `operating_expenses` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `operating_expenses` ADD CONSTRAINT `fk_operating_expenses_voided_by` FOREIGN KEY (`voided_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `operating_expenses` ADD CONSTRAINT `fk_operating_expenses_recorded_by` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `reminders` ADD CONSTRAINT `fk_reminders_organization_id` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `reminders` ADD CONSTRAINT `fk_reminders_assignee_user_id` FOREIGN KEY (`assignee_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `reminders` ADD CONSTRAINT `fk_reminders_resolved_by` FOREIGN KEY (`resolved_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `notifications` ADD CONSTRAINT `fk_notifications_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `notifications` ADD CONSTRAINT `fk_notifications_reminder_id` FOREIGN KEY (`reminder_id`) REFERENCES `reminders` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `audit_logs` ADD CONSTRAINT `fk_audit_logs_organization_id` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `audit_logs` ADD CONSTRAINT `fk_audit_logs_actor_user_id` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `backup_jobs` ADD CONSTRAINT `fk_backup_jobs_manifest_file_id` FOREIGN KEY (`manifest_file_id`) REFERENCES `stored_files` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `backup_jobs` ADD CONSTRAINT `fk_backup_jobs_triggered_by` FOREIGN KEY (`triggered_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `restore_tests` ADD CONSTRAINT `fk_restore_tests_backup_job_id` FOREIGN KEY (`backup_job_id`) REFERENCES `backup_jobs` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `restore_tests` ADD CONSTRAINT `fk_restore_tests_verified_by` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `idempotency_keys` ADD CONSTRAINT `fk_idempotency_keys_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

SET FOREIGN_KEY_CHECKS = 1;
