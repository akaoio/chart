import { hitSlop } from "../../core/utils/dom.js"
import { isNotDefined } from "../../core/utils/index.js"
import { GenericChartComponent } from "../../core/GenericChartComponent.js"
import { getMouseCanvas } from "../../core/GenericComponent.js"
import { defineProperties, define } from "../../core/element.js"
import { isHovering2 } from "./InteractiveStraightLine.js"

export const interactiveFibShapeDefaults = {
    points: undefined,
    variant: "arcs",
    levels: undefined,
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

/** Mức mặc định của từng variant — truyền `levels` để thay cả bảng. */
export const FIB_SHAPE_LEVELS = {
    fan: [0.25, 0.382, 0.5, 0.618, 0.75],
    arcs: [0.236, 0.382, 0.5, 0.618, 0.786, 1],
    circles: [0.236, 0.382, 0.5, 0.618, 0.786, 1],
    wedge: [0.236, 0.382, 0.5, 0.618, 0.786, 1],
    spiral: [],
}

/** Mỗi vòng xoắn nở theo tỉ lệ vàng một phần tư vòng — hằng số của log-spiral. */
const SPIRAL_GROWTH = Math.log((1 + Math.sqrt(5)) / 2) / (Math.PI / 2)

/**
 * Hình học của mọi variant, tính MỘT LẦN trong pixel: vẽ và dò trúng cùng đọc
 * một danh sách đoạn/vành/đường gấp khúc, nên không thể "vẽ một đằng dò một
 * nẻo". Bán kính đo bằng pixel từ hai neo dữ liệu — zoom làm hình co giãn
 * theo trục, đúng tính chất của các công cụ tròn TradingView.
 */
export const fibShapeGeometry = (props, moreProps) => {
    const resolved = { ...interactiveFibShapeDefaults, ...props }
    const {
        xScale,
        chartConfig: { yScale, width, height },
    } = moreProps

    const pts = resolved.points.map(([x, y]) => [xScale(x), yScale(y)])
    const levels = resolved.levels ?? FIB_SHAPE_LEVELS[resolved.variant] ?? []
    const geometry = { segments: [], rings: [], polylines: [], labels: [] }
    if (pts.length < 2) return geometry

    const [p1, p2] = pts
    const span = Math.hypot(p2[0] - p1[0], p2[1] - p1[1])
    if (span === 0) return geometry
    const reach = width + height

    // Tia từ gốc qua một điểm, kéo dài chắc chắn ra khỏi pane
    const ray = (from, through) => {
        const length = Math.hypot(through[0] - from[0], through[1] - from[1])
        if (length === 0) return null
        const t = Math.max(1, reach / length)
        return [from, [from[0] + (through[0] - from[0]) * t, from[1] + (through[1] - from[1]) * t]]
    }

    if (resolved.variant === "fan") {
        // Speed–resistance fan: tia từ p1 qua các phần chia của hai cạnh hộp p1→p2
        const dx = p2[0] - p1[0]
        const dy = p2[1] - p1[1]
        geometry.segments.push(ray(p1, p2))
        for (const level of levels) {
            geometry.segments.push(ray(p1, [p2[0], p1[1] + dy * level]))
            geometry.segments.push(ray(p1, [p1[0] + dx * level, p2[1]]))
        }
        geometry.segments = geometry.segments.filter(each => each !== null)
    }

    if (resolved.variant === "arcs" || resolved.variant === "circles") {
        // Tâm ở neo thứ hai — cuối con sóng; arcs là nửa vành mở về phía neo đầu
        const theta = Math.atan2(p1[1] - p2[1], p1[0] - p2[0])
        const half = resolved.variant === "arcs"
        for (const level of levels) {
            const r = span * level
            geometry.rings.push(
                half
                    ? { cx: p2[0], cy: p2[1], r, from: theta - Math.PI / 2, to: theta + Math.PI / 2 }
                    : { cx: p2[0], cy: p2[1], r, from: 0, to: Math.PI * 2 },
            )
            const at = half ? theta : -Math.PI / 2
            geometry.labels.push({ x: p2[0] + Math.cos(at) * r, y: p2[1] + Math.sin(at) * r - 4, text: String(level) })
        }
    }

    if (resolved.variant === "spiral") {
        // Log-spiral tâm p1 đi qua đúng p2: ba vòng vào trong, ra ngoài tới khi rời pane
        const phi0 = Math.atan2(p2[1] - p1[1], p2[0] - p1[0])
        const step = Math.PI / 12
        const line = []
        for (let phi = phi0 - 6 * Math.PI; ; phi += step) {
            const r = span * Math.exp(SPIRAL_GROWTH * (phi - phi0))
            line.push([p1[0] + Math.cos(phi) * r, p1[1] + Math.sin(phi) * r])
            if (r > reach) break
        }
        geometry.polylines.push(line)
    }

    if (resolved.variant === "wedge") {
        if (pts.length < 3) {
            geometry.segments.push([p1, p2])
            return geometry
        }
        const p3 = pts[2]
        const spanThird = Math.hypot(p3[0] - p1[0], p3[1] - p1[1])
        if (spanThird === 0) return geometry
        geometry.segments.push([p1, p2], [p1, p3])

        // Vành giữa hai tia, quét theo phía NGẮN — đúng cái nêm người dùng đã chỉ
        const a1 = Math.atan2(p2[1] - p1[1], p2[0] - p1[0])
        let delta = Math.atan2(p3[1] - p1[1], p3[0] - p1[0]) - a1
        if (delta > Math.PI) delta -= Math.PI * 2
        if (delta < -Math.PI) delta += Math.PI * 2
        const radius = Math.min(span, spanThird)
        for (const level of levels) {
            const r = radius * level
            geometry.rings.push({ cx: p1[0], cy: p1[1], r, from: a1, to: a1 + delta, sweep: delta })
            const mid = a1 + delta / 2
            geometry.labels.push({ x: p1[0] + Math.cos(mid) * r, y: p1[1] + Math.sin(mid) * r - 4, text: String(level) })
        }
    }

    return geometry
}

export const drawFibShape = (context, moreProps, props) => {
    const resolved = { ...interactiveFibShapeDefaults, ...props }
    const geometry = fibShapeGeometry(resolved, moreProps)

    context.lineWidth = resolved.strokeWidth
    context.strokeStyle = resolved.strokeStyle

    for (const [from, to] of geometry.segments) {
        context.beginPath()
        context.moveTo(from[0], from[1])
        context.lineTo(to[0], to[1])
        context.stroke()
    }
    for (const ring of geometry.rings) {
        context.beginPath()
        context.arc(ring.cx, ring.cy, ring.r, ring.from, ring.to, (ring.sweep ?? 1) < 0)
        context.stroke()
    }
    for (const line of geometry.polylines) {
        context.beginPath()
        context.moveTo(line[0][0], line[0][1])
        for (const point of line.slice(1)) context.lineTo(point[0], point[1])
        context.stroke()
    }

    context.font = `${resolved.fontSize}px ${resolved.fontFamily}`
    context.fillStyle = resolved.fontFill
    context.textAlign = "center"
    for (const label of geometry.labels) context.fillText(label.text, label.x, label.y)
}

/** Góc có nằm trong quãng quét của một vành hở không — chuẩn hoá về [0, 2π). */
const withinSweep = (angle, ring) => {
    if (ring.from === 0 && ring.to === Math.PI * 2) return true
    const span = ring.to - ring.from
    const turn = Math.PI * 2
    let offset = (((angle - ring.from) % turn) + turn) % turn
    if (span < 0) offset -= turn
    return span < 0 ? offset >= span : offset <= span
}

export const isFibShapeHover = (moreProps, props) => {
    const resolved = { ...interactiveFibShapeDefaults, ...props }
    const { mouseXY } = moreProps
    const reach = resolved.tolerance + hitSlop(moreProps)
    const geometry = fibShapeGeometry(resolved, moreProps)

    for (const [from, to] of geometry.segments) if (isHovering2(from, to, mouseXY, reach)) return true
    for (const ring of geometry.rings) {
        const distance = Math.hypot(mouseXY[0] - ring.cx, mouseXY[1] - ring.cy)
        if (Math.abs(distance - ring.r) > reach) continue
        if (withinSweep(Math.atan2(mouseXY[1] - ring.cy, mouseXY[0] - ring.cx), ring)) return true
    }
    for (const line of geometry.polylines)
        for (let index = 1; index < line.length; index++)
            if (isHovering2(line[index - 1], line[index], mouseXY, reach)) return true
    return false
}

/** One Fibonacci construction: fan, arcs, circles, spiral or wedge over the same anchors. */
export class InteractiveFibShape extends GenericChartComponent {
    #props

    constructor() {
        super()
        this.#props = defineProperties(this, interactiveFibShapeDefaults)
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
        return isFibShapeHover(moreProps, this.#props)
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
        drawFibShape(context, moreProps, this.#props)
    }
}

define("chart-interactive-fib-shape", InteractiveFibShape)
