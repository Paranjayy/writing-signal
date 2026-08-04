# Project Agent Contract

## Mission

Deliver a privacy-respecting, local-first Raycast extension that makes writing habits legible without turning into surveillance.

## Current stage

Prototype. Optimize for useful, inspectable local behavior and a small reversible architecture.

## Non-negotiable invariants

- Never collect raw keystrokes or selected text by default.
- Never send writing or clipboard contents over the network.
- Store only aggregate metrics unless a future explicit opt-in design changes this.
- Destructive clipboard actions require confirmation.
- Keep a client-neutral `src/core` layer so a future native monitor can use the same local model.

## Commands

- Install: `npm install`
- Develop in Raycast: `npm run dev`
- Lint: `npm run lint`
- Build: `npm run build`
