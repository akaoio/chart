import { hitSlop } from "../../core/utils/dom.js"
import { isNotDefined } from "../../core/utils/index.js"
import { GenericChartComponent } from "../../core/GenericChartComponent.js"
import { getMouseCanvas } from "../../core/GenericComponent.js"
import { defineProperties, define } from "../../core/element.js"
import { isHovering2 } from "./InteractiveStraightLine.js"

export const interactiveArrowDefaults = {
    x1Value: undefined,
    y1Value: undefined,
    x2Value: undefined,
    y2Value: undefined,
    strokeStyle: "#000000",
    strokeWidth: 2,
    headSize: 10,
    tolerance: 7,
    selected: false,
    interactiveCursorClass: undefined,
    onHover: undefined,
    onUnHover: undefined,
    onDragStart: undefined,
    onDrag: undefined,
    onDragComplete: undefined,
}

export const drawInteractiveArrow = (context, moreProps, props) => {
    const resolved = { ...interactiveArrowDefaults, ...props }
    const { x1Value, y1Value, x2Value, y2Value, strokeStyle, strokeWidth, headSize } = resolved
    const {
        xScale,
        chartConfig: { yScale },
    } = moreProps

    const x1 = xScale(x1Value)
    const y1 = yScale(y1Value)
    const x2 = xScale(x2Value)
    const y2 = yScale(y2Value)
    const angle = Math.atan2(y2 - y1, x2 - x1)

    context.lineWidth = strokeWidth
    context.strokeStyle = strokeStyle
    context.fillStyle = strokeStyle
    context.beginPath()
    context.moveTo(x1, y1)
    context.lineTo(x2, y2)
    context.stroke()

    context.beginPath()
    context.moveTo(x2, y2)
    context.lineTo(x2 - headSize * Math.cos(angle - Math.PI / 6), y2 - headSize * Math.sin(angle - Math.PI / 6))
    context.lineTo(x2 - headSize * Math.cos(angle + Math.PI / 6), y2 - headSize * Math.sin(angle + Math.PI / 6))
    context.closePath()
    context.fill()
}

export const isArrowHover = (moreProps, props) => {
    const resolved = { ...interactiveArrowDefaults, ...props }
    const {
        mouseXY,
        xScale,
        chartConfig: { yScale },
    } = moreProps
    const reach = resolved.tolerance + hitSlop(moreProps)
    return isHovering2(
        [xScale(resolved.x1Value), yScale(resolved.y1Value)],
        [xScale(resolved.x2Value), yScale(resolved.y2Value)],
        mouseXY,
        reach,
    )
}

/** An arrow the user drew: a bounded line with a filled head at its end. */
export class InteractiveArrow extends GenericChartComponent {
    #props

    constructor() {
        super()
        this.#props = defineProperties(this, interactiveArrowDefaults)
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
        if (isNotDefined(this.#props.x1Value) || isNotDefined(this.#props.x2Value)) return false
        return isArrowHover(moreProps, this.#props)
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
        drawInteractiveArrow(context, moreProps, this.#props)
    }
}

define("chart-interactive-arrow", InteractiveArrow)
