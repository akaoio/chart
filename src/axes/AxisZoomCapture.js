import { mean } from "d3-array"
import { first, last, sign } from "../core/utils/index.js"
import { mousePosition, pointerPosition, touchPosition, getTouchProps } from "../core/utils/dom.js"
import { GenericChartComponent } from "../core/GenericChartComponent.js"
import { define, defineProperties } from "../core/element.js"

export const axisZoomCaptureDefaults = {
    axis: null,
    inverted: true,
    className: undefined,
    zoomCursorClassName: "",
    onDoubleClick: undefined,
    onContextMenu: undefined,
}

/**
 * The invisible strip over an axis that you drag to stretch or squash it.
 *
 * Both ends of the range move by the same amount in opposite directions, which is why the
 * middle of the axis stays put while you drag. Dragging **towards** the middle brings the
 * ends together, and the domain is then read off the old scale at those two closer
 * points — so fewer sessions fit on screen and the chart zooms in. Dragging away does the
 * reverse.
 *
 * Returns `undefined` when the drag would turn the axis inside out: past that point the
 * two ends have crossed, and the chart would be showing time (or price) backwards.
 */
export const axisZoomDomain = ({ startScale, startXY, mouseXY, getMouseDelta, inverted = true }) => {
    const difference = getMouseDelta(startXY, mouseXY)

    const range = startScale.range()
    const center = mean(range)
    if (center === undefined) return undefined

    const stretched = range.map(each =>
        inverted ? each - sign(each - center) * difference : each + sign(each - center) * difference,
    )

    if (sign(last(range) - first(range)) !== sign(last(stretched) - first(stretched))) return undefined

    return stretched.map(startScale.invert)
}

/** The rect itself. Invisible — it exists to catch the pointer, not to be seen. */
export const axisZoomCaptureRect = ({ bg, className, zoomCursorClassName = "", dragging = false }) => ({
    tag: "rect",
    attrs: {
        className: `chart-enable-interaction ${dragging ? zoomCursorClassName : "chart-default-cursor"} ${className}`,
        x: bg.x,
        y: bg.y,
        opacity: 0,
        height: bg.h,
        width: bg.w,
    },
})

/** The invisible strip over an axis that you drag to stretch or squash that scale. */
export class AxisZoomCapture extends GenericChartComponent {
    #props
    #rect = null
    #startPosition = null
    #gesture = null
    #clicked = false
    #clickTimer = null
    #dragHappened = false

    constructor() {
        super()
        this.#props = defineProperties(this, axisZoomCaptureDefaults)
    }

    get drawOn() {
        return ["pan"]
    }

    get clip() {
        return false
    }

