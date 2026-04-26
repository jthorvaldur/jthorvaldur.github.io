# Encryption Process for Protected Pages

This documents how to build, encrypt, and deploy password-protected pages on jthorvaldur.github.io.

## The Rule

**Never commit plaintext HTML for private content.** Build the page as a source file (prefixed with `_`), encrypt it, deploy the encrypted version, and keep the source gitignored.

## Passwords

Two passwords cover the entire site:

| Password | Sections |
|---|---|
| `8bCcTDP9CoNKXeoAb3bU` | contacts, d72, food-trust, qwl |
| `Th0r-Filing-2024!` | cook6724-QgixOl/filing |

The full map is in `.passwords` (gitignored, never committed).

## Step-by-step: Adding a new encrypted page

### 1. Build the source HTML

Write the page as normal HTML. Save it with a `_` prefix or in an `_originals/` directory so it's gitignored:

```
r/d72/_originals/my-new-page.html    # source (gitignored)
r/d72/my-new-page.html               # encrypted (committed)
```

### 2. Encrypt it

Use Node.js with the site's encryption pattern. Two methods depending on the section:

**For d72, contacts, food-trust pages** (SALT/IV/CT pattern):

```bash
node -e "
const crypto = require('crypto');
const fs = require('fs');

const pw = '8bCcTDP9CoNKXeoAb3bU';
const content = fs.readFileSync('r/d72/_originals/my-new-page.html', 'utf8');

const salt = crypto.randomBytes(16);
const iv = crypto.randomBytes(12);
const key = crypto.pbkdf2Sync(pw, salt, 100000, 32, 'sha256');
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const encrypted = Buffer.concat([cipher.update(content, 'utf8'), cipher.final()]);
const tag = cipher.getAuthTag();
const combined = Buffer.concat([encrypted, tag]);

// Copy gate template from existing page, swap in new blob
const template = fs.readFileSync('r/d72/index.html', 'utf8');
const gateHtml = template
  .replace(/const SALT = \"[^\"]+\"/, 'const SALT = \"' + salt.toString('base64') + '\"')
  .replace(/const IV = \"[^\"]+\"/, 'const IV = \"' + iv.toString('base64') + '\"')
  .replace(/const CT = \"[^\"]+\"/, 'const CT = \"' + combined.toString('base64') + '\"')
  .replace(/<title>[^<]+<\/title>/, '<title>My New Page — Protected</title>')
  .replace(/<h1>[^<]+<\/h1>/, '<h1>My New Page</h1>');

fs.writeFileSync('r/d72/my-new-page.html', gateHtml);
"
```

**For QWL pages** (uses the encrypt_pages.mjs tool):

```bash
cd ~/GitHub/words_quantum_legal
node tools/encrypt_pages.mjs '8bCcTDP9CoNKXeoAb3bU' viz ~/GitHub/jthorvaldur.github.io/r/qwl/
```

**For filing pages** (uses the _encrypt.js tool):

```bash
cd ~/GitHub/jthorvaldur.github.io/r/cook6724-QgixOl/filing
node _encrypt.js 'Th0r-Filing-2024!' new-page.html
```

### 3. Fix the 1Password form

After encryption, the password input needs proper form wrapping for Safari/1Password autofill. Check that the gate HTML contains:

```html
<form id="gate-form" onsubmit="event.preventDefault();decrypt();" autocomplete="on">
  <input type="hidden" name="username" autocomplete="username" value="thorarinson-SECTION">
  <input type="password" id="pw" name="password" placeholder="Access key" autofocus
         autocomplete="current-password">
  <button type="submit">Unlock</button>
</form>
```

Where `SECTION` is one of: `contacts`, `d72`, `private`, `qwl`, `filing`.

If using the template-copy method above, this is already in place. If using encrypt_pages.mjs, apply the fix manually or run the bulk fixer.

### 4. Verify

```bash
node -e "
const crypto = require('crypto');
const fs = require('fs');
const html = fs.readFileSync('r/d72/my-new-page.html', 'utf8');
const s = html.match(/const SALT = \"([^\"]+)\"/)[1];
const i = html.match(/const IV = \"([^\"]+)\"/)[1];
const c = html.match(/const CT = \"([^\"]+)\"/)[1];
const salt = Buffer.from(s, 'base64');
const iv = Buffer.from(i, 'base64');
const combined = Buffer.from(c, 'base64');
const tag = combined.slice(combined.length - 16);
const encrypted = combined.slice(0, combined.length - 16);
const key = crypto.pbkdf2Sync('8bCcTDP9CoNKXeoAb3bU', salt, 100000, 32, 'sha256');
const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
decipher.setAuthTag(tag);
const dec = Buffer.concat([decipher.update(encrypted), decipher.final()]);
console.log(dec.toString('utf8').includes('<!DOCTYPE') ? 'PASS' : 'FAIL');
"
```

### 5. Commit

Only commit the encrypted file. The source stays local.

## .gitignore entries

```
_originals/
_encrypt.js
_*.html
.passwords
```

## Session behavior

All sections use `sessionStorage` so the password only needs to be entered once per browser tab. Navigating between pages in the same section auto-decrypts.

| Section | Session key |
|---|---|
| contacts, d72, food-trust | `_cp` |
| qwl | `qwl_key` |
| filing | `filing_key` |

## Encryption details

- Algorithm: AES-256-GCM
- Key derivation: PBKDF2, 100,000 iterations, SHA-256
- Salt: 16 random bytes per file
- IV: 12 random bytes per file
- Auth tag: 16 bytes (appended to ciphertext)
- All base64 encoded in the HTML
