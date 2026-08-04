import { line } from "d3-shape"
import { getClosestItemIndexes, getStrokeDasharrayCanvas, withDefaults } from "../core/utils/index.js"
import { getAxisCanvas, getMouseCanvas } from "../core/GenericComponent.js"
import { Series } from "./Series.js"
import { define } from "../core/element.js"

export const lineSeriesDefaults = {
    connectNulls: false,
    defined: value => value !== undefined && !isNaN(value),
    hoverStrokeWidth: 4,
    hoverTolerance: 6,
    highlightOnHover: false,
    strokeDasharray: "Solid",
    strokeStyle: "#2196f3",
    strokeWidth: 1,
    yAccessor: undefined,
    curve: undefined,
    canvasClip: undefined,
}

/** A line through the data. */
export const drawLineSeries = (context, moreProps, props) => {
    const {
        connectNulls,
        yAccessor,
        hoverStrokeWidth,
        defined,
        curve,
        canvasClip,
        strokeStyle,
        strokeWidth,
        lineDash = getStrokeDasharrayCanvas(props.strokeDasharray),
    } = withDefaults(lineSeriesDefaults, props)

    const { xAccessor, xScale, chartConfig, plotData, hovering } = moreProps
    if (!chartConfig) return

    const { yScale } = chartConfig

    if (canvasClip !== undefined) {
        context.save()
        canvasClip(context, moreProps)
    }

    context.lineWidth = hovering ? hoverStrokeWidth : strokeWidth

    if (strokeStyle !== undefined) context.strokeStyle = strokeStyle
    if (lineDash !== undefined) context.setLineDash(lineDash)

    const dataSeries = line()
        .x(datum => Math.round(xScale(xAccessor(datum))))
        .y(datum => Math.round(yScale(yAccessor(datum))))

    if (curve !== undefined) dataSeries.curve(curve)
    if (!connectNulls) dataSeries.defined(datum => defined(yAccessor(datum)))

    context.beginPath()
    dataSeries.context(context)(plotData)
    context.stroke()

    if (canvasClip !== undefined) context.restore()
}

/**
 * Is the pointer near the line?
 *
 * Between two data points there is no point to measure to, so it solves the straight
 * line between them and asks how far the pointer is from that — which is why a thin
 * diagonal line is grabbable anywhere along it, not just at its vertices.
 */
export const isLineHover = (moreProps, props) => {
    const { highlightOnHover, yAccessor, hoverTolerance } = withDefaults(lineSeriesDefaults, props)
    if (!highlightOnHover) return false

    const {
        chartConfig: { yScale, origin },
        xAccessor,
        mouseXY,
        currentItem,
        xScale,
        plotData,
    } = moreProps

    const [x, y] = mouseXY
    const radius = hoverTolerance

    const { left, right } = getClosestItemIndexes(plotData, xScale.invert(x), xAccessor)

    if (left === right) {
        const cy = yScale(yAccessor(currentItem)) + origin[1]
        const cx = xScale(xAccessor(currentItem)) + origin[0]

        return Math.pow(x - cx, 2) + Math.pow(y - cy, 2) < Math.pow(radius, 2)
    }

    const leftItem = plotData[left]
    const rightItem = plotData[right]
    const x1 = xScale(xAccessor(leftItem)) + origin[0]
    const y1 = yScale(yAccessor(leftItem)) + origin[1]
    const x2 = xScale(xAccessor(rightItem)) + origin[0]
    const y2 = yScale(yAccessor(rightItem)) + origin[1]

    const slope = (y2 - y1) / (x2 - x1)
    const intercept = -1 * slope * x1 + y1
    const desiredY = Math.round(slope * x + intercept)

    return y >= desiredY - radius && y <= desiredY + radius
}

export class LineSeries extends Series {
    static defaults = lineSeriesDefaults
    static properties = ["onClick", "onDoubleClick", "onHover", "onUnHover", "onContextMenu"]

    /** Hovering means redrawing on every mouse move, so it moves to the top canvas. */
    get #interactive() {
        const { highlightOnHover } = this.seriesProps
        return highlightOnHover || this.onHover !== undefined || this.onUnHover !== undefined
    }

    get drawOn() {
        return this.#interactive ? ["mousemove", "pan"] : ["pan"]
    }

    canvasToDraw(contexts) {
        return this.#interactive ? getMouseCanvas(contexts) : getAxisCanvas(contexts)
    }

    isHoverTest(moreProps) {
        return isLineHover(moreProps, this.seriesProps)
    }

    canvasDraw(context, moreProps) {
        drawLineSeries(context, moreProps, this.seriesProps)
    }

    onClickWhenHover(event, moreProps) {
        this.seriesProps.onClick?.(event, moreProps)
    }

    onDoubleClickWhenHover(event, moreProps) {
        this.seriesProps.onDoubleClick?.(event, moreProps)
    }

    onContextMenuWhenHover(event, moreProps) {
        this.seriesProps.onContextMenu?.(event, moreProps)
    }
}

define("chart-line-series", LineSeries)
