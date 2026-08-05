import { isDefined, isNotDefined } from "../../core/utils/index.js"
import { GenericChartComponent } from "../../core/GenericChartComponent.js"
import { getMouseCanvas } from "../../core/GenericComponent.js"
import { defineProperties, define } from "../../core/element.js"
import { generateLine, isHovering } from "./InteractiveStraightLine.js"

export const channelWithAreaDefaults = {
    type: "LINE",
    strokeWidth: 1,
    tolerance: 4,
    selected: false,
    startXY: undefined,
    endXY: undefined,
    dy: undefined,
    strokeStyle: undefined,
    fillStyle: undefined,
    interactiveCursorClass: undefined,
    onHover: undefined,
    onUnHover: undefined,
    onDragStart: undefined,
    onDrag: undefined,
    onDragComplete: undefined,
}

/**
 * Two parallel lines with the space between them filled.
 *
 * The second line is the first shifted by `dy` — a single number, not a second pair of
 * points. That is what keeps the channel parallel no matter how either end is dragged:
 * parallelism is not maintained, it is structural.
 */
export const channelLines = (props, moreProps) => {
    const { startXY, endXY, dy, type } = props
    const { xScale } = moreProps

    if (isNotDefined(startXY) || isNotDefined(endXY)) return {}

    const line1 = generateLine({ type, start: startXY, end: endXY, xScale, yScale: undefined })
    const line2 = isDefined(dy) ? { ...line1, y1: line1.y1 + dy, y2: line1.y2 + dy } : undefined

    return { line1, line2 }
}

const toPixels = (props, moreProps) => {
    const lines = channelLines(props, moreProps)
    const {
        xScale,
        chartConfig: { yScale },
    } = moreProps

    const line1 =
        lines.line1 !== undefined
            ? {
                  x1: xScale(lines.line1.x1),
                  y1: yScale(lines.line1.y1),
                  x2: xScale(lines.line1.x2),
                  y2: yScale(lines.line1.y2),
              }
            : undefined

    const line2 =
        lines.line2 !== undefined
            ? { x1: line1.x1, y1: yScale(lines.line2.y1), x2: line1.x2, y2: yScale(lines.line2.y2) }
            : undefined

    return { lines, line1, line2 }
}

export const drawChannelWithArea = (context, moreProps, props) => {
    const { strokeStyle, strokeWidth, fillStyle } = { ...channelWithAreaDefaults, ...props }
    const { line1, line2 } = toPixels({ ...channelWithAreaDefaults, ...props }, moreProps)

    if (line1 === undefined) return

    const { x1, y1, x2, y2 } = line1

    context.lineWidth = strokeWidth
    context.strokeStyle = strokeStyle

    context.beginPath()
    context.moveTo(x1, y1)
    context.lineTo(x2, y2)
    context.stroke()

    if (line2 === undefined) return

    const { y1: line2Y1, y2: line2Y2 } = line2

    context.beginPath()
    context.moveTo(x1, line2Y1)
    context.lineTo(x2, line2Y2)
    context.stroke()

    context.fillStyle = fillStyle
    context.beginPath()
    context.moveTo(x1, y1)
    context.lineTo(x2, y2)
    context.lineTo(x2, line2Y2)
    context.lineTo(x1, line2Y1)
    context.closePath()
    context.fill()
}

/** Hovering either edge counts — the filled middle is not a target. */
export const isChannelHover = (moreProps, props) => {
    const resolved = { ...channelWithAreaDefaults, ...props }
    const { tolerance, onHover } = resolved
    if (onHover === undefined) return false

    const { lines } = toPixels(resolved, moreProps)
    if (lines.line1 === undefined || lines.line2 === undefined) return false

    const {
        mouseXY,
        xScale,
        chartConfig: { yScale },
    } = moreProps

    const near = line =>
        isHovering({
            x1Value: line.x1,
            y1Value: line.y1,
            x2Value: line.x2,
            y2Value: line.y2,
            type: "LINE",
            mouseXY,
            tolerance,
            xScale,
            yScale,
        })

    return near(lines.line1) || near(lines.line2)
}

/** Two parallel lines with the space between them filled. */
export class ChannelWithArea extends GenericChartComponent {
    #props

    constructor() {
        super()
        this.#props = defineProperties(this, channelWithAreaDefaults)
    }

    get drawOn() {
        return ["mousemove", "mouseleave", "pan", "drag"]
    }

    get selected() {
        return this.#props.selected
    }

    get interactiveCursorClass() {
        return this.#props.interactiveCursorClass
    }

    canvasToDraw(contexts) {
        return getMouseCanvas(contexts)
    }

    isHoverTest(moreProps) {
        return isChannelHover(moreProps, this.#props)
    }

    onHover(event, moreProps) {
        this.#props.onHover?.(event, moreProps)
    }
    onUnHover(event, moreProps) {
        this.#props.onUnHover?.(event, moreProps)
    }
    onDragStart(event, moreProps) {
        this.#props.onDragStart?.(event, moreProps)
    }
    onDrag(event, moreProps) {
        this.#props.onDrag?.(event, moreProps)
    }
    onDragComplete(event, moreProps) {
        this.#props.onDragComplete?.(event, moreProps)
    }

    canvasDraw(context, moreProps) {
        drawChannelWithArea(context, moreProps, this.#props)
    }
}

define("chart-channel-with-area", ChannelWithArea)
