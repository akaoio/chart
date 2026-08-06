import { hitSlop } from "../../core/utils/dom.js"
import { isNotDefined } from "../../core/utils/index.js"
import { GenericChartComponent } from "../../core/GenericChartComponent.js"
import { getMouseCanvas } from "../../core/GenericComponent.js"
import { defineProperties, define } from "../../core/element.js"

export const interactiveCyclesDefaults = {
    x1Value: undefined,
    y1Value: undefined,
    x2Value: undefined,
    y2Value: undefined,
    offsets: undefined,
    strokeStyle: "#000000",
    strokeWidth: 1,
    tolerance: 4,
    selected: false,
    interactiveCursorClass: undefined,
    onHover: undefined,
    onUnHover: undefined,
    onDragStart: undefined,
    onDrag: undefined,
    onDragComplete: undefined,
}

/**
 * Các vạch chu kỳ trong pixel: hai điểm định một chu kỳ |x2 − x1|, vạch dọc
 * lặp từ x1 về phía phải cho tới mép domain. Chặn 500 vạch — chu kỳ một nến
 * trên một domain dài không được phép treo tab.
 */
export const cycleLines = (props, moreProps) => {
    const { x1Value, x2Value, offsets } = { ...interactiveCyclesDefaults, ...props }
    const {
        xScale,
        chartConfig: { height },
    } = moreProps

    const period = x2Value - x1Value
    if (!period) return []

    // Có `offsets` thì không lặp đều nữa: mỗi bội số một vạch, đúng dãy được giao —
    // Fib time zone giao dãy Fibonacci. Vạch ngoài khung để canvas tự cắt.
    if (offsets !== undefined) return offsets.map(k => ({ x: xScale(x1Value + k * period), height }))

    const [, domainRight] = xScale.domain()
    const step = Math.abs(period)
    const lines = []
    for (let x = Math.min(x1Value, x2Value); x <= domainRight && lines.length < 500; x += step) {
        lines.push({ x: xScale(x), height })
    }
    return lines
}

export const drawInteractiveCycles = (context, moreProps, props) => {
    const resolved = { ...interactiveCyclesDefaults, ...props }
    const lines = cycleLines(resolved, moreProps)

    context.lineWidth = resolved.strokeWidth
    context.strokeStyle = resolved.strokeStyle
    for (const line of lines) {
        context.beginPath()
        context.moveTo(line.x, 0)
        context.lineTo(line.x, line.height)
        context.stroke()
    }
}

export const isCyclesHover = (moreProps, props) => {
    const resolved = { ...interactiveCyclesDefaults, ...props }
    const {
        mouseXY: [mouseX],
    } = moreProps
    const reach = resolved.tolerance + hitSlop(moreProps)

    for (const line of cycleLines(resolved, moreProps)) if (Math.abs(mouseX - line.x) <= reach) return true
    return false
}

/** Cyclic lines: two points set the period, vertical lines repeat rightward to the domain edge. */
export class InteractiveCycles extends GenericChartComponent {
    #props

    constructor() {
        super()
        this.#props = defineProperties(this, interactiveCyclesDefaults)
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
        return isCyclesHover(moreProps, this.#props)
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
        drawInteractiveCycles(context, moreProps, this.#props)
    }
}

define("chart-interactive-cycles", InteractiveCycles)
