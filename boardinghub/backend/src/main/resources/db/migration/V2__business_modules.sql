CREATE TABLE tenants (
 id BIGSERIAL PRIMARY KEY,
 full_name VARCHAR(160) NOT NULL,
 phone VARCHAR(30),
 email VARCHAR(180)
);

CREATE TABLE contracts (
 id BIGSERIAL PRIMARY KEY,
 room_id BIGINT NOT NULL REFERENCES rooms(id),
 tenant_id BIGINT NOT NULL REFERENCES tenants(id),
 start_date DATE NOT NULL,
 end_date DATE,
 rent_amount NUMERIC(15,2) NOT NULL,
 status VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
);

CREATE TABLE assets (
 id BIGSERIAL PRIMARY KEY,
 room_id BIGINT NOT NULL REFERENCES rooms(id),
 name VARCHAR(150) NOT NULL,
 quantity INTEGER NOT NULL DEFAULT 1,
 condition_note VARCHAR(500)
);

CREATE TABLE meter_readings (
 id BIGSERIAL PRIMARY KEY,
 room_id BIGINT NOT NULL REFERENCES rooms(id),
 period VARCHAR(7) NOT NULL,
 meter_type VARCHAR(15) NOT NULL,
 previous_value NUMERIC(15,3) NOT NULL,
 current_value NUMERIC(15,3) NOT NULL
);

CREATE TABLE invoices (
 id BIGSERIAL PRIMARY KEY,
 contract_id BIGINT NOT NULL REFERENCES contracts(id),
 period VARCHAR(7) NOT NULL,
 total_amount NUMERIC(15,2) NOT NULL,
 status VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
);

CREATE TABLE payments (
 id BIGSERIAL PRIMARY KEY,
 invoice_id BIGINT NOT NULL REFERENCES invoices(id),
 amount NUMERIC(15,2) NOT NULL,
 paid_at DATE NOT NULL,
 reference VARCHAR(120)
);

CREATE TABLE maintenance_requests (
 id BIGSERIAL PRIMARY KEY,
 room_id BIGINT NOT NULL REFERENCES rooms(id),
 title VARCHAR(200) NOT NULL,
 description TEXT,
 status VARCHAR(30) NOT NULL DEFAULT 'OPEN'
);

CREATE TABLE residence_records (
 id BIGSERIAL PRIMARY KEY,
 tenant_id BIGINT NOT NULL REFERENCES tenants(id),
 record_type VARCHAR(30) NOT NULL,
 start_date DATE,
 end_date DATE,
 status VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
);

CREATE TABLE room_listings (
 id BIGSERIAL PRIMARY KEY,
 room_id BIGINT NOT NULL REFERENCES rooms(id),
 title VARCHAR(180) NOT NULL,
 description TEXT,
 published BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE operation_tasks (
 id BIGSERIAL PRIMARY KEY,
 title VARCHAR(200) NOT NULL,
 due_date DATE,
 status VARCHAR(30) NOT NULL DEFAULT 'OPEN'
);

CREATE TABLE operating_expenses (
 id BIGSERIAL PRIMARY KEY,
 property_id BIGINT NOT NULL REFERENCES properties(id),
 description VARCHAR(250) NOT NULL,
 amount NUMERIC(15,2) NOT NULL,
 spent_at DATE NOT NULL
);

CREATE TABLE fund_entries (
 id BIGSERIAL PRIMARY KEY,
 room_id BIGINT NOT NULL REFERENCES rooms(id),
 description VARCHAR(250) NOT NULL,
 amount NUMERIC(15,2) NOT NULL,
 status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
);

CREATE TABLE absences (
 id BIGSERIAL PRIMARY KEY,
 tenant_id BIGINT NOT NULL REFERENCES tenants(id),
 start_date DATE NOT NULL,
 end_date DATE NOT NULL,
 status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
);
