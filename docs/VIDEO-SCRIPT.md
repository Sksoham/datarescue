# Demo video: target 2 minutes 40 seconds

Record real application behavior. Do not display API keys or private account details. Use the final narration only after a successful live Nebius run; otherwise label the recording an incomplete development preview.

| Time | Screen action | Narration |
|---|---|---|
| 0:00–0:20 | Show the sample workspace | “Inventory data arrives with inconsistent units, duplicate records, and missing information. DataRescue helps you repair what is known and keep uncertainty visible.” |
| 0:20–0:40 | Open handoff rehearsal; preview and approve eight safe repairs | “We first confirm what each column means. These eight formatting repairs are deterministic. We normalize unit labels without converting quantities or inventing business values.” |
| 0:40–1:15 | Consent and run actual Nemotron review; show a returned proposal | “For contextual review, the backend sends a bounded sample to NVIDIA Nemotron through Nebius Token Factory. Each proposal must pass validation and refer to a value in another sampled row. The user still decides whether it is correct.” |
| 1:15–1:40 | Review negative quantity and duplicate | “A negative quantity needs a source. For this synthetic example, our stocktake says four, so we enter four ourselves. We only remove a duplicate after checking it is not a separate lot. The missing price stays unresolved.” |
| 1:40–2:05 | Compare originals, undo, open audit | “Every original value is preserved. We can compare before and after, undo a repair, and inspect the reason behind each decision.” |
| 2:05–2:30 | Show handoff split; export report and CSVs | “The handoff gate separates passing records from uncertain ones, holds every member of duplicate groups, and preserves source-row references. We export the split with a traceable report.” |
| 2:30–2:40 | End on workspace and project name | “DataRescue makes inventory cleanup reviewable, reversible, and easier to trust.” |

If inference takes longer than the allotted segment, visibly label any time cut and retain real request/result evidence. Do not replace the live segment with a fabricated response. If the model misses the typo, explain the actual outcome and demonstrate manual review.

Suggested title: DataRescue — Auditable Inventory Cleanup with NVIDIA Nemotron and Nebius

Suggested description, after live verification: “DataRescue combines deterministic CSV checks with NVIDIA Nemotron review through Nebius Token Factory. Users approve changes, preserve originals, and export an audit. Built for the Nebius x NVIDIA Global AI Hackathon, Best Apps and Agents track.” Add the real public repository and accessible demo URLs before publishing.

