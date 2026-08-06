import { isNotDefined } from "../../core/utils/index.js"
import { getXValue } from "../../core/utils/ChartDataUtil.js"
import { ElementBase, define, defineProperties } from "../../core/element.js"
import { isHover, saveNodeType } from "../utils.js"
import { getNewXY } from "./EachTrendLine.js"
import { angleLineEndpoints } from "../components/InteractiveAngleLine.js"

export const eachAngleLineDefaults = {
    index: undefined,
    interactive: true,
    selected: false,
    start: undefined,
    angle: 0,
    length: 0,
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
 * One trend angle: kéo tay cầm cuối là XOAY (đổi góc và độ dài, đo lại từ
 * pixel — đúng thứ nhãn hiển thị), kéo tay cầm đầu hay thân là DỜI (neo đổi,
 * góc giữ nguyên). Tay cầm cuối định vị bằng xyProvider vì điểm cuối là đại
 * lượng màn hình, không có toạ độ dữ liệu cố định.
 */
export class EachAngleLine extends ElementBase {
    #props
    #dragStart
    #hover = false
    #children = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, eachAngleLineDefaults)
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
        const { start, angle, length, interactive, appearance, hoverText, selected } = props
        const { enable: hoverTextEnabled, selectedText, text: unselectedText, ...restHoverText } = hoverText

        if (isNotDefined(start)) return

        const showHandles = selected || this.#hover

        if (this.#children === null) {
            this.#children = {
                body: document.createElement("chart-interactive-angle-line"),
                first: document.createElement("chart-clickable-circle"),
                second: document.createElement("chart-clickable-circle"),
                hoverText: document.createElement("chart-hover-text"),
            }
            this.append(this.#children.body, this.#children.first, this.#children.second, this.#children.hoverText)
            this.nodes = [this.#children.body, this.#children.first, this.#children.second]
        }

        Object.assign(this.#children.body, {
            selected: showHandles,
            x1Value: start[0],
            y1Value: start[1],
            angle,
            length,
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

        const dress = circle =>
            Object.assign(circle, {
                show: showHandles,
                r: appearance.r,
                fillStyle: appearance.edgeFill,
                strokeStyle: appearance.edgeStroke,
                strokeWidth: appearance.edgeStrokeWidth,
                interactiveCursorClass: "chart-move-cursor",
                onDragStart: () => {},
                onDragComplete: props.onDragComplete,
            })

        dress(this.#children.first)
        Object.assign(this.#children.first, { cx: start[0], cy: start[1], onDrag: this.#handleStartDrag })

        dress(this.#children.second)
        Object.assign(this.#children.second, {
            cx: undefined,
            cy: undefined,
            xyProvider: moreProps =>
                angleLineEndpoints({ x1Value: start[0], y1Value: start[1], angle, length }, moreProps).p2,
            onDrag: this.#handleEndDrag,
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

    // Mỗi handler báo ĐỦ cả ba giá trị: override thiếu khoá nào là build kế
    // wrapper nhận undefined khoá ấy — và tay cầm crash giữa chuỗi kéo.
    #handleStartDrag = (event, moreProps) => {
        this.#props.onDrag(event, this.#props.index, {
            start: getNewXY(moreProps),
            angle: this.#props.angle,
            length: this.#props.length,
        })
    }

    /** Kéo đầu cuối: đo lại góc và độ dài từ pixel — đúng đại lượng nhãn hiển thị. */
    #handleEndDrag = (event, moreProps) => {
        const {
            xScale,
            chartConfig: { yScale },
            mouseXY,
        } = moreProps
        const [startX, startY] = [xScale(this.#props.start[0]), yScale(this.#props.start[1])]
        const angle = (Math.atan2(startY - mouseXY[1], mouseXY[0] - startX) * 180) / Math.PI
        const length = Math.max(1, Math.hypot(mouseXY[0] - startX, mouseXY[1] - startY))
        this.#props.onDrag(event, this.#props.index, { start: this.#props.start, angle, length })
    }

    #handleBodyStart = () => {
        this.#dragStart = { start: this.#props.start }
    }

    /** Kéo thân: neo dời theo quãng pixel, góc và độ dài màn hình giữ nguyên. */
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
        const [xValue, yValue] = this.#dragStart.start
        this.#props.onDrag(event, this.#props.index, {
            start: [
                getXValue(xScale, xAccessor, [xScale(xValue) - dx, yScale(yValue) - dy], fullData),
                yScale.invert(yScale(yValue) - dy),
            ],
            angle: this.#props.angle,
            length: this.#props.length,
        })
    }
}

define("chart-each-angle-line", EachAngleLine)
