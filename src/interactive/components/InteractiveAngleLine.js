import { hitSlop } from "../../core/utils/dom.js"
import { isNotDefined } from "../../core/utils/index.js"
import { GenericChartComponent } from "../../core/GenericChartComponent.js"
import { getMouseCanvas } from "../../core/GenericComponent.js"
import { defineProperties, define } from "../../core/element.js"
import { isHovering2 } from "./InteractiveStraightLine.js"

export const interactiveAngleLineDefaults = {
    x1Value: undefined,
    y1Value: undefined,
    angle: 0,
    length: 0,
    strokeStyle: "#000000",
    strokeWidth: 1,
    fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
    fontSize: 11,
    fontFill: "#000000",
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
 * Hai đầu của đường góc, trong pixel. Neo đầu là toạ độ dữ liệu; góc và độ
 * dài là đại lượng MÀN HÌNH — đúng cách TradingView làm với Trend Angle:
 * đổi scale hay zoom thì đường giữ nguyên góc trên màn hình, còn điểm cuối
 * trôi theo dữ liệu. Nhãn độ vì thế không bao giờ nói dối.
 */
export const angleLineEndpoints = (props, moreProps) => {
    const resolved = { ...interactiveAngleLineDefaults, ...props }
    const {
        xScale,
        chartConfig: { yScale },
    } = moreProps

    const p1 = [xScale(resolved.x1Value), yScale(resolved.y1Value)]
    const radians = (resolved.angle * Math.PI) / 180
    const p2 = [p1[0] + Math.cos(radians) * resolved.length, p1[1] - Math.sin(radians) * resolved.length]
    return { p1, p2, radians }
}

export const drawAngleLine = (context, moreProps, props) => {
    const resolved = { ...interactiveAngleLineDefaults, ...props }
    const { p1, p2, radians } = angleLineEndpoints(resolved, moreProps)

    context.lineWidth = resolved.strokeWidth
    context.strokeStyle = resolved.strokeStyle
    context.beginPath()
    context.moveTo(p1[0], p1[1])
    context.lineTo(p2[0], p2[1])
    context.stroke()

    // Đường chuẩn ngang + cung góc — cái làm con số đọc được bằng mắt
    const reference = Math.min(48, resolved.length)
    context.save()
    context.setLineDash([4, 4])
    context.beginPath()
    context.moveTo(p1[0], p1[1])
    context.lineTo(p1[0] + reference, p1[1])
    context.stroke()
    context.restore()

    if (resolved.length > 12) {
        context.beginPath()
        context.arc(p1[0], p1[1], Math.min(22, resolved.length / 2), 0, -radians, radians > 0)
        context.stroke()
    }

    const half = radians / 2
    context.font = `${resolved.fontSize}px ${resolved.fontFamily}`
    context.fillStyle = resolved.fontFill
    context.textAlign = "left"
    context.fillText(`${Math.round(resolved.angle)}°`, p1[0] + Math.cos(half) * 34, p1[1] - Math.sin(half) * 34 + 4)
}

export const isAngleLineHover = (moreProps, props) => {
    const resolved = { ...interactiveAngleLineDefaults, ...props }
    const { mouseXY } = moreProps
    const reach = resolved.tolerance + hitSlop(moreProps)
    const { p1, p2 } = angleLineEndpoints(resolved, moreProps)
    return isHovering2(p1, p2, mouseXY, reach)
}

/** One trend angle: a data-anchored start, a screen-space angle and length, a label that reads the true degrees. */
export class InteractiveAngleLine extends GenericChartComponent {
    #props

    constructor() {
        super()
        this.#props = defineProperties(this, interactiveAngleLineDefaults)
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
        if (isNotDefined(this.#props.x1Value) || isNotDefined(this.#props.y1Value)) return false
        return isAngleLineHover(moreProps, this.#props)
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
        drawAngleLine(context, moreProps, this.#props)
    }
}

define("chart-interactive-angle-line", InteractiveAngleLine)
