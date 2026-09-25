import {
    renderBarAnnotation,
    renderLabelAnnotation,
    renderSvgPathAnnotation,
    sma,
} from "@akaoio/chart"
import { daily } from "./data.js"
import { chartHost, demo, grid, page } from "./showcase.js"

page({
    title: "Cursors & tooltips",
    intro:
        "Everything here answers the question “what is under the pointer?”. Move the mouse " +
        "across a chart to see it — with no pointer on the chart there is nothing to report, " +
        "which is why several of these read n/a until you do.",
})

const price = datum => [datum.high, datum.low]

const average = sma()
    .options({ windowSize: 20 })
    .merge((datum, value) => {
        datum.average = value
    })
    .accessor(datum => datum.average)

const rows = average(daily(160))

const chart = (host, options) =>
    chartHost(host, rows, { height: 320, series: ["chart-candlestick-series"], ...options })

demo({
    title: "Cursors",
    about:
        "`chart-cross-hair-cursor` draws both lines; `chart-cursor` is the configurable one " +
        "underneath it — here with the y line switched off and the x line drawn as a band the " +
        "width of one bar.",
    build: stage => {
        grid(stage, ["chart-cross-hair-cursor", "chart-cursor"], (host, tag) => {
            const { pane } = chart(host, { height: 220 })
            const cursor = document.createElement(tag)

            if (tag === "chart-cursor") {
                Object.assign(cursor, {
                    disableYCursor: true,
                    useXCursorShape: true,
                    xCursorShapeFillStyle: "rgba(42, 109, 244, 0.12)",
                })
            }

            pane.append(cursor)
        })
    },
})

demo({
    title: "Coordinates",
    about:
        "A coordinate is a label pinned to an axis. The two mouse coordinates follow the " +
        "pointer, `chart-edge-indicator` pins the latest value, `chart-price-coordinate` pins " +
        "a price you chose, and `chart-current-coordinate` puts a dot on the series itself.",
    build: stage => {
        const { pane } = chart(stage, { height: 360 })

        const cursor = document.createElement("chart-cross-hair-cursor")

        const line = document.createElement("chart-line-series")
        Object.assign(line, { yAccessor: average.accessor(), strokeStyle: "#2a6df4" })

        const dot = document.createElement("chart-current-coordinate")
        Object.assign(dot, { yAccessor: average.accessor(), fillStyle: "#2a6df4", r: 4 })

        const xLabel = document.createElement("chart-mouse-coordinate-x")
        Object.assign(xLabel, { displayFormat: date => date.toISOString().slice(0, 10) })

        const yLabel = document.createElement("chart-mouse-coordinate-y")
        Object.assign(yLabel, { displayFormat: value => value.toFixed(2) })

        const last = document.createElement("chart-edge-indicator")
        Object.assign(last, {
            itemType: "last",
            orient: "right",
            edgeAt: "right",
            yAccessor: datum => datum.close,
            fill: datum => (datum.close > datum.open ? "#26a69a" : "#ef5350"),
        })

        // A fixed price, wherever the chart happens to be. Deliberately not the latest one:
        // rounding the last close put this label within half a point of the edge indicator
        // above, so the two sat on the same pixel row and the yellow one hid the other.
        const band = [Math.min(...rows.map(datum => datum.low)), Math.max(...rows.map(datum => datum.high))]

        const level = document.createElement("chart-price-coordinate")
        Object.assign(level, {
            price: Math.round((band[0] + band[1]) / 2),
            orient: "right",
            at: "right",
            fill: "#e0a800",
            lineStroke: "#e0a800",
            arrowWidth: 6,
        })

        pane.append(line, dot, cursor, xLabel, yLabel, last, level)
    },
})

/**
 * The same sessions priced in the tens of thousands.
 *
 * `daily()` peaks near 110, and a label that short never needed shortening — the price
 * column only becomes a problem at the scale an index or a crypto pair actually trades
 * at, where every tick is six characters and the last price is eight.
 */
const expensive = rows.map(datum => ({
    ...datum,
    open: Math.round(datum.open * 800),
    close: Math.round(datum.close * 800),
    high: Math.round(datum.high * 800),
    low: Math.round(datum.low * 800),
}))

