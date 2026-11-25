CREATE TABLE rental_rooms (
 id BIGINT PRIMARY KEY AUTO_INCREMENT, owner_id BIGINT NOT NULL, property_name VARCHAR(150) NOT NULL,
 room_number VARCHAR(30) NOT NULL, capacity INT NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'VACANT',
 FOREIGN KEY (owner_id) REFERENCES app_users(id), UNIQUE(owner_id, property_name, room_number),
 CHECK (capacity > 0), CHECK (status IN ('VACANT','OCCUPIED'))
);
CREATE TABLE rental_persons (
 id BIGINT PRIMARY KEY AUTO_INCREMENT, owner_id BIGINT NOT NULL, full_name VARCHAR(150) NOT NULL,
 phone VARCHAR(30) NOT NULL, account_email VARCHAR(254), FOREIGN KEY (owner_id) REFERENCES app_users(id)
);
CREATE TABLE rental_contracts (
 id BIGINT PRIMARY KEY AUTO_INCREMENT, owner_id BIGINT NOT NULL, room_id BIGINT NOT NULL, person_id BIGINT NOT NULL,
 start_date DATE NOT NULL, end_date DATE, rent_amount DECIMAL(15,2) NOT NULL, deposit_due DECIMAL(15,2) NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'DRAFT', FOREIGN KEY (owner_id) REFERENCES app_users(id),
 FOREIGN KEY (room_id) REFERENCES rental_rooms(id), FOREIGN KEY (person_id) REFERENCES rental_persons(id),
 CHECK (rent_amount >= 0 AND deposit_due >= 0), CHECK (end_date IS NULL OR end_date >= start_date),
 CHECK (status IN ('DRAFT','ACTIVE','TERMINATED'))
);
CREATE TABLE rental_rent_rates (
 id BIGINT PRIMARY KEY AUTO_INCREMENT, owner_id BIGINT NOT NULL, contract_id BIGINT NOT NULL,
 effective_from DATE NOT NULL, amount DECIMAL(15,2) NOT NULL, FOREIGN KEY (contract_id) REFERENCES rental_contracts(id), CHECK(amount>=0)
);
CREATE TABLE rental_contract_services (
 id BIGINT PRIMARY KEY AUTO_INCREMENT, owner_id BIGINT NOT NULL, contract_id BIGINT NOT NULL,
 service_type VARCHAR(20) NOT NULL, unit_price DECIMAL(15,2) NOT NULL, quantity DECIMAL(15,3) NOT NULL DEFAULT 1,
 FOREIGN KEY (contract_id) REFERENCES rental_contracts(id), UNIQUE(contract_id, service_type), CHECK(unit_price>=0 AND quantity>=0)
);
CREATE TABLE rental_occupancies (
 id BIGINT PRIMARY KEY AUTO_INCREMENT, owner_id BIGINT NOT NULL, contract_id BIGINT NOT NULL, person_id BIGINT NOT NULL,
 start_date DATE NOT NULL, end_date DATE, status VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
 FOREIGN KEY (contract_id) REFERENCES rental_contracts(id), FOREIGN KEY (person_id) REFERENCES rental_persons(id),
 UNIQUE(contract_id,person_id), CHECK(status IN ('PLANNED','ACTIVE','ENDED'))
);
CREATE TABLE rental_service_prices (
 id BIGINT PRIMARY KEY AUTO_INCREMENT, owner_id BIGINT NOT NULL, contract_id BIGINT NOT NULL,
 service_type VARCHAR(20) NOT NULL, effective_from DATE NOT NULL, unit_price DECIMAL(15,2) NOT NULL,
 FOREIGN KEY(contract_id) REFERENCES rental_contracts(id), UNIQUE(contract_id,service_type,effective_from), CHECK(unit_price>=0)
);
CREATE TABLE rental_handovers (
 id BIGINT PRIMARY KEY AUTO_INCREMENT, owner_id BIGINT NOT NULL, contract_id BIGINT NOT NULL,
 kind VARCHAR(20) NOT NULL, notes VARCHAR(1000) NOT NULL, handover_date DATE NOT NULL,
 FOREIGN KEY (contract_id) REFERENCES rental_contracts(id), UNIQUE(contract_id,kind)
);
CREATE TABLE rental_billing_periods (
 id BIGINT PRIMARY KEY AUTO_INCREMENT, owner_id BIGINT NOT NULL, contract_id BIGINT NOT NULL,
 period_key VARCHAR(7) NOT NULL, due_date DATE NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
 FOREIGN KEY (contract_id) REFERENCES rental_contracts(id), UNIQUE(contract_id,period_key), CHECK(status IN ('OPEN','LOCKED'))
);
CREATE TABLE rental_meter_readings (
 id BIGINT PRIMARY KEY AUTO_INCREMENT, owner_id BIGINT NOT NULL, contract_id BIGINT NOT NULL,
 period_id BIGINT, kind VARCHAR(20) NOT NULL, meter_type VARCHAR(20) NOT NULL,
 previous_value DECIMAL(15,3) NOT NULL, current_value DECIMAL(15,3) NOT NULL, status VARCHAR(20) NOT NULL,
 reading_date DATE NOT NULL, FOREIGN KEY (contract_id) REFERENCES rental_contracts(id),
 FOREIGN KEY (period_id) REFERENCES rental_billing_periods(id), CHECK(current_value>=previous_value AND previous_value>=0)
);
CREATE TABLE rental_invoices (
 id BIGINT PRIMARY KEY AUTO_INCREMENT, owner_id BIGINT NOT NULL, contract_id BIGINT NOT NULL,
 period_id BIGINT, kind VARCHAR(20) NOT NULL, period_key VARCHAR(7) NOT NULL, due_date DATE NOT NULL,
 total_amount DECIMAL(15,2) NOT NULL DEFAULT 0, status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
 FOREIGN KEY (contract_id) REFERENCES rental_contracts(id), FOREIGN KEY (period_id) REFERENCES rental_billing_periods(id),
 UNIQUE(contract_id,kind,period_key), CHECK(total_amount>=0), CHECK(status IN ('DRAFT','ISSUED'))
);
CREATE TABLE rental_invoice_items (
 id BIGINT PRIMARY KEY AUTO_INCREMENT, owner_id BIGINT NOT NULL, invoice_id BIGINT NOT NULL,
 description VARCHAR(250) NOT NULL, quantity DECIMAL(15,3) NOT NULL, unit_price DECIMAL(15,2) NOT NULL,
 amount DECIMAL(15,2) NOT NULL, FOREIGN KEY (invoice_id) REFERENCES rental_invoices(id), CHECK(quantity>=0 AND unit_price>=0 AND amount>=0)
);
CREATE TABLE rental_payments (
 id BIGINT PRIMARY KEY AUTO_INCREMENT, owner_id BIGINT NOT NULL, contract_id BIGINT NOT NULL,
 amount DECIMAL(15,2) NOT NULL, paid_at DATE NOT NULL, reference VARCHAR(100) NOT NULL,
 FOREIGN KEY (contract_id) REFERENCES rental_contracts(id), UNIQUE(owner_id,reference), CHECK(amount>0)
);
CREATE TABLE rental_payment_allocations (
 id BIGINT PRIMARY KEY AUTO_INCREMENT, owner_id BIGINT NOT NULL, payment_id BIGINT NOT NULL,
 invoice_id BIGINT NOT NULL, amount DECIMAL(15,2) NOT NULL,
 FOREIGN KEY (payment_id) REFERENCES rental_payments(id), FOREIGN KEY (invoice_id) REFERENCES rental_invoices(id), CHECK(amount>0)
);
CREATE TABLE rental_checkouts (
 id BIGINT PRIMARY KEY AUTO_INCREMENT, owner_id BIGINT NOT NULL, contract_id BIGINT NOT NULL UNIQUE,
 checkout_date DATE NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
 debt_amount DECIMAL(15,2) NOT NULL DEFAULT 0, deduction_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
 applied_amount DECIMAL(15,2) NOT NULL DEFAULT 0, refund_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
 remaining_due DECIMAL(15,2) NOT NULL DEFAULT 0, FOREIGN KEY (contract_id) REFERENCES rental_contracts(id),
 CHECK(status IN ('DRAFT','FINALIZED'))
);
CREATE TABLE rental_checkout_deductions (
 id BIGINT PRIMARY KEY AUTO_INCREMENT, owner_id BIGINT NOT NULL, checkout_id BIGINT NOT NULL,
 description VARCHAR(250) NOT NULL, amount DECIMAL(15,2) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
 FOREIGN KEY (checkout_id) REFERENCES rental_checkouts(id), CHECK(amount>0), CHECK(status IN ('PENDING','APPROVED'))
);
CREATE TABLE rental_deposit_transactions (
 id BIGINT PRIMARY KEY AUTO_INCREMENT, owner_id BIGINT NOT NULL, contract_id BIGINT NOT NULL,
 checkout_id BIGINT, kind VARCHAR(20) NOT NULL, amount DECIMAL(15,2) NOT NULL, reference VARCHAR(100) NOT NULL,
 transaction_date DATE NOT NULL, FOREIGN KEY (contract_id) REFERENCES rental_contracts(id),
 FOREIGN KEY (checkout_id) REFERENCES rental_checkouts(id), UNIQUE(owner_id,reference), CHECK(amount>0),
 CHECK(kind IN ('RECEIVE','APPLY_TO_DEBT','REFUND'))
);
CREATE TABLE rental_deposit_allocations (
 id BIGINT PRIMARY KEY AUTO_INCREMENT, owner_id BIGINT NOT NULL, transaction_id BIGINT NOT NULL,
 invoice_id BIGINT NOT NULL, amount DECIMAL(15,2) NOT NULL,
 FOREIGN KEY(transaction_id) REFERENCES rental_deposit_transactions(id), FOREIGN KEY(invoice_id) REFERENCES rental_invoices(id), CHECK(amount>0)
);
