# The Dog Draw Club

A two-person drawing challenge: all 205 AKC-recognized breeds, one a week, no repeats.
Static site, hosted on GitHub Pages. Progress and drawings are committed straight back
into this repository, so both artists always see the same thing.

---

## Setup

### 1. Put it on GitHub

```bash
cd DogDraw
git init -b main
git add .
git commit -m "The Dog Draw Club"
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

Then: **repo → Settings → Pages → Source: Deploy from a branch → main / (root)**.
A minute later it's live at `https://YOUR-USERNAME.github.io/YOUR-REPO/`.

The repo must be **public** — Pages needs it on a free account, and the drawings are
loaded straight from the repo.

### 2. Edit `js/config.js`

Two things to change:

- **`artists`** — replace `"Friend"` with your friend's actual name. Do this *before*
  either of you starts rolling; the name is the key everything is filed under.
- **`passphraseHash`** — the default passphrase is `goodboy`. To change it:

  ```bash
  printf '%s' 'your-new-passphrase' | shasum -a 256
  ```

  Paste the hash into `passphraseHash`.

You do **not** need to fill in `repo` — the site works out its own owner and repo name
from the GitHub Pages URL. Only fill it in if you use a custom domain.

### 3. Each of you makes a GitHub token

Reading the site needs nothing. Saving a roll or uploading a drawing writes to the repo,
so it needs a token. The site asks for one the first time you try to save.

**GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
→ Generate new token**

- **Repository access:** Only select repositories → this repo
- **Repository permissions:** Contents → **Read and write**
- Set an expiry you're happy with

Paste it into the site when prompted. It's stored in that browser's local storage and is
sent only to github.com. Your friend needs their own token, and needs to be a collaborator
on the repo (**Settings → Collaborators**).

---

## Previewing it locally

Opening `index.html` by double-clicking won't load saved progress — browsers block a
local page from reading a local file. Run a tiny server instead:

```bash
cd DogDraw
python3 -m http.server 8000
```

Then open <http://localhost:8000>. The roller and gallery work; saving still needs
the live GitHub Pages copy.

---

## How it works

**Roller.** Picks a breed at random from the ones you personally haven't rolled yet, plays
the animation, and shows you the result. Nothing is saved until you hit *Lock it in* — so
*Reroll* costs you nothing. There's an optional checkbox to also skip breeds your friend
has already claimed, if you'd rather not overlap.

If you have a breed you've claimed but not uploaded yet, the roller nudges you about it
instead of offering a fresh roll. You can roll anyway.

**Gallery.** All 205 breeds, filterable by group, state, or name.

| Look | Meaning |
|---|---|
| Greyed out | Neither of you has claimed it |
| Dashed gold border | Claimed by someone, no drawing uploaded yet |
| Normal, with thumbnail | One of you has drawn it |
| Gold frame, star, shimmer | **Both** of you have drawn it |

The two dots on each card are the two artists — filled teal means drawn, pale gold means
claimed, grey means not started. Click any breed to see the drawings and their dates, and
to upload your own.

**Uploads.** Images are resized to 1400px on the longest edge in your browser before being
committed, so the repo stays reasonable. They land in
`drawings/<artist>/<breed>-<timestamp>.jpg`.

If you both save at the same moment, the site notices, re-reads the latest file, and
re-applies your change on top — neither roll gets clobbered.

---

## A note on the passphrase

This keeps casual passers-by out. It is not real security: the hash is sitting in a public
repo and a short word will not survive anyone who actually cares. Since the site holds
nothing but dog drawings, that's a fair trade — just don't reuse a password you use elsewhere.

## Files

```
index.html          markup for both tabs, the modal, and the roll animation
css/style.css       all styling, including the dog-catching-paintbrush keyframes
js/config.js        >>> the only file you need to edit <<<
js/breeds.js        the 205 AKC breeds and their groups
js/app.js           auth, roller, gallery, GitHub read/write
data/progress.json  who has claimed and drawn what (the site writes this)
drawings/           uploaded drawings (the site writes these)
```
