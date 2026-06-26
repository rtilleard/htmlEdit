# htmlEdit

A simple, minimal Mac app for editing HTML files **visually** — point, click, and type directly on the live rendered page. No code, no markup. It feels like editing a Word document, but the file you save is your original HTML.

Built for editing AI-generated HTML docs (briefs, notes, memos, recipes) without having to re-prompt or touch the source.

## Features

- **Edit the live page** — WYSIWYG editing of the rendered HTML, not the raw source
- **Light formatting toolbar** — bold, italic, underline, headings, lists, links, undo/redo
- **Opens and saves real `.html` files** — your markup and doctype are preserved
- **Completely private** — no accounts, no analytics, no network access; files never leave your Mac
- **Minimal, wireframe-style design** with soft shadows

## Build

Requires Xcode 15+ on macOS.

```bash
open LiveEdit.xcodeproj
```

Then build and run the `htmlEdit` scheme (⌘R).

## Project layout

| Path | What it is |
|------|------------|
| `LiveEdit/` | App source (SwiftUI + WKWebView) |
| `LiveEdit/WebView.swift` | The editable web view (`designMode` + doctype-preserving save) |
| `LiveEdit/ContentView.swift` | Editor UI and formatting toolbar |
| `LiveEdit/LiveEditApp.swift` | App entry point and welcome screen |
| `site/` | Landing page (htmledit.io) |
| `store-assets/` | App Store listing copy, privacy policy, sample docs, screenshots |

## License

MIT — see [LICENSE](LICENSE).
