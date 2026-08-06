import { hitSlop } from "../../core/utils/dom.js"
import { isNotDefined } from "../../core/utils/index.js"
import { GenericChartComponent } from "../../core/GenericChartComponent.js"
import { getMouseCanvas } from "../../core/GenericComponent.js"
import { defineProperties, define } from "../../core/element.js"
import { isHovering2 } from "./InteractiveStraightLine.js"

export const interactiveFreehandDefaults = {
    points: undefined,
    mode: "brush",
    strokeStyle: "#000000",
    strokeWidth: 2,
    highlighterWidth: 14,
    highlighterOpacity: 0.35,
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
 * Một nét vẽ tay: chuỗi điểm neo dữ liệu nối bằng nét tròn đầu — brush là
 * nét mảnh đặc, highlighter là nét rộng mờ (globalAlpha) như bút dạ quang.
 * Điểm neo theo dữ liệu nên zoom/pan là nét co giãn cùng biểu đồ, đúng cách
 * TradingView làm với Brush/Highlighter.
 */
export const drawFreehand = (context, moreProps, props) => {
    const resolved = { ...interactiveFreehandDefaults, ...props }
    const {
        xScale,
        chartConfig: { yScale },
    } = moreProps
    if (isNotDefined(resolved.points) || resolved.points.length < 2) return

    const highlighter = resolved.mode === "highlighter"
    context.save()
    context.lineWidth = highlighter ? resolved.highlighterWidth : resolved.strokeWidth
    context.strokeStyle = resolved.strokeStyle
    context.globalAlpha = highlighter ? resolved.highlighterOpacity : 1
    context.lineCap = "round"
    context.lineJoin = "round"

    context.beginPath()
    context.moveTo(xScale(resolved.points[0][0]), yScale(resolved.points[0][1]))
    for (const [xValue, yValue] of resolved.points.slice(1)) context.lineTo(xScale(xValue), yScale(yValue))
    context.stroke()
    context.restore()
}

export const isFreehandHover = (moreProps, props) => {
    const resolved = { ...interactiveFreehandDefaults, ...props }
    const {
        mouseXY,
        xScale,
        chartConfig: { yScale },
    } = moreProps
    const width = resolved.mode === "highlighter" ? resolved.highlighterWidth / 2 : 0
    const reach = resolved.tolerance + width + hitSlop(moreProps)

    let previous = null
    for (const [xValue, yValue] of resolved.points) {
        const point = [xScale(xValue), yScale(yValue)]
        if (previous !== null && isHovering2(previous, point, mouseXY, reach)) return true
        previous = point
    }
    return false
}

/** One freehand stroke the user drew: a run of data-anchored points with round joins. */
export class InteractiveFreehand extends GenericChartComponent {
    #props

    constructor() {
        super()
        this.#props = defineProperties(this, interactiveFreehandDefaults)
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
        return isFreehandHover(moreProps, this.#props)
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
        drawFreehand(context, moreProps, this.#props)
    }
}

define("chart-interactive-freehand", InteractiveFreehand)
