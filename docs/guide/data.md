# Data and scales

## What a row looks like

Nothing is imposed. A row is whatever your data is; the chart only ever reaches it through
accessors you supply:

```js
series.yAccessor = datum => datum.close
pane.yExtents = datum => [datum.high, datum.low]
```

The conventional shape — `{ date, open, high, low, close, volume }` — is only conventional
because the default accessors on the OHLC-shaped series expect those names. Any of them
can be overridden.

Dates must be `Date` objects, not strings. If your rows arrive from JSON, convert first:

```js
const bars = rows.map(row => ({ ...row, date: new Date(row.date) }))
```

## Why a weekend is not a gap

Plot a daily series against real time and every weekend leaves a hole two days wide. Worse,
an intraday series is mostly hole: the market is shut for two thirds of the day.

`discontinuousTimeScaleProviderBuilder` fixes that by giving each row an **index** and
plotting against the index instead of against the date. Bars sit shoulder to shoulder; the
axis still shows dates, because the index remembers which date it came from:

```js
const provider = discontinuousTimeScaleProviderBuilder().inputDateAccessor(datum => datum.date)
const { data, xScale, xAccessor, displayXAccessor } = provider(bars)

Object.assign(canvas, { data, xScale, xAccessor, displayXAccessor })
```

Four things come back and all four go on the canvas:

| | |
|---|---|
| `data` | your rows, each with an `idx` field added |
| `xScale` | a scale from index to pixels |
| `xAccessor` | index of a row — this is the chart's x |
| `displayXAccessor` | the row's real date, for anything a human reads |

The axis chooses its own tick density and format from how far apart the visible rows are —
minutes, hours, days, weeks, months, quarters, years — so zooming in changes `Jan` to
`Jan 15` to `09:30` without being told to.

### The `idx` field

The provider adds `idx` to every row: an object holding the index, the date and which
level of tick formatting that row deserves. `xAccessor` reads `datum.idx.index`.

You rarely touch it, with one exception. Feeding a second dataset through
[`<chart-alternate-data>`](../reference/elements.md) means giving each of those rows the
`idx` of the chart row it belongs next to, since that is the x the chart measures it
against. The guest usually has its own dates, so look them up rather than counting:

```js
const at = new Map(data.map(datum => [Number(datum.date), datum.idx]))

alternate.data = guestRows
    .map(datum => ({ ...datum, idx: at.get(Number(datum.date)) }))
    .filter(datum => datum.idx !== undefined)
```

Two things follow from this, and both are worth knowing before you debug them.

On an index scale there is no x *between* two bars, so a guest point always lands on a
bar, and a guest date the chart has never heard of has nowhere to go — hence the filter.
If your guest dataset lines up row for row with the chart's, you do not need this element
at all: put the extra field on the rows you already have and draw a second series.

And the element leaves out any guest row sitting exactly at the edge of the visible
window, so a sparse guest series stops one sampling step short of each side. That is the
original's behaviour, kept deliberately — see [parity: series](../parity/series.md).

### Configuring it

The builder is chainable, d3-style — a setter with an argument configures, without one
reads:

```js
discontinuousTimeScaleProviderBuilder()
    .inputDateAccessor(datum => datum.timestamp)   // where the date lives
    .initialIndex(0)                               // first index handed out
```

## When you do not want indices

Kagi, Renko and Point & Figure are not about time at all: a new column appears when price
moves far enough, not when the clock ticks. Those need a plain linear scale over the
reshaped rows:

```js
import { defaultScaleProvider } from "@akaoio/chart"
import { scaleLinear } from "d3-scale"

const reshaped = renko().options({ reversalType: "FIXED", fixedBrickSize: 2 })(bars)
const rows = reshaped.map((datum, index) => ({ ...datum, idx: index }))

const { data, xScale, xAccessor } = defaultScaleProvider(scaleLinear())(rows, datum => datum.idx)
```

`defaultScaleProvider` does nothing clever — it hands back the scale and accessor you gave
it. That is the point: it is the escape hatch when the discontinuous machinery is in the
way.

## What is on screen

The canvas decides which rows are visible, and everything downstream sees only those.
`xExtents` sets the starting window:

```js
Object.assign(canvas, {
    // open showing the last 120 bars; the rest is there to scroll back into
    xExtents: [xAccessor(data[data.length - 120]), xAccessor(data[data.length - 1])],
})
```

Panning and zooming change it from there. `getState().xScale.domain()` reads it back at
any moment.

## When the chart's box changes

Leave `width` and `height` unset and the canvas measures itself, then keeps watching. On
a resize the default `maintainPointsPerPixelOnResize` keeps the **bar width** and changes
how many bars fit — a chart made narrower shows less history rather than squeezing what it
had. Set it to `false` to keep the domain and squeeze instead.

Worth knowing because it also applies to the box settling *after* the chart is built. A
chart created into a container that is still growing measures the wrong width first and
then treats the correction as a resize, so it ends up showing a different stretch than
`xExtents` asked for. If you build charts into a layout you are still assembling, finish
the layout first.

## Two modes for the price scale

By default a pane's y scale **fits the data on screen**, recomputed every frame from
`yExtents`. That is why dragging the chart up and down does nothing at first: the next
frame would recompute the domain and undo it.

Dragging the price axis hands the y domain over to the user — the pane switches to manual,
and from then on the chart pans vertically too. Double-clicking the price axis gives it
back to auto-fit, and vertical panning switches off again.

The time axis works the same way in miniature: drag it to stretch or squash the scale,
double-click it to return to the default zoom level, keeping the stretch of history you
are looking at.

```js
// per pane, if you want to forbid the manual mode entirely
pane.yPan = false

// or replace what a double-click does
yAxis.onDoubleClick = (event, position) => rememberAndReset(position)
```

The same two gestures on both axes — drag to take control, double-click to give it back —
is what a trading screen conditions people to expect. Hovering either axis shows a resize
cursor, so the gesture is discoverable without being told; `zoomCursorClassName` changes
what the cursor becomes while the drag is under way.

## Data that keeps arriving

Assign `data` again:

```js
Object.assign(canvas, provider(bars.concat(newBar)))
```

If the last bar was on screen, the chart slides along to keep it there. If you had
scrolled back to look at something, it leaves you where you were — moving the view out
from under someone reading it is worse than being one bar behind.

## Time zones

The library divides time using `getHours`, `getDay`, `getMonth` — all local time. The same
rows produce different tick levels in Hanoi and in London. That is the original's decision
and it is kept: a trading session is a local thing. It is also why the test suite pins
`TZ=UTC` at both ends.
