import { GenericChartComponent } from "../../core/GenericChartComponent.js"
import { getMouseCanvas } from "../../core/GenericComponent.js"
import { defineProperties, define } from "../../core/element.js"

export const interactiveTextDefaults = {
    type: "SD",
    fontWeight: "normal",
    tolerance: 4,
    selected: false,
    position: undefined,
    text: undefined,
    textFill: undefined,
    bgFillStyle: undefined,
    bgStroke: undefined,
    bgStrokeWidth: undefined,
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

/** Where the box lands: centred on the point, padded by one font size on every side. */
export const interactiveTextGeometry = (props, moreProps, textWidth) => {
    const { position, fontSize } = { ...interactiveTextDefaults, ...props }
    const {
        xScale,
        chartConfig: { yScale },
    } = moreProps

    const [xValue, yValue] = position
    const x = xScale(xValue)
    const y = yScale(yValue)

    return {
        x,
        y,
        rect: {
            x: x - textWidth / 2 - fontSize,
            y: y - fontSize,
            width: textWidth + fontSize * 2,
            height: fontSize * 2,
        },
    }
}

/**
 * A label the user placed on the chart.
 *
 * The width of the box depends on the width of the text, which only a canvas can tell us —
 * so the measurement happens while drawing and is remembered in `cache`. That is why the
 * label cannot be hovered until it has been drawn once: before the first draw nobody knows
 * how wide it is. The original works the same way, for the same reason.
 */
export const drawInteractiveText = (context, moreProps, props, cache = {}) => {
    const resolved = { ...interactiveTextDefaults, ...props }
    const { bgFillStyle, bgStrokeWidth, bgStroke, textFill, text, selected } = resolved
    const { fontFamily, fontSize, fontStyle, fontWeight } = resolved

    if (cache.textWidth === undefined) {
        context.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`
        cache.textWidth = context.measureText(text).width
    }

    const { x, y, rect } = interactiveTextGeometry(resolved, moreProps, cache.textWidth ?? 0)

    context.fillStyle = bgFillStyle

    context.beginPath()
    context.fillRect(rect.x, rect.y, rect.width, rect.height)

    if (selected) {
        context.strokeStyle = bgStroke
        context.lineWidth = bgStrokeWidth
        context.strokeRect(rect.x, rect.y, rect.width, rect.height)
    }

    context.fillStyle = textFill
    context.textBaseline = "middle"
    context.textAlign = "center"
    context.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`

    context.beginPath()
    context.fillText(text, x, y)
}

/** Is the pointer inside the box? Answerable only once the text has been measured. */
export const isTextHover = (props, moreProps, textWidth) => {
    if (textWidth === undefined) return false

    const { rect } = interactiveTextGeometry(props, moreProps, textWidth)
    const [x, y] = moreProps.mouseXY

    return x >= rect.x && y >= rect.y && x <= rect.x + rect.width && y <= rect.y + rect.height
}

export class InteractiveText extends GenericChartComponent {
    #props
    #cache = {}

    constructor() {
        super()
        this.#props = defineProperties(this, interactiveTextDefaults)
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

    /** Text or font changed: the remembered width is stale, measure again next draw. */
    propertyChanged(name) {
        if (["text", "fontStyle", "fontWeight", "fontSize", "fontFamily"].includes(name)) this.#cache = {}
    }

    isHoverTest(moreProps) {
        if (this.#props.onHover === undefined) return false
        return isTextHover(this.#props, moreProps, this.#cache.textWidth)
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
        drawInteractiveText(context, moreProps, this.#props, this.#cache)
    }
}

define("chart-interactive-text", InteractiveText)
