import { isNotDefined } from "../../core/utils/index.js"
import { getXValue } from "../../core/utils/ChartDataUtil.js"
import { ElementBase, define, defineProperties } from "../../core/element.js"
import { isHover, saveNodeType } from "../utils.js"
import { getNewXY } from "./EachTrendLine.js"

export const eachPatternDefaults = {
    index: undefined,
    interactive: true,
    selected: false,
    points: undefined,
    labels: [],
    fillTriangles: false,
    appearance: {
        strokeStyle: "#000000",
        strokeWidth: 1,
        fillStyle: "rgba(138, 175, 226, 0.2)",
        fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
        fontSize: 11,
        fontFill: "#000000",
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
 * One drawn pattern: the polyline body and one handle per vertex.
 *
 * Số đỉnh do variant quyết định nên tay cầm được đối chiếu lại mỗi lần build —
 * nhưng vẫn tạo-một-lần-sửa-tại-chỗ cho từng cái, đúng quy tắc wrapper.
 */
export class EachPattern extends ElementBase {
    #props
    #dragStart
    #hover = false
    #children = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, eachPatternDefaults)
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
        const { points, labels, fillTriangles, interactive, appearance, hoverText, selected } = props
        const { enable: hoverTextEnabled, selectedText, text: unselectedText, ...restHoverText } = hoverText

        // connectedCallback chay truoc khi tool kip gan diem — chua du thi chua dung gi
        if (isNotDefined(points) || points.length < 2) return

        const showHandles = selected || this.#hover

        if (this.#children === null) {
            this.#children = {
                body: document.createElement("chart-interactive-polyline"),
                handles: [],
                hoverText: document.createElement("chart-hover-text"),
            }
            this.append(this.#children.body, this.#children.hoverText)
        }

        // Đối chiếu số tay cầm với số đỉnh của variant
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
            labels,
            fillTriangles,
            strokeStyle: appearance.strokeStyle,
            strokeWidth: showHandles ? appearance.strokeWidth + 1 : appearance.strokeWidth,
            fillStyle: appearance.fillStyle,
            fontFamily: appearance.fontFamily,
            fontSize: appearance.fontSize,
            fontFill: appearance.fontFill,
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

    /** Kéo thân: mọi đỉnh dời cùng một quãng pixel. */
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

define("chart-each-pattern", EachPattern)
