import { format } from "d3-format"
import { first, functor, last, noop, withDefaults } from "../core/utils/index.js"
import { Series } from "../series/Series.js"
import { define } from "../core/element.js"
import { drawEdgeCoordinate } from "./EdgeCoordinate.js"

export const edgeIndicatorDefaults = {
    fitToText: false,
    lineStroke: "#000000",
    lineOpacity: 1,
    lineStrokeDasharray: "ShortDot",
    orient: "right",
    displayFormat: format(".2f"),
    edgeAt: "right",
    yAxisPad: 0,
    rectHeight: 20,
    rectWidth: 50,
    arrowWidth: 0,
    fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
    fontSize: 13,
    dx: 0,
    hideLine: false,
    fill: "#8a8a8a",
    opacity: 1,
    stroke: noop,
    strokeOpacity: 1,
    strokeWidth: 1,
    textFill: "#FFFFFF",
    type: "horizontal",
    itemType: "last",
    yAccessor: undefined,
    fullWidth: undefined,
}

/**
 * The value of the first or last visible point, pinned to the axis.
 *
 * This is what keeps the current price readable when the cursor is elsewhere — it tracks
 * the data, not the pointer, so it stays put while the crosshair moves.
 */
export const drawEdgeIndicator = (context, moreProps, props) => {
    const resolved = withDefaults(edgeIndicatorDefaults, props)
    const { itemType, yAccessor } = resolved
    const { plotData } = moreProps

    const item = itemType === "first" ? first(plotData, yAccessor) : last(plotData, yAccessor)
    if (item === undefined) return

    const {
        fontFamily,
        fontSize,
        type,
        displayFormat,
        edgeAt,
        yAxisPad,
        orient,
        lineStroke,
        fill,
        fullWidth,
        textFill,
        rectHeight,
        rectWidth,
        arrowWidth,
        stroke,
    } = resolved

    const {
        xScale,
        chartConfig: { yScale },
        xAccessor,
        width,
    } = moreProps

    const yValue = yAccessor(item)
    if (yValue === undefined) return

    const x1 = fullWidth ? 0 : Math.round(xScale(xAccessor(item)))
    const y1 = Math.round(yScale(yValue))

    drawEdgeCoordinate(context, {
        ...resolved,
        coordinate: displayFormat(yValue),
        show: true,
        type,
        orient,
        edgeAt: edgeAt === "left" ? 0 - yAxisPad : width + yAxisPad,
        fill: functor(fill)(item),
        lineStroke: functor(lineStroke)(item),
        stroke: functor(stroke)(item),
        fontFamily,
        fontSize,
        textFill: functor(textFill)(item),
        rectHeight,
        rectWidth,
        arrowWidth,
        x1,
        y1,
        x2: width,
        y2: y1,
    })
}

export class EdgeIndicator extends Series {
    static defaults = edgeIndicatorDefaults

    get clip() {
        return false
    }

    get edgeClip() {
        return true
    }

    canvasDraw(context, moreProps) {
        drawEdgeIndicator(context, moreProps, this.seriesProps)
    }
}

define("chart-edge-indicator", EdgeIndicator)
