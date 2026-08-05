import { hitSlop } from "../../core/utils/dom.js"
import { GenericChartComponent } from "../../core/GenericChartComponent.js"
import { getMouseCanvas } from "../../core/GenericComponent.js"
import { defineProperties, define } from "../../core/element.js"

export const clickableCircleDefaults = {
    className: "chart-interactive-line-edge",
    show: false,
    cx: undefined,
    cy: undefined,
    r: 6,
    fillStyle: "#FFFFFF",
    strokeStyle: "#000000",
    strokeWidth: 1,
    xyProvider: undefined,
    interactiveCursorClass: undefined,
    onDragStart: undefined,
    onDrag: undefined,
    onDragComplete: undefined,
}

const positionOf = (props, moreProps) => {
    if (props.xyProvider !== undefined) return props.xyProvider(moreProps)

    const {
        xScale,
        chartConfig: { yScale },
    } = moreProps

    return [xScale(props.cx), yScale(props.cy)]
}

export const drawClickableCircle = (context, moreProps, props) => {
    const { strokeStyle, strokeWidth, fillStyle, r } = { ...clickableCircleDefaults, ...props }

    context.lineWidth = strokeWidth
    context.fillStyle = fillStyle
    context.strokeStyle = strokeStyle

    const [x, y] = positionOf({ ...clickableCircleDefaults, ...props }, moreProps)

    context.beginPath()
    context.arc(x, y, r, 0, 2 * Math.PI, false)
    context.fill()
    context.stroke()
}

/**
 * A grab handle at the end of a drawn object.
 *
 * The hit area is seven pixels larger than the circle in every direction — a six-pixel
 * dot is almost impossible to grab otherwise, and the handle exists precisely so that a
 * line can be adjusted rather than redrawn.
 */
export const isClickableCircleHover = (moreProps, props) => {
    const resolved = { ...clickableCircleDefaults, ...props }
    const reach = resolved.r + 7
    const [x, y] = positionOf(resolved, moreProps)
    const [mouseX, mouseY] = moreProps.mouseXY

    return x - reach < mouseX && mouseX < x + reach && y - reach < mouseY && mouseY < y + reach
}

/** A grab handle at the end of a drawn object. */
export class ClickableCircle extends GenericChartComponent {
    #props

    constructor() {
        super()
        this.#props = defineProperties(this, clickableCircleDefaults)
    }

    get drawOn() {
        return ["pan", "mousemove", "drag"]
    }

    /** Always "selected", so it is draggable the moment it is shown. */
    get selected() {
        return true
    }

    get interactiveCursorClass() {
        return this.#props.interactiveCursorClass
    }

    isHoverTest(moreProps) {
        // Chốt kéo đo bằng bán kính, nên nới bán kính. `r` chỉ đi vào phép dò trúng ở đây;
        // phần vẽ đọc `r` riêng, nên chốt không to ra trên màn hình.
        return this.#props.show
            ? isClickableCircleHover(moreProps, { ...this.#props, r: this.#props.r + hitSlop(moreProps) })
            : false
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
        if (!this.#props.show) return
        drawClickableCircle(context, moreProps, this.#props)
    }
}

define("chart-clickable-circle", ClickableCircle)
