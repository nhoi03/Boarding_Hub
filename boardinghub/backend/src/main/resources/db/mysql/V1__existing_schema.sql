CREATE TABLE properties (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(150) NOT NULL,
 address VARCHAR(500) NOT NULL DEFAULT ''
);
CREATE TABLE rooms (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 property_id BIGINT NOT NULL REFERENCES properties(id),
 room_number VARCHAR(30) NOT NULL,
 capacity INTEGER NOT NULL CHECK (capacity > 0),
 base_price NUMERIC(15,2) NOT NULL CHECK (base_price >= 0),
 status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','OCCUPIED','MAINTENANCE')),
 CONSTRAINT uq_property_room UNIQUE(property_id,room_number)
);

CREATE TABLE tenants (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 full_name VARCHAR(160) NOT NULL,
 phone VARCHAR(30),
 email VARCHAR(180)
);

CREATE TABLE contracts (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 room_id BIGINT NOT NULL REFERENCES rooms(id),
 tenant_id BIGINT NOT NULL REFERENCES tenants(id),
 start_date DATE NOT NULL,
 end_date DATE,
 rent_amount NUMERIC(15,2) NOT NULL,
 status VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
);

CREATE TABLE assets (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 room_id BIGINT NOT NULL REFERENCES rooms(id),
 name VARCHAR(150) NOT NULL,
 quantity INTEGER NOT NULL DEFAULT 1,
 condition_note VARCHAR(500)
);

CREATE TABLE meter_readings (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 room_id BIGINT NOT NULL REFERENCES rooms(id),
 period VARCHAR(7) NOT NULL,
 meter_type VARCHAR(15) NOT NULL,
 previous_value NUMERIC(15,3) NOT NULL,
 current_value NUMERIC(15,3) NOT NULL
);

CREATE TABLE invoices (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 contract_id BIGINT NOT NULL REFERENCES contracts(id),
 period VARCHAR(7) NOT NULL,
 total_amount NUMERIC(15,2) NOT NULL,
 status VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
);

CREATE TABLE payments (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 invoice_id BIGINT NOT NULL REFERENCES invoices(id),
 amount NUMERIC(15,2) NOT NULL,
 paid_at DATE NOT NULL,
 reference VARCHAR(120)
);

CREATE TABLE maintenance_requests (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 room_id BIGINT NOT NULL REFERENCES rooms(id),
 title VARCHAR(200) NOT NULL,
 description TEXT,
 status VARCHAR(30) NOT NULL DEFAULT 'OPEN'
);

CREATE TABLE residence_records (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 tenant_id BIGINT NOT NULL REFERENCES tenants(id),
 record_type VARCHAR(30) NOT NULL,
 start_date DATE,
 end_date DATE,
 status VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
);

CREATE TABLE room_listings (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 room_id BIGINT NOT NULL REFERENCES rooms(id),
 title VARCHAR(180) NOT NULL,
 description TEXT,
 published BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE operation_tasks (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 title VARCHAR(200) NOT NULL,
 due_date DATE,
 status VARCHAR(30) NOT NULL DEFAULT 'OPEN'
);

CREATE TABLE operating_expenses (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 property_id BIGINT NOT NULL REFERENCES properties(id),
 description VARCHAR(250) NOT NULL,
 amount NUMERIC(15,2) NOT NULL,
 spent_at DATE NOT NULL
);

CREATE TABLE fund_entries (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 room_id BIGINT NOT NULL REFERENCES rooms(id),
 description VARCHAR(250) NOT NULL,
 amount NUMERIC(15,2) NOT NULL,
 status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
);

CREATE TABLE absences (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 tenant_id BIGINT NOT NULL REFERENCES tenants(id),
 start_date DATE NOT NULL,
 end_date DATE NOT NULL,
 status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
);

ALTER TABLE meter_readings ADD CONSTRAINT ck_meter_order CHECK (current_value >= previous_value);
ALTER TABLE meter_readings ADD CONSTRAINT uq_meter_period UNIQUE (room_id, period, meter_type);
ALTER TABLE invoices ADD CONSTRAINT uq_invoice_period UNIQUE (contract_id, period);
ALTER TABLE payments ADD CONSTRAINT ck_payment_amount CHECK (amount > 0);
ALTER TABLE invoices ADD CONSTRAINT ck_invoice_amount CHECK (total_amount >= 0);
ALTER TABLE contracts ADD CONSTRAINT ck_contract_amount CHECK (rent_amount >= 0);
ALTER TABLE contracts ADD CONSTRAINT ck_contract_dates CHECK (end_date IS NULL OR end_date >= start_date);
ALTER TABLE absences ADD CONSTRAINT ck_absence_dates CHECK (end_date >= start_date);
ALTER TABLE fund_entries ADD CONSTRAINT ck_fund_amount CHECK (amount <> 0);
ALTER TABLE operating_expenses ADD CONSTRAINT ck_expense_amount CHECK (amount >= 0);

CREATE TABLE app_users (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 full_name VARCHAR(100) NOT NULL,
 email VARCHAR(254) NOT NULL UNIQUE,
 password_hash VARCHAR(100) NOT NULL,
 role VARCHAR(10) NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'OWNER', 'ADMIN')),
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
);
