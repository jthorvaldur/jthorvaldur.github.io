# CLAUDE.md — jthorvaldur.github.io

**Runtime:** Static HTML (GitHub Pages — PUBLIC repo)
**Status:** active

## CRITICAL: This repo is PUBLIC

Everything committed here is accessible on the internet. All HTML containing
case data, personal names, financial info, legal analysis, or private
communications **MUST** be encrypted with AES-256-GCM before committing.

**Before committing ANY HTML to r/**, run:**
```bash
cd ~/GitHub/policy-orchestrator && devctl audit-pages
```
If it reports errors, DO NOT commit until fixed.

## Encryption rules

1. **Never commit plaintext sensitive HTML** — encrypt first
2. **Never use localStorage** — only sessionStorage (clears on tab close)
3. **Never put passwords in URL hashes** — leaks to browser history
4. **Never commit _originals/ files** — they're gitignored for a reason
5. **Always verify after encrypting** — `devctl deploy-pages --verify`

## How to deploy pages

```bash
# Preferred: central deploy from policy-orchestrator (reads pages.yaml)
devctl deploy-pages --section=SECTION_NAME --verify --push

# Manual single file (from any repo with the encrypt tool):
cd ~/GitHub/policy-orchestrator
.venv/bin/python ~/GitHub/contacts/tools/encrypt_page.py \
    SOURCE.html r/SECTION/TARGET.html "$PASSWORD"
```

## Password zones

| Env var | Session key | Sections |
|---------|------------|----------|
| `CONTACTS_PAGE_PASSWORD` | `_cp` | contacts, concepts, d72, food-trust, dimensions |
| `CONTACTS_PAGE_PASSWORD` | `qwl_key` | qwl |
| `JTHORVALDUR_LEGAL_PAGE_PASSWORD` | `filing_key` | filing, reports, case, thor2026 |
| `ENERGY_TEXAS_PAGE_PASSWORD` | `energy_key` | energy |

## Structure

- `index.html` — homepage (public, Hopf fibration + project cards)
- `cv/` — curriculum vitae (public)
- `r/` — private sections (encrypted) + portal gate
- `r/contacts/` — contact analytics (9 pages)
- `r/concepts/` — concept maps (8 pages)
- `r/d72/` — coherence framework (11 pages)
- `r/food-trust/` — food value trust (6 pages)
- `r/qwl/` — quantum word logic (15 pages)
- `r/cook6724-QgixOl/filing/` — legal filing portal (10+ pages)
- `r/energy/` — energy texas research (11 pages)
- `r/reports/` — div_legal analysis reports (40 pages)
- `r/case/` — caseledger exhibits (6 pages)
- `r/dimensions/` — dimensional analysis (9 pages)
- `r/thor2026/` — case review portal (2 pages)
- `scripts/sync_all.sh` — legacy sync (use devctl deploy-pages instead)
- `.passwords` — gitignored, password mappings for sync_all.sh

## How it connects

- Receives encrypted output from: contacts, div_legal, caseledger, energy_texas, words_quantum_legal, legal-tax-ops
- Policy: `policy-orchestrator/policies/hard/pages-encryption.yaml`
- Registry: `policy-orchestrator/registries/pages.yaml`
- Audit: `devctl audit-pages`

## Data-First Protocol
When answering questions about data, facts, documents, conversations, or history:
1. **Query the vector DB first.** Use `devctl search "query"` or direct Qdrant search before answering from memory or general knowledge. The DB has 2M+ vectors across legal docs, chats, sessions, and facts.
2. **Cite the source.** Include collection name, confidence level, and date when referencing DB results.
3. **Distinguish confidence levels.** A bank statement (verified) is not the same as an email claim (asserted). Never present asserted facts as verified.
4. **Log new facts.** When you discover or confirm a fact during work, log it: `devctl log-fact --fact "..." --source-type X --confidence Y --domain Z`
