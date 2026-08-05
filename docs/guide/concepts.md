# Concepts

Four ideas carry the whole library. None of them is complicated, but knowing them saves
reading a lot of source.

## Canvas, pane, series

```
<chart-canvas>          owns the data, the scales and the pixels
  <chart-pane>          a box with its own y scale
    <chart-…-series>    something drawn inside that box
```

`<chart-canvas>` holds the rows, the x scale, and three stacked `<canvas>` elements. It
decides what is on screen and tells every child to draw.

`<chart-pane>` is a horizontal band of the canvas with its own y scale. Give it `height`
and `origin` and several panes stack — price above, volume and oscillators below. They all
share the x scale, so panning one pans all of them. (The original calls this element
`Chart`; the tag is `<chart-pane>` because "chart inside chart" reads badly, and its `id`
prop is `chartId` because `id` on an element already means something to the document.)

Everything else — series, axes, cursors, tooltips, drawing tools — is a child.

## How children find the chart

There is no framework passing props down. When a child connects, it fires a bubbling
`chart-context-request` event; the nearest provider answers with itself and stops the
event going further.

Two consequences worth knowing:

- **A child can sit anywhere below its pane.** Wrap it in a `<div>` if you like.
- **Charts nest.** A chart inside another chart's subtree binds to the nearer one, because
  the nearer provider answers first. That is what `<chart-alternate-data>` exploits: it
  answers the request itself and hands its children different rows.

## State is explicit

The chart is a function of its state. `getState()` returns everything that decides what is
drawn — the x scale, the rows on screen, the pane configurations — and `setState()` puts
it back:

```js
const saved = canvas.getState()
// … pan and zoom somewhere else …
canvas.setState(saved)   // exactly the same picture again
```

Nothing is hidden where only the chart can see it. This is the one place the port
deliberately parts company with the original, which kept pointer position and the item
under it in a `mutableState` field written to from inside event handlers. Being able to
scrub a chart backwards and forwards in step with something else is the whole reason.

Pointer state lives in `getMutableState()` and is deliberately separate: it changes on
every mouse move and is not part of what makes the picture.

## Drawing happens once per batch

Writing a property does not draw. It asks for a redraw, and the redraw happens after the
current task finishes:

```js
Object.assign(series, { yAccessor, strokeStyle, strokeWidth })  // one redraw, not three
```

The same applies to the first draw: `append` runs `connectedCallback` immediately, but
drawing waits until the microtask queue drains, so this works —

```js
pane.append(series)
series.yAccessor = datum => datum.close   // set after appending: still fine
```

— and so does setting the properties first. There is no order you have to remember.

## Canvas for shapes, SVG for text

Series, axes, cursors and coordinates are drawn on canvas: they are thousands of shapes
and they move on every pointer event.

Tooltips and annotations are **SVG**. Their numbers are real text — selectable, readable
by a screen reader, styleable with CSS. `<chart-hover-tooltip>` is the exception; it
follows the pointer, so it is on canvas with everything else that does.

Three canvases are stacked, and code says which one it draws on:

| layer | cleared when | what lives there |
|---|---|---|
| `bg` | rarely | `<chart-label>` watermarks |
| `axes` | on pan and zoom | series, axes, everything about the data |
| `mouseCoord` | on every mouse move | cursors, coordinates, drawing tools |

## Coordinates

Drawing code inside a pane works in **pane coordinates**: `(0, 0)` is that pane's top
left, not the page's. The canvas origin is moved and clipped before your code runs, so a
series cannot spill into a neighbouring pane even by accident.

Pointer positions handed to your callbacks are in the same space, for the same reason.

## What the elements are called

Every tag starts with `chart-`. The class name matches the original library's export name,
so `LineSeries` is `<chart-line-series>` and `CrossHairCursor` is
`<chart-cross-hair-cursor>`. Two names differ on purpose:

| original | here | why |
|---|---|---|
| `Chart` | `<chart-pane>` | "a chart inside a chart" is not what it is |
| `Chart`'s `id` prop | `chartId` | `id` already means the document-wide identifier |

The full list is in the [element reference](../reference/elements.md), generated from the
source.
