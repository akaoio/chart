# Indicators

An indicator is a **function over your rows**, not an element. Nothing about it touches
the DOM: you configure it, run it, and hand the result to whichever series should draw it.

## The shape of one

```js
import { sma } from "@akaoio/chart"

const average = sma()
    .options({ windowSize: 20 })              // what to compute
    .merge((datum, value) => {                // where to put it
        datum.sma20 = value
    })
    .accessor(datum => datum.sma20)           // how to read it back

const rows = average(bars)
```

Then draw it:

```js
const line = document.createElement("chart-line-series")
line.yAccessor = average.accessor()
pane.append(line)
```

`.accessor()` with no argument reads the accessor back, which is why the series and the
tooltip can both be handed the same one without repeating the field name.

**`merge` and `accessor` go together.** Most indicators default both to a field named
after themselves, so `sma()(bars)` on its own writes `datum.sma` and reads it back. Three
have no sensible default and throw if you merge without an accessor — `atr`,
`bollingerBand` and `stochasticOscillator`. Setting `merge` without `accessor` is worth
avoiding anyway: it writes a value under a name nothing else knows.

Running several is just running several — each writes into its own field:

```js
const rows = slow(fast(bars))
```

## Not merging

Pass `{ merge: false }` and you get an array of values instead of modified rows:

```js
const values = rsi().options({ windowSize: 14 })(bars, { merge: false })
```

Useful when you want the numbers rather than a chart.

## What comes with it

| | |
|---|---|
| moving averages | `sma` `ema` `wma` `tma` |
| oscillators | `rsi` `macd` `stochasticOscillator` `atr` `forceIndex` `elderRay` |
| bands and stops | `bollingerBand` `sar` |
| bar transforms | `heikinAshi` `change` `compare` `elderImpulse` |
| non-time charts | `kagi` `renko` `pointAndFigure` |
| the machinery | `algo` |

Several have a series built for their shape: `<chart-bollinger-series>`,
`<chart-macd-series>`, `<chart-rsi-series>`, `<chart-stochastic-series>`,
`<chart-elder-ray-series>`, `<chart-sar-series>`. The rest are numbers, so any series that
takes a `yAccessor` will draw them — usually a line or an alternating fill.

## Putting one in its own pane

Oscillators do not share the price scale. Give them a pane:

```js
const oscillator = document.createElement("chart-pane")
Object.assign(oscillator, {
    chartId: "rsi",
    height: 120,
    origin: (width, height) => [0, height - 120],   // pinned to the bottom
    yExtents: [0, 100],                             // RSI is bounded, so fix it
})
```

`yExtents` takes a fixed pair, an accessor, or an array of accessors. Fix it when the
indicator has natural bounds; leave it to the data when it does not.

## Tooltips

The indicator tooltips read the same options object the indicator was configured with, so
the label always matches what was actually computed:

```js
const tooltip = document.createElement("chart-rsi-tooltip")
Object.assign(tooltip, { origin: [8, 12], yAccessor: relative.accessor(), options: relative.options() })
```

`<chart-macd-tooltip>` and `<chart-stochastic-tooltip>` additionally want an `appearance`,
because they colour each label to match the line it belongs to and cannot guess what
colours the series was given.

## Writing your own

`algo` is the machinery underneath all of them with nothing filled in — a window size,
something to do with each window, and somewhere to put the answer:

```js
import { algo } from "@akaoio/chart"

const midpoint = algo()
    .windowSize(10)
    .accumulator(window => {
        const high = Math.max(...window.map(datum => datum.high))
        const low = Math.min(...window.map(datum => datum.low))
        return (high + low) / 2
    })
    .merge((datum, value) => {
        datum.midpoint = value
    })

const rows = midpoint(bars)
```

The accumulator receives the whole window of rows, in order, and returns one value. Rows
before the window is full get `undefined`, and the series' `defined` test skips them.

## Elder Impulse

Worth a note because it is the odd one out twice over. It is the only indicator built from
two other indicators' output, so it has to be told where they are:

```js
const impulse = elderImpulse().macdSource(momentum.accessor()).emaSource(trend.accessor())
```

It is also the one export of the original library that **throws on construction** — a
`.fill(undefined)` that is really a getter call, which makes the next line fail. The port
fixes it; see [`docs/parity/indicators.md`](../parity/indicators.md).

## See it running

[The indicators page](../showcase/indicators.html) of the showcase has every one of the
above, with the code that made each chart underneath it.
