# DogDraw

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
git commit -m "DogDraw"
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

Then: **repo → Settings → Pages → Source: Deploy from a branch → main / (root)**.
A minute later it's live at `https://YOUR-USERNAME.github.io/YOUR-REPO/`.

The repo must be **public** — Pages needs it on a free account, and the drawings are
loaded straight from the repo.

### 2. Edit `js/config.js`

Two things to change:

- **`artists`** — already set to `["Aspen", "Casey"]`. Don't change a name after either
  of you has started rolling; the name is the key everything is filed under, so renaming
  orphans that person's history.
- **`passphraseHash`** — the default passphrase is `goodboy`. To change it:

  ```bash
  printf '%s' 'your-new-passphrase' | shasum -a 256
  ```

  Paste the hash into `passphraseHash`.

You do **not** need to fill in `repo` — the site works out its own owner and repo name
from the GitHub Pages URL. Only fill it in if you use a custom domain.

### 3. Make ONE access key and share it

There is only one key for the whole site. Aspen makes it; Casey never needs a GitHub
account, and does not need to be added as a collaborator.

**GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
→ Generate new token**

- **Repository access:** Only select repositories → this repo
- **Repository permissions:** Contents → **Read and write**
- Set an expiry you're happy with

Reading the site needs no key at all. Only saving a roll or uploading a drawing does.

**Getting it onto Casey's browser.** Easiest is a setup link — take the site URL and add
`#key=` and the token:

```
https://quixotet.github.io/dogdraw/#key=github_pat_XXXXXXXX
```

She opens it once, the key is stored in her browser, and the URL is scrubbed immediately
so it doesn't sit in the address bar. After that she just goes to the normal URL.

Send that link somewhere private — it does land in her browser history, and anyone who
has it can write to this repo. Nothing else: the key is scoped to this repository only,
and you can revoke it from the same GitHub page at any time. If you'd rather not use a
link, she can paste the key into the prompt the site shows her instead.

Both of you can use the same key on as many devices as you like.

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
*Reroll* costs you nothing. Only your own history narrows the pool — you and Casey can
land on the same breed, which is half the point.

If you have a breed you've claimed but not uploaded yet, the roller nudges you about it
instead of offering a fresh roll. You can roll anyway.

**Gallery.** All 205 breeds, filterable by group, state, or name.

| Look | Meaning |
|---|---|
| Greyed out | Neither of you has claimed it |
| Dashed gold border | Claimed by someone, no drawing uploaded yet |
| Normal, with thumbnail | One of you has drawn it |
| Gold frame, star, shimmer | **Both** of you have drawn it |

The two dots on each card are Aspen and Casey — filled teal means drawn, pale gold means
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
