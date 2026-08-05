import { GenericChartComponent } from "../../core/GenericChartComponent.js"
import { getMouseCanvas } from "../../core/GenericComponent.js"
import { defineProperties, define } from "../../core/element.js"
import { isHovering2 } from "./InteractiveStraightLine.js"

export const clickableShapeDefaults = {
    show: false,
    strokeWidth: 1,
    hovering: false,
    yValue: undefined,
    text: undefined,
    textBox: undefined,
    strokeStyle: undefined,
    fontFamily: undefined,
    fontSize: undefined,
    fontStyle: undefined,
    fontWeight: undefined,
    interactiveCursorClass: undefined,
    onHover: undefined,
    onUnHover: undefined,
    onClick: undefined,
}

/**
 * Where the ✕ sits: past the label text, so it has to measure the text to know.
 * The canvas is the only thing that can answer that, hence the context argument.
 */
export const closeIconPosition = (props, moreProps, context) => {
    const { yValue, text, textBox, fontFamily, fontStyle, fontWeight, fontSize } = props

    context.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`

    const {
        chartConfig: { yScale },
    } = moreProps

    const x =
        textBox.left +
        textBox.padding.left +
        context.measureText(text).width +
        textBox.padding.right +
        textBox.closeIcon.padding.left +
        textBox.closeIcon.width / 2

    return [x, yScale(yValue)]
}

/** The ✕ that deletes an alert line. Two strokes, thicker while hovered. */
export const drawClickableShape = (context, moreProps, props, cache = {}) => {
    const resolved = { ...clickableShapeDefaults, ...props }
    const { strokeStyle, strokeWidth, hovering, textBox } = resolved

    const [x, y] = closeIconPosition(resolved, moreProps, context)

    cache.closeIcon = { x, y }

    context.beginPath()

    context.lineWidth = hovering ? strokeWidth + 1 : strokeWidth
    context.strokeStyle = strokeStyle

    const halfWidth = textBox.closeIcon.width / 2

    context.moveTo(x - halfWidth, y - halfWidth)
    context.lineTo(x + halfWidth, y + halfWidth)
    context.moveTo(x - halfWidth, y + halfWidth)
    context.lineTo(x + halfWidth, y - halfWidth)
    context.stroke()
}

/** Hovering means being near either stroke of the ✕ — not merely inside its box. */
export const isCloseIconHover = (closeIcon, textBox, mouseXY) => {
    if (closeIcon === undefined) return false

    const { x, y } = closeIcon
    const halfWidth = textBox.closeIcon.width / 2

    return (
        isHovering2([x - halfWidth, y - halfWidth], [x + halfWidth, y + halfWidth], mouseXY, 3) ||
        isHovering2([x - halfWidth, y + halfWidth], [x + halfWidth, y - halfWidth], mouseXY, 3)
    )
}

export class ClickableShape extends GenericChartComponent {
    #props
    #cache = {}

    constructor() {
        super()
        this.#props = defineProperties(this, clickableShapeDefaults)
    }

    get drawOn() {
        return ["pan", "mousemove", "drag"]
    }

    get interactiveCursorClass() {
        return this.#props.interactiveCursorClass
    }

    canvasToDraw(contexts) {
        return getMouseCanvas(contexts)
    }

    isHoverTest(moreProps) {
        if (!this.#props.show) return false
        return isCloseIconHover(this.#cache.closeIcon, this.#props.textBox, moreProps.mouseXY)
    }

    onClickWhenHover(event, moreProps) {
        this.#props.onClick?.(event, moreProps)
    }

    onHover(event, moreProps) {
        this.#props.onHover?.(event, moreProps)
    }
    onUnHover(event, moreProps) {
        this.#props.onUnHover?.(event, moreProps)
    }

    canvasDraw(context, moreProps) {
        // Bản gốc trả về null khi `show` sai, nên không có gì được vẽ và cũng không có
        // biểu tượng nào để trỏ vào.
        if (!this.#props.show) return
        drawClickableShape(context, moreProps, this.#props, this.#cache)
    }
}

define("chart-clickable-shape", ClickableShape)
