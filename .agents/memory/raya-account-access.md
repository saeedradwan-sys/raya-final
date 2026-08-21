---
name: RAYA account access
description: Durable security rules for staff and client credential provisioning
---

Treat staff activation codes and client access codes as case-sensitive credentials. Trim surrounding whitespace only; never uppercase or lowercase them before hashing, sending, or verification.

**Why:** The portal previously uppercased client codes before sending them, which made mixed-case database credentials fail even though direct API authentication worked.

**How to apply:** Preserve exact code casing in every UI/API boundary. Legacy demo credentials may normalize case only inside their isolated development fallback.

Configured owner and client records are ensured idempotently from environment-backed identity values and secrets when the RAYA API starts.

**Why:** Development and production databases are isolated, and publishing schema does not copy newly seeded account rows into an already-deployed production database.

**How to apply:** Keep bootstrap validation fail-closed, avoid logging identifiers or secrets, and verify an existing matching hash before generating a replacement.