# BoardingHub — React + Spring Boot + MySQL

BoardingHub has real session accounts and three transactional rental workflows: move-in, monthly billing, and checkout. Other operational screens remain demonstrations.

## Run locally on Windows

Requirements: Node.js 22+, Java 21, Maven 3.9+, MySQL Server 8.0 (the local setup script accepts a custom binary directory).

From `backend`:

```powershell
./setup-local-mysql.ps1
mvn package
./start-local.ps1
```

If this machine blocks local scripts, invoke the corresponding script using `powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./start-local.ps1` (or `./setup-local-mysql.ps1`). This only affects that PowerShell process. Set `JAVA_HOME` to Java 21 first.

From another terminal in `frontend`:

```powershell
npm install
npm run dev -- --host 127.0.0.1 --port 5174
```

- Frontend: http://127.0.0.1:5174
- Backend: http://127.0.0.1:8080/api/v1
- Project MySQL: 127.0.0.1:3307, database `boardinghub`
- Vite proxies `/api` to the backend. Keep `VITE_API_URL=/api/v1`.

The MySQL setup uses its own data directory under `backend/.local/mysql` and credentials in ignored local files. It does not alter MySQL on port 3306 or PostgreSQL on port 5432. Do not remove the data directory to restart the project; rerun the setup script.

## Accounts

- `/register`, `/login`: USER accounts.
- `/register?role=owner`, `/login?role=owner`: OWNER accounts, opening `/dashboard` after login.
- `/login?role=admin`, `/admin`: ADMIN sign-in and account administration.
- `/nguoi-thue/ho-so-thue`: real tenant contracts and issued invoices. Owners explicitly link an existing USER account while creating a person; the relation is stored by account id.

The local launcher creates an administrator only when no local configuration exists. The email is `admin@boardinghub.local`; the generated password is in `backend/.env`. Bootstrap never promotes an existing USER or resets an existing account's password.

Authentication uses BCrypt hashes, an HttpOnly/SameSite=Lax session cookie and CSRF protection. Sessions expire after eight hours of inactivity or a backend restart. Use HTTPS with `SESSION_COOKIE_SECURE=true` for HTTPS environments. Owner data is scoped on the server, including all financial mutations.

## Rental workflows

1. `/tenants`: create a room and person, draft the contract and prices, receive the deposit, record CHECK_IN handover and meter baselines, then activate once.
2. `/invoices`: open a billing period, confirm meters, create a draft invoice, issue it, receive partial/full payments and lock the period.
3. `/checkout`: close meters and handover, approve deductions, issue the final invoice, collect any debt above the deposit, then apply deposit and acknowledge the refund to vacate the room.

Each workflow has an explicit **Dữ liệu thật / Dùng thử riêng** selector. Real mode uses MySQL via the HTTP adapter. Demo mode uses account-specific localStorage and never falls back from failed HTTP requests. The React pages use TanStack Query against the shared BoardingHubApi interface. Auth and UI selection stay in React state.

See [API and financial rules](docs/API.md) for endpoints, transitions and settlement policies. Monthly rent is charged as a full month; final rent/service are entered after reconciliation. The application records payments and refunds but does not initiate bank transfers. Financial reversals, cancellation/reopening, variable occupancy, person-day allocation, OCR/PDF and backups are not implemented. Other sidebar screens remain explicitly labeled demonstrations.

## Databases and migration

MySQL Flyway scripts live under `backend/src/main/resources/db/mysql`. The normalized `rental_*` tables are separate from earlier CRUD tables. The old PostgreSQL scripts remain under `db/migration`, selectable using the `postgres` Spring profile for legacy data access only. The new rental workflows require MySQL. PostgreSQL data is not modified by the MySQL setup.

MySQL starts as a separate application database. Existing PostgreSQL records and accounts have not been imported; the PostgreSQL source was offline during this change. Register an OWNER account in MySQL to start using the new workflows. Existing administrator credentials in the ignored local configuration remain usable through bootstrap. PostgreSQL data was not deleted or modified.

## Checks

```powershell
# frontend
npm run build
npm run test:workflows
# backend
mvn test
./test-mysql.ps1
```

The default backend tests use isolated H2 databases. `test-mysql.ps1` uses only the dedicated `boardinghub_test` database on the project MySQL instance and runs the same lifecycle, ownership and concurrent-payment tests there. It does not test against the application database. MySQL testing is skipped in ordinary `mvn test` unless its dedicated environment variables are supplied.

`backend/tools/smoke-rental.ps1` exercises all workflow HTTP endpoints using real browser-form JSON, against a temporary backend on port 18080 connected to `boardinghub_test`. It checks partial payment, exact deposit/refund amounts and repeated-finalization safety without writing to the application database.
