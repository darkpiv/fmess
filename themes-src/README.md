# Theme sources (GitHub, Terminal)

```sh
python3 -I build.py      # builds all six into ../src-tauri/themes/ and checks fMess's rules
```

| Theme (id) | Source | Parts |
|---|---|---|
| GitHub (`github`) | `github/github.src.css` | `base.css` + `extras.css` |
| GitHub Split (`github-split`) | `github/github-split.src.css` | `base.css` + `extras.css` + `split.css` |
| Terminal (`terminal`) | `terminal/terminal.src.css` | dark + paper-light tokens + `base.css` |
| Terminal Green (`terminal-green`) | `terminal/terminal-green.src.css` | `green.tokens.css` + `base.css` |
| Terminal Amber (`terminal-amber`) | `terminal/terminal-amber.src.css` | amber tokens + `base.css` |
| Terminal CRT (`terminal-crt`) | `terminal/terminal-crt.src.css` | `green.tokens.css` + `base.css` + `crt.css` |

Placeholders: `{{include:f}}`, `{{icon:octicon-name}}`, `{{font:path.woff2}}` (see build.py).

Assets and licences: Octicons (MIT) in `github/octicons/`; Primer tokens
(@primer/primitives 10.4.0) in `github/primer/`; JetBrains Mono (SIL OFL 1.1,
`terminal/font/OFL.txt`), latin, latin-ext and Vietnamese subsets from @fontsource-variable.

**None of these has been seen running yet** (built 2026-11-03 on a machine without fMess).
Mapping and the guesses to check first: `github/NOTES.md`. Terminal-specific guesses:

1. Your rows turned from Messenger's right side to the left (`flex-direction: row` on the
   row, `align-items: flex-start` inside it via `--t-own`). If yours stay right or break,
   this is the place.
2. The composer prompt is padded with `14.5ch` in the code font; the send button is a
   reverse-video ⏎ (U+23CE may come from a fallback font).
3. CRT: one fixed overlay over the window (`body::after`, `will-change`); compare scrolling
   with plain Terminal Green.
4. Contribution graph (GitHub, details pane) and diffstat squares (by `nth-child` of the
   list rows: if each row is wrapped, every row shows the same pattern).
