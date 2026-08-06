import { hitSlop } from "../../core/utils/dom.js"
import { GenericChartComponent } from "../../core/GenericChartComponent.js"
import { getMouseCanvas } from "../../core/GenericComponent.js"
import { defineProperties, define } from "../../core/element.js"

export const interactiveMeasureDefaults = {
    mode: "both",
    x1Value: undefined,
    y1Value: undefined,
    x2Value: undefined,
    y2Value: undefined,
    strokeStyle: "#2962FF",
    strokeWidth: 1,
    fillStyle: "rgba(41, 98, 255, 0.16)",
    textFill: "#FFFFFF",
    labelFill: "#2962FF",
    fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
    fontSize: 11,
    formatPrice: value => value.toFixed(2),
    formatPercent: value => `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`,
    formatDuration: milliseconds => {
        const days = milliseconds / 86_400_000
        if (Math.abs(days) >= 1) return `${Math.round(days)}d`
        const hours = milliseconds / 3_600_000
        if (Math.abs(hours) >= 1) return `${Math.round(hours)}h`
        return `${Math.round(milliseconds / 60_000)}m`
    },
    tolerance: 4,
    selected: false,
    interactiveCursorClass: undefined,
    onHover: undefined,
    onUnHover: undefined,
    onDragStart: undefined,
    onDrag: undefined,
    onDragComplete: undefined,
}

/** The measured box in pixels plus the numbers the readout prints. */
export const measureGeometry = (props, moreProps) => {
    const resolved = { ...interactiveMeasureDefaults, ...props }
    const { x1Value, y1Value, x2Value, y2Value } = resolved
    const {
        xScale,
        chartConfig: { yScale },
        xAccessor,
        fullData,
    } = moreProps

    const [xa, xb] = [xScale(x1Value), xScale(x2Value)]
    const [ya, yb] = [yScale(y1Value), yScale(y2Value)]

    // xValues are the accessor's index domain, so the bar count is their distance —
    // and the matching rows carry the dates the duration is read from.
    const bars = Math.round(x2Value - x1Value)
    const base = fullData.length > 0 ? xAccessor(fullData[0]) : 0
    const itemAt = value => {
        const guess = fullData[Math.round(value) - base]
        if (guess !== undefined && xAccessor(guess) === Math.round(value)) return guess
        return fullData.find(row => xAccessor(row) === Math.round(value))
    }
    const from = itemAt(x1Value)
    const until = itemAt(x2Value)
    const elapsed = from?.date instanceof Date && until?.date instanceof Date ? until.date.getTime() - from.date.getTime() : undefined

    return {
        x: Math.min(xa, xb),
        y: Math.min(ya, yb),
        width: Math.abs(xb - xa),
        height: Math.abs(yb - ya),
        rising: y2Value >= y1Value,
        forward: x2Value >= x1Value,
        change: y2Value - y1Value,
        percent: y1Value === 0 ? 0 : ((y2Value - y1Value) / Math.abs(y1Value)) * 100,
        bars,
        elapsed,
    }
}

const arrow = (context, fromX, fromY, toX, toY) => {
    const angle = Math.atan2(toY - fromY, toX - fromX)
    const head = 5
    context.beginPath()
    context.moveTo(fromX, fromY)
    context.lineTo(toX, toY)
    context.stroke()
    context.beginPath()
    context.moveTo(toX, toY)
    context.lineTo(toX - head * Math.cos(angle - Math.PI / 6), toY - head * Math.sin(angle - Math.PI / 6))
    context.lineTo(toX - head * Math.cos(angle + Math.PI / 6), toY - head * Math.sin(angle + Math.PI / 6))
    context.closePath()
    context.fill()
}

export const drawInteractiveMeasure = (context, moreProps, props) => {
    const resolved = { ...interactiveMeasureDefaults, ...props }
    const { mode, strokeStyle, strokeWidth, fillStyle, textFill, labelFill, fontFamily, fontSize } = resolved
    const geometry = measureGeometry(resolved, moreProps)
    const { x, y, width, height } = geometry

    context.lineWidth = strokeWidth
    context.strokeStyle = strokeStyle
    context.fillStyle = fillStyle
    context.fillRect(x, y, width, height)
    context.strokeRect(x, y, width, height)

    context.fillStyle = strokeStyle
    const centerX = x + width / 2
    const centerY = y + height / 2
    if (mode !== "date") {
        // giá đi lên thì mũi tên chỉ lên — chiều của phép đo, không phải chiều vẽ
        if (geometry.rising) arrow(context, centerX, y + height, centerX, y)
        else arrow(context, centerX, y, centerX, y + height)
    }
    if (mode !== "price") {
        if (geometry.forward) arrow(context, x, centerY, x + width, centerY)
        else arrow(context, x + width, centerY, x, centerY)
    }

    const lines = []
    if (mode !== "date") lines.push(`${resolved.formatPrice(geometry.change)} (${resolved.formatPercent(geometry.percent)})`)
    if (mode !== "price") {
        const span = geometry.elapsed === undefined ? `${geometry.bars} bars` : `${geometry.bars} bars, ${resolved.formatDuration(geometry.elapsed)}`
        lines.push(span)
    }

    context.font = `${fontSize}px ${fontFamily}`
    const readoutWidth = Math.max(...lines.map(line => context.measureText(line).width)) + 16
    const lineHeight = fontSize + 4
    const readoutHeight = lines.length * lineHeight + 8
    const readoutX = centerX - readoutWidth / 2
    // hộp số nằm ngoài hộp đo, phía mũi tên giá chỉ tới
    const readoutY = geometry.rising ? y - readoutHeight - 6 : y + height + 6

    context.fillStyle = labelFill
    context.fillRect(readoutX, readoutY, readoutWidth, readoutHeight)
    context.fillStyle = textFill
    context.textAlign = "center"
    lines.forEach((line, index) => {
        context.fillText(line, centerX, readoutY + (index + 1) * lineHeight)
    })
    context.textAlign = "start"
}

export const isMeasureHover = (moreProps, props) => {
    const resolved = { ...interactiveMeasureDefaults, ...props }
    const {
        mouseXY: [mouseX, mouseY],
    } = moreProps
    const tolerance = resolved.tolerance + hitSlop(moreProps)
    const { x, y, width, height } = measureGeometry(resolved, moreProps)

    return mouseX >= x - tolerance && mouseX <= x + width + tolerance && mouseY >= y - tolerance && mouseY <= y + height + tolerance
}

/**
 * A measurement box between two points: price change, percent, bar count and elapsed
 * time, depending on `mode` (`price`, `date` or `both`).
 */
export class InteractiveMeasure extends GenericChartComponent {
    #props

    constructor() {
        super()
        this.#props = defineProperties(this, interactiveMeasureDefaults)
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
        return isMeasureHover(moreProps, this.#props)
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
        drawInteractiveMeasure(context, moreProps, this.#props)
    }
}

define("chart-interactive-measure", InteractiveMeasure)
