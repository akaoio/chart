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

Run it locally with `npm run docs`, which serves the repository as-is. There is no build
step for the site either: the pages import `src/` directly and resolve d3 through an
import map written in the HTML.

## Parity with the original

- [Parity](parity/) — what was ported, what was deliberately left out, and the evidence

This library is a port of
[react-financial-charts](https://github.com/react-financial/react-financial-charts) from
React to plain custom elements. The parity documents list every runtime export of the
original, the state of each one, and how it was checked — including the places where the
port deliberately behaves differently, and why.
