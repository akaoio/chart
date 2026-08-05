import { withDefaults } from "../core/utils/index.js"
import { getMouseCanvas } from "../core/GenericComponent.js"
import { Series } from "../series/Series.js"
import { define } from "../core/element.js"

const defaultXPosition = (props, moreProps) => moreProps.xAccessor(moreProps.currentItem)

/**
 * The pointed callout shape, drawn as one path so the stem and the box are a single
 * outline rather than two overlapping strokes.
 */
const defaultDrawCoordinate = (context, shape, props, moreProps) => {
    const { x, y, textWidth, text } = shape
    const {
        orient,
        dx,
        dy,
        bg: { padding, fill, stroke, strokeWidth },
        text: { fontSize, fill: textFill },
    } = props

    context.textAlign = "center"

    const sign = orient === "top" ? -1 : 1
    const halfWidth = Math.round(textWidth / 2 + padding.right)
    const height = Math.round(fontSize + padding.top + padding.bottom)

    context.strokeStyle = typeof stroke === "function" ? stroke(moreProps, context) : stroke
    context.fillStyle = typeof fill === "function" ? fill(moreProps, context) : fill
    context.lineWidth = typeof strokeWidth === "function" ? strokeWidth(moreProps) : strokeWidth

    context.beginPath()
    context.moveTo(x, y)
    context.lineTo(x + dx, y + sign * dy)
    context.lineTo(x + halfWidth, y + sign * dy)
    context.lineTo(x + halfWidth, y + sign * (dy + height))
    context.lineTo(x - halfWidth, y + sign * (dy + height))
    context.lineTo(x - halfWidth, y + sign * dy)
    context.lineTo(x - dx, y + sign * dy)
    context.closePath()
    context.stroke()
    context.fill()

    context.beginPath()
    context.fillStyle = typeof textFill === "function" ? textFill(moreProps, context) : textFill

    context.textBaseline = orient === "top" ? "alphabetic" : "hanging"
    const pad = orient === "top" ? padding.bottom : padding.top

    context.fillText(text, x, y + sign * (dy + pad + 2))
}

export const mouseCoordinateXV2Defaults = {
    xPosition: defaultXPosition,
    drawCoordinate: defaultDrawCoordinate,
    at: "bottom",
    orient: "bottom",
    text: {
        fontStyle: "",
        fontWeight: "",
        fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
        fontSize: 13,
        fill: "rgb(35, 35, 35)",
    },
    bg: {
        fill: "rgb(255, 255, 255)",
        stroke: "rgb(35, 35, 35)",
        strokeWidth: 1,
        padding: { left: 7, right: 7, top: 4, bottom: 4 },
    },
    dx: 7,
    dy: 7,
    displayFormat: undefined,
}

export const drawMouseCoordinateXV2 = (context, moreProps, props) => {
    const resolved = withDefaults(mouseCoordinateXV2Defaults, props)
    const { show, currentItem } = moreProps

    if (!show || currentItem == null) return

    const { at, displayFormat, text, xPosition, drawCoordinate } = resolved
    const xValue = xPosition(resolved, moreProps)

    const {
        xScale,
        chartConfig: { height },
    } = moreProps

    context.font = `${text.fontStyle} ${text.fontWeight} ${text.fontSize}px ${text.fontFamily}`

    const label = displayFormat(xValue)

    drawCoordinate(
        context,
        {
            x: Math.round(xScale(xValue)),
            y: at === "bottom" ? height : 0,
            textWidth: context.measureText(label).width,
            text: label,
        },
        resolved,
        moreProps,
    )
}

/** The date under the pointer, drawn as a pointed callout rather than a plain box. */
export class MouseCoordinateXV2 extends Series {
    static defaults = mouseCoordinateXV2Defaults

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
        drawMouseCoordinateXV2(context, moreProps, this.seriesProps)
    }
}

define("chart-mouse-coordinate-x-v2", MouseCoordinateXV2)
