# Implementation status (honest baseline)

## Implemented in code
- Maven Spring Boot project, Java 21, MySQL connector.
- package-by-feature skeleton.
- Stateless JWT bearer authentication; register/login; BCrypt password hashing.
- Core user/property/room entities, repositories, DTOs, services and REST controllers.
- Property CRUD and Room CRUD with pagination/filter by property.
- Validation and standard success/error envelopes.
- Global exception handling for business, validation, bad request and DB constraint errors.
- Flyway V1 schema; Hibernate validates rather than generating schema.
- Audit records on property and room create/update/delete.
- Swagger UI/OpenAPI bearer security definition.
- Dockerfile and Compose for MySQL + API, env example.
- Basic test classes.

## Not yet implemented (do not use as production)
- Refresh token rotation, refresh endpoint, logout/revocation.
- Role tables, role/permission administration and property-level authorization.
- Tenant/occupancy/contracts/deposit/assets/service tariffs/meters/invoice/payment/settlement.
- Maintenance/expenses/reminders/fund/absence/residence/listing/appointment/report endpoints.
- Audit old/new diffs, request ID, IP address, audit browse endpoint, retention controls.
- File storage and PDF/OCR.
- Integration tests with MySQL/Testcontainers and CI pipeline.
- Business acceptance tests for all 30 US/95 AC and 41 BR from BA v1.1.

## Source baseline
BoardingHub_BA_v1_1.docx; excluded: roommate matching and room transfer; retained room discovery. Q01-Q14 decisions must be confirmed before locking dependent business rules.
