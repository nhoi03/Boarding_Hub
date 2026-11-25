# API v1

All endpoints are under `/api/v1`.

- `tenants`: GET collection, GET /{id}, POST, PUT /{id}, DELETE /{id}
- `contracts`: GET collection, GET /{id}, POST, PUT /{id}, DELETE /{id}
- `assets`: GET collection, GET /{id}, POST, PUT /{id}, DELETE /{id}
- `meter-readings`: GET collection, GET /{id}, POST, PUT /{id}, DELETE /{id}
- `invoices`: GET collection, GET /{id}, POST, PUT /{id}, DELETE /{id}
- `payments`: GET collection, GET /{id}, POST, PUT /{id}, DELETE /{id}
- `maintenance-requests`: GET collection, GET /{id}, POST, PUT /{id}, DELETE /{id}
- `residence-records`: GET collection, GET /{id}, POST, PUT /{id}, DELETE /{id}
- `room-listings`: GET collection, GET /{id}, POST, PUT /{id}, DELETE /{id}
- `operation-tasks`: GET collection, GET /{id}, POST, PUT /{id}, DELETE /{id}
- `operating-expenses`: GET collection, GET /{id}, POST, PUT /{id}, DELETE /{id}
- `fund-entries`: GET collection, GET /{id}, POST, PUT /{id}, DELETE /{id}
- `absences`: GET collection, GET /{id}, POST, PUT /{id}, DELETE /{id}
- `properties`: GET, POST
- `rooms`: GET, POST, PUT, DELETE

The resources above are legacy ADMIN-only CRUD endpoints. They are separate from the transactional rental workflows below and cannot alter rental workflow records.

## Rental workflows

All paths below are relative to `/api/v1/rental`. Except `/my`, these endpoints require OWNER or ADMIN and always scope records to the authenticated account id. The client cannot supply an owner id. Mutations require a session and a CSRF token obtained from `GET /api/v1/auth/csrf`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/state` | Owner-scoped rooms, persons, contracts, periods, invoice snapshots and ledgers |
| GET | `/my` | Read-only contracts and issued invoices linked to the logged-in tenant account |
| POST | `/rooms` | Create a room: propertyName, roomNumber, capacity |
| POST | `/persons` | Create a tenant: fullName, phone, optional accountEmail of an existing USER account |
| POST | `/contracts` | Draft contract, rent rate, service prices and PLANNED occupancy |
| POST | `/contracts/{id}/deposit` | Receive deposit: amount, unique reference, date |
| POST | `/contracts/{id}/check-in` | CHECK_IN handover and electricity/water baseline: electricity, water, notes |
| POST | `/contracts/{id}/activate` | Atomically activate contract/occupancy and occupy room |
| POST | `/contracts/{id}/periods` | Open period: period (`YYYY-MM`), dueDate |
| POST | `/periods/{id}/readings` | Confirm electricity/water from last baseline |
| POST | `/periods/{id}/draft-invoice` | Create one draft invoice and immutable line snapshots |
| POST | `/invoices/{id}/issue` | Issue the invoice; amounts can no longer change |
| POST | `/payments` | Receive and allocate payment: invoiceId, amount, reference, date |
| POST | `/periods/{id}/lock` | Lock issued billing period; outstanding debt may still be collected |
| POST | `/contracts/{id}/checkout` | Checkout date, final meters, finalRent, finalService and handover notes |
| POST | `/checkouts/{id}/deductions` | Request deduction: description, amount |
| POST | `/deductions/{id}/approve` | Approve deduction and add it once to the draft checkout invoice |
| POST | `/checkouts/{id}/finalize` | Apply deposit to debt, record refund, terminate contract/occupancy and vacate room |

Contract creation fields: `roomId`, `personId`, `startDate`, optional `endDate`, `rent`, `deposit`, `electricityPrice`, `waterPrice`, `servicePrice`. Monetary fields use decimal amounts (at most 12 integer digits and 2 fractional digits); meters support 3 fractional digits.

State rows use snake_case database field names. Invoice rows include derived `balance`; contract rows include derived `deposit_balance`. Mutations that create a main record return `{ "id": ... }`. Errors return `{ "message": "..." }`, with 400 for invalid inputs, 401 for no session, 403 for wrong role, 404 for records outside the account, and 409 for conflicting transitions or duplicate references.

Financial rules:

- Money uses BigDecimal, rounded HALF_UP per line to two decimal places. Monthly rent is a full monthly charge from the applicable rent rate. Service prices and readings are captured in invoice line snapshots.
- A payment cannot exceed the remaining debt. Unique references reject duplicate financial commands without partially inserting a payment or allocation.
- Activation requires enough received deposit and a CHECK_IN handover/readings. A locked room prevents two concurrent activations from occupying it.
- Periods advance chronologically. A period must be issued and locked before another opens or checkout begins. Payments remain possible after a period is locked.
- Checkout final rent/service are explicitly entered after reconciliation. They must be zero if that month already has a regular bill. Meter consumption starts from the last confirmed reading.
- Approved deductions are included in the checkout invoice once, so settlement does not add them a second time. All deductions must be approved before issuing that invoice.
- Finalization requires all invoices issued and enough deposit to cover their remaining debt. Collect any shortfall first. It allocates deposit to invoices and records the remainder as REFUND in one transaction. Repeating finalization cannot record another refund.
- Refund records acknowledge a cash/bank transfer the operator has performed; no bank transfer is initiated by the application.
- Financial commands lock the parent contract using READ_COMMITTED transactions. Issued snapshots and finalized records have no generic edit/delete endpoint.

The normalized `rental_*` tables are intentionally separate from legacy CRUD tables. PostgreSQL migrations are retained under the `postgres` profile; MySQL migrations are the default. Legacy rows are not silently treated as valid rental workflow states.
