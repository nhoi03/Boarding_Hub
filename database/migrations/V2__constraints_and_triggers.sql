-- BoardingHub V2: ràng buộc nghiệp vụ không biểu diễn được trong DBML.
-- MySQL 8.0.16+ (CHECK được thực thi). Chạy sau V1__schema.sql.

SET NAMES utf8mb4;

-- =====================================================================
-- 1. CHECK constraints
-- =====================================================================

ALTER TABLE `user_role_assignments`
  ADD CONSTRAINT `ck_ura_room_needs_property` CHECK (`room_id` IS NULL OR `property_id` IS NOT NULL);

ALTER TABLE `support_access_grants`
  ADD CONSTRAINT `ck_sag_valid_range` CHECK (`valid_to` > `valid_from`);

ALTER TABLE `rooms`
  ADD CONSTRAINT `ck_rooms_capacity` CHECK (`capacity` > 0),
  ADD CONSTRAINT `ck_rooms_listed_rent` CHECK (`listed_rent` >= 0);

ALTER TABLE `contracts`
  ADD CONSTRAINT `ck_contracts_dates` CHECK (`end_date` >= `start_date`),
  ADD CONSTRAINT `ck_contracts_anchor_day` CHECK (`billing_anchor_day` BETWEEN 1 AND 28),
  ADD CONSTRAINT `ck_contracts_due_days` CHECK (`payment_due_days` >= 0),
  ADD CONSTRAINT `ck_contracts_deposit` CHECK (`deposit_required` >= 0);

ALTER TABLE `contract_versions`
  ADD CONSTRAINT `ck_contract_versions_dates` CHECK (`end_date` >= `start_date`);

ALTER TABLE `rent_rates`
  ADD CONSTRAINT `ck_rent_rates_amount` CHECK (`monthly_rent` >= 0),
  ADD CONSTRAINT `ck_rent_rates_range` CHECK (`effective_to` IS NULL OR `effective_to` >= `effective_from`);

ALTER TABLE `contract_services`
  ADD CONSTRAINT `ck_contract_services_qty` CHECK (`quantity` > 0),
  ADD CONSTRAINT `ck_contract_services_price` CHECK (`unit_price_override` IS NULL OR `unit_price_override` >= 0),
  ADD CONSTRAINT `ck_contract_services_range` CHECK (`effective_to` IS NULL OR `effective_to` >= `effective_from`);

ALTER TABLE `occupancies`
  ADD CONSTRAINT `ck_occupancies_dates` CHECK (`move_out_date` IS NULL OR `move_out_date` >= `move_in_date`);

ALTER TABLE `deposit_transactions`
  ADD CONSTRAINT `ck_deposit_txn_amount` CHECK (`amount` > 0);

ALTER TABLE `room_assets`
  ADD CONSTRAINT `ck_room_assets_qty` CHECK (`quantity` >= 0),
  ADD CONSTRAINT `ck_room_assets_value` CHECK (`reference_value` IS NULL OR `reference_value` >= 0);

ALTER TABLE `handover_items`
  ADD CONSTRAINT `ck_handover_items_qty` CHECK (`quantity` >= 0);

ALTER TABLE `service_prices`
  ADD CONSTRAINT `ck_service_prices_amount` CHECK (`unit_price` >= 0),
  ADD CONSTRAINT `ck_service_prices_range` CHECK (`effective_to` IS NULL OR `effective_to` >= `effective_from`),
  ADD CONSTRAINT `ck_service_prices_room_needs_property` CHECK (`room_id` IS NULL OR `property_id` IS NOT NULL);

ALTER TABLE `meters`
  ADD CONSTRAINT `ck_meters_initial` CHECK (`initial_value` >= 0),
  ADD CONSTRAINT `ck_meters_removed` CHECK (`removed_at` IS NULL OR `removed_at` >= `installed_at`),
  ADD CONSTRAINT `ck_meters_final` CHECK (`final_value` IS NULL OR `final_value` >= `initial_value`);

-- BR-007, AC-008-02: chỉ số cuối không nhỏ hơn chỉ số đầu của cùng đồng hồ
ALTER TABLE `meter_readings`
  ADD CONSTRAINT `ck_meter_readings_previous` CHECK (`previous_value` >= 0),
  ADD CONSTRAINT `ck_meter_readings_monotonic` CHECK (`current_value` >= `previous_value`);

ALTER TABLE `ocr_jobs`
  ADD CONSTRAINT `ck_ocr_confidence` CHECK (`confidence` IS NULL OR (`confidence` >= 0 AND `confidence` <= 1));

