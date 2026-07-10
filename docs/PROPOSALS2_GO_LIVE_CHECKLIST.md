# Proposals 2 Go-Live Checklist

## Purpose
Use this checklist to decide when it is safe to switch default proposal creation from legacy proposals to Proposals 2, without risking current production behavior.

## In-Scope Surfaces (Current System Baseline)
- Legacy list/create: `src/pages/Proposals.tsx`
- Legacy editor/save/send: `src/pages/ProposalDetail.tsx`
- Public view + accept flow: `src/pages/PublicProposal.tsx`
- App routing + default paths: `src/App.tsx`
- Accepted proposal -> contract import dependency: `src/lib/contractProposalImport.ts`

---

## Gate A: Isolation and Safety
Owner: Engineering

Pass criteria (all required):
- `A1` Proposals 2 is protected behind a feature flag and can be disabled without deploy.
- `A2` Legacy routes continue to function unchanged (`/proposals`, `/proposals/:id`, `/proposal/:token`).
- `A3` Switching the flag OFF returns all users to legacy proposal creation in under 5 minutes.
- `A4` Proposals 2 writes are isolated from legacy rendering logic (no regressions on existing proposal records).

Fail if any pass criterion is not met.

Evidence required:
- Feature flag screenshot/config export.
- Staging recording of ON/OFF behavior.
- Smoke test output for legacy routes after enabling Proposals 2.

---

## Gate B: Functional Parity
Owner: Product + QA

Pass criteria (all required):
- `B1` Draft -> Save -> Send works in Proposals 2 for required fields and service lines.
- `B2` Public proposal link renders successfully and acceptance updates status to `accepted`.
- `B3` Existing send flow and email delivery still work for legacy proposals.
- `B4` Accepted proposals from Proposals 2 import into contracts with correct pricing/terms.
- `B5` No blocking UX defects in Details, Services, Conditions, Preview, Send.

Fail thresholds:
- Any blocking bug in create/edit/send/accept/import paths.
- Any mismatch in accepted totals or payment terms during contract import.

Evidence required:
- Test matrix with pass/fail for each path.
- 10+ end-to-end run logs (mix of legacy + Proposals 2).
- At least 3 acceptance-to-contract-import validation cases.

---

## Gate C: Data Integrity and Migration Safety
Owner: Engineering

Pass criteria (all required):
- `C1` Legacy proposals load exactly as before with no forced migration.
- `C2` Proposals 2 schema version is validated before save/render.
- `C3` Upgrade flow preserves original source data until first successful Proposals 2 save.
- `C4` Upgrade failures are recoverable (retry possible, legacy still accessible).

Fail thresholds:
- Any data loss, overwritten legacy content, or unrecoverable upgrade state.

Evidence required:
- Migration test report.
- Before/after snapshots for 5 upgraded proposals.
- Negative test results (invalid schema, partial save, interrupted autosave).

---

## Gate D: PDF and Snapshot Consistency
Owner: Engineering + Product

Pass criteria (all required):
- `D1` Download PDF is available for both internal user and client-facing proposal view.
- `D2` PDF content parity with web view is acceptable (branding, totals, terms, selected services).
- `D3` PDF generation success rate >= 99.0% in pilot window.
- `D4` Cached PDF invalidates on proposal update and regenerates correctly.

Fail thresholds:
- PDF generation success < 99.0%.
- Any incorrect total/terms in generated PDFs.

Evidence required:
- PDF success/failure metric dashboard.
- Side-by-side comparison pack for 10 proposals (web vs pdf).
- Cache invalidation test output.

---

## Gate E: Reliability and Operations
Owner: Engineering + Ops

Pass criteria (all required):
- `E1` Autosave success rate >= 99.5% (5xx/network failures excluded and retried).
- `E2` Send success rate >= 99.5%.
- `E3` Accept success rate >= 99.5%.
- `E4` p95 performance:
  - editor initial load <= 2.5s
  - preview render <= 1.8s
  - public proposal load <= 2.0s
  - pdf generation <= 8.0s
- `E5` Alerting configured for save/send/accept/pdf failure spikes.

Fail thresholds:
- Any core success metric below threshold for 48-hour canary period.
- Missing telemetry for core flows.

Evidence required:
- Monitoring dashboard links.
- Alert policy screenshots.
- 48-hour canary metrics export.

---

## Gate F: Rollout Decision
Owner: Product + Engineering + Ops

Pass criteria:
- Gates A-E are all green.
- Support ticket volume related to proposals is not elevated (>20% above baseline).
- No unresolved Sev-1/Sev-2 proposal issues.

If pass: switch default creation to Proposals 2.
If fail: keep legacy default and execute rollback runbook.

---

## Rollback Runbook (Immediate)
1. Turn Proposals 2 feature flag OFF.
2. Verify legacy create/edit/send on production smoke checklist.
3. Post internal incident note with failure mode and affected flows.
4. Freeze Proposals 2 rollout cohort.
5. Triage logs and create corrective patch plan before retry.

Rollback triggers:
- Spike in proposal send or accept failures.
- Data mismatch incidents (totals/terms/status).
- PDF generation outage impacting client delivery.
- Any Sev-1/Sev-2 issue in proposal core flow.

---

## Required Test Matrix (Minimum)
- Create draft (legacy + Proposals 2)
- Edit services and totals (legacy + Proposals 2)
- Save and reload integrity
- Send proposal email
- Public proposal open via token
- Accept proposal flow
- Accepted proposal import to contract
- Download PDF (internal + public)
- Feature-flag OFF fallback validation

---

## Cutover Timeline
1. **Internal only** (1-2 days): team uses Proposals 2 behind flag.
2. **Canary cohort** (2-5 days): small % of users or selected accounts.
3. **Decision checkpoint**: evaluate Gates A-E and support trend.
4. **Default ON for new proposals**: legacy remains accessible.
5. **Stability window** (2-4 weeks): monitor KPIs and defects.
6. **Legacy sunset decision**: separate go/no-go, never bundled with default switch.

---

## Go/No-Go Meeting Template
- Attendees: Product, Engineering, QA, Ops/Support
- Inputs:
  - Gate A-F status
  - KPI report (48h canary + 7d trend)
  - Open defects by severity
  - Rollback rehearsal confirmation
- Decision:
  - GO: switch default for new proposals
  - NO-GO: remain on legacy default + remediation plan

