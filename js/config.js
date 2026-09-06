// ---------------------------------------------------------------------------
// EDIT THIS FILE. Everything you need to personalize lives here.
// ---------------------------------------------------------------------------
const CONFIG = {

  // The two artists. Names appear on the login screen and on every drawing.
  // Changing a name after you've started will orphan that person's history,
  // so pick them now.
  artists: ["Aspen", "Casey"],

  // Shared passphrase, stored as a SHA-256 hash so the plain word isn't sitting
  // in the repo. To change it, run this in a terminal and paste the result here:
  //   printf '%s' 'your-new-passphrase' | shasum -a 256
  passphraseHash: "5ca43653795b25b819d1502c18d7bd7ce7d489a41af9a832e0ec9c528b203e91",

  // Where progress and drawings are committed. Leave owner/repo blank and the
  // site figures them out from its own GitHub Pages URL. Only fill these in if
  // you're serving from a custom domain.
  repo: {
    owner: "",
    name: "",
    branch: "main"
  },

  // How long the roll animation plays, in milliseconds.
  rollDuration: 3200,

  // Longest edge (px) that uploaded drawings are resized to before committing.
  // Keeps the repo from ballooning. 1400 is plenty for viewing on screen.
  maxImageEdge: 1400
};
