import { mean } from "d3-array"
import { first, last, sign } from "../core/utils/index.js"
import { mousePosition, pointerPosition, touchPosition, getTouchProps } from "../core/utils/dom.js"
import { GenericChartComponent } from "../core/GenericChartComponent.js"
import { DOUBLE_CLICK_SLOP } from "../core/EventCapture.js"
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

/**
 * The rect itself. Invisible — it exists to catch the pointer, not to be seen.
 *
 * `cursorClass` is what the pointer looks like at rest, and it defaults to the plain arrow
 * the original hard-codes here. The elements pass the resize cursor of their own axis
 * instead, which is the whole affordance: hovering the strip says it can be dragged. That
 * substitution lives in `AxisZoomCapture` so this function stays byte-identical to the
 * original and can go on being compared against it.
 *
 * Empty parts are dropped rather than joined blindly — otherwise an axis that sets no
 * `className` ships a class literally called `undefined`, which is what the original does.
 */
export const axisZoomCaptureRect = ({
    bg,
    className,
    cursorClass = "chart-default-cursor",
    zoomCursorClassName = "",
    dragging = false,
}) => ({
    tag: "rect",
    attrs: {
        className: ["chart-enable-interaction", dragging ? zoomCursorClassName : cursorClass, className]
            .filter(Boolean)
            .join(" "),
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
    #clickedAt = null
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

        // Con trỏ lúc nghỉ là con trỏ co giãn của chính trục — có thế thì rê chuột lên
        // dải này mới biết là kéo được. Lúc đang kéo, nếu ứng dụng không đặt riêng thì
        // vẫn là con trỏ ấy, để giữa chừng không nhấp nháy.
        const cursorClass = axis.axisCursorClass ?? "chart-default-cursor"

        const { attrs } = axisZoomCaptureRect({
            bg: props.bg,
            className: this.#props.className ?? props.className,
            cursorClass,
            zoomCursorClassName: this.#props.zoomCursorClassName || props.zoomCursorClassName || cursorClass,
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

    /**
     * Ai lo cú bấm chuột phải: hỏi chính mình trước, rồi hỏi trục.
     *
     * Bản gốc truyền `onContextMenu` từ `XAxis`/`YAxis` xuống dải này, còn ở đây dải được
     * chính trục dựng ra nên người dùng không chạm tới nó được — đặt `onContextMenu` lên
     * `<chart-x-axis>` thì trước đây không có gì nhận.
     */
    #contextMenu() {
        return this.#props.onContextMenu ?? this.#props.axis?.seriesProps?.onContextMenu
    }

    #handleDragEnd = event => {
        if (this.#rect !== null && !this.#dragHappened) {
            const position = pointerPosition(event, this.#rect)

            // Cùng phép đo khoảng cách như `EventCapture`: nhấp đúp là hai cú bấm vào cùng
            // một chỗ, không phải hai cú bấm gần nhau về thời gian ở hai đầu dải trục.
            const nearFirst =
                this.#clickedAt !== null &&
                Math.abs(position[0] - this.#clickedAt[0]) <= DOUBLE_CLICK_SLOP &&
                Math.abs(position[1] - this.#clickedAt[1]) <= DOUBLE_CLICK_SLOP

            if (this.#clicked && nearFirst) {
                this.#doubleClick()?.(event, position)
                this.#clicked = false
                this.#clickedAt = null
            } else {
                this.#clicked = true
                this.#clickedAt = position
                window.clearTimeout(this.#clickTimer)
                this.#clickTimer = setTimeout(() => {
                    this.#clicked = false
                    this.#clickedAt = null
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

        const onContextMenu = this.#contextMenu()
        if (onContextMenu === undefined) return

        const mouseXY = mousePosition(event, this.#rect.getBoundingClientRect())

        this.#endGesture()
        this.#startPosition = null

        onContextMenu(event, mouseXY)
    }
}

define("chart-axis-zoom-capture", AxisZoomCapture)
