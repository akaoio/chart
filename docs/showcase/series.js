import {
    CircleMarker,
    Square,
    Triangle,
    change,
    discontinuousTimeScaleProviderBuilder,
    defaultScaleProvider,
    kagi,
    pointAndFigure,
    renko,
    sma,
} from "@akaoio/chart"
import { scaleLinear } from "d3-scale"
import { daily, secondary } from "./data.js"
import { demo, grid, page } from "./showcase.js"

page({
    title: "Series",
    intro:
        "A series is a child of a pane that knows how to draw one thing. Every series in the " +
        "library is below, drawn from the same 120 bars unless the shape needs its own data.",
})

/**
 * The 120 bars every cell in the gallery draws, with two things merged onto each row.
 *
 * `sma` is there because several cells want a moving average to draw. `change` is there
 * for a subtler reason: a few series colour themselves from `absoluteChange` and fall back
 * to black when a row has none — `chart-ohlc-series` does, and without this every bar in
 * that cell came out the fallback colour. A gallery of defaults has to show the default,
 * not the degenerate case the default guards against.
 */
const bars = change()(
    sma()
        .options({ windowSize: 20 })
        .merge((datum, value) => {
            datum.average = value
        })(daily(120)),
)

/** The scaffolding every cell in the gallery shares: a canvas, a pane, an axis. */
const cell = (host, { yExtents, data = bars, ticks = 4, tickFormat }) => {
    const provider = discontinuousTimeScaleProviderBuilder().inputDateAccessor(datum => datum.date)
    const scaled = provider(data)

    const canvas = document.createElement("chart-canvas")
    Object.assign(canvas, { ...scaled, margin: { left: 0, right: 44, top: 6, bottom: 20 } })

    const pane = document.createElement("chart-pane")
    Object.assign(pane, { yExtents })

    const axis = document.createElement("chart-y-axis")
    Object.assign(axis, { ticks, fontSize: 10, tickFormat })

    pane.append(axis)
    canvas.append(pane)
    host.append(canvas)

    return pane
}

const price = datum => [datum.high, datum.low]
const close = datum => datum.close

/** A value in the middle of what the data does, for the demos that need a base line. */
const middle = Math.round((Math.max(...bars.map(datum => datum.high)) + Math.min(...bars.map(datum => datum.low))) / 2)

demo({
    title: "Price",
    about: "The four shapes that draw a bar as a bar.",
    build: stage => {
        const entries = [
            { title: "chart-candlestick-series", tag: "chart-candlestick-series", props: {} },
            { title: "chart-volume-candlestick-series", tag: "chart-volume-candlestick-series", props: {} },
            { title: "chart-ohlc-series", tag: "chart-ohlc-series", props: {} },
            {
                title: "chart-line-series",
                tag: "chart-line-series",
                props: { yAccessor: close },
            },
            {
                title: "chart-area-series",
                tag: "chart-area-series",
                props: { yAccessor: close },
            },
        ]

        grid(stage, entries, (host, entry) => {
            const pane = cell(host, { yExtents: price })
            const series = document.createElement(entry.tag)
            Object.assign(series, entry.props)
            pane.append(series)
        })
    },
})

demo({
    title: "Fills",
    about:
        "`chart-area-only-series` is the fill without the line, so it can sit under a line of " +
        "its own. `chart-alternating-fill-area-series` colours above and below a base value " +
        "differently — the usual way to draw an oscillator around zero.",
    build: stage => {
        grid(stage, ["area-only", "alternating fill"], (host, kind) => {
            const pane = cell(host, { yExtents: price })

            if (kind === "area-only") {
                const fill = document.createElement("chart-area-only-series")
                Object.assign(fill, { yAccessor: close, fillStyle: "rgba(42, 109, 244, 0.15)" })

                const line = document.createElement("chart-line-series")
                Object.assign(line, { yAccessor: close, strokeStyle: "#2a6df4" })

                pane.append(fill, line)
            } else {
                const series = document.createElement("chart-alternating-fill-area-series")
                Object.assign(series, { yAccessor: close, baseAt: middle })
                pane.append(series)
            }
        })
    },
})

