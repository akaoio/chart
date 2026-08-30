import { hitSlop } from "../../core/utils/dom.js"
import { isNotDefined } from "../../core/utils/index.js"
import { GenericChartComponent } from "../../core/GenericChartComponent.js"
import { getMouseCanvas } from "../../core/GenericComponent.js"
import { defineProperties, define } from "../../core/element.js"
import { isHovering2 } from "./InteractiveStraightLine.js"

export const interactiveCurveDefaults = {
    points: [],
    mode: "polygon",
    closed: false,
    strokeStyle: "#000000",
    strokeWidth: 1,
    fillStyle: "rgba(138, 175, 226, 0.2)",
    samples: 64,
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
 * Đường tròn đi qua ba điểm — tâm là giao của hai trung trực, viết gọn thành
 * một định thức. Ba điểm thẳng hàng thì `d` về 0 và không có đường tròn nào:
 * trả `undefined` để chỗ gọi hạ xuống đoạn thẳng thay vì chia cho số 0 rồi vẽ
 * một cung bán kính vô hạn (canvas nuốt `NaN` trong im lặng — không nổ, không vẽ).
 */
const circleThrough = ([ax, ay], [bx, by], [cx, cy]) => {
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
    if (Math.abs(d) < 1e-9) return undefined

    const a2 = ax * ax + ay * ay
    const b2 = bx * bx + by * by
    const c2 = cx * cx + cy * cy
    const ux = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / d
    const uy = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / d

    return { center: [ux, uy], radius: Math.hypot(ax - ux, ay - uy) }
}

/** Cung tròn từ a tới c mà ĐI QUA b, lấy mẫu đều theo góc. */
const arcThrough = (a, b, c, samples) => {
    const circle = circleThrough(a, b, c)
    if (circle === undefined) return [a, b, c]

    const { center, radius } = circle
    const angleOf = ([x, y]) => Math.atan2(y - center[1], x - center[0])
    const start = angleOf(a)
    // Quãng góc dương từ `start`, trong [0, 2π) — dùng để xếp b và c lên cùng một trục.
    const turn = angle => {
        const delta = (angle - start) % (2 * Math.PI)
        return delta < 0 ? delta + 2 * Math.PI : delta
    }

    // b nằm trước c theo chiều dương thì quét dương; ngược lại quét âm — đó chính là
    // điều kiện "cung phải đi qua b", và là chỗ duy nhất phân biệt cung ngắn với cung dài.
    const through = turn(angleOf(b))
    const end = turn(angleOf(c))
    const sweep = through <= end ? end : end - 2 * Math.PI

    const out = []
    for (let step = 0; step <= samples; step++) {
        const angle = start + (sweep * step) / samples
        out.push([center[0] + radius * Math.cos(angle), center[1] + radius * Math.sin(angle)])
    }
    return out
}

const quadraticAt = (p0, p1, p2, t) => {
    const u = 1 - t
    return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]
}

const cubicAt = (p0, p1, p2, p3, t) => {
    const u = 1 - t
    return [
        u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]
}

const sampled = (at, samples) => {
    const out = []
    for (let step = 0; step <= samples; step++) out.push(at(step / samples))
    return out
}

/**
 * Hình trong pixel, **duỗi thẳng thành một danh sách điểm** — một danh sách cho cả
 * vẽ lẫn dò trúng.
 *
 * Có thể gọi `quadraticCurveTo`/`arc` của canvas cho nét mượt hơn, nhưng khi ấy phép
 * dò trúng phải tự dựng lại cùng hình học ấy bằng công thức khác, và hai bản mô tả
 * cùng một hình là hai chỗ để lệch nhau: thứ người ta bấm trúng không còn là thứ họ
 * thấy. 64 đoạn ở cỡ pane thật là dưới một pixel sai lệch — rẻ hơn nhiều so với một
 * hình học thứ hai.
 *
 * Chưa đủ đỉnh cho `mode` thì hạ xuống đường gấp khúc: đó chính là hình tạm lúc đang
 * đặt, khi mới có hai trong ba đỉnh.
 */
export const curveOutline = (props, moreProps) => {
    const resolved = { ...interactiveCurveDefaults, ...props }
    const { points, mode, samples } = resolved
    const {
        xScale,
        chartConfig: { yScale },
    } = moreProps

    const vertices = (points ?? []).map(([xValue, yValue]) => [xScale(xValue), yScale(yValue)])
    if (vertices.length < 2) return vertices

    if (mode === "arc" && vertices.length >= 3) return arcThrough(vertices[0], vertices[1], vertices[2], samples)
    if (mode === "quadratic" && vertices.length >= 3) {
        const [p0, p1, p2] = vertices
        return sampled(t => quadraticAt(p0, p1, p2, t), samples)
    }
    if (mode === "cubic" && vertices.length >= 4) {
        const [p0, p1, p2, p3] = vertices
        return sampled(t => cubicAt(p0, p1, p2, p3, t), samples)
    }

    return vertices
}

export const drawInteractiveCurve = (context, moreProps, props) => {
    const resolved = { ...interactiveCurveDefaults, ...props }
    const { closed, strokeStyle, strokeWidth, fillStyle } = resolved
    const outline = curveOutline(resolved, moreProps)
    if (outline.length < 2) return

    context.lineWidth = strokeWidth
    context.strokeStyle = strokeStyle
    context.fillStyle = fillStyle

    context.beginPath()
    context.moveTo(outline[0][0], outline[0][1])
    for (let index = 1; index < outline.length; index++) context.lineTo(outline[index][0], outline[index][1])
    if (closed) {
        context.closePath()
        context.fill()
    }
    context.stroke()
}

/** Trúng khi con trỏ trong lòng — chỉ với hình đóng, vì chỉ hình đóng mới có lòng. */
const inside = (outline, [x, y]) => {
    let hit = false
    for (let index = 0, previous = outline.length - 1; index < outline.length; previous = index++) {
        const [xi, yi] = outline[index]
        const [xj, yj] = outline[previous]
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
    }
    return hit
}

/**
 * Trúng viền hay trúng lòng đều là trúng — cùng luật với `InteractiveShape`:
 * hình có fill thì cái fill chính là bề mặt bấm. Hình mở (curve, double curve)
 * không có lòng nên chỉ còn viền.
 */
export const isCurveHover = (moreProps, props) => {
    const resolved = { ...interactiveCurveDefaults, ...props }
    const { mouseXY } = moreProps
    const reach = resolved.tolerance + hitSlop(moreProps)
    const outline = curveOutline(resolved, moreProps)
    if (outline.length < 2) return false

    for (let index = 1; index < outline.length; index++) {
        if (isHovering2(outline[index - 1], outline[index], mouseXY, reach)) return true
    }
    // Hình đóng: đoạn cuối nối về đỉnh đầu cũng là một cạnh thật
    if (resolved.closed && isHovering2(outline[outline.length - 1], outline[0], mouseXY, reach)) return true

    return resolved.closed && inside(outline, mouseXY)
}

/**
 * Một hình đa giác hoặc cung do người dùng vẽ: đa giác đóng, cung tròn qua ba
 * điểm, Bézier bậc hai và bậc ba — `mode` chọn hình, `closed` chọn có lòng hay không.
 */
export class InteractiveCurve extends GenericChartComponent {
    #props

    constructor() {
        super()
        this.#props = defineProperties(this, interactiveCurveDefaults)
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
        return isCurveHover(moreProps, this.#props)
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
        drawInteractiveCurve(context, moreProps, this.#props)
    }
}

define("chart-interactive-curve", InteractiveCurve)
