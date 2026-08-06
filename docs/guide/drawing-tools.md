# Drawing tools

The tools a person draws on a chart with: trend lines, channels, Fibonacci levels, Gann
fans, text, price alerts, and a brush.

## The library does not remember anything

This is the thing to understand first. A tool never stores what was drawn. It holds a list
you gave it, and when something changes it tells you the **new list** — you decide whether
to keep it:

```js
const tool = document.createElement("chart-trend-line")
tool.enabled = true
tool.trends = []

tool.onComplete = (event, trends) => {
    tool.trends = trends        // keep it
    save(trends)                // …and it is now yours to persist
}
tool.onDragComplete = (event, trends) => {
    tool.trends = trends
}

pane.append(tool)
```

Nothing is drawn that is not in the list you set. Reload the page with a stored list and
the drawings are back; drop the list and they are gone.

## The thirty-five tools

| element | list property | clicks to draw |
|---|---|---|
| `<chart-trend-line>` | `trends` | 2 |
| `<chart-fibonacci-retracement>` | `retracements` | 2 |
| `<chart-equidistant-channel>` | `channels` | 3 — two for the line, one for the width |
| `<chart-standard-deviation-channel>` | `channels` | 2 — the shape comes from the data between |
| `<chart-gann-fan-tool>` | `fans` | 2 |
| `<chart-interactive-text-tool>` | `textList` | 1 |
| `<chart-interactive-y-coordinate-tool>` | `yCoordinateList` | none — alerts arrive already made |
| `<chart-axis-line>` | `lines` | 1 — `mode`: `horizontal`, `horizontalRay`, `vertical`, `cross` |
| `<chart-shape-tool>` | `shapes` | 2 — `shape`: `rectangle` or `ellipse`, spanned corner to corner |
| `<chart-measure>` | `measures` | 2 — reads out Δprice, %, bars and elapsed time by `mode` |
| `<chart-position-tool>` | `positions` | 1 — entry/target/stop from `side`, `stopFraction`, `riskReward` |
| `<chart-pitchfork>` | `forks` | 3 — handle then both prongs; `variant`: `standard`, `schiff`, `modifiedSchiff` |
| `<chart-fib-extension>` | `extensions` | 3 — swing start, swing end, pull-back; levels project C + (B−A)·r |
| `<chart-callout>` | `callouts` | 2 — anchor first, then where the text box sits; `defaultText` fills new ones |
| `<chart-price-label>` | `labels` | 1 — the text is the label's own y, re-derived on every draw |
| `<chart-pattern>` | `patterns` | n — `variant` picks the table: XABCD, Cypher, ABCD, triangle, three drives, head-and-shoulders, Elliott ×3 |
| `<chart-path>` | `paths` | n — click per vertex, double-click to close (the tool also exposes a finish method for touch UIs) |
| `<chart-cyclic-lines>` | `cycles` | 2 — the period; vertical lines repeat to the domain edge |
| `<chart-arrow>` | `arrows` | 2 — tail then head |
| `<chart-arrow-mark>` | `marks` | 1 — ▲ or ▼ by `mode`, each mark remembers its own |
| `<chart-info-line>` | `infoLines` | 2 — a trendline whose midpoint label reads Δprice, %, bars |
| `<chart-fib-time-zone>` | `zones` | 2 — the unit; vertical lines at Fibonacci multiples 0, 1, 2, 3, 5, 8… |
| `<chart-fib-shape>` | `fibShapes` | 2 (`variant`: `fan`, `arcs`, `circles`, `spiral`) or 3 (`wedge`) — Fibonacci constructions with pixel-space radii |
| `<chart-gann-box>` | `gannBoxes` | 2 — opposite corners; level divisions on both axes, `variant: square` adds diagonals and corner fans |
| `<chart-time-cycles>` | `waves` | 2 — the period; `mode: cycles` repeats semicircles on the baseline, `mode: sine` runs a sine line across the pane |
| `<chart-trend-angle>` | `angles` | 2 — anchor then direction; the angle is a screen-space quantity, exactly what the label reads |
| `<chart-note>` | `notes` | 1 — a text box; `kind: note` wears sticky yellow, `kind: comment` a flat card; `text` is the user's words |
| `<chart-signpost>` | `signposts` | 1 — a pole with a text box riding the top |
| `<chart-flag-mark>` | `flags` | 1 — a ⚑ at the pointer, same glyph ride as the arrow marks |
| `<chart-freehand>` | `strokes` | press–drag–release — `mode: brush` draws a thin line, `mode: highlighter` a wide translucent one; points are pixel-decimated |
| `<chart-anchored-text>` | `anchoredTexts` | 1 — a SCREEN-anchored text box: scrolling and zooming leave it in place; position is a pane fraction so resizes keep it put; `kind: note` wears sticky yellow |
| `<chart-price-note>` | `priceNotes` | 2 — first anchor pins the PRICE, second parks the label; the label reads the anchor's price on every draw |
| `<chart-pin>` | `pins` | 1 — a 📍 at the pointer, same glyph ride as flags and arrow marks |
| `<chart-table>` | `tables` | 1 — a screen-anchored table; `cells` is rows×columns of text, editing is application UI |
| `<chart-image-tool>` | `images` | 2 — opposite corners; `src` is a dataURL from the app, no src draws a labelled placeholder |

