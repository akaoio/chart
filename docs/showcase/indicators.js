import {
    algo,
    atr,
    bollingerBand,
    change,
    compare,
    discontinuousTimeScaleProviderBuilder,
    elderImpulse,
    elderRay,
    ema,
    forceIndex,
    heikinAshi,
    macd,
    rsi,
    sar,
    sma,
    stochasticOscillator,
    tma,
    wma,
} from "@akaoio/chart"
import { daily, secondary } from "./data.js"
import { demo, grid, page } from "./showcase.js"

page({
    title: "Indicators",
    intro:
        "An indicator is a function over the data, not an element. You configure it, run it " +
        "over your rows — it merges its result back into each row — and hand the accessor it " +
        "gives you to whichever series should draw it.",
})

const price = datum => [datum.high, datum.low]

/** Canvas, pane, axes. Every demo below differs only in what goes inside. */
const chart = (host, rows, { height = 320, extents = price } = {}) => {
    const provider = discontinuousTimeScaleProviderBuilder().inputDateAccessor(datum => datum.date)
    const { data, xScale, xAccessor, displayXAccessor } = provider(rows)

    const canvas = document.createElement("chart-canvas")
    Object.assign(canvas, {
        data,
        xScale,
        xAccessor,
        displayXAccessor,
        margin: { left: 0, right: 56, top: 8, bottom: 24 },
    })
    canvas.style.height = `${height}px`

    const pane = document.createElement("chart-pane")
    pane.yExtents = extents

    const yAxis = document.createElement("chart-y-axis")
    Object.assign(yAxis, { ticks: 5, fontSize: 11 })

    const xAxis = document.createElement("chart-x-axis")
    Object.assign(xAxis, { fontSize: 11 })

    pane.append(yAxis, xAxis)
    canvas.append(pane)
    host.append(canvas)

    return { canvas, pane, data }
}

demo({
    title: "Moving averages",
    about:
        "Four of them, over the same closes. `sma` weights every bar alike, `ema` leans on " +
        "recent bars, `wma` ramps linearly, `tma` smooths twice.",
    build: stage => {
        const kinds = [
            ["sma", sma(), "#2a6df4"],
            ["ema", ema(), "#26a69a"],
            ["wma", wma(), "#e0a800"],
            ["tma", tma(), "#ef5350"],
        ]

        // each one merges into its own field, so all four can live on the same rows
        let rows = daily(200)
        for (const [name, indicator] of kinds) {
            indicator
                .options({ windowSize: 20 })
                .merge((datum, value) => {
                    datum[name] = value
                })
                .accessor(datum => datum[name])
            rows = indicator(rows)
        }

        const { pane } = chart(stage, rows)

        pane.prepend(document.createElement("chart-candlestick-series"))

        for (const [name, , colour] of kinds) {
            const line = document.createElement("chart-line-series")
            Object.assign(line, { yAccessor: datum => datum[name], strokeStyle: colour })
            pane.append(line)
        }

        const tooltip = document.createElement("chart-moving-average-tooltip")
        Object.assign(tooltip, {
            origin: [8, 12],
            options: kinds.map(([name, , colour]) => ({
                yAccessor: datum => datum[name],
                type: name.toUpperCase(),
                stroke: colour,
                windowSize: 20,
            })),
        })
        pane.append(tooltip)
    },
})

demo({
    title: "Bands and stops, drawn over the price",
    about:
        "Bollinger bands take a band-shaped series of their own; the parabolic SAR is a dot " +
        "per bar, above the price while it is falling and below while it is rising.",
    build: stage => {
        const bands = bollingerBand()
            .options({ windowSize: 20, multiplier: 2, movingAverageType: "sma" })
            .merge((datum, value) => {
                datum.bb = value
            })
            .accessor(datum => datum.bb)

        const stop = sar()
            .options({ accelerationFactor: 0.02, maxAccelerationFactor: 0.2 })
            .merge((datum, value) => {
                datum.sar = value
            })
            .accessor(datum => datum.sar)

        const rows = stop(bands(daily(200)))

        // the pane has to make room for the bands, not just the candles
        const { pane } = chart(stage, rows, {
            extents: datum => [datum.high, datum.low, datum.bb?.top, datum.bb?.bottom],
        })

        const bandSeries = document.createElement("chart-bollinger-series")
        bandSeries.yAccessor = datum => datum.bb

        const candles = document.createElement("chart-candlestick-series")

        const sarSeries = document.createElement("chart-sar-series")
        sarSeries.yAccessor = datum => datum.sar

        pane.prepend(bandSeries, candles, sarSeries)

        const tooltip = document.createElement("chart-bollinger-band-tooltip")
        Object.assign(tooltip, {
            origin: [8, 12],
            yAccessor: datum => datum.bb,
            options: bands.options(),
        })
        pane.append(tooltip)
    },
})

