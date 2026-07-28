# invox

Personal invoice generator. React + TypeScript frontend, Hono + SQLite API, PDF export that reproduces the original reportlab invoice layout via pdf-lib.

## Development

```sh
pnpm install
pnpm dev        # vite on :5173, api on :3001
```

Data lands in `./data/invox.db` (`INVOX_DATA_DIR` overrides).

## Deployment

CI builds and pushes `ghcr.io/chriscorbell/invox:latest` (plus a `sha-*` tag) on every green push to main. The `core` server runs the image via Docker Compose; Watchtower picks up new images automatically within a minute.

Rollback: pin the compose file to a previous `sha-*` tag, or re-run the publish job from an older commit.

Business details (FROM lines, ACH payment info, footer) are stored in the runtime database and edited on the Settings page. They are intentionally not part of this repo.
