# Devpost submission text

Status: paste-ready description of current implementation. Update the explicit live-inference limitation after a verified run; do not submit until the mandatory Nebius requirement is met.

## Project name
DataRescue

## Elevator pitch
Turn messy inventory CSVs into reviewed, usable data—with evidence-backed repair proposals, human approval, undo, and an audit of every change.

## Track
Best Apps and Agents

## Inspiration
An inventory spreadsheet can look ordinary while hiding errors that affect purchasing, stock counts, and reporting. A misspelled unit is usually easy to fix; a missing price or negative quantity needs a reliable source. We wanted a tool that makes this distinction visible and helps people clean data without silently inventing answers.

## What it does
DataRescue imports an inventory CSV, identifies its columns, and builds a repair queue. Users can approve deterministic formatting fixes in bulk, inspect ambiguous findings individually, enter verified corrections, and compare the repaired data with the original. Every applied change has a reason and can be undone. Exports include a reviewed CSV and a separate JSON audit with original values, decisions, and unresolved findings.

The implemented NVIDIA Nemotron integration is designed to review ambiguous headers and vocabulary inconsistencies through Nebius Token Factory. Suggestions must cite a matching value from another sampled row and pass validation before being shown for approval. The model cannot invent prices, quantities, identifiers, or missing values.

The handoff gate previews safe repairs before approval, holds every member of unresolved duplicate groups, and splits current data into passing-checks and on-hold CSVs. A JSON report accounts for every source row and records an original-data fingerprint. Passing checks does not certify factual correctness.

## How we built it
We built a dependency-free browser application using HTML, CSS, JavaScript, and a shared TypeScript data engine. A Fetch API backend calls Nebius Token Factory while keeping the API key on the server. Node.js 24 provides the local server and build tools, and the deployable application is a self-contained Worker.

The workflow separates deterministic checks, AI proposals, human decisions, and export. Original rows remain immutable. Row IDs and an append-only session history make each repair traceable. The optional AI request includes headers and up to 60 original rows, with explicit user consent.

## Challenges we ran into
CSV files need careful handling of quoted delimiters, embedded newlines, Unicode, and identifiers with leading zeros. We also needed to prevent plausible-looking model output from becoming an unverified data change. Our validator restricts AI edits to supported fields and checks source evidence; uncertainty remains visible to the user.

Live Nebius access is pending. We have implemented and tested the integration using a mocked provider response, but we are not claiming a successful live Nebius call yet.

## Accomplishments
The local cleanup workflow is functional, including approvals, manual repairs, duplicate review, undo, before/after inspection, and exports. Eighteen automated tests pass, and desktop/mobile browser workflows have been exercised. The sample dataset has eight deterministic formatting repairs, with missing-value and duplicate decisions kept separate.

On 8 additional developer-authored datasets (28 rows), all 5 safe proposals matched golden labels and the expected held-row sets matched. Another 100 generated variations passed preservation checks. One deliberately included category typo remains undetected by rules; live Nemotron evaluation is still pending. These are small synthetic tests, not independent accuracy validation.

## What we learned
Useful cleanup is not the same as aggressive correction. A system should preserve identifiers, avoid guessing business facts, explain proposed changes, and make mistakes reversible. Supporting evidence helps a reviewer, but does not remove the need for judgment.

## What's next
Verify live Nemotron inference after Nebius activation; evaluate correct and incorrect suggestions on labeled datasets; provide judge-accessible deployment; then add persistent projects, larger-file processing, and reusable inventory schemas.

## Built with
JavaScript, TypeScript, HTML, CSS, Node.js, Fetch API, NVIDIA Nemotron integration, Nebius Token Factory integration.

## Links to fill after publication
- Public repository: https://github.com/Sksoham/datarescue
- Working demo/test build: repository setup instructions; hosted preview currently owner-private.
- Public YouTube video: pending recording and upload after live inference is verified.

## Existing-project declaration
This project was started from scratch in October 2026 for this hackathon. No pre-hackathon DataRescue application was carried forward. Confirm this statement against the team's actual history before submitting.