The last twenty-eight have no counterpart in the original library — they exist because
TradingView has them and a terminal needs them. Each placed object remembers its own
`mode`/`shape`/`side`, so one tool instance can hold a mixed list.

`enabled` decides whether clicking draws. Set it on one tool at a time; several armed at
once will all react to the same click.

Two tools report differently from the rest:

- **Text** places a label with one click and calls `onChoosePosition` with the new label
  alone, not a list — there is nothing to rubber-band, so there is no "complete".
- **Alerts** are never drawn. You add them to `yCoordinateList` yourself, and the tool
  lets them be dragged to another price or deleted through `onDelete`.

## Selecting and deleting

Selection is a separate element, because with several overlapping objects only something
that can see all of them can decide which one a click landed on:

```js
const selector = document.createElement("chart-drawing-object-selector")
Object.assign(selector, {
    getInteractiveNodes: () => ({
        trendline: { type: "trendline", chartId: trendTool.chartId, node: trendTool },
        fib: { type: "fib", chartId: fibTool.chartId, node: fibTool },
    }),
    drawingObjectMap: { trendline: "trends", fib: "retracements" },
    onSelect: (event, interactives) => {
        for (const found of interactives) {
            if (found.type !== "trendline") continue

            trendTool.trends = trendTool.trends.map((each, index) => ({
                ...each,
                selected: found.objects[index].selected === true,
            }))
        }
    },
})
pane.append(selector)
```

Three details, each of which will bite if you assume otherwise:

- `drawingObjectMap` tells it which property on each tool holds the list.
- `chartId` must be a real pane id. The selector narrows the pointer position into that
  pane's coordinates, and there is nothing to narrow into if the id matches no pane — you
  get a thrown error on the first click after anything is drawn, and because that throw
  happens inside the chart's event dispatch, every element registered after the selector
  stops receiving events too. The chart looks dead. Read it off the tool instead of writing
  it out, as above: every tool answers `chartId` with the pane it is in.
- **`onSelect` receives an array, not an object** — one entry per node you listed, in that
  order, each `{ type, chartId, objects }`. And `objects` is the list of drawn objects,
  every one carrying a fresh `selected`; it is not an array of booleans.

Deleting is then whatever you want it to be — there is no delete API, because the list is
yours:

```js
window.addEventListener("keydown", event => {
    if (event.key === "Delete") trendTool.trends = trendTool.trends.filter(each => !each.selected)
})
```

## Brush

`<chart-brush>` is not a drawing tool — it leaves nothing behind. Drag a box and it reports
the two corners once, then clears itself:

```js
const brush = document.createElement("chart-brush")
Object.assign(brush, {
    enabled: true,
    onBrush: ({ start, end }) => zoomTo(start.xValue, end.xValue),
})
```

What a selection *means* is your decision: zoom to it, export it, annotate it. Panning is
switched off while it is enabled, since both want the same drag.

## Two behaviours that look like bugs and are not

**A click that does not move the pointer draws nothing.** Two clicks in the same place
would make a line of length zero, so the tools require the pointer to have travelled.

**Two clicks within 400ms are a double click**, not two clicks. Drawing something that
takes two clicks means two separate ones.

## On a phone

Every tool works with one finger, and the gestures are the ones you already expect:

| gesture | what happens |
|---|---|
| tap on empty chart | places the next point of the armed tool |
| tap on a drawn object | selects it |
| drag a selected object | moves it |
| drag a handle | moves that end |
| drag empty chart | pans |
| two fingers | zooms |

Two things are wider for a finger than for a mouse, because a fingertip is about 30 CSS
pixels across and never lands twice in the same place. Hit testing gains 12 pixels — enough
to catch a thin line, still tight enough to tell two handles apart at the ends of a short
segment. And a double tap has to land within 8 pixels of the first, so two deliberate taps
in different places stay two taps.

Neither widening touches the mouse. If you build your own interactive element, read
`moreProps.inputType` (`"mouse"` or `"touch"`) and add `hitSlop(moreProps)` to whatever
distance your hover test measures.

The original library has none of this: with it, one finger always pans, so a drawn object
can be placed but never moved. See [`docs/parity/core.md`](../parity/core.md).

## One deliberate difference from the original

The body of an equidistant channel can be hovered and dragged here. In the original it
cannot: its hover test feeds pixel coordinates into a function expecting data values, so
the test never passes anywhere on screen — measured at 0 hits out of 68,961 points across
a whole pane. The port removes the extra scaling. The intent was never in doubt; the
original sets a move cursor and a whole-channel drag handler that could never fire. See
[`docs/parity/interactive.md`](../parity/interactive.md).

## See it running

[The drawing tools page](../showcase/drawing.html) of the showcase arms one tool at a time
and lists everything drawn, exactly as the tools report it.
