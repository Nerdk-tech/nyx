# Nyx

Uncensored AI agent UI. A production-ready front end built with vanilla HTML, CSS and JavaScript. No build step, no dependencies, no framework.

## Run it

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

## What is inside

- `index.html` : landing page and dashboard shell in one document
- `style.css` : full design system, dark cyberpunk theme, responsive down to 390px
- `script.js` : view routing, simulated agent runtime, particle background, chat logic

## Features

- Landing: hero, 7 capability cards, pricing with crypto payment marks, auth modal (Google / Email)
- Dashboard: glass sidebar, workspace nav, new session, recent sessions, profile menu with plan badge
- Chat: collapsible thinking summary with live step progression, distinct user and agent bubbles, artifact chips
- Composer: auto-growing input, glowing focus ring, file attachments, keyboard shortcuts (Enter to send, Shift+Enter for newline, Cmd/Ctrl+K to focus)
- Right panel: live capability status, usage meter, session facts
- Responsive: off-canvas sidebar and collapsible panel on mobile
- Accessibility: reduced-motion support, aria labels, keyboard escape handling

## Notes

The agent is simulated. Replies, artifacts and tool activity are generated locally so the interface can be evaluated without a backend. Wire `plan()` in `script.js` to a real agent endpoint to make it live.
