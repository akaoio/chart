import { first, last, withDefaults } from "../core/utils/index.js"
import { getAxisCanvas, getMouseCanvas } from "../core/GenericComponent.js"
import { Series } from "./Series.js"
import { define } from "../core/element.js"

export const sarSeriesDefaults = {
    fillStyle: { falling: "#4682B4", rising: "#15EC2E" },
    strokeStyle: undefined,
    highlightOnHover: false,
    yAccessor: undefined,
}

/**
 * Parabolic SAR: a dot per period, above the price while falling and below while rising.
 *
 * The dot size follows how much room each period has, clamped between half a pixel and
 * two — dense data gets specks, sparse data gets dots, and neither turns into a smear.
 */
export const drawSARSeries = (context, moreProps, props) => {
    const { yAccessor, fillStyle, strokeStyle } = withDefaults(sarSeriesDefaults, props)

    const {
        xAccessor,
        plotData,
        xScale,
        chartConfig: { yScale },
        hovering,
    } = moreProps

    const width = xScale(xAccessor(last(plotData))) - xScale(xAccessor(first(plotData)))
    const spacing = ((width / plotData.length) * 0.5) / 2
    const radius = Math.min(2, Math.max(0.5, spacing)) + (hovering ? 2 : 0)

    plotData.forEach(datum => {
        const yValue = yAccessor(datum)
        if (yValue === undefined) return

        const falling = yValue > datum.close

        context.fillStyle = falling ? fillStyle.falling : fillStyle.rising
        if (strokeStyle !== undefined) context.strokeStyle = falling ? strokeStyle.falling : strokeStyle.rising

        context.beginPath()
        context.ellipse(xScale(xAccessor(datum)), yScale(yValue), radius, radius, 0, 0, 2 * Math.PI)
        context.closePath()
        context.fill()

        if (strokeStyle !== undefined) context.stroke()
    })
}

export const isSARHover = (moreProps, props) => {
    const {
        mouseXY,
        currentItem,
        chartConfig: { yScale },
    } = moreProps

    const currentY = yScale(props.yAccessor(currentItem))
    return mouseXY[1] < currentY + 5 && mouseXY[1] > currentY - 5
}

export class SARSeries extends Series {
    static defaults = sarSeriesDefaults
    static properties = ["onClick", "onDoubleClick", "onContextMenu"]

    get drawOn() {
        return this.seriesProps.highlightOnHover ? ["mousemove", "pan"] : ["pan"]
    }

    canvasToDraw(contexts) {
        return this.seriesProps.highlightOnHover ? getMouseCanvas(contexts) : getAxisCanvas(contexts)
    }

    isHoverTest(moreProps) {
        return this.seriesProps.highlightOnHover ? isSARHover(moreProps, this.seriesProps) : false
    }

    canvasDraw(context, moreProps) {
        drawSARSeries(context, moreProps, this.seriesProps)
    }
}

define("chart-sar-series", SARSeries)