demo({
    title: "Bars",
    about:
        "Four ways to place several bars on the same x. Stacked puts them end to end, grouped " +
        "puts them side by side, overlay draws them on top of one another.",
    build: stage => {
        // three made-up columns per bar, so there is something to stack
        const parts = [
            datum => datum.volume * 0.5,
            datum => datum.volume * 0.3,
            datum => datum.volume * 0.2,
        ]
        const colours = ["#2a6df4", "#26a69a", "#e0a800"]

        const total = datum => datum.volume
        const volumeExtents = datum => [0, datum.volume]

        grid(
            stage,
            ["chart-bar-series", "chart-stacked-bar-series", "chart-grouped-bar-series", "chart-overlay-bar-series"],
            (host, tag) => {
                const pane = cell(host, {
                    yExtents: volumeExtents,
                    ticks: 3,
                    tickFormat: value => `${Math.round(value / 1000)}k`,
                })
                const series = document.createElement(tag)

                if (tag === "chart-bar-series") {
                    Object.assign(series, { yAccessor: total })
                } else {
                    // the stacking series take an array of accessors, one per column
                    Object.assign(series, {
                        yAccessor: parts,
                        fillStyle: (datum, index) => colours[index],
                    })
                }

                pane.append(series)
            },
        )
    },
})

demo({
    title: "Points and lines",
    about:
        "`chart-scatter-series` takes a marker — a plain object with a `drawOnCanvas`, not an " +
        "element. `chart-straight-line` is a horizontal or vertical rule at a fixed value.",
    build: stage => {
        const markers = [
            ["CircleMarker", CircleMarker, { r: 2.5, fillStyle: "#2a6df4" }],
            ["Square", Square, { width: 5, fillStyle: "#26a69a" }],
            ["Triangle", Triangle, { width: 7, fillStyle: "#e0a800" }],
            ["chart-straight-line", null, null],
        ]

        grid(stage, markers.map(([title]) => title), (host, title) => {
            const [, marker, markerProps] = markers.find(entry => entry[0] === title)
            const pane = cell(host, { yExtents: price })

            if (marker === null) {
                const line = document.createElement("chart-line-series")
                Object.assign(line, { yAccessor: close })

                const rule = document.createElement("chart-straight-line")
                Object.assign(rule, { yValue: middle, strokeStyle: "#ef5350", lineDash: "ShortDash" })

                pane.append(line, rule)
            } else {
                const series = document.createElement("chart-scatter-series")
                Object.assign(series, { yAccessor: close, marker, markerProps })
                pane.append(series)
            }
        })
    },
})

demo({
    title: "Volume profile",
    about:
        "Volume by price rather than by time: the bars run sideways, one bin per price band, " +
        "split into the part that traded on up bars and the part that traded on down bars.",
    build: stage => {
        // The profile splits each bin by whether the bar closed up or down, and it reads
        // that from `absoluteChange` — which the `change()` indicator puts there.
        const withChange = change()(daily(120).map(datum => ({ ...datum })))
        const pane = cell(stage, { yExtents: price, data: withChange, ticks: 6 })

        const candles = document.createElement("chart-candlestick-series")
        const profile = document.createElement("chart-volume-profile-series")
        Object.assign(profile, { bins: 24, maxProfileWidthPercent: 40 })

        pane.append(profile, candles)
        stage.querySelector("chart-canvas").style.height = "300px"
    },
})

