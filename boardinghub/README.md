# BoardingHub — React + Spring Boot Extended Codebase

This is an **extended development scaffold**, not a production-complete implementation of BA v1.1.

## Requirements
- Node.js 22+, Java 21, Maven 3.9+, Docker Desktop

## Run
```bash
docker compose up -d
cd backend && mvn spring-boot:run
# new terminal
cd frontend && npm install && npm run dev
```

- React: http://localhost:5173
- Spring Boot: http://localhost:8080/api/v1/rooms
- PostgreSQL: localhost:5432, development credentials `boardinghub / boardinghub_dev` (change before sharing).
- Frontend defaults to demonstration data. Use the `API thật` mode for Rooms.

## Contents
- 15 React UI sections matching the BA screen inventory, with demo data
- Property and Room endpoints from starter
- 13 additional JPA CRUD resources with Flyway schema and DB constraints
- CI frontend build workflow, docs/API.md

## Important limitations
- No login/JWT, authorization, roles or tenant-level data isolation. **Do not deploy publicly.**
- No verified business workflows for deposits, invoice issuance, partial payments, settlement, fund approval, person-day computation, OCR, PDF or backups.
- Finance-related resources are raw CRUD prototypes only, not accounting-safe transactions.
- UI screens other than Rooms still use demo data; API integration is a subsequent phase.
- Java/Maven build has not been run in this environment.

## Next recommended implementation
1. Security: users, organizations, role memberships, JWT and scoped authorization.
2. DTOs + Bean Validation + global exception handling, service transaction boundaries.
3. Business-state transitions, immutable invoice snapshots, receipts and audit events.
4. Connect 15 frontend modules to APIs and write integration tests.
5. Review all open BA policy decisions before production.