ALTER TABLE `billing_periods`
  ADD CONSTRAINT `ck_billing_periods_dates` CHECK (`date_to` >= `date_from`);

ALTER TABLE `invoices`
  ADD CONSTRAINT `ck_invoices_subtotal` CHECK (`subtotal_amount` >= 0),
  ADD CONSTRAINT `ck_invoices_periodic_has_period` CHECK (`invoice_type` <> 'PERIODIC' OR `period_id` IS NOT NULL),
  ADD CONSTRAINT `ck_invoices_cancel_reason` CHECK (`status` <> 'CANCELLED' OR `cancel_reason` IS NOT NULL);

ALTER TABLE `invoice_items`
  ADD CONSTRAINT `ck_invoice_items_qty` CHECK (`quantity` >= 0),
  ADD CONSTRAINT `ck_invoice_items_price` CHECK (`unit_price` >= 0),
  ADD CONSTRAINT `ck_invoice_items_range` CHECK (`date_to` IS NULL OR `date_from` IS NULL OR `date_to` >= `date_from`);

ALTER TABLE `invoice_adjustments`
  ADD CONSTRAINT `ck_invoice_adjustments_nonzero` CHECK (`amount` <> 0);

ALTER TABLE `payments`
  ADD CONSTRAINT `ck_payments_amount` CHECK (`amount` > 0),
  ADD CONSTRAINT `ck_payments_void_reason` CHECK (`status` <> 'VOIDED' OR `void_reason` IS NOT NULL);

ALTER TABLE `payment_allocations`
  ADD CONSTRAINT `ck_payment_allocations_amount` CHECK (`amount` > 0);

ALTER TABLE `overpayment_refunds`
  ADD CONSTRAINT `ck_overpayment_refunds_amount` CHECK (`amount` > 0);

-- BR-017 + công thức đối chiếu trong BA (mục Trả phòng và quyết toán)
ALTER TABLE `checkouts`
  ADD CONSTRAINT `ck_checkouts_nonnegative` CHECK (
    `outstanding_debt` >= 0 AND `extra_deductions` >= 0 AND `deposit_available` >= 0
    AND `deposit_used` >= 0 AND `refund_amount` >= 0 AND `extra_charge` >= 0),
  ADD CONSTRAINT `ck_checkouts_total_obligation` CHECK (`total_obligation` = `outstanding_debt` + `extra_deductions`),
  ADD CONSTRAINT `ck_checkouts_deposit_used` CHECK (`deposit_used` = LEAST(`deposit_available`, `total_obligation`)),
  ADD CONSTRAINT `ck_checkouts_refund` CHECK (`refund_amount` = `deposit_available` - `deposit_used`),
  ADD CONSTRAINT `ck_checkouts_extra_charge` CHECK (`extra_charge` = `total_obligation` - `deposit_used`);

ALTER TABLE `checkout_deductions`
  ADD CONSTRAINT `ck_checkout_deductions_amount` CHECK (`amount` >= 0);

ALTER TABLE `absence_requests`
  ADD CONSTRAINT `ck_absence_dates` CHECK (`date_to` >= `date_from`);

ALTER TABLE `allocation_batches`
  ADD CONSTRAINT `ck_allocation_batches_amount` CHECK (`eligible_amount` >= 0),
  ADD CONSTRAINT `ck_allocation_batches_days` CHECK (`total_person_days` >= 0),
  ADD CONSTRAINT `ck_allocation_batches_zero_weight` CHECK (`status` <> 'CONFIRMED' OR `total_person_days` > 0);

ALTER TABLE `person_day_allocations`
  ADD CONSTRAINT `ck_pda_days` CHECK (`days_in_period` >= 0 AND `absent_days` >= 0 AND `person_days` >= 0),
  ADD CONSTRAINT `ck_pda_person_days` CHECK (`person_days` = `days_in_period` - `absent_days`),
  ADD CONSTRAINT `ck_pda_amount` CHECK (`allocated_amount` >= 0 AND `raw_share` >= 0);

ALTER TABLE `fund_obligations`
  ADD CONSTRAINT `ck_fund_obligations_amount` CHECK (`amount_due` >= 0);

ALTER TABLE `fund_transactions`
  ADD CONSTRAINT `ck_fund_transactions_amount` CHECK (`amount` > 0),
  ADD CONSTRAINT `ck_fund_transactions_contribution` CHECK (`type` <> 'CONTRIBUTION' OR `occupancy_id` IS NOT NULL);

ALTER TABLE `shared_purchase_revisions`
  ADD CONSTRAINT `ck_purchase_revisions_amount` CHECK (`amount` > 0);

