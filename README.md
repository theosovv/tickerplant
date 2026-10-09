# MiniTerm — Mini Trading Terminal

A fullstack demo built over a weekend for an HFT/algo-trading interview:
a real-time trading terminal over a simulated market — order tickets, order book,
blotter, positions/PnL, and a custom canvas charting engine.

**Architecture (mirrors the target role's stack):**

```
┌──────────────┐   WebSocket (JSON)   ┌───────────────┐   gRPC (stream)   ┌───────────────┐
│   Browser     │ ◄────────────────── │   Node BFF     │ ◄─────────────── │  Core:         │
│  React 18+TS │ ── commands (WS) ─► │  ws + prom-    │ ── unary:        │  market sim +  │
│  RxJS stores │                     │  client,       │    PlaceOrder /  │  matching      │
│  canvas chart│                     │  topic routing │    CancelOrder   │  engine        │
└──────────────┘                     └───────┬───────┘                  └───────────────┘
                                     /metrics (Prometheus)
```

Market data comes from an in-house simulator, not a real exchange, on purpose:
- **Load knob:** 10 or 2000 ticks/sec is one env var — the only honest way to prove the UI holds 60 fps.
- **Offline & reproducible:** no API keys, no rate limits, deterministic replay.
- **Full loop:** the simulator matches my own orders — a real sandbox won't do that.

## Quick start

Requires Node 20+ and pnpm.

```bash
cd server && pnpm install
pnpm run dev:core   # terminal 1 — market simulator, gRPC on :50051
pnpm run dev:bff    # terminal 2 — WS gateway on :8080

cd web && pnpm install
pnpm run dev        # terminal 3 — UI on http://localhost:5173
```

Tick rate knob: `TICK_MS=10 pnpm run dev:core`.

## Requirement → Implementation

| Requirement | How it's done |
|---|---|
| gRPC streaming | Core server-streaming `SubscribeMarket`, snapshot+delta with seq numbers |
| Node BFF | topic-based WS gateway, browser commands → unary gRPC, `/metrics` |
| RxJS reactivity | stores live outside React, `useSyncExternalStore`, frame-throttled notifications |
| High-load tables | virtualized blotter, row flash on change <!-- TODO day 3 --> |
| Custom chart engine | 3-layer canvas, rAF loop with dirty flags, wheel zoom <!-- TODO day 2 --> |
| Order lifecycle | `client_order_id`, anti-double-click via `exhaustMap` <!-- TODO day 3 --> |
| Reconciliation | one click → unary `GetAccount` → diff against client store <!-- TODO day 4 --> |

## Performance

<!-- TODO day 4: storm-mode gif at 1000 ticks/sec + profiler screenshot showing 60 fps -->

## Deliberate simplifications

- **No persistence** — state lives in memory; the transport layer is the point of the demo.
- **Single simulator** instead of a real exchange adapter (a Binance/Bybit WS adapter is a ~50-line stretch behind the same interface).
- **Monolith frontend** — I know Module Federation, but for a one-dev 4-day demo the overhead outweighs the benefit; module boundaries are kept explicit instead.
- **OAuth** — stubbed / stretch goal: GitHub OAuth code flow on the BFF with an httpOnly session cookie.

## Tech stack

React 19 · TypeScript · RxJS · Vite · Node · gRPC (`@grpc/grpc-js`, dynamic proto loading) · `ws` · `prom-client` · canvas (no chart libraries)