demo({
    title: "Oscillators, each in its own pane",
    about:
        "Panes stack inside one canvas: give each a height and an origin. They share the x " +
        "scale, so panning one pans all of them.",
    build: stage => {
        const relative = rsi()
            .options({ windowSize: 14 })
            .merge((datum, value) => {
                datum.rsi = value
            })
            .accessor(datum => datum.rsi)

        const convergence = macd()
            .options({ fast: 12, slow: 26, signal: 9 })
            .merge((datum, value) => {
                datum.macd = value
            })
            .accessor(datum => datum.macd)

        const rows = convergence(relative(daily(200)))

        const provider = discontinuousTimeScaleProviderBuilder().inputDateAccessor(datum => datum.date)
        const { data, xScale, xAccessor, displayXAccessor } = provider(rows)

        const canvas = document.createElement("chart-canvas")
        Object.assign(canvas, {
            data,
            xScale,
            xAccessor,
            displayXAccessor,
            margin: { left: 0, right: 56, top: 8, bottom: 24 },
        })
        canvas.style.height = "520px"

        const pricePane = document.createElement("chart-pane")
        Object.assign(pricePane, { chartId: "price", height: 220, yExtents: price })
        pricePane.append(
            document.createElement("chart-candlestick-series"),
            Object.assign(document.createElement("chart-y-axis"), { ticks: 4, fontSize: 11 }),
        )

        const rsiPane = document.createElement("chart-pane")
        Object.assign(rsiPane, {
            chartId: "rsi",
            height: 120,
            origin: (width, height) => [0, height - 250],
            yExtents: [0, 100],
        })
        const rsiSeries = document.createElement("chart-rsi-series")
        rsiSeries.yAccessor = datum => datum.rsi
        const rsiTooltip = document.createElement("chart-rsi-tooltip")
        Object.assign(rsiTooltip, { origin: [8, 12], yAccessor: datum => datum.rsi, options: relative.options() })
        rsiPane.append(
            rsiSeries,
            Object.assign(document.createElement("chart-y-axis"), { ticks: 2, fontSize: 11 }),
            rsiTooltip,
        )

        const macdPane = document.createElement("chart-pane")
        Object.assign(macdPane, {
            chartId: "macd",
            height: 120,
            origin: (width, height) => [0, height - 120],
            yExtents: datum => datum.macd,
        })
        const macdSeries = document.createElement("chart-macd-series")
        macdSeries.yAccessor = datum => datum.macd
        const macdTooltip = document.createElement("chart-macd-tooltip")
        Object.assign(macdTooltip, {
            origin: [8, 12],
            yAccessor: datum => datum.macd,
            options: convergence.options(),
            // MACDTooltip has no default appearance — it draws each label in the colour
            // the series drew that line, so it has to be told what those colours are.
            appearance: {
                strokeStyle: { macd: "#0093FF", signal: "#D84315" },
                fillStyle: { divergence: "#4682B4" },
            },
        })
        macdPane.append(
            macdSeries,
            Object.assign(document.createElement("chart-y-axis"), { ticks: 2, fontSize: 11 }),
            Object.assign(document.createElement("chart-x-axis"), { fontSize: 11 }),
            macdTooltip,
        )

        canvas.append(pricePane, rsiPane, macdPane)
        stage.append(canvas)
    },
})

demo({
    title: "The rest of the oscillators",
    about: "Stochastic, Elder Ray, ATR and Force Index, each with the series built for it.",
    build: stage => {
        const setups = [
            {
                title: "chart-stochastic-series",
                indicator: stochasticOscillator()
                    .options({ windowSize: 14, kWindowSize: 3, dWindowSize: 3 })
                    .merge((datum, value) => {
                        datum.stochastic = value
                    })
                    .accessor(datum => datum.stochastic),
                extents: [0, 100],
                build: pane => {
                    const series = document.createElement("chart-stochastic-series")
                    series.yAccessor = datum => datum.stochastic
                    pane.prepend(series)
                },
            },
            {
                title: "chart-elder-ray-series",
                indicator: elderRay()
                    .options({ windowSize: 13 })
                    .merge((datum, value) => {
                        datum.elderRay = value
                    })
                    .accessor(datum => datum.elderRay),
                extents: datum => [datum.elderRay?.bullPower, datum.elderRay?.bearPower],
                build: pane => {
                    const series = document.createElement("chart-elder-ray-series")
                    series.yAccessor = datum => datum.elderRay
                    pane.prepend(series)
                },
            },
            {
                title: "atr, drawn as a line",
                indicator: atr()
                    .options({ windowSize: 14 })
                    .merge((datum, value) => {
                        datum.atr = value
                    })
                    .accessor(datum => datum.atr),
                extents: datum => datum.atr,
                build: pane => {
                    const series = document.createElement("chart-line-series")
                    Object.assign(series, { yAccessor: datum => datum.atr, strokeStyle: "#2a6df4" })
                    pane.prepend(series)
                },
            },
            {
                title: "forceIndex, drawn as an area",
                indicator: forceIndex()
                    .merge((datum, value) => {
                        datum.force = value
                    })
                    .accessor(datum => datum.force),
                extents: datum => datum.force,
                build: pane => {
                    const series = document.createElement("chart-alternating-fill-area-series")
                    Object.assign(series, { yAccessor: datum => datum.force, baseAt: 0 })
                    pane.prepend(series)
                },
            },
        ]

        grid(stage, setups, (host, setup) => {
            const { pane } = chart(host, setup.indicator(daily(200)), {
                height: 180,
                extents: setup.extents,
            })
            setup.build(pane)
        })
    },
})

