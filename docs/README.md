# Documentation

## Guide

- [Getting started](guide/getting-started.md) — install, the import map, a first chart
- [Concepts](guide/concepts.md) — canvas, panes, series, and how they find each other
- [Data and scales](guide/data.md) — accessors, the discontinuous time scale, live data
- [Indicators](guide/indicators.md) — moving averages, oscillators, writing your own
- [Drawing tools](guide/drawing-tools.md) — trend lines, channels, alerts, selection

## Reference

- [Elements](reference/elements.md) — all 77 custom elements and every property, generated
  from the source

## Showcase

- [The showcase](showcase/) — every feature running, each chart shown with the exact code
  that built it

Live at **<https://akaoio.github.io/chart/>**, or `npm run docs` to serve the repository
as-is and open it locally. There is no build step for the site either: the pages import
`src/` directly and resolve d3 through an import map written in the HTML.

Publishing copies `docs/`, `src/` and the d3 packages into `_site/` **keeping the same
directory layout**, so those relative import maps point at the same places they do here —
what is published is what was tested, not a rewritten copy of it:

```sh
npm run docs:site     # gather _site/
npm run docs:check    # serve it from its own root and drive every page in Chromium
```

The workflow runs both before it deploys, so a broken page stops the release rather than
reaching a reader.

## Parity with the original

- [Parity](parity/) — what was ported, what was deliberately left out, and the evidence

This library is a port of
[react-financial-charts](https://github.com/react-financial/react-financial-charts) from
React to plain custom elements. The parity documents list every runtime export of the
original, the state of each one, and how it was checked — including the places where the
port deliberately behaves differently, and why.
