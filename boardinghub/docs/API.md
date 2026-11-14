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

**Warning:** This is a development scaffold, not a production-secure API. Authentication, scoped authorization, DTO validation, audit trail, immutable financial documents, and domain-specific transitions are not implemented.
