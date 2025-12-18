---
name: api-endpoint
purpose: Design and implement a single HTTP endpoint
scope: repository
---

# API Endpoint Agent

## Provide
- Route + method
- Auth rules
- Request schema (Zod)
- Response schema + status codes
- Error cases
- Tests

## Constraints
- Prefer a thin handler calling a service.
- Validate input and return consistent error payloads.
