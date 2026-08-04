import { getStrokeDasharrayCanvas, withDefaults } from "../core/utils/index.js"
import { GenericComponent, getMouseCanvas } from "../core/GenericComponent.js"
import { defineProperties, define } from "../core/element.js"

const defaultCustomX = (props, moreProps) => {
    const { xScale, xAccessor, currentItem, mouseXY } = moreProps
    return props.snapX ? Math.round(xScale(xAccessor(currentItem))) : mouseXY[0] + 0.5
}

export const crossHairCursorDefaults = {
    customX: defaultCustomX,
    snapX: true,
    strokeStyle: "rgba(55, 71, 79, 0.8)",
    strokeDasharray: "Dash",
    strokeWidth: 1,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    ratio: 1,
}

/**
 * Two dashed lines following the pointer.
 *
 * `snapX` is on by default, so the vertical line jumps to the nearest data point rather
 * than tracking the pointer exactly — reading a value off a line that sits between two
 * candles is misleading.
 */
export const drawCrossHairCursor = (context, moreProps, props) => {
    const resolved = withDefaults(crossHairCursorDefaults, props)
    const { mouseXY, currentItem, show, height, width } = moreProps
    const { customX, strokeStyle, strokeDasharray, strokeWidth } = resolved
    const margin = props.margin ?? moreProps.margin ?? resolved.margin
    const ratio = props.ratio ?? moreProps.ratio ?? resolved.ratio

    if (!show || currentItem === undefined) return

    const horizontal = {
        x1: 0,
        x2: width,
        y1: mouseXY[1] + 0.5,
        y2: mouseXY[1] + 0.5,
        strokeStyle,
        strokeDasharray,
        strokeWidth,
    }

    const x = customX(resolved, moreProps)
    const vertical = { x1: x, x2: x, y1: 0, y2: height, strokeStyle, strokeDasharray, strokeWidth }

    context.save()
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.scale(ratio, ratio)
    context.translate(0.5 * ratio + margin.left, 0.5 * ratio + margin.top)
    ;[horizontal, vertical].forEach(line => {
        context.strokeStyle = line.strokeStyle
        context.lineWidth = line.strokeWidth
        context.setLineDash(getStrokeDasharrayCanvas(line.strokeDasharray))
        context.beginPath()
        context.moveTo(line.x1, line.y1)
        context.lineTo(line.x2, line.y2)
        context.stroke()
    })

    context.restore()
}

export class CrossHairCursor extends GenericComponent {
    #props

    constructor() {
        super()
        this.#props = defineProperties(this, crossHairCursorDefaults)
    }

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
        drawCrossHairCursor(context, moreProps, {
            ...this.#props,
            margin: this.canvas?.margin,
            ratio: this.canvas?.ratio,
        })
    }
}

define("chart-cross-hair-cursor", CrossHairCursor)
