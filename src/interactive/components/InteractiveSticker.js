import { hitSlop } from "../../core/utils/dom.js"
import { isNotDefined } from "../../core/utils/index.js"
import { GenericChartComponent } from "../../core/GenericChartComponent.js"
import { getMouseCanvas } from "../../core/GenericComponent.js"
import { defineProperties, define } from "../../core/element.js"
import { imageOf } from "./InteractiveImage.js"

export const interactiveStickerDefaults = {
    xValue: undefined,
    yValue: undefined,
    src: undefined,
    size: 32,
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
 * Ô vuông của con dấu, trong pixel: MỘT neo dữ liệu ở giữa, cạnh là `size` pixel.
 *
 * Đây là chỗ nó khác `chart-interactive-image` một cách đo được: ảnh căng giữa
 * HAI neo nên nó co giãn cùng biểu đồ; con dấu neo MỘT chỗ nên zoom vào không
 * làm nó to ra. Một con dấu phóng to theo zoom thì hết là dấu.
 */
export const stickerFrame = (props, moreProps) => {
    const resolved = { ...interactiveStickerDefaults, ...props }
    const {
        xScale,
        chartConfig: { yScale },
    } = moreProps

    const size = resolved.size
    return {
        x: xScale(resolved.xValue) - size / 2,
        y: yScale(resolved.yValue) - size / 2,
        width: size,
        height: size,
    }
}

export const isStickerHover = (moreProps, props) => {
    const resolved = { ...interactiveStickerDefaults, ...props }
    const {
        mouseXY: [mouseX, mouseY],
    } = moreProps
    const reach = resolved.tolerance + hitSlop(moreProps)
    const frame = stickerFrame(resolved, moreProps)

    return (
        mouseX >= frame.x - reach &&
        mouseX <= frame.x + frame.width + reach &&
        mouseY >= frame.y - reach &&
        mouseY <= frame.y + frame.height + reach
    )
}

/**
 * Một con dấu người dùng đóng xuống: một neo dữ liệu, cỡ cố định theo pixel,
 * ảnh do ứng dụng đưa vào qua `src`.
 *
 * Gói không mang bức tranh nào — kể cả emoji. `imageToolDefaults.src` đã là bằng
 * chứng của luật ấy từ trước; chỗ này chỉ tiếp tục nó. Ai cần dán emoji, logo,
 * cờ hay chữ ký đều dùng đúng phần tử này, và bộ hình là việc của ứng dụng.
 * Chưa có ảnh thì vẽ ô chờ có nhãn.
 */
export class InteractiveSticker extends GenericChartComponent {
    #props

    constructor() {
        super()
        this.#props = defineProperties(this, interactiveStickerDefaults)
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
        if (isNotDefined(this.#props.xValue) || isNotDefined(this.#props.yValue)) return false
        return isStickerHover(moreProps, this.#props)
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
        const resolved = { ...interactiveStickerDefaults, ...this.#props }
        if (isNotDefined(resolved.xValue) || isNotDefined(resolved.yValue)) return
        const frame = stickerFrame(resolved, moreProps)

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

        // Chưa có ảnh: ô chờ có nhãn — người dùng thấy chỗ mình vừa đóng dấu
        context.strokeStyle = resolved.strokeStyle
        context.lineWidth = resolved.strokeWidth
        context.strokeRect(frame.x, frame.y, frame.width, frame.height)
        context.font = "10px system-ui, sans-serif"
        context.fillStyle = resolved.strokeStyle
        context.textAlign = "center"
        context.fillText("★", frame.x + frame.width / 2, frame.y + frame.height / 2 + 4)
        context.textAlign = "start"
    }
}

define("chart-interactive-sticker", InteractiveSticker)
