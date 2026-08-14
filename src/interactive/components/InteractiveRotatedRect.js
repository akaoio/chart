import { hitSlop } from "../../core/utils/dom.js"
import { isDefined, isNotDefined } from "../../core/utils/index.js"
import { GenericChartComponent } from "../../core/GenericChartComponent.js"
import { getMouseCanvas } from "../../core/GenericComponent.js"
import { defineProperties, define } from "../../core/element.js"

export const interactiveRotatedRectDefaults = {
    p1: undefined,
    p2: undefined,
    p3: undefined,
    strokeStyle: "#000000",
    strokeWidth: 1,
    fillStyle: "rgba(138, 175, 226, 0.35)",
    tolerance: 7,
    selected: false,
    interactiveCursorClass: undefined,
    onHover: undefined,
    onUnHover: undefined,
    onDragStart: undefined,
    onDrag: undefined,
    onDragComplete: undefined,
}

/**
 * The four corners of a rotated rectangle, in pixel space.
 *
 * The object keeps THREE data anchors: P1–P2 is one edge, and P3's perpendicular
 * distance from that edge is the width. Perpendicularity only means anything on the
 * screen — x is an index, y a price, and an angle between them is dimensional
 * nonsense — so the corners are derived here, in pixels, on every draw. Computed
 * once per pass; draw and hit test read the same list (kỷ luật fib-shape).
 */
export const rotatedRectCorners = (props, moreProps) => {
    const { p1, p2, p3 } = { ...interactiveRotatedRectDefaults, ...props }
    const {
        xScale,
        chartConfig: { yScale },
    } = moreProps

    if (isNotDefined(p1) || isNotDefined(p2) || isNotDefined(p3)) return []

    const a = [xScale(p1[0]), yScale(p1[1])]
    const b = [xScale(p2[0]), yScale(p2[1])]
    const c = [xScale(p3[0]), yScale(p3[1])]

    const edge = [b[0] - a[0], b[1] - a[1]]
    const length = Math.hypot(edge[0], edge[1])
    if (length === 0) return []

    // thành phần của AC vuông góc với AB — bề rộng có dấu
    const normal = [-edge[1] / length, edge[0] / length]
    const width = (c[0] - a[0]) * normal[0] + (c[1] - a[1]) * normal[1]
    const shift = [normal[0] * width, normal[1] * width]

    return [a, b, [b[0] + shift[0], b[1] + shift[1]], [a[0] + shift[0], a[1] + shift[1]]]
}

export const drawInteractiveRotatedRect = (context, moreProps, props) => {
    const resolved = { ...interactiveRotatedRectDefaults, ...props }
    const corners = rotatedRectCorners(resolved, moreProps)
    if (corners.length === 0) return

    const { strokeStyle, strokeWidth, fillStyle } = resolved

    context.beginPath()
    context.moveTo(corners[0][0], corners[0][1])
    for (const corner of corners.slice(1)) context.lineTo(corner[0], corner[1])
    context.closePath()

    context.fillStyle = fillStyle
    context.fill()
    context.lineWidth = strokeWidth
    context.strokeStyle = strokeStyle
    context.stroke()
}

/** Trúng cả lòng lẫn viền — cùng phép thử ray-casting cho tứ giác bất kỳ. */
export const isRotatedRectHover = (moreProps, props) => {
    const resolved = { ...interactiveRotatedRectDefaults, ...props }
    if (resolved.onHover === undefined) return false

    const corners = rotatedRectCorners(resolved, moreProps)
    if (corners.length === 0) return false

    const {
        mouseXY: [x, y],
    } = moreProps
    const reach = resolved.tolerance + hitSlop(moreProps)

    let inside = false
    for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
        const [xi, yi] = corners[i]
        const [xj, yj] = corners[j]
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
        // gần một cạnh cũng tính — viền mảnh không được khó trỏ hơn lòng
        const t = Math.max(0, Math.min(1, ((x - xi) * (xj - xi) + (y - yi) * (yj - yi)) / ((xj - xi) ** 2 + (yj - yi) ** 2 || 1)))
        const near = Math.hypot(x - (xi + t * (xj - xi)), y - (yi + t * (yj - yi)))
        if (near <= reach) return true
    }
    return inside
}

/** A rectangle whose edges need not follow the axes: three data anchors, corners derived in pixels. */
export class InteractiveRotatedRect extends GenericChartComponent {
    #props

    constructor() {
        super()
        this.#props = defineProperties(this, interactiveRotatedRectDefaults)
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
        return isRotatedRectHover(moreProps, this.#props)
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
        drawInteractiveRotatedRect(context, moreProps, this.#props)
    }
}

define("chart-interactive-rotated-rect", InteractiveRotatedRect)
