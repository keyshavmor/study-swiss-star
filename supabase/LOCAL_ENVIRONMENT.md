# Isolated local Supabase environment

This layer is separate from the frontend Node installation, the backend Python
virtual environment, model runtimes, and documentation tooling. It consists of
the repository-pinned Supabase CLI (`CLI_VERSION`) and the Docker services that
the CLI owns. Do not install Supabase packages into the Python virtual
environment or expose service-role keys through frontend `VITE_*` variables.

## Supported hosts

- Ubuntu x86_64: Docker Engine/Desktop and the pinned Supabase CLI.
- Apple-silicon macOS, including MacBook M4: Docker Desktop/OrbStack-compatible
  Docker API and the ARM64 CLI build. A physical M4 smoke test is still required
  before calling that path release-verified.

The repository does not install Docker or the CLI globally. Install the exact
CLI version from the official Supabase CLI release instructions, then confirm
`supabase --help`, `supabase --version`, and `docker info`. The wrapper rejects
version drift unless a compatibility test explicitly sets
`ALIM_ALLOW_SUPABASE_CLI_VERSION_MISMATCH=1`.

## Commands

From any directory:

```bash
/absolute/path/to/repository/supabase/scripts/local.sh start
/absolute/path/to/repository/supabase/scripts/local.sh status
/absolute/path/to/repository/supabase/scripts/local.sh health
/absolute/path/to/repository/supabase/scripts/local.sh test
/absolute/path/to/repository/supabase/scripts/local.sh stop
```

`reset` is destructive only to the CLI-owned local database and additionally
requires `ALIM_ALLOW_LOCAL_DB_RESET=yes`. Never run `db reset --linked`.
Prompt 08 owns the cross-layer bootstrap and central launcher; it should call
this wrapper instead of duplicating Supabase lifecycle logic.

After `start`, record exact container images/digests for a supported-host smoke
receipt with:

```bash
docker ps --filter label=com.supabase.cli.project --format '{{.Image}} {{.ID}}'
```

Supabase's API/Studio URLs are service endpoints, not the app launch URL. The
user-facing app must be opened at the loopback frontend URL reported by the
frontend launcher, never at a Lovable URL or Supabase Studio URL.

## Hosted versus local

`project_id` in `config.toml` identifies the hosted project for explicitly
authorized linked operations. Local commands run CLI-owned containers and
volumes. Any production migration, Edge Function deployment, Auth dashboard
change, or advisor remediation requires a separate reviewed authorization.

The checked-in migration bodies do not yet reproduce 23 historical migrations
whose original SQL was never committed. Therefore a clean local reset is a
diagnostic and is expected to remain blocked until a reviewed baseline is
captured; the new forward hardening migration is intended to safely advance a
database that already has the 32-entry live baseline.
