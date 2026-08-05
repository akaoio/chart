import { group } from "d3-array"
import { functor, isDefined, withDefaults } from "../core/utils/index.js"
import { Series } from "./Series.js"
import { define } from "../core/element.js"

export const ohlcSeriesDefaults = {
    yAccessor: datum => ({ open: datum.open, high: datum.high, low: datum.low, close: datum.close }),
    stroke: datum => (isDefined(datum.absoluteChange) ? (datum.absoluteChange > 0 ? "#26a69a" : "#ef5350") : "#000000"),
    strokeWidth: 1,
    clip: true,
}

/**
 * The open-high-low-close bar: a vertical line from high to low, with the open ticking
 * out to the left and the close to the right.
 *
 * Bar width comes from how much room each point has rather than from a ratio, and the
 * stroke is capped at that width so tightly packed bars stay distinguishable.
 */
export const getOHLCBars = (moreProps, props) => {
    const { stroke, strokeWidth: strokeWidthProp, yAccessor } = withDefaults(ohlcSeriesDefaults, props)
    const { xAccessor, xScale, chartConfig, plotData } = moreProps
    const { yScale } = chartConfig

    const strokeFunc = functor(stroke)

    const width = xScale(xAccessor(plotData[plotData.length - 1])) - xScale(xAccessor(plotData[0]))
    const barWidth = Math.max(1, Math.round(width / (plotData.length - 1) / 2) - 1.5)
    const strokeWidth = Math.min(barWidth, strokeWidthProp)

    const bars = plotData
        .filter(datum => yAccessor(datum).close !== undefined)
        .map(datum => {
            const ohlc = yAccessor(datum)
            const x = Math.round(xScale(xAccessor(datum)))

            return {
                x,
                y1: yScale(ohlc.high),
                y2: yScale(ohlc.low),
                openX1: x - barWidth,
                openX2: x + strokeWidth / 2,
                openY: yScale(ohlc.open),
                closeX1: x - strokeWidth / 2,
                closeX2: x + barWidth,
                closeY: yScale(ohlc.close),
                stroke: strokeFunc(datum),
            }
        })

    return { barWidth, strokeWidth, bars }
}

export const drawOHLCSeries = (context, moreProps, props) => {
    const { strokeWidth, bars } = getOHLCBars(moreProps, props)

    context.lineWidth = strokeWidth

    group(bars, bar => bar.stroke).forEach((values, key) => {
        context.strokeStyle = key

        values.forEach(bar => {
            context.beginPath()
            context.moveTo(bar.x, bar.y1)
            context.lineTo(bar.x, bar.y2)

            context.moveTo(bar.openX1, bar.openY)
            context.lineTo(bar.openX2, bar.openY)

            context.moveTo(bar.closeX1, bar.closeY)
            context.lineTo(bar.closeX2, bar.closeY)

            context.stroke()
        })
    })
}

/** The open-high-low-close bar: high to low, with open ticking left and close right. */
export class OHLCSeries extends Series {
    static defaults = ohlcSeriesDefaults

    get clip() {
        return this.seriesProps.clip
    }

    canvasDraw(context, moreProps) {
        drawOHLCSeries(context, moreProps, this.seriesProps)
    }
}

define("chart-ohlc-series", OHLCSeries)
