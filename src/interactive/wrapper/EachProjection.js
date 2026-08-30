import { isNotDefined } from "../../core/utils/index.js"
import { getXValue } from "../../core/utils/ChartDataUtil.js"
import { ElementBase, define, defineProperties } from "../../core/element.js"
import { isHover, saveNodeType } from "../utils.js"
import { getNewXY } from "./EachTrendLine.js"

export const eachProjectionDefaults = {
    index: undefined,
    interactive: true,
    selected: false,
    points: undefined,
    variant: "forecast",
    appearance: {
        strokeStyle: "#787B86",
        strokeWidth: 1,
        upFill: "rgba(38, 166, 154, 0.2)",
        downFill: "rgba(239, 83, 80, 0.2)",
        textFill: "#FFFFFF",
        upLabelFill: "#26A69A",
        downLabelFill: "#EF5350",
        fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
        fontSize: 11,
        edgeStroke: "#787B86",
        edgeFill: "#FFFFFF",
        edgeStrokeWidth: 1,
        r: 6,
    },
    hoverText: { enable: false },
    onDrag: () => {},
    onDragComplete: () => {},
}

/**
 * One projection: the two legs and its THREE anchors.
 *
 * Ba tay cầm, ba lời gọi `createElement` ở thân hàm — số tay cầm phải đọc được
 * mà không phải chạy mã, vì cổng đếm icon bên akao đọc chính chuỗi ấy.
 *
 * Đích của variant `projection` KHÔNG có tay cầm: nó suy ra từ ba neo kia. Một
 * vành kéo được cho một giá trị dẫn xuất là lời hứa mà kéo xong sẽ bị nuốt.
 */
export class EachProjection extends ElementBase {
    #props
    #dragStart
    #hover = false
    #children = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, eachProjectionDefaults)
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
        const { points, variant, interactive, hoverText, selected } = props
        const appearance = { ...eachProjectionDefaults.appearance, ...props.appearance }
        const { enable: hoverTextEnabled, selectedText, text: unselectedText, ...restHoverText } = hoverText

        if (isNotDefined(points) || points.length < 3) return

        const showHandles = selected || this.#hover

        if (this.#children === null) {
            this.#children = {
                body: document.createElement("chart-interactive-projection"),
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

        Object.assign(this.#children.body, {
            selected: showHandles,
            points,
            variant,
            strokeStyle: appearance.strokeStyle,
            strokeWidth: showHandles ? appearance.strokeWidth + 1 : appearance.strokeWidth,
            upFill: appearance.upFill,
            downFill: appearance.downFill,
            textFill: appearance.textFill,
            upLabelFill: appearance.upLabelFill,
            downLabelFill: appearance.downLabelFill,
            fontFamily: appearance.fontFamily,
            fontSize: appearance.fontSize,
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
                interactiveCursorClass: "chart-move-cursor",
                onDragStart: () => {},
                onDrag,
                onDragComplete: props.onDragComplete,
            })

        dress(this.#children.first, points[0], this.#handlePointDrag(0))
        dress(this.#children.second, points[1], this.#handlePointDrag(1))
        dress(this.#children.third, points[2], this.#handlePointDrag(2))

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

    /** Kéo thân: cả ba neo dời cùng một quãng pixel — dự phóng giữ nguyên dáng. */
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

define("chart-each-projection", EachProjection)
