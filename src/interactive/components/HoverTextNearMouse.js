import { GenericChartComponent } from "../../core/GenericChartComponent.js"
import { defineProperties, define } from "../../core/element.js"

const PADDING = 8
const MIN_WIDTH = PADDING * 2

export const hoverTextNearMouseDefaults = {
    fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
    fontSize: 12,
    fill: "#000000",
    bgFill: "#FA9325",
    bgOpacity: 0.5,
    bgWidth: "auto",
    bgHeight: "auto",
    text: "",
    show: false,
}

/**
 * The tooltip that follows the cursor while an object is hoverable.
 *
 * It flips to the other side of the pointer near an edge, so the hint never falls off
 * the chart — the same trick `HoverTooltip` uses, and for the same reason.
 */
export const hoverTextLayout = (props, moreProps) => {
    const { show, bgWidth, bgHeight } = props
    const {
        mouseXY,
        chartConfig: { height, width },
        show: mouseInsideCanvas,
    } = moreProps

    if (!show || !mouseInsideCanvas) return undefined

    const [x, y] = mouseXY

    const cx = x < width / 2 ? x + PADDING : x - bgWidth - PADDING
    const cy = y < height / 2 ? y + PADDING : y - bgHeight - PADDING

    return {
        rect: { x: cx, y: cy, width: bgWidth, height: bgHeight },
        text: { text: props.text, x: cx + PADDING / 2, y: cy + bgHeight / 2 },
    }
}

export const renderHoverTextNearMouse = (moreProps, props) => {
    const resolved = { ...hoverTextNearMouseDefaults, ...props }
    const { fontFamily, fontSize, fill, bgFill, bgOpacity } = resolved

    // "auto" needs a measured text node, which only exists once rendered. Until then the
    // box is a minimum size; the browser path re-measures and settles.
    const bgWidth = resolved.bgWidth === "auto" ? (resolved.textWidth ?? 0) + PADDING || MIN_WIDTH : resolved.bgWidth
    const bgHeight =
        resolved.bgHeight === "auto" ? (resolved.textHeight ?? 0) + PADDING || MIN_WIDTH : resolved.bgHeight

    const layout = hoverTextLayout({ ...resolved, bgWidth, bgHeight }, moreProps)
    if (layout === undefined) return null

    const { rect, text } = layout

    return {
        tag: "g",
        children: [
            { tag: "rect", attrs: { fill: bgFill, fillOpacity: bgOpacity, stroke: bgFill, ...rect } },
            {
                tag: "text",
                attrs: {
                    fontSize,
                    fontFamily,
                    textAnchor: "start",
                    alignmentBaseline: "central",
                    fill,
                    x: text.x,
                    y: text.y,
                },
                children: [text.text],
            },
        ],
    }
}

/** The hint that follows the cursor while a drawn object can be grabbed. */
export class HoverTextNearMouse extends GenericChartComponent {
    #props
    #measured = {}

    constructor() {
        super()
        this.#props = defineProperties(this, hoverTextNearMouseDefaults)
    }

    get drawOn() {
        return ["mousemove"]
    }

    /** Chữ nào, cỡ nào, font nào — đổi một trong ba thì phải đo lại, còn không thì không. */
    #shapeKey() {
        const { text, fontSize, fontFamily, fontWeight } = this.#props
        return `${fontWeight}|${fontSize}|${fontFamily}|${text}`
    }

    svgDraw(moreProps) {
        if (!this.#props.text) return null

        const result = renderHoverTextNearMouse(moreProps, { ...this.#props, ...this.#measured })

        /**
         * Đo một lần cho mỗi chữ, không đo lại theo từng bước con trỏ.
         *
         * `drawOn` của phần tử này là `mousemove`, nên nó được vẽ lại mỗi lần con trỏ nhích.
         * Trước đây mỗi lần vẽ lại đều hẹn một `#measure()`, và `#measure()` gọi `getBBox()` —
         * mà `getBBox` buộc trình duyệt tính lại layout **đồng bộ**, ngay giữa lúc đang vẽ
         * canvas. Đo được trên trang thật: 1,1 lần `getBBox` cho mỗi bước con trỏ, mãi mãi,
         * dù kích cỡ chữ chẳng đổi.
         *
         * Kích cỡ chỉ phụ thuộc vào chữ và font, không phụ thuộc vào chỗ con trỏ đang ở. Nên
         * chỉ đo khi một trong những thứ ấy đổi. Và `bgWidth`/`bgHeight` không phải "auto"
         * thì không đo lần nào — trước đây vẫn hẹn một microtask rồi mới quay ra.
         */
        const { bgWidth, bgHeight } = this.#props
        const auto = bgWidth === "auto" || bgHeight === "auto"

        if (auto && this.#measuredFor !== this.#shapeKey()) queueMicrotask(() => this.#measure())

        return result
    }

    #measuredFor = null

    #measure() {
        const key = this.#shapeKey()
        if (this.#measuredFor === key) return

        const node = this.svgParent()?.querySelector("text")
        if (!node) return

        const { width, height } = node.getBBox()

        // Chữ chưa được xếp chỗ thì `getBBox` trả 0 — đừng ghi nhớ con số ấy, vì ghi nhớ là
        // không bao giờ đo lại nữa, và cái nhãn sẽ hẹp mãi.
        if (width === 0) return

        this.#measuredFor = key

        if (this.#measured.textWidth === width && this.#measured.textHeight === height) return

        this.#measured = { textWidth: width, textHeight: height }
        this.canvas?.redraw()
    }
}

define("chart-hover-text", HoverTextNearMouse)
