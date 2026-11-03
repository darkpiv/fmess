# fMess "GitHub" theme: a PR's Files changed page

Built 2026-11-03. **Not yet seen running in fMess**: the syntax and fMess's loader rules
(`check()`, `preview()` in themes.rs) are verified by a Python mirror; no selector has been
checked against the live Messenger DOM.

```sh
python3 -I build.py ../../fmess/src-tauri/themes/github.css   # ~33.6 KB
```

| File | What |
|---|---|
| `github.src.css` | the theme, `{{icon:name}}` placeholders |
| `build.py` | replaces placeholders with data: URLs; checks @import / non-data url() / 2 MB |
| `octicons/*.svg` | Octicons 16px (MIT, github.com/primer/octicons, main, fetched 2026-11-03) |
| `primer/{light,dark}.css` | @primer/primitives 10.4.0 functional themes: the token source |

## Mapping

| GitHub region | fMess / Messenger hook | Technique | Can't / skipped |
|---|---|---|---|
| Header strip | `html[data-fmess-chats]::before`, `--fmess-title-bar` | bgColor-muted + 1px line | |
| App rail | none | GitHub has no rail | skipped on purpose |
| Unread count | `html[data-fmess-unread]` | not used | Messenger's unread dots stay (accent blue) |
| File tree | `[data-fmess-list]`, rows `[role="row"] a[role="link"]` | TreeView: 6px radius, hover, selected bg + 4px accent bar (gradient) | avatars kept (zoom 0.571 → 32px), not file icons |
| Tree filter | `label:has(input[type="search"])`, `label > span > svg` | Primer TextInput, search-16 | placeholder stays Messenger's (translated) |
| UnderlineNav | `[role="tablist"]`, `[role="tab"][aria-selected]` | orange 2px inset underline | |
| New / ⋯ | `a[href="/messages/new/"]`, `list-menu` | invisible 32px buttons, plus-16 / kebab-horizontal-16 | |
| File header | `chat-header`, `video-call`, `info` | bgColor-muted, mono 14px name | audio call keeps Messenger's icon (no Octicon telephone) |
| Diff lines | row content `[data-scope="messages_table"] > [role="presentation"]` | row bg = add/del line, `padding-left: 96px`, `::before` gutter with CSS counters `gh-old`/`gh-new`, `::after` sign | numbers count loaded rows only (restart when history loads) |
| Yours vs theirs | own row `:has(> [role="presentation"]:first-child > [role="presentation"] > [role="none"])` (Teams' `--tm-own`) | yours = addition (+, new numbers), theirs = deletion (−, old numbers) | **design choice**: for theirs as plain context lines set `--gh-del-line` → `--gh-canvas`, `--gh-del-num` → `--gh-canvas`, sign → " " |
| Bubbles | `--chat-*` vars, `[data-message-id] [role="presentation"]` | same colour as line, radius 0, mono 12/20 | dark tokens are pre-blended opaque so bubble + row don't stack |
| Hunk headers | `[data-scope="date_break"]` | hunk bg + 80px num gutter, `@@ date @@` | assumes the break is a full-width block |
| Group sender | `[data-scope="messages_table"] h4 span` | muted mono 12px | |
| Reactions | the reaction-pill structure (hooks.md) | bordered round pills | quick reactions (`--fmess-quick-reactions`) not set |
| Comment box | `composer`, `attach`, `more-actions`, `sticker`, `emoji`, `send` | bordered box, focus ring; paperclip / plus-circle / image / smiley | GIF hidden (WhatsApp precedent); voice-clip keeps Messenger's icon |
| Comment button | span flagged `--gh-send` unless it holds the 👍 (`M16,9.1c`) | green primary 40×30, paper-airplane-16 | like / 👍 left as Messenger's |
| Reply bar | `composer-bar` (+ composer) | one box, grey top part | |
| Details | `details` | canvas bg | no title written |
| Menus | `[role="menu"]:not([data-fmess-ui="reactions"])` | ActionMenu: 12px radius, floating shadow, no arrow, 6px items | |
| Tooltips | `[role="tooltip"]` | always dark (#25292e / #3d444d), white text in both modes | |
| Photo viewer | `html[data-fmess-media]` | strip hidden | |
| Fonts | font stack | system UI + ui-monospace stacks | nothing bundled |
| App icon | `icon.rs` falls back to fMess's | none | Invertocat is trademark-restricted; if wanted, git-pull-request-16 on a squircle |

## Untested guesses (check first in a live run)

1. Row content tolerates `padding-left: 96px` and is full width (gutter/sign/background).
2. `[data-scope="date_break"]` is a full-width block (hunk header).
3. Own-row flag selector (borrowed from Teams, 2026-11-02).
4. Reaction pill selector, row avatar `zoom`, the `--gh-send` container flag.
5. Message rows may have gaps between them (white seams between "lines").

`:has()` audit: none nested; left of a combinator only the typing-dots selector copied
from Teams (hooks.md accepts it).
