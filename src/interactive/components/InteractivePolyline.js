import { hitSlop } from "../../core/utils/dom.js"
import { isNotDefined } from "../../core/utils/index.js"
import { GenericChartComponent } from "../../core/GenericChartComponent.js"
import { getMouseCanvas } from "../../core/GenericComponent.js"
import { defineProperties, define } from "../../core/element.js"
import { isHovering2 } from "./InteractiveStraightLine.js"

export const interactivePolylineDefaults = {
    points: [],
    labels: [],
    strokeStyle: "#000000",
    strokeWidth: 1,
    fillStyle: "rgba(138, 175, 226, 0.2)",
    fillTriangles: false,
    fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
    fontSize: 11,
    fontFill: "#000000",
    tolerance: 4,
    selected: false,
    interactiveCursorClass: undefined,
    onHover: undefined,
    onUnHover: undefined,
    onDragStart: undefined,
    onDrag: undefined,
    onDragComplete: undefined,
}

/** The polyline in pixel space: vertices plus the segments between them. */
export const polylineGeometry = (props, moreProps) => {
    const { points } = { ...interactivePolylineDefaults, ...props }
    const {
        xScale,
        chartConfig: { yScale },
    } = moreProps

    const vertices = points.map(([xValue, yValue]) => [xScale(xValue), yScale(yValue)])
    const segments = []
    for (let index = 1; index < vertices.length; index++) segments.push([vertices[index - 1], vertices[index]])
    return { vertices, segments }
}

export const drawInteractivePolyline = (context, moreProps, props) => {
    const resolved = { ...interactivePolylineDefaults, ...props }
    const { labels, strokeStyle, strokeWidth, fillStyle, fillTriangles, fontFamily, fontSize, fontFill } = resolved
    const { vertices } = polylineGeometry(resolved, moreProps)
    if (vertices.length < 2) return

    // Fill kieu XABCD: cac tam giac goi len nhau buoc 2 — (0,1,2), (2,3,4), …
    if (fillTriangles) {
        context.fillStyle = fillStyle
        for (let index = 0; index + 2 < vertices.length; index += 2) {
            context.beginPath()
            context.moveTo(vertices[index][0], vertices[index][1])
            context.lineTo(vertices[index + 1][0], vertices[index + 1][1])
            context.lineTo(vertices[index + 2][0], vertices[index + 2][1])
            context.closePath()
            context.fill()
        }
    }

    context.lineWidth = strokeWidth
    context.strokeStyle = strokeStyle
    context.beginPath()
    context.moveTo(vertices[0][0], vertices[0][1])
    for (let index = 1; index < vertices.length; index++) context.lineTo(vertices[index][0], vertices[index][1])
    context.stroke()

    // Nhan dinh: dinh nao la cuc dai cuc bo thi chu nam tren, con lai nam duoi —
    // de chu khong de len chinh duong gap khuc.
    context.font = `${fontSize}px ${fontFamily}`
    context.fillStyle = fontFill
    context.textAlign = "center"
    labels.forEach((label, index) => {
        const vertex = vertices[index]
        if (!vertex || !label) return
        const previous = vertices[index - 1]?.[1] ?? Infinity
        const next = vertices[index + 1]?.[1] ?? Infinity
        const isPeak = vertex[1] <= previous && vertex[1] <= next
        context.fillText(label, vertex[0], vertex[1] + (isPeak ? -8 : fontSize + 6))
    })
    context.textAlign = "start"
}

export const isPolylineHover = (moreProps, props) => {
    const resolved = { ...interactivePolylineDefaults, ...props }
    const {
        mouseXY: [mouseX, mouseY],
    } = moreProps
    const reach = resolved.tolerance + hitSlop(moreProps)
    const { segments } = polylineGeometry(resolved, moreProps)

    for (const [start, end] of segments) if (isHovering2(start, end, [mouseX, mouseY], reach)) return true
    return false
}

/** A hand-drawn polyline through N points, with per-vertex labels — the body every pattern tool shares. */
export class InteractivePolyline extends GenericChartComponent {
    #props

    constructor() {
        super()
        this.#props = defineProperties(this, interactivePolylineDefaults)
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
        if (this.#props.onHover === undefined) return false
        if (isNotDefined(this.#props.points) || this.#props.points.length < 2) return false
        return isPolylineHover(moreProps, this.#props)
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
        drawInteractivePolyline(context, moreProps, this.#props)
    }
}

define("chart-interactive-polyline", InteractivePolyline)
