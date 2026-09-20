# Backend archive manifest — 2026-09-20

Archived files are non-executable reference material. Nothing was deleted.

| Former path | Reason and evidence | Active replacement |
|---|---|---|
| `backend/scripts/start_app.py` | No runtime code imported it. Two legacy unit tests exercised its now-forbidden automatic-download branch; those tests were retired when that contract was replaced. Its model-before-backend two-process behavior was superseded by the ownership-token, explicit-download, readiness and rollback launchers introduced by Prompt 08. Current references were repaired and Git history was checked through `48ec874`. | `scripts/dev/start_all.sh`, per-layer scripts in `scripts/dev/`, and operations lifecycle tests. |
| `environment.yml` | The setup script and current environment guide use `backend/environment.yml` plus the platform-specific model manifests. No active script consumed the root file. Git history was checked through `0f2f5ef`. | `backend/environment.yml`, `backend/environment.model-linux-{cpu,cuda}.yml`, and `backend/environment.model-macos-metal.yml`. |

To restore, first document the missing capability, move the file to its former
path with an ordinary Git move, update active navigation, and run the complete
Prompt 08 validation set. Never run the archived launcher in place: its relative
repository calculation is intentionally invalid from the archive tree.
