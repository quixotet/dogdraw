// ---------------------------------------------------------------------------
// EDIT THIS FILE. Everything you need to personalize lives here.
// ---------------------------------------------------------------------------
const CONFIG = {

  // The two artists. Names appear on the login screen and on every drawing.
  // Changing a name after you've started will orphan that person's history,
  // so pick them now.
  artists: ["Aspen", "Friend"],

  // Shared passphrase, stored as a SHA-256 hash so the plain word isn't sitting
  // in the repo. Default passphrase is:  goodboy
  // To change it, run this in a terminal and paste the result here:
  //   printf '%s' 'your-new-passphrase' | shasum -a 256
  passphraseHash: "3ab8fa69d3458631d1a2727253a277c0145f8554e2d82082fa2b5972e9a15576",

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