demo({
    title: "Indicators that rewrite the data",
    about:
        "`heikinAshi` replaces every bar with a smoothed one; `compare` rebases several " +
        "series onto a common percentage so they can be read against each other.",
    build: stage => {
        grid(stage, ["heikinAshi", "compare"], (host, kind) => {
            if (kind === "heikinAshi") {
                const rows = heikinAshi()
                    .merge((datum, value) => {
                        Object.assign(datum, value)
                    })
                    .accessor(datum => datum.close)(daily(120).map(datum => ({ ...datum })))

                const { pane } = chart(host, rows, { height: 200 })
                pane.prepend(document.createElement("chart-candlestick-series"))
            } else {
                // one row per date holding both instruments, then compare() rebases them
                const mine = daily(120)
                const theirs = secondary(120)
                const paired = mine.map((datum, index) => ({ ...datum, other: theirs[index].close }))

                const rows = compare()
                    .options({ basePath: "close", mainKeys: ["close"], compareKeys: ["other"] })
                    .merge((datum, value) => {
                        Object.assign(datum, value)
                    })
                    .accessor(datum => datum.close)(paired)

                const { pane } = chart(host, rows, {
                    height: 200,
                    extents: datum => [datum.close, datum.other],
                })

                for (const [key, colour] of [
                    ["close", "#2a6df4"],
                    ["other", "#e0a800"],
                ]) {
                    const line = document.createElement("chart-line-series")
                    Object.assign(line, { yAccessor: datum => datum[key], strokeStyle: colour })
                    pane.prepend(line)
                }
            }
        })
    },
})

demo({
    title: "Elder Impulse",
    about:
        "Green when trend and momentum agree upward, red when they agree downward, blue when " +
        "they disagree. It is the only indicator built out of two others' output — and the " +
        "one export of the original library that throws on construction. See " +
        "docs/parity/indicators.md.",
    build: stage => {
        const trend = ema()
            .options({ windowSize: 13 })
            .merge((datum, value) => {
                datum.ema13 = value
            })
            .accessor(datum => datum.ema13)

        const momentum = macd()
            .options({ fast: 12, slow: 26, signal: 9 })
            .merge((datum, value) => {
                datum.macd = value
            })
            .accessor(datum => datum.macd)

        const impulse = elderImpulse()
            .macdSource(momentum.accessor())
            .emaSource(trend.accessor())
            .merge((datum, value) => {
                datum.impulse = value
            })

        const rows = impulse(momentum(trend(daily(200))))

        const { pane } = chart(stage, rows)

        const candles = document.createElement("chart-candlestick-series")
        const colours = { up: "#26a69a", down: "#ef5350", neutral: "#2a6df4" }
        Object.assign(candles, {
            fill: datum => colours[datum.impulse] ?? "#9aa1ad",
            wickStroke: datum => colours[datum.impulse] ?? "#9aa1ad",
        })

        pane.prepend(candles)
    },
})

demo({
    title: "One of your own",
    about:
        "`algo` is the machinery under all of the above with nothing filled in: a window size, " +
        "something to do with each window, and somewhere to put the answer.",
    build: stage => {
        const midpointRange = algo()
            .windowSize(10)
            .accumulator(window => {
                const high = Math.max(...window.map(datum => datum.high))
                const low = Math.min(...window.map(datum => datum.low))
                return (high + low) / 2
            })
            .merge((datum, value) => {
                datum.midpoint = value
            })

        const rows = midpointRange(daily(200).map(datum => ({ ...datum })))

        const { pane } = chart(stage, rows)

        pane.prepend(document.createElement("chart-candlestick-series"))

        const line = document.createElement("chart-line-series")
        Object.assign(line, { yAccessor: datum => datum.midpoint, strokeStyle: "#e0a800", strokeWidth: 2 })
        pane.append(line)

        const tooltip = document.createElement("chart-single-value-tooltip")
        Object.assign(tooltip, {
            origin: [8, 12],
            yLabel: "Midpoint (10)",
            yAccessor: datum => datum.midpoint,
        })
        pane.append(tooltip)
    },
})
