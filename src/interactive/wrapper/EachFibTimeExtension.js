import { isNotDefined } from "../../core/utils/index.js"
import { getXValue } from "../../core/utils/ChartDataUtil.js"
import { ElementBase, define, defineProperties } from "../../core/element.js"
import { isHover, saveNodeType } from "../utils.js"
import { getNewXY } from "./EachTrendLine.js"

export const eachFibTimeExtensionDefaults = {
    index: undefined,
    interactive: true,
    selected: false,
    points: undefined,
    ratios: undefined,
    appearance: {
        strokeStyle: "#000000",
        strokeWidth: 1,
        edgeStroke: "#000000",
        edgeFill: "#FFFFFF",
        edgeStrokeWidth: 1,
        r: 5,
    },
    hoverText: { enable: false },
    onDrag: () => {},
    onDragComplete: () => {},
}

/**
 * One trend-based fib time extension: the vertical lines and its THREE anchors.
 *
 * Ba tay cầm, và ba là con số thật — hai neo đầu đo đơn vị thời gian trên xu
 * hướng, neo thứ ba là gốc chiếu. Ba lời gọi `createElement` nằm thẳng ở thân
 * hàm chứ không trong vòng lặp: cổng đếm icon bên akao đọc chính chuỗi ấy để
 * biết vẽ mấy vành, nên số tay cầm phải đọc được mà không phải chạy mã.
 */
export class EachFibTimeExtension extends ElementBase {
    #props
    #dragStart
    #hover = false
    #children = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, eachFibTimeExtensionDefaults)
        this.isHover = isHover.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
    }

    connectedCallback() {
        this.style.display = "none"
        this.#build()
    }

    update() {
        if (this.isConnected) this.#build()
    }

    #build() {
        const props = this.#props
        const { points, ratios, interactive, appearance, hoverText, selected } = props
        const { enable: hoverTextEnabled, selectedText, text: unselectedText, ...restHoverText } = hoverText

        if (isNotDefined(points) || points.length < 3) return

        const showHandles = selected || this.#hover

        if (this.#children === null) {
            this.#children = {
                body: document.createElement("chart-interactive-cycles"),
                first: document.createElement("chart-clickable-circle"),
                second: document.createElement("chart-clickable-circle"),
                third: document.createElement("chart-clickable-circle"),
                hoverText: document.createElement("chart-hover-text"),
            }
            this.append(
                this.#children.body,
                this.#children.first,
                this.#children.second,
                this.#children.third,
                this.#children.hoverText,
            )
            this.nodes = [this.#children.body, this.#children.first, this.#children.second, this.#children.third]
        }

        const [start, end, origin] = points

        Object.assign(this.#children.body, {
            selected: showHandles,
            offsets: ratios,
            x1Value: start[0],
            y1Value: start[1],
            x2Value: end[0],
            y2Value: end[1],
            x3Value: origin[0],
            strokeStyle: appearance.strokeStyle,
            strokeWidth: showHandles ? appearance.strokeWidth + 1 : appearance.strokeWidth,
            interactiveCursorClass: "chart-move-cursor",
            onHover: interactive ? this.#handleHover : undefined,
            onUnHover: interactive ? this.#handleHover : undefined,
            onDragStart: this.#handleBodyStart,
            onDrag: this.#handleBodyDrag,
            onDragComplete: props.onDragComplete,
        })

        const dress = (circle, point, onDrag) =>
            Object.assign(circle, {
                show: showHandles,
                cx: point[0],
                cy: point[1],
                r: appearance.r,
                fillStyle: appearance.edgeFill,
                strokeStyle: appearance.edgeStroke,
                strokeWidth: appearance.edgeStrokeWidth,
                interactiveCursorClass: "chart-ew-resize-cursor",
                onDragStart: () => {},
                onDrag,
                onDragComplete: props.onDragComplete,
            })

        dress(this.#children.first, start, this.#handlePointDrag(0))
        dress(this.#children.second, end, this.#handlePointDrag(1))
        dress(this.#children.third, origin, this.#handlePointDrag(2))

        Object.assign(this.#children.hoverText, {
            ...restHoverText,
            show: hoverTextEnabled && this.#hover,
            text: selected ? selectedText : unselectedText,
        })
    }

    #handleHover = (event, moreProps) => {
        if (this.#hover === moreProps.hovering) return
        this.#hover = moreProps.hovering
        this.update()
    }

    #handlePointDrag = which => (event, moreProps) => {
        const points = this.#props.points.map((point, index) => (index === which ? getNewXY(moreProps) : point))
        this.#props.onDrag(event, this.#props.index, { points })
    }

    #handleBodyStart = () => {
        this.#dragStart = { points: this.#props.points }
    }

    /** Kéo thân: cả ba neo dời cùng một quãng — đơn vị thời gian giữ nguyên, cả bộ trượt. */
    #handleBodyDrag = (event, moreProps) => {
        const {
            xScale,
            chartConfig: { yScale },
            xAccessor,
            fullData,
            startPos,
            mouseXY,
        } = moreProps
        const dx = startPos[0] - mouseXY[0]
        const dy = startPos[1] - mouseXY[1]
        const points = this.#dragStart.points.map(([xValue, yValue]) => [
            getXValue(xScale, xAccessor, [xScale(xValue) - dx, yScale(yValue) - dy], fullData),
            yScale.invert(yScale(yValue) - dy),
        ])
        this.#props.onDrag(event, this.#props.index, { points })
    }
}

define("chart-each-fib-time-extension", EachFibTimeExtension)
