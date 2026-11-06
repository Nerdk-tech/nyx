# Nyx

Uncensored AI agent UI. Vanilla HTML, CSS and JavaScript, no build step and no dependencies.

Live: https://nyx-damini.vercel.app

## Run it

Open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000
```

## What is inside

- `index.html` : landing page and dashboard shell
- `style.css` : design system, dark theme, 3D transforms, responsive to 320px
- `script.js` : 3D wireframe renderer, particle field, scroll reveals, card tilt, pricing toggle, simulated agent runtime

## Landing

- Hero with a real 3D icosahedron rendered on canvas (drag to spin), orbit rings and floating capability chips
- Bento capability grid with pointer tilt and depth: apps, unrestricted code, web search, browser sessions, capture, hosting, workspace, assistant
- Three step flow with a live progress card
- Pricing: Free, Pro, Builder, with monthly and yearly toggle
- Developers section: OpenAI compatible API, copyable curl snippet, self hosted and managed pricing
- FAQ, final CTA, footer

## Dashboard

- Glass sidebar with workspace nav, recents, profile and plan badge
- Collapsible thinking summary that ticks through each tool call
- Rich agent bubbles with artifact chips
- Composer with auto grow, attachments, focus glow and shortcuts
- Capability panel with live status, usage meter and session facts

## Notes

The agent is simulated. Wire `plan()` in `script.js` to a real endpoint to make it live.
