import { isNotDefined, withDefaults } from "../core/utils/index.js"
import { getMouseCanvas } from "../core/GenericComponent.js"
import { Series } from "../series/Series.js"
import { define } from "../core/element.js"
import { drawEdgeCoordinate } from "./EdgeCoordinate.js"

const defaultCustomX = (props, moreProps) => {
    const { xScale, xAccessor, currentItem, mouseXY, displayXAccessor } = moreProps
    const { snapX, displayFormat } = props

    const x = snapX ? xScale(xAccessor(currentItem)) : mouseXY[0]
    const coordinate = snapX ? displayFormat(displayXAccessor(currentItem)) : displayFormat(xScale.invert(x))

    return { x, coordinate }
}

export const mouseCoordinateXDefaults = {
    at: "bottom",
    customX: defaultCustomX,
    fill: "#4C525E",
    fitToText: true,
    fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
    fontSize: 13,
    opacity: 1,
    orient: "bottom",
    rectWidth: 80,
    rectHeight: 20,
    snapX: true,
    strokeOpacity: 1,
    strokeWidth: 1,
    textFill: "#FFFFFF",
    yAxisPad: 0,
    displayFormat: undefined,
    stroke: undefined,
    rectRadius: undefined,
}

/** The time readout under the cursor, in a tab against the x axis. */
export const drawMouseCoordinateX = (context, moreProps, props) => {
    const resolved = withDefaults(mouseCoordinateXDefaults, props)

    const {
        show,
        currentItem,
        chartConfig: { height },
    } = moreProps

    if (isNotDefined(currentItem)) return

    const { customX, orient, at, rectRadius, rectWidth, rectHeight, stroke, strokeOpacity, strokeWidth } = resolved
    const { fill, opacity, fitToText, fontFamily, fontSize, textFill } = resolved

    const { x, coordinate } = customX(resolved, moreProps)

    drawEdgeCoordinate(context, {
        coordinate,
        fitToText,
        show,
        type: "vertical",
        orient,
        edgeAt: at === "bottom" ? height : 0,
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
        rectRadius,
        arrowWidth: 0,
        x1: x,
        x2: x,
        y1: 0,
        y2: height,
    })
}

export class MouseCoordinateX extends Series {
    static defaults = mouseCoordinateXDefaults

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
        drawMouseCoordinateX(context, moreProps, this.seriesProps)
    }
}

define("chart-mouse-coordinate-x", MouseCoordinateX)
