# Getting started

## Install

```sh
npm install github:akaoio/chart
```

There is no build step and nothing to compile. The package ships the source it runs.

## The import map

The library imports d3 by bare name — `import { extent } from "d3-array"` — and a browser
has no idea where that is. A bundler resolves those; without one, an **import map** does
the same job in the page itself:

```html
<script type="importmap">
{
    "imports": {
        "d3-array": "/node_modules/d3-array/src/index.js",
        "d3-color": "/node_modules/d3-color/src/index.js",
        "d3-dispatch": "/node_modules/d3-dispatch/src/index.js",
        "d3-force": "/node_modules/d3-force/src/index.js",
        "d3-format": "/node_modules/d3-format/src/index.js",
        "d3-interpolate": "/node_modules/d3-interpolate/src/index.js",
        "d3-path": "/node_modules/d3-path/src/index.js",
        "d3-quadtree": "/node_modules/d3-quadtree/src/index.js",
        "d3-scale": "/node_modules/d3-scale/src/index.js",
        "d3-shape": "/node_modules/d3-shape/src/index.js",
        "d3-time": "/node_modules/d3-time/src/index.js",
        "d3-time-format": "/node_modules/d3-time-format/src/index.js",
        "d3-timer": "/node_modules/d3-timer/src/index.js",
        "internmap": "/node_modules/internmap/src/index.js",
        "@akaoio/chart": "/node_modules/@akaoio/chart/src/index.js"
    }
}
</script>
```

The map must appear before the first `<script type="module">` on the page. Every page in
[the showcase](../showcase/) carries exactly this block — view source on any of them.

If you do use a bundler, none of this applies: delete the map and import by name.

## The smallest chart that is a chart

```html
<script type="module">
    import { discontinuousTimeScaleProviderBuilder } from "@akaoio/chart"

    // your bars: { date, open, high, low, close, volume }
    const bars = await fetch("/bars.json")
        .then(response => response.json())
        .then(rows => rows.map(row => ({ ...row, date: new Date(row.date) })))

    const provider = discontinuousTimeScaleProviderBuilder().inputDateAccessor(datum => datum.date)
    const { data, xScale, xAccessor, displayXAccessor } = provider(bars)

    const canvas = document.createElement("chart-canvas")
    Object.assign(canvas, { data, xScale, xAccessor, displayXAccessor })

    const pane = document.createElement("chart-pane")
    pane.yExtents = datum => [datum.high, datum.low]

    pane.append(document.createElement("chart-candlestick-series"))
    canvas.append(pane)

    document.body.append(canvas)
</script>

<style>
    chart-canvas { display: block; width: 100%; height: 400px; }
</style>
```

Three elements and four properties. That is a working chart: it pans, it zooms, it
redraws when the window resizes.

## Properties, not attributes

Everything is set as a **JavaScript property**, never as an HTML attribute:

```js
series.yAccessor = datum => datum.close   // yes
series.setAttribute("y-accessor", "…")    // no — an attribute cannot hold a function
```

Most properties are functions, scales or objects, which is why. Writing one asks the chart
to redraw; writing a dozen in a row still only redraws once.

Because of this, the elements are usually created in JavaScript rather than written in
HTML. You can write the tags in HTML and set their properties afterwards — a custom
element is a normal element and `querySelector` finds it — but there is little point.

## Size

Leave `width` and `height` alone and the canvas measures itself with a `ResizeObserver`,
so CSS decides how big it is. Set them and it believes you instead. Same for `ratio`,
which otherwise follows `devicePixelRatio`.

## Adding to it

Everything else is a child you add:

```js
pane.append(
    Object.assign(document.createElement("chart-y-axis"), { ticks: 5 }),
    document.createElement("chart-x-axis"),
    document.createElement("chart-cross-hair-cursor"),
    document.createElement("chart-mouse-coordinate-y"),
    document.createElement("chart-ohlc-tooltip"),
)
```

Order matters the way it does in any canvas drawing: later children are drawn over earlier
ones.

## Where to go next

- [Concepts](concepts.md) — what the pieces are and how they find each other
- [Data and scales](data.md) — why a weekend is not a gap
- [Indicators](indicators.md) — moving averages, RSI, and writing your own
- [Drawing tools](drawing-tools.md) — trend lines, channels, alerts
- [Element reference](../reference/elements.md) — every element and every property
- [The showcase](../showcase/) — all of the above, running