demo({
    title: "The price column",
    about:
        "`chart-y-axis` folds a round number into a `K` or an `M` suffix — but only when the " +
        "short form is exact AND shorter, so `1,500` becomes `1.5K` and `77,375.89` is left " +
        "alone rather than growing into `77.37589K`. Hover the price column to read every " +
        "digit again. Set `abbreviate = false` for the second chart's behaviour, or give the " +
        "axis a `tickFormat` of your own — a format you supply is never folded, because it is " +
        "a label rather than a number and the suffix would eat whatever else is in it.\n\n" +
        "The labels pinned to that column — `chart-edge-indicator` here — fill its width: no " +
        "leftover strip beside the box, and enough room inside it that the digits never touch " +
        "the axis line or run off the canvas.",
    build: stage => {
        grid(
            stage,
            [
                { title: "abbreviated — the default" },
                { title: "every digit — abbreviate = false", abbreviate: false },
            ],
            (host, entry) => {
                const { pane } = chartHost(host, expensive, {
                    height: 260,
                    series: ["chart-candlestick-series"],
                })

                // The first chart is left ALONE on purpose — it is showing the default, so
                // it must not be handed the value it is meant to be demonstrating.
                if (entry.abbreviate === false) pane.querySelector("chart-y-axis").abbreviate = false

                const last = document.createElement("chart-edge-indicator")
                Object.assign(last, {
                    itemType: "last",
                    orient: "right",
                    edgeAt: "right",
                    yAccessor: datum => datum.close,
                    fill: "#2a6df4",
                })

                pane.append(last)
            },
        )
    },
})

demo({
    title: "Tooltips",
    about:
        "Tooltips are SVG, not canvas — the numbers are real text, so they can be selected, " +
        "read by a screen reader and styled with CSS. `chart-hover-tooltip` is the exception: " +
        "it follows the pointer and is drawn on canvas.",
    build: stage => {
        const { pane } = chart(stage, { height: 360 })

        pane.append(document.createElement("chart-cross-hair-cursor"))

        const ohlc = document.createElement("chart-ohlc-tooltip")
        Object.assign(ohlc, { origin: [8, 12] })

        const single = document.createElement("chart-single-value-tooltip")
        Object.assign(single, {
            origin: [8, 42],
            yLabel: "SMA (20)",
            yAccessor: average.accessor(),
        })

        const group = document.createElement("chart-group-tooltip")
        Object.assign(group, {
            origin: [8, 66],
            layout: "horizontalInline",
            options: [
                { yLabel: "O", yAccessor: datum => datum.open },
                { yLabel: "H", yAccessor: datum => datum.high },
                { yLabel: "L", yAccessor: datum => datum.low },
                { yLabel: "C", yAccessor: datum => datum.close },
            ],
        })

        const hover = document.createElement("chart-hover-tooltip")
        Object.assign(hover, {
            yAccessor: average.accessor(),
            tooltip: {
                content: ({ currentItem, xAccessor }) => ({
                    x: currentItem.date.toISOString().slice(0, 10),
                    y: [
                        { label: "close", value: currentItem.close?.toFixed(2) },
                        { label: "sma", value: currentItem.average?.toFixed(2) },
                    ],
                }),
            },
        })

        pane.append(ohlc, single, group, hover)
    },
})

demo({
    title: "Languages",
    about:
        "The chart ships no translations — it declares what it says (`dictionary`, exported in " +
        "English) and the application decides. Two properties on `chart-canvas` do it: `locale`, " +
        "a BCP 47 tag, for every number and date the chart formats itself (derived from `Intl`, so " +
        "any locale the browser knows works), and `dictionary`, a function `(key, values)` or an " +
        "object `{ key: text }`, for every word. A missing key falls back to English. Formatters " +
        "the application passes are its own and are never rewritten.",
    build: stage => {
        const languages = [
            { title: "en — nothing set", locale: undefined, dictionary: undefined },
            { title: "de", locale: "de", dictionary: { open: "E", high: "H", low: "T", close: "S", notAvailable: "k. A." } },
            { title: "ja", locale: "ja", dictionary: { open: "始", high: "高", low: "安", close: "終", notAvailable: "なし" } },
            { title: "hi — lakh grouping", locale: "hi", dictionary: key => ({ open: "खु", high: "उ", low: "नि", close: "बं" })[key] },
        ]
        grid(stage, languages, (host, { locale, dictionary }) => {
            const { pane } = chart(host, { height: 220, locale, dictionary })
            pane.append(Object.assign(document.createElement("chart-ohlc-tooltip"), { origin: [8, 12] }))
        })
    },
})

