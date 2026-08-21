---
name: RAYA GitHub mirroring
description: How this workspace safely mirrors its Git history to GitHub
---

When GitHub OAuth is connected in Replit but shell `git push` still rejects authentication, use the connector's authenticated Octokit client and Git Data APIs rather than requesting a token.

**Why:** The workspace connector authorizes REST API calls without exposing credentials, while it does not automatically configure Git CLI credential transport.

**How to apply:** Verify the remote is empty or its tree matches before writing. For a full mirror, recreate commits in parent order, then verify that the remote branch head and tree match local Git before setting the tracking branch.