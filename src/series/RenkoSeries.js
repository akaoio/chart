import { isDefined, withDefaults } from "../core/utils/index.js"
import { Series } from "./Series.js"
import { define } from "../core/element.js"

export const renkoSeriesDefaults = {
    clip: true,
    fill: { up: "#26a69a", down: "#ef5350", partial: "#4682B4" },
    stroke: { up: "none", down: "none" },
    yAccessor: datum => ({ open: datum.open, high: datum.high, low: datum.low, close: datum.close }),
}

/**
 * Renko bricks: one fixed-size block per price move, time ignored.
 *
 * A brick still forming is filled in a third colour, so it is visible that the last
 * block may still change — a Renko chart that hides this reads as more settled than it is.
 */
export const getRenkoBricks = (moreProps, props) => {
    const { fill, stroke, yAccessor } = withDefaults(renkoSeriesDefaults, props)

    const {
        xAccessor,
        xScale,
        chartConfig: { yScale },
        plotData,
    } = moreProps

    const width = xScale(xAccessor(plotData[plotData.length - 1])) - xScale(xAccessor(plotData[0]))
    const candleWidth = width / (plotData.length - 1)

    return plotData
        .filter(datum => isDefined(yAccessor(datum).close))
        .map(datum => {
            const ohlc = yAccessor(datum)
            const rising = ohlc.open <= ohlc.close

            return {
                fillStyle: datum.fullyFormed ? (rising ? fill?.up : fill?.down) : fill?.partial,
                strokeStyle: datum.fullyFormed ? (rising ? stroke?.up : stroke?.down) : undefined,
                height: Math.abs(yScale(ohlc.open) - yScale(ohlc.close)),
                width: candleWidth,
                x: xScale(xAccessor(datum)) - 0.5 * candleWidth,
                y: yScale(Math.max(ohlc.open, ohlc.close)),
            }
        })
}

export const drawRenkoSeries = (context, moreProps, props) => {
    getRenkoBricks(moreProps, props).forEach(brick => {
        const { fillStyle, strokeStyle } = brick

        context.beginPath()

        if (strokeStyle !== undefined) context.strokeStyle = strokeStyle
        if (fillStyle !== undefined) context.fillStyle = fillStyle

        context.rect(brick.x, brick.y, brick.width, brick.height)
        context.closePath()
        context.fill()
    })
}

/** Renko bricks: one fixed-size block per price move, time ignored. */
export class RenkoSeries extends Series {
    static defaults = renkoSeriesDefaults

    get clip() {
        return this.seriesProps.clip
    }

    canvasDraw(context, moreProps) {
        drawRenkoSeries(context, moreProps, this.seriesProps)
    }
}

define("chart-renko-series", RenkoSeries)
