#!/usr/bin/env bash
# sync_all.sh — Sync all private pages from source repos to GitHub Pages
#
# Pulls latest encrypted pages from each source project,
# commits, and pushes to GitHub Pages.
#
# Usage:
#   ./scripts/sync_all.sh              # full sync
#   ./scripts/sync_all.sh --dry-run    # show what would happen
#
# Source repos:
#   ~/contacts     → r/contacts/  (contact manager)
#   ~/contacts     → r/d72/       (coherence framework, via WhatsApp export)
#
# Password file: .passwords (git-ignored)

set -euo pipefail
cd "$(dirname "$0")/.."

DRY_RUN=""
for arg in "$@"; do
    case "$arg" in
        --dry-run) DRY_RUN="1" ;;
    esac
done

echo "================================================================"
echo "  GITHUB PAGES SYNC — $(date '+%Y-%m-%d %H:%M')"
echo "================================================================"
echo ""

# Read password
PASSWORD=""
if [[ -f .passwords ]]; then
    PASSWORD=$(grep "^/r/contacts/" .passwords | awk '{print $2}')
fi

if [[ -z "$PASSWORD" ]]; then
    echo "No password found in .passwords"
    read -s -p "Enter encryption password: " PASSWORD
    echo ""
fi

CONTACTS_DIR="$HOME/contacts"
ENCRYPT_TOOL="$CONTACTS_DIR/tools/encrypt_page.py"

# ── Step 1: Contacts pages ────────────────────────────────
echo "[1/3] Syncing Contact Manager pages..."
if [[ -d "$CONTACTS_DIR/out" ]] && [[ -f "$ENCRYPT_TOOL" ]]; then
    DEST="r/contacts"
    for page in contacts_index dashboard contacts_browser birthday_calendar; do
        src="$CONTACTS_DIR/out/${page}.html"
        case "$page" in
            contacts_index) dest="$DEST/index.html" ;;
            contacts_browser) dest="$DEST/browser.html" ;;
            birthday_calendar) dest="$DEST/calendar.html" ;;
            *) dest="$DEST/${page}.html" ;;
        esac
        if [[ -f "$src" ]]; then
            if [[ -z "$DRY_RUN" ]]; then
                cd "$CONTACTS_DIR" && uv run python tools/encrypt_page.py "$src" "$OLDPWD/$dest" "$PASSWORD" 2>&1
                cd "$OLDPWD"
            else
                echo "  Would encrypt: $src -> $dest"
            fi
        fi
    done
    # Radial birthday web
    if [[ -f "$CONTACTS_DIR/out/birthdays.html" ]]; then
        if [[ -z "$DRY_RUN" ]]; then
            cd "$CONTACTS_DIR" && uv run python tools/encrypt_page.py out/birthdays.html "$OLDPWD/$DEST/radial.html" "$PASSWORD" 2>&1
            cd "$OLDPWD"
        else
            echo "  Would encrypt: birthdays.html -> radial.html"
        fi
    fi
    # ICS (not encrypted — just names+dates)
    cp "$CONTACTS_DIR/out/birthdays.ics" "$DEST/birthdays.ics" 2>/dev/null || true
    echo "  Done."
else
    echo "  Skipped (contacts project not found at $CONTACTS_DIR)"
fi
echo ""

# ── Step 2: D.72 Coherence pages ─────────────────────────
echo "[2/3] Checking D.72 Coherence pages..."
if [[ -d "r/d72" ]]; then
    echo "  Pages present ($(ls r/d72/*.html 2>/dev/null | wc -l | tr -d ' ') files)"
else
    echo "  No d72 pages found"
fi
echo ""

# ── Step 3: Commit and push ──────────────────────────────
echo "[3/3] Committing and pushing..."
if [[ -z "$DRY_RUN" ]]; then
    git add -A
    if ! git diff --cached --quiet; then
        git commit -m "Auto-sync: $(date +%Y-%m-%d) — contacts + d72 pages"
        git push
        echo "  Pushed to GitHub Pages."
    else
        echo "  No changes to push."
    fi
else
    echo "  (dry-run: would commit and push)"
fi

echo ""
echo "================================================================"
echo "  Pages live at:"
echo "    https://jthorvaldur.github.io/r/contacts/"
echo "    https://jthorvaldur.github.io/r/d72/"
echo "================================================================"
