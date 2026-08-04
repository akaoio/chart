import { isDefined, isNotDefined, withDefaults } from "../core/utils/index.js"
import { Series } from "./Series.js"
import { define } from "../core/element.js"

export const kagiSeriesDefaults = {
    currentValueStroke: "#000000",
    fill: { yang: "none", yin: "none" },
    stroke: { yang: "#26a69a", yin: "#ef5350" },
    strokeWidth: 2,
}

/**
 * Split the data into runs that share a direction.
 *
 * Kagi ignores time almost entirely: the line only turns when price reverses by more
 * than a threshold, and each turn starts a new segment with the opposite thickness. The
 * input already carries `changeTo`/`changePoint` marking where those turns fall.
 */
export const getKagiLines = (plotData, xAccessor) => {
    const kagiLine = []
    let kagi = {}
    let datum = plotData[0]
    let index = xAccessor(datum)

    for (let i = 0; i < plotData.length; i++) {
        datum = plotData[i]

        if (isNotDefined(datum.close)) continue
        if (isNotDefined(kagi.type)) kagi.type = datum.startAs
        if (isNotDefined(kagi.plot)) kagi.plot = []

        index = xAccessor(datum)
        kagi.plot.push([index, datum.open])

        if (isDefined(datum.changeTo)) {
            kagi.plot.push([index, datum.changePoint])
            kagi.added = true
            kagiLine.push(kagi)

            kagi = { type: datum.changeTo, plot: [], added: false }
            kagi.plot.push([index, datum.changePoint])
        }
    }

    if (!kagi.added) {
        kagi.plot.push([index, datum.close, datum.current, datum.reverseAt])
        kagiLine.push(kagi)
    }

    return kagiLine
}

/** Every step is drawn as a right angle: across at the old level, then vertically. */
export const drawKagiSeries = (context, moreProps, props) => {
    const { stroke, strokeWidth, currentValueStroke } = withDefaults(kagiSeriesDefaults, props)

    const {
        xAccessor,
        xScale,
        chartConfig: { yScale },
        plotData,
    } = moreProps

    const paths = getKagiLines(plotData, xAccessor)
    let begin = true

    paths.forEach(each => {
        context.strokeStyle = stroke[each.type]
        if (strokeWidth !== undefined) context.lineWidth = strokeWidth

        context.beginPath()
        let previousX

        each.plot.forEach(point => {
            const [x, y] = [xScale(point[0]), yScale(point[1])]

            if (begin) {
                context.moveTo(x, y)
                begin = false
            } else {
                if (isDefined(previousX)) context.lineTo(previousX, y)
                context.lineTo(x, y)
            }

            previousX = x
        })

        context.stroke()
    })

    // The two stubs at the right edge: current price, and the level a reversal needs
    const lastPlot = paths[paths.length - 1].plot
    const lastPoint = lastPlot[lastPlot.length - 1]

    context.beginPath()
    context.lineWidth = 1

    const [x, y1, y2] = [xScale(lastPoint[0]), yScale(lastPoint[2]), yScale(lastPoint[3])]

    context.moveTo(x, y1)
    context.lineTo(x + 10, y1)
    context.stroke()

    context.beginPath()
    if (currentValueStroke !== undefined) context.strokeStyle = currentValueStroke
    context.moveTo(x - 10, y2)
    context.lineTo(x, y2)
    context.stroke()
}

export class KagiSeries extends Series {
    static defaults = kagiSeriesDefaults

    canvasDraw(context, moreProps) {
        drawKagiSeries(context, moreProps, this.seriesProps)
    }
}

define("chart-kagi-series", KagiSeries)
