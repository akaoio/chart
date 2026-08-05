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
