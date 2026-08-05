import { hitSlop } from "../../core/utils/dom.js"
import { getStrokeDasharrayCanvas } from "../../core/utils/index.js"
import { GenericChartComponent } from "../../core/GenericChartComponent.js"
import { getMouseCanvas } from "../../core/GenericComponent.js"
import { defineProperties, define } from "../../core/element.js"
import { getYCoordinate } from "../../coordinates/MouseCoordinateY.js"
import { drawEdgeCoordinate } from "../../coordinates/EdgeCoordinate.js"

export const interactiveYCoordinateDefaults = {
    fontWeight: "normal",
    strokeWidth: 1,
    tolerance: 4,
    selected: false,
    hovering: false,
    yValue: undefined,
    text: undefined,
    textBox: undefined,
    edge: undefined,
    bgFillStyle: undefined,
    textFill: undefined,
    strokeStyle: undefined,
    strokeDasharray: undefined,
    fontFamily: undefined,
    fontSize: undefined,
    fontStyle: undefined,
    interactiveCursorClass: undefined,
    onHover: undefined,
    onUnHover: undefined,
    onDragStart: undefined,
    onDrag: undefined,
    onDragComplete: undefined,
}

/**
 * The line and its label box — or nothing at all.
 *
 * An alert whose price has scrolled off the pane returns `undefined` rather than drawing
 * at a clamped edge: a line pinned to the top of the chart would read as an alert at that
 * price, which it is not.
 */
export const interactiveYCoordinateGeometry = (props, moreProps) => {
    const { yValue, textBox } = props
    const {
        chartConfig: { width, yScale, height },
    } = moreProps

    const y = Math.round(yScale(yValue))

    if (y < 0 || y > height) return undefined

    return {
        x1: 0,
        x2: width,
        y,
        rect: { x: textBox.left, y: y - textBox.height / 2, height: textBox.height },
    }
}

/** How wide the label box is: padding, the text itself, then room for the ✕. */
export const interactiveYCoordinateWidth = (props, context) => {
    const { textBox, text } = props
    return (
        textBox.padding.left +
        context.measureText(text).width +
        textBox.padding.right +
        textBox.closeIcon.padding.left +
        textBox.closeIcon.width +
        textBox.closeIcon.padding.right
    )
}

export const drawInteractiveYCoordinate = (context, moreProps, props, cache = {}) => {
    const resolved = { ...interactiveYCoordinateDefaults, ...props }
    const { bgFillStyle, textFill, strokeStyle, strokeWidth, strokeDasharray } = resolved
    const { fontFamily, fontSize, fontStyle, fontWeight } = resolved
    const { text, textBox, edge, selected, hovering, yValue } = resolved

    const values = interactiveYCoordinateGeometry(resolved, moreProps)
    if (values === undefined) return

    const { x1, x2, y, rect } = values

    context.strokeStyle = strokeStyle

    context.beginPath()
    context.lineWidth = selected || hovering ? strokeWidth + 1 : strokeWidth
    context.textBaseline = "middle"
    context.textAlign = "start"
    context.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`

    const width = interactiveYCoordinateWidth(resolved, context)
    cache.width = width

    // Đường đứt ở HAI đoạn, chừa chỗ cho hộp chữ ở giữa — chứ không vẽ đè qua nó
    context.setLineDash(getStrokeDasharrayCanvas(strokeDasharray))
    context.moveTo(x1, y)
    context.lineTo(rect.x, y)

    context.moveTo(rect.x + width, y)
    context.lineTo(x2, y)
    context.stroke()

    context.setLineDash([])

    context.fillStyle = bgFillStyle

    context.fillRect(rect.x, rect.y, width, rect.height)
    context.strokeRect(rect.x, rect.y, width, rect.height)

    context.fillStyle = textFill

    context.beginPath()
    context.fillText(text, rect.x + 10, y)

    const yCoordinate = getYCoordinate(y, edge.displayFormat(yValue), { ...edge, textFill, fontFamily, fontSize }, moreProps)
    drawEdgeCoordinate(context, yCoordinate)
}

/** Hovering means the label box, or the line itself within four pixels. */
export const isInteractiveYCoordinateHover = (props, moreProps, width) => {
    const values = interactiveYCoordinateGeometry(props, moreProps)
    if (values === undefined) return false

    const { x1, x2, y, rect } = values
    const [mouseX, mouseY] = moreProps.mouseXY

    if (mouseX >= rect.x && mouseX <= rect.x + width && mouseY >= rect.y && mouseY <= rect.y + rect.height) return true

    return x1 <= mouseX && x2 >= mouseX && Math.abs(mouseY - y) < 4
}

/** A price alert: a line across the pane with a label at the left and a ✕ to remove it. */
export class InteractiveYCoordinate extends GenericChartComponent {
    #props
    #cache = { width: 0 }

    constructor() {
        super()
        this.#props = defineProperties(this, interactiveYCoordinateDefaults)
    }

    get drawOn() {
        return ["mousemove", "mouseleave", "pan", "drag"]
    }

    /** Nhãn nằm ở lề, ngoài vùng vẽ — cắt theo vùng vẽ thì mất nửa cái nhãn. */
    get clip() {
        return false
    }

    /** Kéo được ngay khi trỏ vào, không cần chọn trước: đây là thứ hay bị kéo. */
    get enableDragOnHover() {
        return true
    }

    get interactiveCursorClass() {
        return this.#props.interactiveCursorClass
    }

    isHoverTest(moreProps) {
        if (this.#props.onHover === undefined) return false
        return isInteractiveYCoordinateHover(
            { ...this.#props, tolerance: this.#props.tolerance + hitSlop(moreProps) },
            moreProps,
            this.#cache.width,
        )
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

    canvasToDraw(contexts) {
        return getMouseCanvas(contexts)
    }

    canvasDraw(context, moreProps) {
        drawInteractiveYCoordinate(context, moreProps, this.#props, this.#cache)
    }
}

define("chart-interactive-y-coordinate", InteractiveYCoordinate)