ALTER TABLE `fund_reservations`
  ADD CONSTRAINT `ck_fund_reservations_amount` CHECK (`amount` > 0),
  ADD CONSTRAINT `ck_fund_reservations_released` CHECK (`released_amount` >= 0 AND `released_amount` <= `amount`);

ALTER TABLE `fund_refund_entitlements`
  ADD CONSTRAINT `ck_entitlements_amount` CHECK (`amount` > 0),
  ADD CONSTRAINT `ck_entitlements_remaining` CHECK (`remaining_amount` >= 0 AND `remaining_amount` <= `amount`);

ALTER TABLE `fund_offsets`
  ADD CONSTRAINT `ck_fund_offsets_amount` CHECK (`amount` > 0);

ALTER TABLE `stored_files`
  ADD CONSTRAINT `ck_stored_files_size` CHECK (`size_bytes` >= 0);

ALTER TABLE `room_listings`
  ADD CONSTRAINT `ck_listings_price` CHECK (`listed_price` >= 0),
  ADD CONSTRAINT `ck_listings_reject_reason` CHECK (`status` <> 'REJECTED' OR `reject_reason` IS NOT NULL);

ALTER TABLE `viewing_appointments`
  ADD CONSTRAINT `ck_appointments_duration` CHECK (`duration_minutes` > 0);

ALTER TABLE `operating_expenses`
  ADD CONSTRAINT `ck_expenses_amount` CHECK (`amount` > 0),
  ADD CONSTRAINT `ck_expenses_void_reason` CHECK (`status` <> 'VOIDED' OR `void_reason` IS NOT NULL);

-- =====================================================================
-- 2. Unique có điều kiện (generated column + UNIQUE; MySQL cho phép nhiều NULL)
-- =====================================================================

-- BR-004 / Q01: một phòng tối đa một hợp đồng ACTIVE hoặc EXPIRED (chưa trả phòng)
ALTER TABLE `contracts`
  ADD COLUMN `active_room_key` BIGINT
    GENERATED ALWAYS AS (IF(`status` IN ('ACTIVE', 'EXPIRED'), `room_id`, NULL)) STORED,
  ADD UNIQUE KEY `uq_contracts_active_room` (`active_room_key`);

-- Một người không được ghi hai lượt ở còn hiệu lực trong cùng hợp đồng
ALTER TABLE `occupancies`
  ADD COLUMN `active_person_key` VARCHAR(50)
    GENERATED ALWAYS AS (IF(`status` IN ('PLANNED', 'ACTIVE'), CONCAT(`contract_id`, ':', `person_id`), NULL)) STORED,
  ADD UNIQUE KEY `uq_occupancies_active_person` (`active_person_key`);

-- Mỗi hợp đồng chỉ một người đại diện còn hiệu lực
ALTER TABLE `occupancies`
  ADD COLUMN `active_representative_key` BIGINT
    GENERATED ALWAYS AS (IF(`role` = 'REPRESENTATIVE' AND `status` IN ('PLANNED', 'ACTIVE'), `contract_id`, NULL)) STORED,
  ADD UNIQUE KEY `uq_occupancies_active_representative` (`active_representative_key`);

-- Một biên bản CONFIRMED cho mỗi hợp đồng và loại (nhận/trả)
ALTER TABLE `handovers`
  ADD COLUMN `confirmed_key` VARCHAR(50)
    GENERATED ALWAYS AS (IF(`status` = 'CONFIRMED', CONCAT(`contract_id`, ':', `type`), NULL)) STORED,
  ADD UNIQUE KEY `uq_handovers_confirmed` (`confirmed_key`);

-- Một đồng hồ ACTIVE cho mỗi phòng và dịch vụ
ALTER TABLE `meters`
  ADD COLUMN `active_key` VARCHAR(50)
    GENERATED ALWAYS AS (IF(`status` = 'ACTIVE', CONCAT(`room_id`, ':', `service_id`), NULL)) STORED,
  ADD UNIQUE KEY `uq_meters_active` (`active_key`);

-- Một chỉ số CONFIRMED cho mỗi đồng hồ, kỳ, loại đoạn
ALTER TABLE `meter_readings`
  ADD COLUMN `confirmed_key` VARCHAR(80)
    GENERATED ALWAYS AS (IF(`status` = 'CONFIRMED',
      CONCAT(`meter_id`, ':', IFNULL(`period_id`, 0), ':', `reading_type`), NULL)) STORED,
  ADD UNIQUE KEY `uq_meter_readings_confirmed` (`confirmed_key`);

