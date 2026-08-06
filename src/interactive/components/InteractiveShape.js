import { hitSlop } from "../../core/utils/dom.js"
import { getStrokeDasharrayCanvas } from "../../core/utils/index.js"
import { GenericChartComponent } from "../../core/GenericChartComponent.js"
import { getMouseCanvas } from "../../core/GenericComponent.js"
import { defineProperties, define } from "../../core/element.js"

export const interactiveShapeDefaults = {
    shape: "rectangle",
    x1Value: undefined,
    y1Value: undefined,
    x2Value: undefined,
    y2Value: undefined,
    strokeStyle: "#000000",
    strokeWidth: 1,
    strokeDasharray: "Solid",
    fillStyle: "rgba(138, 175, 226, 0.35)",
    tolerance: 4,
    selected: false,
    interactiveCursorClass: undefined,
    onHover: undefined,
    onUnHover: undefined,
    onDragStart: undefined,
    onDrag: undefined,
    onDragComplete: undefined,
}

/** The shape's box in pixels, normalised so x/y always name the top-left corner. */
export const shapeBox = (props, moreProps) => {
    const { x1Value, y1Value, x2Value, y2Value } = { ...interactiveShapeDefaults, ...props }
    const {
        xScale,
        chartConfig: { yScale },
    } = moreProps

    const [xa, xb] = [xScale(x1Value), xScale(x2Value)]
    const [ya, yb] = [yScale(y1Value), yScale(y2Value)]

    return {
        x: Math.min(xa, xb),
        y: Math.min(ya, yb),
        width: Math.abs(xb - xa),
        height: Math.abs(yb - ya),
    }
}

export const drawInteractiveShape = (context, moreProps, props) => {
    const resolved = { ...interactiveShapeDefaults, ...props }
    const { shape, strokeStyle, strokeWidth, strokeDasharray, fillStyle } = resolved
    const { x, y, width, height } = shapeBox(resolved, moreProps)

    context.lineWidth = strokeWidth
    context.strokeStyle = strokeStyle
    context.fillStyle = fillStyle
    context.setLineDash(getStrokeDasharrayCanvas(strokeDasharray))

    context.beginPath()
    if (shape === "ellipse") context.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, 2 * Math.PI)
    else context.rect(x, y, width, height)
    context.fill()
    context.stroke()
    context.setLineDash([])
}

/**
 * Trúng ở đâu cũng là trúng: cả lòng lẫn viền.
 *
 * TradingView chọn hình khi bấm vào lòng hình, không bắt người dùng nhắm trúng viền —
 * hình có fill thì cái fill chính là bề mặt bấm. Elip kiểm bằng phương trình elip
 * chuẩn hoá thay vì hộp bao, để góc hộp không tính là trúng.
 */
export const isShapeHover = (moreProps, props) => {
    const resolved = { ...interactiveShapeDefaults, ...props }
    const {
        mouseXY: [mouseX, mouseY],
    } = moreProps
    const tolerance = resolved.tolerance + hitSlop(moreProps)
    const { x, y, width, height } = shapeBox(resolved, moreProps)

    if (resolved.shape === "ellipse") {
        const rx = width / 2 + tolerance
        const ry = height / 2 + tolerance
        if (rx <= 0 || ry <= 0) return false
        const nx = (mouseX - (x + width / 2)) / rx
        const ny = (mouseY - (y + height / 2)) / ry
        return nx * nx + ny * ny <= 1
    }

    return mouseX >= x - tolerance && mouseX <= x + width + tolerance && mouseY >= y - tolerance && mouseY <= y + height + tolerance
}

/** A filled rectangle or ellipse the user drew, spanned between two data-space corners. */
export class InteractiveShape extends GenericChartComponent {
    #props

    constructor() {
        super()
        this.#props = defineProperties(this, interactiveShapeDefaults)
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
        return isShapeHover(moreProps, this.#props)
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
        drawInteractiveShape(context, moreProps, this.#props)
    }
}

define("chart-interactive-shape", InteractiveShape)
