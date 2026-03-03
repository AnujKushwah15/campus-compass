# DECISIONS.md

> Record of architectural and technical decisions.

## Format
- **Date:** YYYY-MM-DD
- **Context:** Brief description of the issue.
- **Decision:** What was decided.
- **Consequences:** Implications of the decision.

---

## Initial Decisions
- **Date:** 2026-03-03
- **Context:** Establishing the Campus Compass transport infrastructure.
- **Decision:** Use a split architecture: Edge devices push data (video and telemetry) to a centralized VPS rather than exposing on-bus devices to the internet.
- **Consequences:** Simplifies edge network configuration (no port forwarding), enhances security, but requires the VPS to handle all streaming bandwidth.
