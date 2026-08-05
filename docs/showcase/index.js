import {
    discontinuousTimeScaleProviderBuilder,
    sma,
    ema,
} from "@akaoio/chart"
import { daily } from "./data.js"
import { demo, page } from "./showcase.js"

page({
    title: "Overview",
    intro:
        "Everything on this site is drawn by the elements this library defines. There is no " +
        "framework underneath and nothing was compiled: the pages import the source directly " +
        "and the browser resolves d3 through the import map at the top of the HTML.",
})

demo({
    title: "A stock chart",
    about:
        "Candles and volume in one pane, two moving averages over them, a crosshair with " +
        "readouts on both axes, and the last price pinned to the right edge.",
    build: stage => {
        // Indicators are functions over the data. Each one merges its result back into the
        // bar it was computed from, and hands you an accessor to read it out again.
        const fast = sma()
            .options({ windowSize: 20 })
            .merge((datum, value) => {
                datum.sma20 = value
            })
            .accessor(datum => datum.sma20)

        const slow = ema()
            .options({ windowSize: 50 })
            .merge((datum, value) => {
                datum.ema50 = value
            })
            .accessor(datum => datum.ema50)

        const bars = slow(fast(daily(260)))

        // The scale provider turns dates into indices, so a weekend is not a gap.
        const provider = discontinuousTimeScaleProviderBuilder().inputDateAccessor(datum => datum.date)
        const { data, xScale, xAccessor, displayXAccessor } = provider(bars)

        const canvas = document.createElement("chart-canvas")
        Object.assign(canvas, {
            data,
            xScale,
            xAccessor,
            displayXAccessor,
            seriesName: "DEMO",
            margin: { left: 0, right: 64, top: 8, bottom: 28 },
            // show the last 120 bars; the rest is there to scroll back into
            xExtents: [xAccessor(data[data.length - 120]), xAccessor(data[data.length - 1])],
        })

        const price = document.createElement("chart-pane")
        Object.assign(price, {
            chartId: "price",
            height: 300,
            yExtents: datum => [datum.high, datum.low],
        })

        const candles = document.createElement("chart-candlestick-series")

        const fastLine = document.createElement("chart-line-series")
        Object.assign(fastLine, { yAccessor: fast.accessor(), strokeStyle: "#2a6df4" })

        const slowLine = document.createElement("chart-line-series")
        Object.assign(slowLine, { yAccessor: slow.accessor(), strokeStyle: "#e0a800" })

        const yAxis = document.createElement("chart-y-axis")
        Object.assign(yAxis, { ticks: 6 })

        const yCoordinate = document.createElement("chart-mouse-coordinate-y")
        Object.assign(yCoordinate, { displayFormat: value => value.toFixed(2) })

        const lastPrice = document.createElement("chart-edge-indicator")
        Object.assign(lastPrice, {
            itemType: "last",
            orient: "right",
            edgeAt: "right",
            yAccessor: datum => datum.close,
            fill: datum => (datum.close > datum.open ? "#26a69a" : "#ef5350"),
        })

        const ohlc = document.createElement("chart-ohlc-tooltip")
        Object.assign(ohlc, { origin: [8, 16] })

        const averages = document.createElement("chart-moving-average-tooltip")
        Object.assign(averages, {
            origin: [8, 40],
            options: [
                { yAccessor: fast.accessor(), type: "SMA", stroke: "#2a6df4", windowSize: 20 },
                { yAccessor: slow.accessor(), type: "EMA", stroke: "#e0a800", windowSize: 50 },
            ],
        })

        price.append(candles, fastLine, slowLine, yAxis, yCoordinate, lastPrice, ohlc, averages)

        const volume = document.createElement("chart-pane")
        Object.assign(volume, {
            chartId: "volume",
            height: 90,
            origin: (width, height) => [0, height - 90],
            yExtents: datum => datum.volume,
        })

        const volumeBars = document.createElement("chart-bar-series")
        Object.assign(volumeBars, {
            yAccessor: datum => datum.volume,
            fillStyle: datum => (datum.close > datum.open ? "#26a69a66" : "#ef535066"),
        })

        const volumeAxis = document.createElement("chart-y-axis")
        Object.assign(volumeAxis, { ticks: 3, tickFormat: value => `${Math.round(value / 1000)}k` })

        const xAxis = document.createElement("chart-x-axis")

        volume.append(volumeBars, volumeAxis, xAxis)

        const cursor = document.createElement("chart-cross-hair-cursor")
        const xCoordinate = document.createElement("chart-mouse-coordinate-x")
        Object.assign(xCoordinate, {
            displayFormat: date => date.toISOString().slice(0, 10),
        })
        const zoom = document.createElement("chart-zoom-buttons")

        volume.append(cursor, xCoordinate)
        price.append(zoom)

        canvas.append(price, volume)
        stage.append(canvas)
    },
})

demo({
    title: "The same chart, as little code as it takes",
    about:
        "Nothing above is required. A canvas, a pane and a series is a chart — everything " +
        "else is something you asked for.",
    build: stage => {
        const provider = discontinuousTimeScaleProviderBuilder().inputDateAccessor(datum => datum.date)
        const { data, xScale, xAccessor, displayXAccessor } = provider(daily(120))

        const canvas = document.createElement("chart-canvas")
        Object.assign(canvas, { data, xScale, xAccessor, displayXAccessor })

        const pane = document.createElement("chart-pane")
        pane.yExtents = datum => [datum.high, datum.low]

        pane.append(document.createElement("chart-candlestick-series"))
        canvas.append(pane)
        stage.append(canvas)
    },
})
