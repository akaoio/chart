import { getStrokeDasharrayCanvas } from "../../core/utils/index.js"
import { GenericChartComponent } from "../../core/GenericChartComponent.js"
import { getMouseCanvas } from "../../core/GenericComponent.js"
import { defineProperties, define } from "../../core/element.js"

/** Undefined slope means vertical — there is no `y = mx + b` for a vertical line. */
export const getSlope = (start, end) => (end[0] === start[0] ? undefined : (end[1] - start[1]) / (end[0] - start[0]))

export const getYIntercept = (slope, end) => -1 * slope * end[0] + end[1]

/**
 * Where a line actually ends, given how far the user meant it to go.
 *
 * `LINE` stops at the two points. `RAY` runs from the first point to the edge of the
 * chart. `XLINE` crosses the whole chart in both directions. The difference matters
 * because a trendline drawn on two candles is usually meant to keep going — and if it
 * extends, it has to be recomputed every time the domain moves.
 */
export const generateLine = ({ type, start, end, xScale, yScale }) => {
    const slope = getSlope(start, end)
    const intercept = getYIntercept(slope, start)

    switch (type) {
        case "XLINE":
            return getXLineCoordinates({ start, end, xScale, yScale, m: slope, b: intercept })
        case "RAY":
            return getRayCoordinates({ start, end, xScale, yScale, m: slope, b: intercept })
        default:
        case "LINE":
            return getLineCoordinates({ start, end })
    }
}

const getXLineCoordinates = ({ start, end, xScale, yScale, m, b }) => {
    const [xBegin, xFinish] = xScale.domain()
    const [yBegin, yFinish] = yScale.domain()

    if (end[0] === start[0]) return { x1: end[0], y1: yBegin, x2: end[0], y2: yFinish }

    const [x1, x2] = end[0] > start[0] ? [xBegin, xFinish] : [xFinish, xBegin]

    return { x1, y1: m * x1 + b, x2, y2: m * x2 + b }
}

const getRayCoordinates = ({ start, end, xScale, yScale, m, b }) => {
    const [xBegin, xFinish] = xScale.domain()
    const [yBegin, yFinish] = yScale.domain()

    const x1 = start[0]

    if (end[0] === start[0]) {
        return { x1, y1: start[1], x2: x1, y2: end[1] > start[1] ? yFinish : yBegin }
    }

    const x2 = end[0] > start[0] ? xFinish : xBegin

    return { x1, y1: m * x1 + b, x2, y2: m * x2 + b }
}

const getLineCoordinates = ({ start, end }) => {
    const [x1, y1] = start
    const [x2, y2] = end

    if (end[0] === start[0]) return { x1, y1: start[1], x2: x1, y2: end[1] }

    return { x1, y1, x2, y2 }
}

/**
 * Is the pointer near a line segment, in pixels?
 *
 * Solves the line and measures vertical distance, then checks the pointer is between the
 * ends — otherwise every point on an infinite extension of the line would count as a hit.
 * Vertical lines have no slope, so they get their own branch.
 */
export const isHovering2 = (start, end, [mouseX, mouseY], tolerance) => {
    const slope = getSlope(start, end)

    if (slope !== undefined) {
        const y = slope * mouseX + getYIntercept(slope, end)

        return (
            mouseY < y + tolerance &&
            mouseY > y - tolerance &&
            mouseX > Math.min(start[0], end[0]) - tolerance &&
            mouseX < Math.max(start[0], end[0]) + tolerance
        )
    }

    return (
        mouseY >= Math.min(start[1], end[1]) &&
        mouseY <= Math.max(start[1], end[1]) &&
        mouseX < start[0] + tolerance &&
        mouseX > start[0] - tolerance
    )
}

/** The same test, but starting from data values rather than pixels. */
export const isHovering = ({ x1Value, y1Value, x2Value, y2Value, mouseXY, type, tolerance, xScale, yScale }) => {
    const line = generateLine({ type, start: [x1Value, y1Value], end: [x2Value, y2Value], xScale, yScale })

    return isHovering2([xScale(line.x1), yScale(line.y1)], [xScale(line.x2), yScale(line.y2)], mouseXY, tolerance)
}

export const interactiveStraightLineDefaults = {
    edgeStrokeWidth: 3,
    edgeStroke: "#000000",
    edgeFill: "#FFFFFF",
    r: 10,
    withEdge: false,
    strokeWidth: 1,
    strokeDasharray: "Solid",
    tolerance: 7,
    selected: false,
    type: "LINE",
    x1Value: undefined,
    y1Value: undefined,
    x2Value: undefined,
    y2Value: undefined,
    strokeStyle: undefined,
    interactiveCursorClass: undefined,
    onHover: undefined,
    onUnHover: undefined,
    onDragStart: undefined,
    onDrag: undefined,
    onDragComplete: undefined,
}

export const drawInteractiveStraightLine = (context, moreProps, props) => {
    const { x1Value, x2Value, y1Value, y2Value, type, strokeWidth, strokeDasharray, strokeStyle } = {
        ...interactiveStraightLineDefaults,
        ...props,
    }

    const {
        xScale,
        chartConfig: { yScale },
    } = moreProps

    const line = generateLine({ type, start: [x1Value, y1Value], end: [x2Value, y2Value], xScale, yScale })

    context.lineWidth = strokeWidth
    context.strokeStyle = strokeStyle
    context.setLineDash(getStrokeDasharrayCanvas(strokeDasharray))

    context.beginPath()
    context.moveTo(xScale(line.x1), yScale(line.y1))
    context.lineTo(xScale(line.x2), yScale(line.y2))
    context.stroke()
}

/** A straight line the user drew — bounded, one-ended or crossing the whole pane. */
export class InteractiveStraightLine extends GenericChartComponent {
    #props

    constructor() {
        super()
        this.#props = defineProperties(this, interactiveStraightLineDefaults)
    }

    get drawOn() {
        return ["mousemove", "pan", "drag"]
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
        const { tolerance, onHover, x1Value, x2Value, y1Value, y2Value, type } = this.#props
        if (onHover === undefined) return false

        return isHovering({
            x1Value,
            y1Value,
            x2Value,
            y2Value,
            mouseXY: moreProps.mouseXY,
            type,
            tolerance,
            xScale: moreProps.xScale,
            yScale: moreProps.chartConfig.yScale,
        })
    }

    /**
     * Chuyển tiếp callback từ property sang hook.
     *
     * Kể từ khi hook được tra trên chuỗi prototype (xem `GenericComponent`), property và
     * hook trùng tên không còn che nhau nữa — nhưng cũng nghĩa là component phải nối
     * chúng lại một cách tường minh. Đổi lại: đọc mã là thấy ngay cái nào gọi cái nào.
     */
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
        drawInteractiveStraightLine(context, moreProps, this.#props)
    }
}

define("chart-interactive-straight-line", InteractiveStraightLine)
