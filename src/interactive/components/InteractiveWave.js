import { hitSlop } from "../../core/utils/dom.js"
import { isNotDefined } from "../../core/utils/index.js"
import { GenericChartComponent } from "../../core/GenericChartComponent.js"
import { getMouseCanvas } from "../../core/GenericComponent.js"
import { defineProperties, define } from "../../core/element.js"
import { isHovering2 } from "./InteractiveStraightLine.js"

export const interactiveWaveDefaults = {
    x1Value: undefined,
    y1Value: undefined,
    x2Value: undefined,
    y2Value: undefined,
    mode: "cycles",
    strokeStyle: "#000000",
    strokeWidth: 1,
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
 * Hình học của sóng thời gian, tính MỘT LẦN trong pixel.
 *
 * `cycles`: hai neo định một chu kỳ — bán nguyệt úp lên đường nền y của neo
 * đầu, lặp về phía phải cho tới mép pane, chặn 300 vành. `sine`: neo đầu là
 * đỉnh, neo thứ hai là đáy kế tiếp — nửa chu kỳ; đường sin trải hết bề ngang
 * pane. Vẽ và dò trúng cùng đọc một danh sách vành/gấp khúc.
 */
export const waveGeometry = (props, moreProps) => {
    const resolved = { ...interactiveWaveDefaults, ...props }
    const {
        xScale,
        chartConfig: { yScale, width },
    } = moreProps

    const x1 = xScale(resolved.x1Value)
    const y1 = yScale(resolved.y1Value)
    const x2 = xScale(resolved.x2Value)
    const y2 = yScale(resolved.y2Value)
    const geometry = { rings: [], polylines: [] }
    if (x1 === x2) return geometry

    if (resolved.mode === "cycles") {
        const period = Math.abs(x2 - x1)
        const radius = period / 2
        const start = Math.min(x1, x2)
        for (let center = start + radius, count = 0; center - radius <= width && count < 300; center += period, count++)
            geometry.rings.push({ cx: center, cy: y1, r: radius, from: Math.PI, to: Math.PI * 2 })
    }

    if (resolved.mode === "sine") {
        const midline = (y1 + y2) / 2
        const amplitude = y1 - midline
        const half = x2 - x1
        const line = []
        for (let x = 0; x <= width; x += 4)
            line.push([x, midline + amplitude * Math.cos((Math.PI * (x - x1)) / half)])
        geometry.polylines.push(line)
    }

    return geometry
}

export const drawWave = (context, moreProps, props) => {
    const resolved = { ...interactiveWaveDefaults, ...props }
    const geometry = waveGeometry(resolved, moreProps)

    context.lineWidth = resolved.strokeWidth
    context.strokeStyle = resolved.strokeStyle
    for (const ring of geometry.rings) {
        context.beginPath()
        context.arc(ring.cx, ring.cy, ring.r, ring.from, ring.to)
        context.stroke()
    }
    for (const line of geometry.polylines) {
        context.beginPath()
        context.moveTo(line[0][0], line[0][1])
        for (const point of line.slice(1)) context.lineTo(point[0], point[1])
        context.stroke()
    }
}

export const isWaveHover = (moreProps, props) => {
    const resolved = { ...interactiveWaveDefaults, ...props }
    const { mouseXY } = moreProps
    const reach = resolved.tolerance + hitSlop(moreProps)
    const geometry = waveGeometry(resolved, moreProps)

    for (const ring of geometry.rings) {
        const distance = Math.hypot(mouseXY[0] - ring.cx, mouseXY[1] - ring.cy)
        // Bán nguyệt úp lên nền: chỉ nửa trên (canvas y hướng xuống) mới là nét thật
        if (Math.abs(distance - ring.r) <= reach && mouseXY[1] <= ring.cy + reach) return true
    }
    for (const line of geometry.polylines)
        for (let index = 1; index < line.length; index++)
            if (isHovering2(line[index - 1], line[index], mouseXY, reach)) return true
    return false
}

/** One time wave: repeating semicircles on a baseline, or a sine line through peak and trough. */
export class InteractiveWave extends GenericChartComponent {
    #props

    constructor() {
        super()
        this.#props = defineProperties(this, interactiveWaveDefaults)
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
        return isWaveHover(moreProps, this.#props)
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
        drawWave(context, moreProps, this.#props)
    }
}

define("chart-interactive-wave", InteractiveWave)