-- BR-010: một hóa đơn gốc PERIODIC còn hiệu lực cho mỗi kỳ (kỳ gắn với hợp đồng)
ALTER TABLE `invoices`
  ADD COLUMN `active_periodic_key` BIGINT
    GENERATED ALWAYS AS (IF(`invoice_type` = 'PERIODIC' AND `status` <> 'CANCELLED', `period_id`, NULL)) STORED,
  ADD UNIQUE KEY `uq_invoices_active_periodic` (`active_periodic_key`);

-- Không phân bổ trùng cùng phiếu thu vào cùng hóa đơn khi đang ACTIVE
ALTER TABLE `payment_allocations`
  ADD COLUMN `active_key` VARCHAR(50)
    GENERATED ALWAYS AS (IF(`status` = 'ACTIVE', CONCAT(`payment_id`, ':', `invoice_id`), NULL)) STORED,
  ADD UNIQUE KEY `uq_payment_allocations_active` (`active_key`);

-- AC-012-04: tối đa một quyết toán chưa hủy cho mỗi hợp đồng
ALTER TABLE `checkouts`
  ADD COLUMN `active_contract_key` BIGINT
    GENERATED ALWAYS AS (IF(`status` <> 'CANCELLED', `contract_id`, NULL)) STORED,
  ADD UNIQUE KEY `uq_checkouts_active_contract` (`active_contract_key`);

-- AC-016-04: một phiên chia CONFIRMED cho mỗi kỳ và dịch vụ
ALTER TABLE `allocation_batches`
  ADD COLUMN `confirmed_key` VARCHAR(50)
    GENERATED ALWAYS AS (IF(`status` = 'CONFIRMED', CONCAT(`period_id`, ':', `service_id`), NULL)) STORED,
  ADD UNIQUE KEY `uq_allocation_batches_confirmed` (`confirmed_key`);

-- Một quỹ OPEN cho mỗi hợp đồng
ALTER TABLE `room_funds`
  ADD COLUMN `open_contract_key` BIGINT
    GENERATED ALWAYS AS (IF(`status` = 'OPEN', `contract_id`, NULL)) STORED,
  ADD UNIQUE KEY `uq_room_funds_open_contract` (`open_contract_key`);

-- BR-027: một giữ chỗ HELD cho mỗi đề nghị mua chung
ALTER TABLE `fund_reservations`
  ADD COLUMN `held_purchase_key` BIGINT
    GENERATED ALWAYS AS (IF(`status` = 'HELD', `purchase_id`, NULL)) STORED,
  ADD UNIQUE KEY `uq_fund_reservations_held` (`held_purchase_key`);

-- =====================================================================
-- 3. Triggers: bất biến của chứng từ
-- =====================================================================

DELIMITER $$

-- BR-038, AC-028-02: nhật ký chỉ được thêm
CREATE TRIGGER `trg_audit_logs_no_update` BEFORE UPDATE ON `audit_logs`
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_logs is append-only';
END$$

CREATE TRIGGER `trg_audit_logs_no_delete` BEFORE DELETE ON `audit_logs`
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_logs is append-only';
END$$

-- BR-025: người đề nghị không tự xác nhận; chỉ xác nhận phiên bản hiện tại (BR-026)
CREATE TRIGGER `trg_purchase_approvals_rules` BEFORE INSERT ON `purchase_approvals`
FOR EACH ROW
BEGIN
  DECLARE v_requester BIGINT;
  DECLARE v_revision INT;
  SELECT `requested_by_occupancy_id`, `current_revision_no`
    INTO v_requester, v_revision
    FROM `shared_purchases` WHERE `id` = NEW.`purchase_id`;
  IF NEW.`approver_occupancy_id` = v_requester THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Requester cannot approve own purchase';
  END IF;
  IF NEW.`revision_no` <> v_revision THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Approval must target the current purchase revision';
  END IF;
END$$

-- BR-011: dòng hóa đơn chỉ sửa khi hóa đơn còn DRAFT
CREATE TRIGGER `trg_invoice_items_draft_insert` BEFORE INSERT ON `invoice_items`
FOR EACH ROW
BEGIN
  IF (SELECT `status` FROM `invoices` WHERE `id` = NEW.`invoice_id`) <> 'DRAFT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invoice is not DRAFT; use invoice_adjustments';
  END IF;
END$$

CREATE TRIGGER `trg_invoice_items_draft_update` BEFORE UPDATE ON `invoice_items`
FOR EACH ROW
BEGIN
  IF (SELECT `status` FROM `invoices` WHERE `id` = OLD.`invoice_id`) <> 'DRAFT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invoice is not DRAFT; use invoice_adjustments';
  END IF;
END$$