demo({
    title: "A second dataset in the same chart",
    about:
        "`chart-alternate-data` stands in front of the chart and answers its children with " +
        "different rows. The guest below is a second instrument sampled once a week, and its " +
        "history only starts a third of the way in — the count is under the chart. Pan and " +
        "zoom: it keeps up, because the element narrows its own rows to the window on screen. " +
        "A point at the very edge of that window is left out, so the line stops a step short.",
    build: (stage, api) => {
        const provider = discontinuousTimeScaleProviderBuilder().inputDateAccessor(datum => datum.date)
        const { data, xScale, xAccessor, displayXAccessor } = provider(daily(120))

        const canvas = document.createElement("chart-canvas")
        Object.assign(canvas, {
            data,
            xScale,
            xAccessor,
            displayXAccessor,
            margin: { left: 0, right: 44, top: 6, bottom: 20 },
        })

        const pane = document.createElement("chart-pane")
        pane.yExtents = price

        const candles = document.createElement("chart-candlestick-series")

        // The guest is a different instrument on a different clock: one point per week, and
        // nothing before the fortieth bar. That is the whole reason this element exists — a
        // dataset that lines up row for row needs no help, just another field on the rows.
        //
        // Rebased to meet the chart where it starts, because the pane takes its y extents
        // from the chart's own rows and a guest far outside them would be clipped away.
        const other = secondary(120)
        const factor = data[40].close / other[40].close

        // Each guest row carries the SAME x the provider handed out — an `idx` object it
        // made — because that is what the chart measures the guest against. On an index
        // scale there is no x between two bars, so a guest point lands on a bar; what
        // makes it a guest is that there are far fewer of them, over a shorter span.
        const guest = []
        for (let index = 40; index < data.length; index += 5) {
            guest.push({
                idx: data[index].idx,
                close: Math.round(other[index].close * factor * 100) / 100,
            })
        }

        const alternate = document.createElement("chart-alternate-data")
        alternate.data = guest

        const line = document.createElement("chart-line-series")
        Object.assign(line, { yAccessor: close, strokeStyle: "#e0a800", strokeWidth: 2 })

        // Every child is fed the guest rows, not just the first — the dots sit on the line.
        const dots = document.createElement("chart-scatter-series")
        Object.assign(dots, {
            yAccessor: close,
            marker: CircleMarker,
            markerProps: { r: 3, fillStyle: "#e0a800" },
        })

        alternate.append(line, dots)

        const axis = document.createElement("chart-y-axis")
        Object.assign(axis, { ticks: 6, fontSize: 10 })

        pane.append(candles, alternate, axis)
        canvas.append(pane)
        canvas.style.height = "300px"
        stage.append(canvas)

        api.say(`${data.length} candles · ${guest.length} guest points`)
    },
})

demo({
    title: "Charts that are not about time",
    about:
        "Kagi, Renko and Point & Figure throw the time axis away: a new column appears when " +
        "price moves far enough, not when the clock ticks. Each has an indicator that " +
        "rewrites the data into that shape first.",
    build: stage => {
        const shapes = [
            ["chart-kagi-series", kagi().options({ reversalType: "FIXED", reversal: 2 })],
            ["chart-renko-series", renko().options({ reversalType: "FIXED", fixedBrickSize: 2 })],
            ["chart-point-and-figure-series", pointAndFigure().options({ boxSize: 2, reversal: 3 })],
        ]

        grid(stage, shapes.map(([tag]) => tag), (host, tag) => {
            const [, indicator] = shapes.find(entry => entry[0] === tag)

            // these reshape the data, so they run before the scale provider sees it
            const reshaped = indicator(daily(260).map(datum => ({ ...datum })))

            // and they are index-based, not date-based — a plain linear scale fits
            const provider = defaultScaleProvider(scaleLinear())
            const scaled = provider(
                reshaped.map((datum, index) => ({ ...datum, idx: index })),
                datum => datum.idx,
            )

            const canvas = document.createElement("chart-canvas")
            Object.assign(canvas, { ...scaled, margin: { left: 0, right: 44, top: 6, bottom: 20 } })

            const pane = document.createElement("chart-pane")
            pane.yExtents = datum => [datum.high, datum.low]

            const axis = document.createElement("chart-y-axis")
            Object.assign(axis, { ticks: 4, fontSize: 10 })

            pane.append(document.createElement(tag), axis)
            canvas.append(pane)
            host.append(canvas)
        })
    },
})
