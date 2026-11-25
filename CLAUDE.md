# CLAUDE.md — jthorvaldur.github.io

**Runtime:** Static HTML (GitHub Pages — PUBLIC repo)
**Status:** active

## CRITICAL: This repo is PUBLIC

Everything committed here is accessible on the internet. HTML with private
case data, PII (SSNs, account numbers, private addresses), financial records or
private communications must be encrypted with AES-256-GCM before committing.

Some pages under `r/` are **public by Joel's choice** (essays, frameworks, the
public legal-bedrock and commandments reports, food-trust overviews). They are listed in
**`PUBLIC_PAGES.txt`**, the single list the audit reads. Encrypted pages stay
encrypted; their passwords were shared deliberately with the people who need them.

**Before committing HTML under `r/`**, run:
```bash
cd ~/GitHub/policy-orchestrator && devctl audit-pages
```
The audit must be clean before you push. If it flags an unencrypted page:
- If the page holds private data, encrypt it.
- If Joel has decided it is public, add its path to `PUBLIC_PAGES.txt` (only with Joel's OK) and re-run.

The PII and name checks (R1) still apply to pages in `PUBLIC_PAGES.txt`.

## Encryption rules

1. **Never commit plaintext private HTML**: encrypt first
2. **Never write password values in any tracked file**: docs, scripts or commit messages. Use the env var name (`$CONTACTS_PAGE_PASSWORD`, etc.); values live in `~/.oh-my-zsh/custom/keys.zsh` and the gitignored `.passwords`
3. **Never use localStorage**: only sessionStorage (clears on tab close)
4. **Never put passwords in URL hashes**: they leak to browser history
5. **Never commit _originals/ files**: they're gitignored for a reason
6. **Always verify after encrypting**: `devctl deploy-pages --verify`
7. **Unlisted sections stay unlisted**: don't link them from `index.html`, `r/index.html` or the sitemap, and don't name their paths in tracked docs

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
| `ANCIENT_INTEL_PAGE_PASSWORD` | `aif_key` | Ancient Intelligence fund pages (unlisted; published by `ancient_intelligence/scripts/publish_questions_page.py`) |
| `KX_SHARE_PAGE_PASSWORD` | `kx_key` | Shared research notes (unlisted; published by the owning project's `krt/share.py`) |

Each zone has its own password, so sharing one zone never opens another.

## Structure

Sections can mix encrypted and public pages. `PUBLIC_PAGES.txt` says which pages are public.


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
2. **Know the search scopes.** `devctl search` defaults to ingested docs, court files, facts, and algorithms — AI-assistant chats are excluded (they carry questions and assertions, not ground truth). Use `--claude` for AI chat history (Claude Code, Claude.ai, ChatGPT), `--facts` for the fact registry / case facts, `--algos` for algorithms, `--all` to include everything.
3. **Cite the source.** Include collection name, confidence level, and date when referencing DB results.
4. **Distinguish confidence levels.** A bank statement (verified) is not the same as an email claim (asserted). Never present asserted facts as verified.
5. **Log new facts.** When you discover or confirm a fact during work, log it: `devctl log-fact --fact "..." --source-type X --confidence Y --domain Z`