    disconnectedCallback() {
        this.#endGesture()
        if (this.#clickTimer !== null) clearTimeout(this.#clickTimer)
        super.disconnectedCallback()
    }

    svgDraw() {
        const axis = this.#props.axis
        const props = axis === null || !axis.axisZoomEnabled ? null : axis.axisProps

        if (props === null) {
            // Bỏ hẳn cái rect chứ không chỉ gỡ khỏi tài liệu: giữ lại là giữ luôn mấy
            // listener trên nó, và một cú kéo đang dở sẽ vẫn chạy tiếp trên một trục mà
            // người dùng vừa tắt.
            this.#endGesture()
            this.#startPosition = null
            this.#rect = null
            return null
        }

        // Nút bấm được dựng MỘT lần rồi dùng lại: mỗi lần vẽ lại `<g>` bọc ngoài bị thay
        // mới, mà giữa chừng có thể đang có một cú kéo bám vào chính cái rect này.
        if (this.#rect === null) {
            this.#rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
            this.#rect.addEventListener("mousedown", this.#handleDragStartMouse)
            this.#rect.addEventListener("touchstart", this.#handleDragStartTouch, { passive: false })
            this.#rect.addEventListener("contextmenu", this.#handleRightClick)
            // Kéo DỌC trên trục giá là để giãn thang giá, nên dải hẹp này giữ lại cả cử
            // chỉ dọc — khác vùng bắt sự kiện chính, nơi cuộn dọc vẫn thuộc về trang.
            this.#rect.style.touchAction = "none"
            // Chỗ bám cho bài kiểm trong trình duyệt, như `data-event-capture` của
            // EventCapture. Không thuộc phần được so với bản gốc.
            this.#rect.setAttribute("data-axis-zoom", axis.localName)
        }

        const { attrs } = axisZoomCaptureRect({
            bg: props.bg,
            className: this.#props.className ?? props.className,
            zoomCursorClassName: this.#props.zoomCursorClassName || props.zoomCursorClassName,
            dragging: this.#startPosition !== null,
        })

        for (const [name, value] of Object.entries(attrs)) {
            this.#rect.setAttribute(name === "className" ? "class" : name, String(value))
        }

        return { tag: "g", attrs: { transform: `translate(${props.transform[0]}, ${props.transform[1]})` }, children: [this.#rect] }
    }

    #startScale() {
        const axis = this.#props.axis
        const props = axis?.axisProps
        if (!props) return undefined

        return props.getScale(this.getMoreProps())
    }

    #beginGesture(moveEvent, endEvent, startXY, startScale) {
        this.#gesture = new AbortController()
        const { signal } = this.#gesture

        window.addEventListener(moveEvent, this.#handleDrag, { signal })
        window.addEventListener(endEvent, this.#handleDragEnd, { signal })

        this.#startPosition = { startScale, startXY }
        this.draw({ force: true })
    }

    #endGesture() {
        this.#gesture?.abort()
        this.#gesture = null
    }

    #handleDragStartMouse = event => {
        event.preventDefault()
        this.#dragHappened = false

        const startScale = this.#startScale()
        if (startScale?.invert === undefined) return

        this.#beginGesture("mousemove", "mouseup", mousePosition(event), startScale)
    }

    #handleDragStartTouch = event => {
        this.#dragHappened = false

        const startScale = this.#startScale()
        if (event.touches.length !== 1 || startScale?.invert === undefined) return

        this.#beginGesture("touchmove", "touchend", touchPosition(getTouchProps(event.touches[0]), event), startScale)
    }

    #handleDrag = event => {
        if (this.#rect === null || this.#startPosition === null) return

        this.#dragHappened = true

        const axis = this.#props.axis
        const props = axis?.axisProps
        if (!props) return

        const newDomain = axisZoomDomain({
            ...this.#startPosition,
            // `touches[0]`, không phải chính sự kiện: một TouchEvent không có `clientX`.
            // Bản gốc đưa thẳng sự kiện vào `pointer()` của d3, nên toạ độ ra `NaN` và
            // kéo bằng ngón tay trên trục không bao giờ chạy. Xem docs/parity/axes.md.
            mouseXY: pointerPosition(event.touches?.[0] ?? event, this.#rect),
            getMouseDelta: props.getMouseDelta,
            inverted: this.#props.inverted,
        })

        if (newDomain !== undefined) axis.axisZoomCallback(newDomain)
    }

    /**
     * Bấm hai lần trong 300ms là nhấp đúp — nhưng chỉ khi giữa hai lần ấy không có kéo.
     * Kéo xong nhả tay không phải là một cú bấm.
     */
    /**
     * Ai lo cú nhấp đúp: `onDoubleClick` đặt riêng thì theo cái ấy, không thì theo phép
     * mặc định của chính trục — cột giá về tự-vừa-khung, trục thời gian về mức zoom mặc
     * định. Bản gốc để trống cả hai, nên cú nhấp đúp lên trục tính ra rồi bị ném đi.
     */
    #doubleClick() {
        return this.#props.onDoubleClick ?? this.#props.axis?.axisDoubleClick?.bind(this.#props.axis)
    }

    #handleDragEnd = event => {
        if (this.#rect !== null && !this.#dragHappened) {
            if (this.#clicked) {
                this.#doubleClick()?.(event, pointerPosition(event, this.#rect))
                this.#clicked = false
            } else {
                this.#clicked = true
                this.#clickTimer = setTimeout(() => {
                    this.#clicked = false
                }, 300)
            }
        }

        this.#endGesture()
        this.#startPosition = null
        this.draw({ force: true })
    }

    #handleRightClick = event => {
        event.stopPropagation()
        event.preventDefault()

        if (this.#props.onContextMenu === undefined) return

        const mouseXY = mousePosition(event, this.#rect.getBoundingClientRect())

        this.#endGesture()
        this.#startPosition = null

        this.#props.onContextMenu(event, mouseXY)
    }
}

define("chart-axis-zoom-capture", AxisZoomCapture)
