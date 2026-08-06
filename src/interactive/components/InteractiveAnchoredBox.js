import { hitSlop } from "../../core/utils/dom.js"
import { isNotDefined } from "../../core/utils/index.js"
import { GenericChartComponent } from "../../core/GenericChartComponent.js"
import { getMouseCanvas } from "../../core/GenericComponent.js"
import { defineProperties, define } from "../../core/element.js"

export const interactiveAnchoredBoxDefaults = {
    at: undefined,
    lines: undefined,
    cells: undefined,
    bgFill: "#FFFFFF",
    bgStroke: "#000000",
    strokeWidth: 1,
    fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
    fontSize: 12,
    fontFill: "#000000",
    padding: 8,
    tolerance: 4,
    selected: false,
    interactiveCursorClass: undefined,
    onHover: undefined,
    onUnHover: undefined,
    onDragStart: undefined,
    onDrag: undefined,
    onDragComplete: undefined,
}

// Đo chữ cần context thật; khởi tạo lười vì Node nhập module này khi sinh docs
let measuring = null

/**
 * Hình học của hộp neo màn hình, tính MỘT LẦN trong pixel.
 *
 * `at` là TỈ LỆ của pane ([0.5, 0.5] là chính giữa) — neo theo màn hình đúng
 * kiểu Anchored Text của TradingView: cuộn hay zoom biểu đồ thì hộp đứng
 * yên, resize thì giữ chỗ tương đối. `lines` là các dòng chữ; `cells` là
 * bảng — mỗi cột rộng theo ô dài nhất của nó.
 */
export const anchoredBoxGeometry = (props, moreProps) => {
    const resolved = { ...interactiveAnchoredBoxDefaults, ...props }
    const {
        chartConfig: { width, height },
    } = moreProps

    if (measuring === null) measuring = document.createElement("canvas").getContext("2d")
    measuring.font = `${resolved.fontSize}px ${resolved.fontFamily}`

    const pad = resolved.padding
    const rowHeight = resolved.fontSize + 8
    const x = resolved.at[0] * width
    const y = resolved.at[1] * height

    if (resolved.cells !== undefined) {
        const columns = Math.max(...resolved.cells.map(row => row.length))
        const widths = Array.from({ length: columns }, (unused, column) =>
            Math.max(24, ...resolved.cells.map(row => measuring.measureText(row[column] ?? "").width + pad * 2)),
        )
        return {
            x,
            y,
            width: widths.reduce((sum, w) => sum + w, 0),
            height: rowHeight * resolved.cells.length,
            widths,
            rowHeight,
        }
    }

    const lines = resolved.lines ?? [""]
    const boxWidth = Math.max(...lines.map(line => measuring.measureText(line).width)) + pad * 2
    return { x, y, width: boxWidth, height: rowHeight * lines.length + pad, widths: null, rowHeight }
}

export const drawAnchoredBox = (context, moreProps, props) => {
    const resolved = { ...interactiveAnchoredBoxDefaults, ...props }
    const box = anchoredBoxGeometry(resolved, moreProps)

    context.fillStyle = resolved.bgFill
    context.strokeStyle = resolved.bgStroke
    context.lineWidth = resolved.strokeWidth
    context.fillRect(box.x, box.y, box.width, box.height)
    context.strokeRect(box.x, box.y, box.width, box.height)

    context.font = `${resolved.fontSize}px ${resolved.fontFamily}`
    context.fillStyle = resolved.fontFill
    context.textAlign = "left"

    if (resolved.cells !== undefined) {
        // Kẻ lưới rồi điền ô — bảng thật, không phải chữ xếp cột
        let cursorY = box.y
        for (const row of resolved.cells) {
            let cursorX = box.x
            row.forEach((cell, column) => {
                context.strokeRect(cursorX, cursorY, box.widths[column], box.rowHeight)
                context.fillText(cell ?? "", cursorX + resolved.padding, cursorY + box.rowHeight - 6)
                cursorX += box.widths[column]
            })
            cursorY += box.rowHeight
        }
        return
    }

    const lines = resolved.lines ?? [""]
    lines.forEach((line, index) => {
        context.fillText(line, box.x + resolved.padding, box.y + box.rowHeight * (index + 1) - 4)
    })
}

export const isAnchoredBoxHover = (moreProps, props) => {
    const resolved = { ...interactiveAnchoredBoxDefaults, ...props }
    const {
        mouseXY: [mouseX, mouseY],
    } = moreProps
    const reach = resolved.tolerance + hitSlop(moreProps)
    const box = anchoredBoxGeometry(resolved, moreProps)

    return (
        mouseX >= box.x - reach &&
        mouseX <= box.x + box.width + reach &&
        mouseY >= box.y - reach &&
        mouseY <= box.y + box.height + reach
    )
}

/** One screen-anchored box: text or a table that stays put while the chart scrolls under it. */
export class InteractiveAnchoredBox extends GenericChartComponent {
    #props

    constructor() {
        super()
        this.#props = defineProperties(this, interactiveAnchoredBoxDefaults)
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
        if (isNotDefined(this.#props.at)) return false
        return isAnchoredBoxHover(moreProps, this.#props)
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
        drawAnchoredBox(context, moreProps, this.#props)
    }
}

define("chart-interactive-anchored-box", InteractiveAnchoredBox)
