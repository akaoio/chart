import { hitSlop } from "../../core/utils/dom.js"
import { isNotDefined } from "../../core/utils/index.js"
import { GenericChartComponent } from "../../core/GenericChartComponent.js"
import { getMouseCanvas } from "../../core/GenericComponent.js"
import { defineProperties, define } from "../../core/element.js"

export const interactiveImageDefaults = {
    x1Value: undefined,
    y1Value: undefined,
    x2Value: undefined,
    y2Value: undefined,
    src: undefined,
    opacity: 1,
    strokeStyle: "#000000",
    strokeWidth: 1,
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
 * Ảnh tải xong mới vẽ được — cache theo `src`, và lần tải xong đầu tiên gọi
 * `onReady` để phần tử xin vẽ lại; không có nó thì ảnh chỉ hiện sau lần
 * chuột đi qua kế tiếp.
 */
const loaded = new Map()
const imageOf = (src, onReady) => {
    if (loaded.has(src)) return loaded.get(src)
    const image = new Image()
    image.onload = onReady
    image.src = src
    loaded.set(src, image)
    return image
}

export const imageFrame = (props, moreProps) => {
    const resolved = { ...interactiveImageDefaults, ...props }
    const {
        xScale,
        chartConfig: { yScale },
    } = moreProps

    const x1 = xScale(resolved.x1Value)
    const y1 = yScale(resolved.y1Value)
    const x2 = xScale(resolved.x2Value)
    const y2 = yScale(resolved.y2Value)
    return { x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) }
}

export const isImageHover = (moreProps, props) => {
    const resolved = { ...interactiveImageDefaults, ...props }
    const {
        mouseXY: [mouseX, mouseY],
    } = moreProps
    const reach = resolved.tolerance + hitSlop(moreProps)
    const frame = imageFrame(resolved, moreProps)

    return (
        mouseX >= frame.x - reach &&
        mouseX <= frame.x + frame.width + reach &&
        mouseY >= frame.y - reach &&
        mouseY <= frame.y + frame.height + reach
    )
}

/**
 * One image the user placed: two data anchors pin opposite corners, so the
 * picture stretches with the chart like every other drawing — TradingView's
 * image tool behaves the same. No `src` yet draws a labelled placeholder.
 */
export class InteractiveImage extends GenericChartComponent {
    #props

    constructor() {
        super()
        this.#props = defineProperties(this, interactiveImageDefaults)
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
        return isImageHover(moreProps, this.#props)
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
        const resolved = { ...interactiveImageDefaults, ...this.#props }
        const frame = imageFrame(resolved, moreProps)

        if (resolved.src !== undefined) {
            const image = imageOf(resolved.src, () => this.draw({ force: true }))
            if (image.complete && image.naturalWidth > 0) {
                context.save()
                context.globalAlpha = resolved.opacity
                context.drawImage(image, frame.x, frame.y, frame.width, frame.height)
                context.restore()
                if (resolved.selected) {
                    context.strokeStyle = resolved.strokeStyle
                    context.lineWidth = resolved.strokeWidth
                    context.strokeRect(frame.x, frame.y, frame.width, frame.height)
                }
                return
            }
        }

        // Chưa có ảnh: khung chờ có nhãn — người dùng thấy chỗ mình vừa đặt
        context.strokeStyle = resolved.strokeStyle
        context.lineWidth = resolved.strokeWidth
        context.strokeRect(frame.x, frame.y, frame.width, frame.height)
        context.font = "11px system-ui, sans-serif"
        context.fillStyle = resolved.strokeStyle
        context.textAlign = "center"
        context.fillText("Image", frame.x + frame.width / 2, frame.y + frame.height / 2 + 4)
    }
}

define("chart-interactive-image", InteractiveImage)
