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

## The seven tools

| element | list property | clicks to draw |
|---|---|---|
| `<chart-trend-line>` | `trends` | 2 |
| `<chart-fibonacci-retracement>` | `retracements` | 2 |
| `<chart-equidistant-channel>` | `channels` | 3 — two for the line, one for the width |
| `<chart-standard-deviation-channel>` | `channels` | 2 — the shape comes from the data between |
| `<chart-gann-fan-tool>` | `fans` | 2 |
| `<chart-interactive-text-tool>` | `textList` | 1 |
| `<chart-interactive-y-coordinate-tool>` | `yCoordinateList` | none — alerts arrive already made |

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
        trendline: { type: "trendline", chartId: "price", node: trendTool },
        fib: { type: "fib", chartId: "price", node: fibTool },
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
  pane's coordinates, and there is nothing to narrow into if the id matches no pane.
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
