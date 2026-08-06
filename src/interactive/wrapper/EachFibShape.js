import { isNotDefined } from "../../core/utils/index.js"
import { getXValue } from "../../core/utils/ChartDataUtil.js"
import { ElementBase, define, defineProperties } from "../../core/element.js"
import { isHover, saveNodeType } from "../utils.js"
import { getNewXY } from "./EachTrendLine.js"

export const eachFibShapeDefaults = {
    index: undefined,
    interactive: true,
    selected: false,
    points: undefined,
    variant: "arcs",
    levels: undefined,
    appearance: {
        strokeStyle: "#000000",
        strokeWidth: 1,
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
 * One drawn Fibonacci construction: the shape body and one handle per anchor.
 * Wedge có ba neo, các variant khác hai — số tay cầm đối chiếu theo số điểm,
 * vẫn tạo-một-lần-sửa-tại-chỗ cho từng cái.
 */
export class EachFibShape extends ElementBase {
    #props
    #dragStart
    #hover = false
    #children = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, eachFibShapeDefaults)
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
        const { points, variant, levels, interactive, appearance, hoverText, selected } = props
        const { enable: hoverTextEnabled, selectedText, text: unselectedText, ...restHoverText } = hoverText

        // connectedCallback chạy trước khi tool kịp gán điểm — chưa đủ thì chưa dựng gì
        if (isNotDefined(points) || points.length < 2) return

        const showHandles = selected || this.#hover

        if (this.#children === null) {
            this.#children = {
                body: document.createElement("chart-interactive-fib-shape"),
                handles: [],
                hoverText: document.createElement("chart-hover-text"),
            }
            this.append(this.#children.body, this.#children.hoverText)
        }

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
            variant,
            levels,
            strokeStyle: appearance.strokeStyle,
            strokeWidth: showHandles ? appearance.strokeWidth + 1 : appearance.strokeWidth,
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

define("chart-each-fib-shape", EachFibShape)
