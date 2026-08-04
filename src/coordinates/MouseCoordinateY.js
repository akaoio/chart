import { isNotDefined, withDefaults } from "../core/utils/index.js"
import { getMouseCanvas } from "../core/GenericComponent.js"
import { Series } from "../series/Series.js"
import { define } from "../core/element.js"
import { drawEdgeCoordinate } from "./EdgeCoordinate.js"

export const mouseCoordinateYDefaults = {
    arrowWidth: 0,
    at: "right",
    dx: 0,
    fill: "#4C525E",
    fitToText: false,
    fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
    fontSize: 13,
    opacity: 1,
    orient: "right",
    rectWidth: 50,
    rectHeight: 20,
    strokeOpacity: 1,
    strokeWidth: 1,
    textFill: "#FFFFFF",
    yAxisPad: 0,
    displayFormat: undefined,
    yAccessor: undefined,
    stroke: undefined,
}

/** Shared by the mouse readout and anything else pinning a value to the y axis. */
export const getYCoordinate = (y, coordinate, props, moreProps) => {
    const { width } = moreProps
    const { orient, at, rectWidth, rectHeight, dx, stroke, strokeOpacity, strokeWidth } = props
    const { fill, opacity, fitToText, fontFamily, fontSize, textFill, arrowWidth } = props

    return {
        coordinate,
        show: true,
        fitToText,
        type: "horizontal",
        orient,
        edgeAt: at === "right" ? width : 0,
        hideLine: true,
        fill,
        opacity,
        fontFamily,
        fontSize,
        textFill,
        stroke,
        strokeOpacity,
        strokeWidth,
        rectWidth,
        rectHeight,
        arrowWidth,
        dx,
        x1: 0,
        x2: width,
        y1: y,
        y2: y,
    }
}

/**
 * The price readout beside the cursor.
 *
 * It stays silent unless the pointer is inside this pane — otherwise every stacked pane
 * would show a price for a cursor that is nowhere near it.
 */
export const drawMouseCoordinateY = (context, moreProps, props) => {
    const resolved = withDefaults(mouseCoordinateYDefaults, props)

    const {
        chartConfig: { yScale },
        chartId,
        currentItem,
        currentCharts,
        mouseXY,
        show,
    } = moreProps

    if (!show) return
    if (isNotDefined(mouseXY)) return
    if (currentCharts.indexOf(chartId) < 0) return

    const { displayFormat, yAccessor } = resolved
    if (yAccessor && !currentItem) return

    const y = yAccessor ? yScale(yAccessor(currentItem)) : mouseXY[1]

    drawEdgeCoordinate(context, getYCoordinate(y, displayFormat(yScale.invert(y)), resolved, moreProps))
}

export class MouseCoordinateY extends Series {
    static defaults = mouseCoordinateYDefaults

    get clip() {
        return false
    }

    get drawOn() {
        return ["mousemove", "pan", "drag"]
    }

    canvasToDraw(contexts) {
        return getMouseCanvas(contexts)
    }

    canvasDraw(context, moreProps) {
        drawMouseCoordinateY(context, moreProps, this.seriesProps)
    }
}

define("chart-mouse-coordinate-y", MouseCoordinateY)
