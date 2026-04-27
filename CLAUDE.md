# CLAUDE.md — jthorvaldur.github.io

**Runtime:** Static HTML (GitHub Pages)
**Status:** active

## What this is
Personal portfolio, research hub, and deployment target for all project outputs. All private sections use AES-256-GCM client-side encryption with shared password.

## How to deploy
```bash
# From any project repo with encrypt_page.py:
python3 tools/encrypt_page.py source.html r/section/page.html --password $CONTACTS_PAGE_PASSWORD

# Sync all:
./scripts/sync_all.sh
```

## Key files
- `scripts/sync_all.sh` — syncs contacts + d72 pages, commits, pushes
- `r/contacts/` — 9 pages (browser, dashboard, coherence, signal, behavioral, calendar, radial, vdb)
- `r/d72/` — 11 pages (coherence framework, dimensional analysis, frequencies)
- `r/concepts/` — concept browser, network graph, repo coherence, system overview
- `r/food-trust/` — 5 pages (trusts, commodity, exchange, governance stack)
- `r/qwl/` — 16 pages (quantum word logic tools)
- `.passwords` — git-ignored, all section passwords

## How it connects
- Receives encrypted output from: contacts, div_legal, d72
- All commits use `git -c commit.gpgsign=false` (1Password workaround)
- Password: stored in CONTACTS_PAGE_PASSWORD env var

