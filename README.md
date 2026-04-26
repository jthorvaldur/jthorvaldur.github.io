# jthorvaldur.github.io

Personal portfolio and research site for **Joel L.M. Thorarinson, Ph.D.** -- portfolio manager, quantitative researcher, and nonlinear systems physicist. 8 peer-reviewed publications, 15+ years in systematic futures.

**Live at:** [https://jthorvaldur.github.io](https://jthorvaldur.github.io)


## Site overview

The homepage opens with an interactive Three.js Hopf fibration visualization (golden-angle fiber distribution, 240 fibers, 2000-particle Yang-Mills gauge field analogue) and leads into a card-based project gallery covering quantitative research, physics, applied systems, and legal analysis.

### Sections

- **Hero** -- Hopf fibration Three.js canvas
- **Project cards** -- each labeled with an epistemic proof-layer tag
- **Coherence Ecosystem** -- joint projects
- **Law and Justice Research**
- **Research and Profile links** -- CV, arXiv, Google Scholar, ORCID, GitHub, YouTube
- **Full CV page** -- publications, operating thesis, research arc


## Epistemic labeling

Every project card carries a proof-layer label so readers can immediately distinguish:

- Evidence-Checked Tool
- Built System
- Research Prototype
- Exploratory Framework
- Speculative Manuscript
- Private Architecture


## Featured projects

BulldogDerm, Morpheme Page, Quantum Grammar, Conformal Maps, Contact Manager, D.72 Coherence, Legal Case, QWL Analysis, Food Value Trust, Coherence Engine, RootWell and Star, Millennium Math, Recover Margins, Agent Simulator, Food Coherence.


## Technology

Pure HTML/CSS/JS -- no frameworks, no build step.

- **Three.js r128** for the Hopf fibration visualization
- **Google Fonts** -- Outfit, JetBrains Mono
- **Color palette** -- Tokyo Night
- **Encryption** -- AES-256-GCM with PBKDF2 key derivation (100K iterations) for private sections


## Repository structure

```
index.html            Homepage with Hopf fibration
cv/index.html         Full CV
r/                    Private/protected content sections
  contacts/           Contact analytics (encrypted)
  d72/                Coherence framework (encrypted)
  food-trust/         Food Value Trust (encrypted)
  qwl/                QWL analysis (encrypted)
  cook6724-*/filing/  Legal filing (encrypted)
pdf/                  Documents
scripts/              Build and utility scripts
```


## Encryption

Private sections use AES-256-GCM with PBKDF2 key derivation (100,000 iterations) for client-side decryption. See `ENCRYPTION_PROCESS.md` for implementation details.
