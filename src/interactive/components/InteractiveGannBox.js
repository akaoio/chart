import { hitSlop } from "../../core/utils/dom.js"
import { isNotDefined } from "../../core/utils/index.js"
import { GenericChartComponent } from "../../core/GenericChartComponent.js"
import { getMouseCanvas } from "../../core/GenericComponent.js"
import { defineProperties, define } from "../../core/element.js"
import { isHovering2 } from "./InteractiveStraightLine.js"

export const interactiveGannBoxDefaults = {
    x1Value: undefined,
    y1Value: undefined,
    x2Value: undefined,
    y2Value: undefined,
    variant: "box",
    scaleRatio: undefined,
    levels: [0.25, 0.382, 0.5, 0.618, 0.75],
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
 * Hình học của hộp Gann, tính MỘT LẦN trong pixel: bốn cạnh, vạch chia hai
 * trục tại các mức, và với variant `square` thêm hai đường chéo cùng quạt
 * tia từ neo đầu qua các mức trên hai cạnh xa. Vẽ và dò trúng cùng đọc một
 * danh sách đoạn — không thể lệch nhau. Một bảng mức dùng chung cho cả hai
 * trục; TradingView cho hai bảng riêng, đây là tập con trung thực.
 */
export const gannBoxGeometry = (props, moreProps) => {
    const resolved = { ...interactiveGannBoxDefaults, ...props }
    const {
        xScale,
        chartConfig: { yScale },
    } = moreProps

    /**
     * `squareFixed` khoá tỉ lệ giá/nến — cách TradingView làm: chiều cao KHÔNG
     * lấy từ neo thứ hai mà suy từ chiều rộng nhân `scaleRatio` (giá mỗi nến),
     * dấu theo hướng kéo. Ratio hiện cạnh neo thứ hai, như TV.
     */
    const fixed = resolved.variant === "squareFixed" && resolved.scaleRatio !== undefined
    const y2Data = fixed
        ? resolved.y1Value +
          Math.sign(resolved.y2Value - resolved.y1Value || 1) *
              Math.abs(resolved.x2Value - resolved.x1Value) *
              resolved.scaleRatio
        : resolved.y2Value

    const x1 = xScale(resolved.x1Value)
    const y1 = yScale(resolved.y1Value)
    const x2 = xScale(resolved.x2Value)
    const y2 = yScale(y2Data)
    const geometry = { segments: [], labels: [] }
    if (x1 === x2 || y1 === y2) return geometry

    if (fixed)
        geometry.labels.push({ x: x2 + 6, y: y2 + 3, text: `1 : ${Number(resolved.scaleRatio.toPrecision(4))}`, align: "left" })

    geometry.segments.push(
        [[x1, y1], [x2, y1]],
        [[x1, y2], [x2, y2]],
        [[x1, y1], [x1, y2]],
        [[x2, y1], [x2, y2]],
    )

    // `levels: undefined` nghĩa là "dùng bảng mặc định", không phải "không vạch nào"
    const levels = resolved.levels ?? interactiveGannBoxDefaults.levels
    const dx = x2 - x1
    const dy = y2 - y1
    for (const level of levels) {
        const y = y1 + dy * level
        const x = x1 + dx * level
        geometry.segments.push([[x1, y], [x2, y]], [[x, y1], [x, y2]])
        geometry.labels.push({ x: Math.min(x1, x2) - 4, y: y + 3, text: String(level), align: "right" })
        geometry.labels.push({ x, y: Math.max(y1, y2) + 12, text: String(level), align: "center" })
    }

    if (resolved.variant === "square" || resolved.variant === "squareFixed") {
        geometry.segments.push([[x1, y1], [x2, y2]], [[x1, y2], [x2, y1]])
        for (const level of levels) {
            geometry.segments.push([[x1, y1], [x2, y1 + dy * level]])
            geometry.segments.push([[x1, y1], [x1 + dx * level, y2]])
        }
    }

    return geometry
}

export const drawGannBox = (context, moreProps, props) => {
    const resolved = { ...interactiveGannBoxDefaults, ...props }
    const geometry = gannBoxGeometry(resolved, moreProps)

    context.lineWidth = resolved.strokeWidth
    context.strokeStyle = resolved.strokeStyle
    for (const [from, to] of geometry.segments) {
        context.beginPath()
        context.moveTo(from[0], from[1])
        context.lineTo(to[0], to[1])
        context.stroke()
    }

    context.font = `${resolved.fontSize}px ${resolved.fontFamily}`
    context.fillStyle = resolved.fontFill
    for (const label of geometry.labels) {
        context.textAlign = label.align
        context.fillText(label.text, label.x, label.y)
    }
}

export const isGannBoxHover = (moreProps, props) => {
    const resolved = { ...interactiveGannBoxDefaults, ...props }
    const { mouseXY } = moreProps
    const reach = resolved.tolerance + hitSlop(moreProps)

    for (const [from, to] of gannBoxGeometry(resolved, moreProps).segments)
        if (isHovering2(from, to, mouseXY, reach)) return true
    return false
}

/** One Gann box or square: edges, level divisions on both axes, and for the square the diagonals and corner fans. */
export class InteractiveGannBox extends GenericChartComponent {
    #props

    constructor() {
        super()
        this.#props = defineProperties(this, interactiveGannBoxDefaults)
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
        return isGannBoxHover(moreProps, this.#props)
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
        drawGannBox(context, moreProps, this.#props)
    }
}

define("chart-interactive-gann-box", InteractiveGannBox)
