import { hitSlop } from "../../core/utils/dom.js"
import { isNotDefined } from "../../core/utils/index.js"
import { GenericChartComponent } from "../../core/GenericChartComponent.js"
import { getMouseCanvas } from "../../core/GenericComponent.js"
import { defineProperties, define } from "../../core/element.js"

export const interactiveSignpostDefaults = {
    position: undefined,
    text: "Signpost",
    poleHeight: 44,
    strokeStyle: "#000000",
    strokeWidth: 1,
    bgFill: "#FFFFFF",
    fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
    fontSize: 11,
    fontFill: "#000000",
    tolerance: 4,
    selected: false,
    interactiveCursorClass: undefined,
    onHover: undefined,
    onUnHover: undefined,
    onDragStart: undefined,
    onDrag: undefined,
    onDragComplete: undefined,
}

// Đo chữ cần một context thật — một canvas ngoài màn hình dùng chung là đủ.
// Khởi tạo lười: module này còn được Node nhập để sinh tài liệu, nơi không có DOM.
let measuring = null

/**
 * Hình học của cột mốc, tính MỘT LẦN trong pixel: chân cắm ở toạ độ dữ liệu,
 * cột dựng lên `poleHeight` pixel, hộp chữ ngồi trên đỉnh cột — kích thước
 * hộp đo từ chính chữ. Vẽ và dò trúng cùng đọc một kết quả.
 */
export const signpostGeometry = (props, moreProps) => {
    const resolved = { ...interactiveSignpostDefaults, ...props }
    const {
        xScale,
        chartConfig: { yScale },
    } = moreProps

    const x = xScale(resolved.position[0])
    const y = yScale(resolved.position[1])
    if (measuring === null) measuring = document.createElement("canvas").getContext("2d")
    measuring.font = `${resolved.fontSize}px ${resolved.fontFamily}`
    const width = measuring.measureText(resolved.text).width + 16
    const height = resolved.fontSize + 10
    const top = y - resolved.poleHeight - height

    return { x, y, box: { x: x - width / 2, y: top, width, height } }
}

export const drawSignpost = (context, moreProps, props) => {
    const resolved = { ...interactiveSignpostDefaults, ...props }
    const { x, y, box } = signpostGeometry(resolved, moreProps)

    context.lineWidth = resolved.strokeWidth
    context.strokeStyle = resolved.strokeStyle
    context.beginPath()
    context.moveTo(x, y)
    context.lineTo(x, box.y + box.height)
    context.stroke()

    context.fillStyle = resolved.bgFill
    context.fillRect(box.x, box.y, box.width, box.height)
    context.strokeRect(box.x, box.y, box.width, box.height)

    context.font = `${resolved.fontSize}px ${resolved.fontFamily}`
    context.fillStyle = resolved.fontFill
    context.textAlign = "center"
    context.fillText(resolved.text, x, box.y + box.height - 7)
}

export const isSignpostHover = (moreProps, props) => {
    const resolved = { ...interactiveSignpostDefaults, ...props }
    const {
        mouseXY: [mouseX, mouseY],
    } = moreProps
    const reach = resolved.tolerance + hitSlop(moreProps)
    const { x, y, box } = signpostGeometry(resolved, moreProps)

    if (mouseX >= box.x - reach && mouseX <= box.x + box.width + reach && mouseY >= box.y - reach && mouseY <= box.y + box.height + reach)
        return true
    return Math.abs(mouseX - x) <= reach && mouseY >= box.y + box.height && mouseY <= y + reach
}

/** One signpost: a pole planted at a data point, a text box riding the top. */
export class InteractiveSignpost extends GenericChartComponent {
    #props

    constructor() {
        super()
        this.#props = defineProperties(this, interactiveSignpostDefaults)
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
        if (isNotDefined(this.#props.position)) return false
        return isSignpostHover(moreProps, this.#props)
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
        drawSignpost(context, moreProps, this.#props)
    }
}

define("chart-interactive-signpost", InteractiveSignpost)
