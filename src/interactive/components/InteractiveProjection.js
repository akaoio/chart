import { hitSlop } from "../../core/utils/dom.js"
import { getStrokeDasharrayCanvas, isNotDefined } from "../../core/utils/index.js"
import { GenericChartComponent } from "../../core/GenericChartComponent.js"
import { getMouseCanvas } from "../../core/GenericComponent.js"
import { defineProperties, define } from "../../core/element.js"
import { isHovering2 } from "./InteractiveStraightLine.js"

export const interactiveProjectionDefaults = {
    points: [],
    variant: "forecast",
    strokeStyle: "#787B86",
    strokeWidth: 1,
    baseStrokeDasharray: "ShortDash2",
    upFill: "rgba(38, 166, 154, 0.2)",
    downFill: "rgba(239, 83, 80, 0.2)",
    textFill: "#FFFFFF",
    upLabelFill: "#26A69A",
    downLabelFill: "#EF5350",
    fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
    fontSize: 11,
    formatPrice: value => value.toFixed(2),
    formatPercent: value => `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`,
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
 * Chân dự phóng suy từ ba neo — **đây là toàn bộ chỗ khác nhau giữa hai công cụ**.
 *
 * · `forecast`: chân nền là 1→2, chân dự báo nối tiếp từ 2 tới neo 3. Neo 3 là
 *   ĐÍCH người dùng tự đặt — công cụ không đoán hộ.
 * · `projection`: chân nền là 1→2, và neo 3 là GỐC mới; đích suy ra bằng cách
 *   chép nguyên vector nền sang đó. Kéo neo 1 hay 2 là đổi cả chân dự phóng —
 *   đó chính là điều làm nó khác forecast, và là điều đáng kiểm.
 *
 * Vì đích của `projection` là **suy ra**, nó không có tay cầm riêng: một tay cầm
 * cho một giá trị dẫn xuất là một lời hứa mà kéo xong sẽ bị nuốt.
 */
export const projectionLeg = (variant, points) => {
    const [a, b, c] = points
    if (variant === "projection") return { from: c, to: [c[0] + (b[0] - a[0]), c[1] + (b[1] - a[1])] }
    return { from: b, to: c }
}

/** Cả hai chân trong pixel, cộng những con số hộp đọc số in ra. */
export const projectionGeometry = (props, moreProps) => {
    const resolved = { ...interactiveProjectionDefaults, ...props }
    const { points, variant } = resolved
    const {
        xScale,
        chartConfig: { yScale },
    } = moreProps

    const leg = projectionLeg(variant, points)
    const at = ([xValue, yValue]) => [xScale(xValue), yScale(yValue)]

    const base = { from: at(points[0]), to: at(points[1]) }
    const projected = { from: at(leg.from), to: at(leg.to) }

    const change = leg.to[1] - leg.from[1]
    const percent = leg.from[1] === 0 ? 0 : (change / Math.abs(leg.from[1])) * 100

    return {
        base,
        projected,
        change,
        percent,
        bars: Math.round(leg.to[0] - leg.from[0]),
        rising: change >= 0,
        box: {
            x: Math.min(projected.from[0], projected.to[0]),
            y: Math.min(projected.from[1], projected.to[1]),
            width: Math.abs(projected.to[0] - projected.from[0]),
            height: Math.abs(projected.to[1] - projected.from[1]),
        },
    }
}

export const drawInteractiveProjection = (context, moreProps, props) => {
    const resolved = { ...interactiveProjectionDefaults, ...props }
    if (isNotDefined(resolved.points) || resolved.points.length < 3) return

    const geometry = projectionGeometry(resolved, moreProps)
    const { base, projected, box } = geometry

    // Chân nền: nét đứt, vì nó là thứ ĐÃ xảy ra — không phải thứ đang được dự phóng
    context.lineWidth = resolved.strokeWidth
    context.strokeStyle = resolved.strokeStyle
    context.setLineDash(getStrokeDasharrayCanvas(resolved.baseStrokeDasharray))
    context.beginPath()
    context.moveTo(base.from[0], base.from[1])
    context.lineTo(base.to[0], base.to[1])
    context.stroke()
    context.setLineDash([])

    context.fillStyle = geometry.rising ? resolved.upFill : resolved.downFill
    context.fillRect(box.x, box.y, box.width, box.height)
    context.strokeRect(box.x, box.y, box.width, box.height)

    // Chân dự phóng: nét liền có đầu mũi tên
    const angle = Math.atan2(projected.to[1] - projected.from[1], projected.to[0] - projected.from[0])
    const head = 8
    context.fillStyle = resolved.strokeStyle
    context.beginPath()
    context.moveTo(projected.from[0], projected.from[1])
    context.lineTo(projected.to[0], projected.to[1])
    context.stroke()
    context.beginPath()
    context.moveTo(projected.to[0], projected.to[1])
    context.lineTo(projected.to[0] - head * Math.cos(angle - Math.PI / 6), projected.to[1] - head * Math.sin(angle - Math.PI / 6))
    context.lineTo(projected.to[0] - head * Math.cos(angle + Math.PI / 6), projected.to[1] - head * Math.sin(angle + Math.PI / 6))
    context.closePath()
    context.fill()

    const text = `${resolved.formatPrice(geometry.change)} (${resolved.formatPercent(geometry.percent)})  ${geometry.bars} bars`
    context.font = `${resolved.fontSize}px ${resolved.fontFamily}`
    const width = context.measureText(text).width + 16
    const height = resolved.fontSize + 10
    const x = projected.to[0] - width / 2
    // Hộp số nằm phía ĐÍCH đi tới, ngoài hộp tô — nó nói về chỗ giá được dự phóng tới
    const y = geometry.rising ? projected.to[1] + 6 : projected.to[1] - height - 6

    context.fillStyle = geometry.rising ? resolved.upLabelFill : resolved.downLabelFill
    context.fillRect(x, y, width, height)
    context.fillStyle = resolved.textFill
    context.textAlign = "center"
    context.textBaseline = "middle"
    context.fillText(text, projected.to[0], y + height / 2)
    context.textAlign = "start"
    context.textBaseline = "alphabetic"
}

/** Trúng trong hộp dự phóng, hoặc trúng chính chân nền — cả hai đều là đối tượng này. */
export const isProjectionHover = (moreProps, props) => {
    const resolved = { ...interactiveProjectionDefaults, ...props }
    if (isNotDefined(resolved.points) || resolved.points.length < 3) return false

    const {
        mouseXY: [mouseX, mouseY],
    } = moreProps
    const reach = resolved.tolerance + hitSlop(moreProps)
    const { base, box } = projectionGeometry(resolved, moreProps)

    if (isHovering2(base.from, base.to, [mouseX, mouseY], reach)) return true

    return (
        mouseX >= box.x - reach && mouseX <= box.x + box.width + reach && mouseY >= box.y - reach && mouseY <= box.y + box.height + reach
    )
}

/**
 * Một dự phóng người dùng vẽ: một chân nền đã xảy ra và một chân được chiếu về
 * phía trước, với hộp tô và số Δgiá/%/số nến đọc ra từ chính ba cái neo.
 */
export class InteractiveProjection extends GenericChartComponent {
    #props

    constructor() {
        super()
        this.#props = defineProperties(this, interactiveProjectionDefaults)
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
        return isProjectionHover(moreProps, this.#props)
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
        drawInteractiveProjection(context, moreProps, this.#props)
    }
}

define("chart-interactive-projection", InteractiveProjection)
