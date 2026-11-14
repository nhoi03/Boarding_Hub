CREATE TABLE properties (
 id BIGSERIAL PRIMARY KEY,
 name VARCHAR(150) NOT NULL,
 address VARCHAR(500) NOT NULL DEFAULT ''
);
CREATE TABLE rooms (
 id BIGSERIAL PRIMARY KEY,
 property_id BIGINT NOT NULL REFERENCES properties(id),
 room_number VARCHAR(30) NOT NULL,
 capacity INTEGER NOT NULL CHECK (capacity > 0),
 base_price NUMERIC(15,2) NOT NULL CHECK (base_price >= 0),
 status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','OCCUPIED','MAINTENANCE')),
 CONSTRAINT uq_property_room UNIQUE(property_id,room_number)
);