demo({
    title: "Annotations",
    about:
        "`chart-annotate` runs a test over every bar on screen and draws something on the ones " +
        "that pass. What it draws is the `with` property — a function that returns a shape.",
    build: stage => {
        const { pane } = chart(stage, { height: 360 })

        // a mark under every bar that closed more than 2% above its open
        const strongUp = document.createElement("chart-annotate")
        Object.assign(strongUp, {
            with: renderSvgPathAnnotation,
            when: datum => datum.close > datum.open * 1.018,
            usingProps: {
                y: ({ yScale, datum }) => yScale(datum.low) + 12,
                path: () => "M0,0L6,10L-6,10Z",
                pathWidth: 12,
                pathHeight: 10,
                fill: "#26a69a",
                tooltip: datum => `up ${(100 * (datum.close / datum.open - 1)).toFixed(1)}%`,
            },
        })

        // and a letter over every bar that closed more than 2% below
        const strongDown = document.createElement("chart-annotate")
        Object.assign(strongDown, {
            with: renderLabelAnnotation,
            when: datum => datum.close < datum.open * 0.982,
            usingProps: {
                y: ({ yScale, datum }) => yScale(datum.high) - 8,
                text: "S",
                fill: "#ef5350",
                fontSize: 13,
                tooltip: datum => `down ${(100 * (1 - datum.close / datum.open)).toFixed(1)}%`,
            },
        })

        // once a month, a labelled bar
        const monthly = document.createElement("chart-annotate")
        Object.assign(monthly, {
            with: renderBarAnnotation,
            when: (datum, index, all) =>
                index > 0 && datum.date.getUTCMonth() !== all[index - 1].date.getUTCMonth(),
            usingProps: {
                y: ({ yScale, datum }) => yScale(datum.high) - 26,
                text: "▼",
                fill: "#2a6df4",
                textFill: "#2a6df4",
                fontSize: 12,
            },
        })

        pane.append(strongUp, strongDown, monthly)
    },
})

demo({
    title: "A label on the canvas itself",
    about:
        "`chart-label` is not tied to the data at all — it is a watermark, positioned in the " +
        "canvas rather than in the pane.",
    build: stage => {
        const { canvas, pane } = chart(stage, { height: 280 })

        const watermark = document.createElement("chart-label")
        Object.assign(watermark, {
            text: "SAMPLE DATA",
            fontSize: 40,
            fillStyle: "rgba(120, 130, 150, 0.2)",
            // A label sits in canvas coordinates, not in a pane, so it is placed against
            // the x scale's own range rather than against any bar.
            x: ({ xScale }) => {
                const [left, right] = xScale.range()
                return (left + right) / 2
            },
            y: () => 130,
        })

        canvas.append(watermark)
    },
})

demo({
    title: "Real DOM inside the chart",
    about:
        "`chart-svg` is the escape hatch into SVG: set `render` to a function of the chart's " +
        "state and its nodes land in the pane as REAL DOM — selectable, focusable, styleable. " +
        "Here it pins a ring and a caption on the newest bar.",
    build: stage => {
        const { pane } = chart(stage, { height: 280 })

        const svg = document.createElement("chart-svg")
        svg.render = ({ plotData, xScale, xAccessor, chartConfig }) => {
            const newest = plotData[plotData.length - 1]
            if (!newest) return null
            const x = xScale(xAccessor(newest))
            const y = chartConfig.yScale(newest.close)
            return {
                tag: "g",
                attrs: { className: "svg-escape-hatch" },
                children: [
                    { tag: "circle", attrs: { cx: x, cy: y, r: 9, fill: "none", stroke: "#e0554a", strokeWidth: 2 } },
                    { tag: "text", attrs: { x: x - 14, y: y - 14, textAnchor: "end", fontSize: 11, fill: "#e0554a" }, children: ["newest close"] },
                ],
            }
        }
        pane.append(svg)
    },
})