CREATE TRIGGER `trg_invoice_items_draft_delete` BEFORE DELETE ON `invoice_items`
FOR EACH ROW
BEGIN
  IF (SELECT `status` FROM `invoices` WHERE `id` = OLD.`invoice_id`) <> 'DRAFT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invoice is not DRAFT; use invoice_adjustments';
  END IF;
END$$

CREATE TRIGGER `trg_invoices_no_delete_issued` BEFORE DELETE ON `invoices`
FOR EACH ROW
BEGIN
  IF OLD.`status` <> 'DRAFT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Issued invoices cannot be deleted; cancel instead';
  END IF;
END$$

CREATE TRIGGER `trg_invoices_lock_issued_amount` BEFORE UPDATE ON `invoices`
FOR EACH ROW
BEGIN
  IF OLD.`status` <> 'DRAFT' AND (NEW.`subtotal_amount` <> OLD.`subtotal_amount`
      OR NEW.`contract_id` <> OLD.`contract_id`
      OR NOT (NEW.`period_id` <=> OLD.`period_id`)) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Issued invoice amount and scope are immutable';
  END IF;
END$$

-- Chứng từ tiền: không xóa, không sửa số tiền (sửa bằng hủy/đảo + bản mới)
CREATE TRIGGER `trg_payments_no_delete` BEFORE DELETE ON `payments`
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'payments cannot be deleted; void instead';
END$$

CREATE TRIGGER `trg_payments_immutable` BEFORE UPDATE ON `payments`
FOR EACH ROW
BEGIN
  IF NEW.`amount` <> OLD.`amount` OR NEW.`contract_id` <> OLD.`contract_id`
      OR NEW.`idempotency_key` <> OLD.`idempotency_key` THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'payment amount/contract is immutable';
  END IF;
  IF OLD.`status` = 'VOIDED' AND NEW.`status` <> 'VOIDED' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'voided payment cannot be restored';
  END IF;
END$$

CREATE TRIGGER `trg_payment_allocations_no_delete` BEFORE DELETE ON `payment_allocations`
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'allocations cannot be deleted; reverse instead';
END$$

CREATE TRIGGER `trg_payment_allocations_immutable` BEFORE UPDATE ON `payment_allocations`
FOR EACH ROW
BEGIN
  IF NEW.`amount` <> OLD.`amount` OR NEW.`payment_id` <> OLD.`payment_id` OR NEW.`invoice_id` <> OLD.`invoice_id` THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'allocation amount/target is immutable';
  END IF;
  IF OLD.`status` = 'REVERSED' AND NEW.`status` <> 'REVERSED' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'reversed allocation cannot be restored';
  END IF;
END$$

CREATE TRIGGER `trg_deposit_transactions_no_delete` BEFORE DELETE ON `deposit_transactions`
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'deposit transactions cannot be deleted; add a reversal';
END$$

CREATE TRIGGER `trg_deposit_transactions_immutable` BEFORE UPDATE ON `deposit_transactions`
FOR EACH ROW
BEGIN
  IF NEW.`amount` <> OLD.`amount` OR NEW.`type` <> OLD.`type` OR NEW.`contract_id` <> OLD.`contract_id` THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'deposit transaction is immutable; add a reversal';
  END IF;
END$$

CREATE TRIGGER `trg_fund_transactions_no_delete` BEFORE DELETE ON `fund_transactions`
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'fund transactions cannot be deleted; add a reversal';
END$$

CREATE TRIGGER `trg_fund_transactions_immutable` BEFORE UPDATE ON `fund_transactions`
FOR EACH ROW
BEGIN
  IF NEW.`amount` <> OLD.`amount` OR NEW.`type` <> OLD.`type` OR NEW.`fund_id` <> OLD.`fund_id` THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'fund transaction is immutable; add a reversal';
  END IF;
END$$

CREATE TRIGGER `trg_fund_offsets_no_update` BEFORE UPDATE ON `fund_offsets`
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'fund offsets are immutable';
END$$

CREATE TRIGGER `trg_fund_offsets_no_delete` BEFORE DELETE ON `fund_offsets`
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'fund offsets are immutable';
END$$

-- Quyết toán đã CONFIRMED không sửa số tiền (AC-012-04)
CREATE TRIGGER `trg_checkouts_lock_confirmed` BEFORE UPDATE ON `checkouts`
FOR EACH ROW
BEGIN
  IF OLD.`status` = 'CONFIRMED' AND (NEW.`status` <> 'CONFIRMED'
      OR NEW.`deposit_used` <> OLD.`deposit_used`
      OR NEW.`refund_amount` <> OLD.`refund_amount`
      OR NEW.`extra_charge` <> OLD.`extra_charge`) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Confirmed checkout is immutable';
  END IF;
END$$

DELIMITER ;
