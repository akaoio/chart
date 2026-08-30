import { isNotDefined } from "../../core/utils/index.js"
import { getXValue } from "../../core/utils/ChartDataUtil.js"
import { ElementBase, define, defineProperties } from "../../core/element.js"
import { isHover, saveNodeType } from "../utils.js"
import { getNewXY } from "./EachTrendLine.js"

export const eachCurveDefaults = {
    index: undefined,
    interactive: true,
    selected: false,
    points: undefined,
    mode: "polygon",
    closed: false,
    appearance: {
        strokeStyle: "#000000",
        strokeWidth: 1,
        fillStyle: "rgba(138, 175, 226, 0.2)",
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
 * One drawn curve: the body and one handle per anchor.
 *
 * Cùng khuôn với `EachPattern` — số neo do variant quyết định nên tay cầm được
 * đối chiếu lại mỗi lần build. Khác đúng một chỗ: thân là
 * `chart-interactive-curve` chứ không phải `chart-interactive-polyline`, vì
 * cung và Bézier không phải đường gấp khúc.
 *
 * MỌI neo đều có tay cầm, kể cả điểm điều khiển của Bézier — nó không phải điểm
 * hình đi qua, nhưng nó là thứ người dùng phải kéo được để đổi độ cong, và giấu
 * nó đi thì hình thành bất trị.
 */
export class EachCurve extends ElementBase {
    #props
    #dragStart
    #hover = false
    #children = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, eachCurveDefaults)
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
        const { points, mode, closed, interactive, appearance, hoverText, selected } = props
        const { enable: hoverTextEnabled, selectedText, text: unselectedText, ...restHoverText } = hoverText

        // connectedCallback chạy trước khi tool kịp gán điểm — chưa đủ thì chưa dựng gì
        if (isNotDefined(points) || points.length < 2) return

        const showHandles = selected || this.#hover

        if (this.#children === null) {
            this.#children = {
                body: document.createElement("chart-interactive-curve"),
                handles: [],
                hoverText: document.createElement("chart-hover-text"),
            }
            this.append(this.#children.body, this.#children.hoverText)
        }

        // Đối chiếu số tay cầm với số neo của variant
        while (this.#children.handles.length > points.length) this.#children.handles.pop().remove()
        while (this.#children.handles.length < points.length) {
            const handle = document.createElement("chart-clickable-circle")
            this.#children.handles.push(handle)
            this.append(handle)
        }

        this.nodes = [this.#children.body, ...this.#children.handles]

        Object.assign(this.#children.body, {
            selected: showHandles,
            points,
            mode,
            closed,
            strokeStyle: appearance.strokeStyle,
            strokeWidth: showHandles ? appearance.strokeWidth + 1 : appearance.strokeWidth,
            fillStyle: appearance.fillStyle,
            interactiveCursorClass: "chart-move-cursor",
            onHover: interactive ? this.#handleHover : undefined,
            onUnHover: interactive ? this.#handleHover : undefined,
            onDragStart: this.#handleBodyStart,
            onDrag: this.#handleBodyDrag,
            onDragComplete: props.onDragComplete,
        })

        points.forEach((point, index) => {
            Object.assign(this.#children.handles[index], {
                show: showHandles,
                cx: point[0],
                cy: point[1],
                r: appearance.r,
                fillStyle: appearance.edgeFill,
                strokeStyle: appearance.edgeStroke,
                strokeWidth: appearance.edgeStrokeWidth,
                interactiveCursorClass: "chart-move-cursor",
                onDragStart: () => {},
                onDrag: this.#handlePointDrag(index),
                onDragComplete: props.onDragComplete,
            })
        })

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

    /** Kéo thân: mọi neo dời cùng một quãng pixel — hình giữ nguyên dáng. */
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

define("chart-each-curve", EachCurve)
