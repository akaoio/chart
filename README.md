# chart

Financial charts as plain Web Components. No framework, no build step.

A port of [react-financial-charts](https://github.com/react-financial/react-financial-charts) —
the most mature open financial charting library for the web — from React to standard custom
elements, so it can be used from any page regardless of what framework that page is (or is not)
built with.

> **Status: in progress.** Nothing is usable yet. The port is being done in dependency order and
> each stage has to prove itself before the next begins — see
> [#1](https://github.com/akaoio/chart/issues/1) for the plan and the parity checklists in
> [`docs/parity/`](docs/parity/) for exactly what is done and what is not.

## Why a port and not a wrapper

Wrapping React would mean shipping React. The point is a charting library that any page can use
without adopting a framework, and that stays usable in ten years because it depends on the
platform rather than on one library's release cycle.

The port is close to the original on purpose. The maths (via [d3](https://d3js.org)) and the
canvas drawing are kept as they are; what changes is how components find each other and how
redraws are scheduled — the parts that were React's job.

## Install

```sh
npm install github:akaoio/chart
```

ESM, no build step. Import what you need and use the elements.

## Determinism

The chart is driven from the outside: given the same state, it draws the same picture. There is
no hidden mutable state that only the chart can see. This is what makes it possible to scrub a
chart backwards and forwards in step with narration, which is what akao — the first consumer —
needs it for.

## Credits

All of the design, the maths and the drawing come from
[react-financial-charts](https://github.com/react-financial/react-financial-charts) by
Ragu Ramaswamy, Julien Renaux and Reactive Markets, MIT licensed. This project would not exist
without it. See [LICENSE](LICENSE).

## License

MIT — original copyright preserved, see [LICENSE](LICENSE).
