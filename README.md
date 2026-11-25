# BoardingHub Backend v2

Backend baseline for BoardingHub BA v1.1. Java 21, Spring Boot 3.5, MySQL, JWT, Flyway, package-by-feature.

## Prerequisites
- JDK 21
- Maven 3.9+
- MySQL 8+ (or Docker Compose)

## Run locally (IntelliJ)
1. Open this folder as Maven project.
2. Start MySQL and create database `boardinghub` (or let JDBC create it if user has permission).
3. Set env vars if needed: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`.
4. Run `vn.boardinghub.BoardingHubApplication`.

Flyway creates core tables; JPA uses `ddl-auto=validate`.

## Docker
`docker compose up --build`

## API Docs
- Swagger UI: http://localhost:8080/swagger-ui/index.html
- OpenAPI: http://localhost:8080/v3/api-docs
- Health: http://localhost:8080/actuator/health

## API sample
Register:
```json
POST /api/v1/auth/register
{ "email":"owner@example.com", "password":"Password123", "fullName":"Property Owner" }
```
Login with same credentials and send `Authorization: Bearer <accessToken>` for protected APIs.
Property endpoints: GET/POST `/api/v1/properties`, GET/PUT/DELETE `/api/v1/properties/{id}`.
Room endpoints: GET `/api/v1/rooms?propertyId=1&page=0&size=20`, POST `/api/v1/rooms`, GET/PUT/DELETE `/api/v1/rooms/{id}`.

## Package convention
Each feature owns controller/service/repository/entity/dto. Shared code is limited to API envelope, errors, persistence and configuration.

## Important security note
JWT currently supports access-token authentication only. Refresh-token rotation, logout token revocation, RBAC and property-level ownership checks are required before production. This is a development baseline, not a production-ready deployment.
