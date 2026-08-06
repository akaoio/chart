import { isDefined, isNotDefined } from "../core/utils/index.js"
import { ElementBase, define, defineProperties, batched } from "../core/element.js"
import { getValueFromOverride, isHoverForInteractiveType, saveNodeType, terminate, toolChartId } from "./utils.js"

export const trendAngleDefaults = {
    enabled: true,
    snap: false,
    snapTo: undefined,
    shouldDisableSnap: event => event.button === 2 || event.shiftKey,
    currentPositionStroke: "#000000",
    currentPositionstrokeOpacity: 1,
    currentPositionStrokeWidth: 3,
    currentPositionRadius: 0,
    onStart: undefined,
    onComplete: undefined,
    onSelect: undefined,
    hoverText: {
        enable: true,
        bgHeight: "auto",
        bgWidth: "auto",
        text: "Click to select object",
        selectedText: "",
    },
    angles: [],
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
}

/**
 * Trend angle: `<chart-trend-angle>`.
 *
 * Hai cú bấm: neo rồi hướng. Neo là toạ độ dữ liệu; góc và độ dài đo bằng
 * PIXEL lúc bấm — cách TradingView làm: đổi scale hay zoom thì đường giữ
 * nguyên góc trên màn hình và nhãn độ vẫn đúng, còn điểm cuối trôi theo
 * dữ liệu.
 */
export class TrendAngle extends ElementBase {
    #props
    #current = null
    #override = null
    #mouseMoved = false

    #wrappers = []
    #temporary = null
    #indicator = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, trendAngleDefaults)

        this.terminate = terminate.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
        this.getSelectionState = isHoverForInteractiveType("angles").bind(this)
    }

    /** Pane nào chứa công cụ này — thứ `chart-drawing-object-selector` cần khi đăng ký. */
    get chartId() {
        return toolChartId.call(this)
    }

    /** What `isHoverForInteractiveType` reads. */
    get interactiveProps() {
        return this.#props
    }

    setInteractiveState(next) {
        if ("current" in next) this.#current = next.current
        if ("override" in next) this.#override = next.override
        this.update()
    }

    /** Đổi danh sách đối tượng đã vẽ thì phải dựng lại cây con, không chỉ vẽ lại. */
    propertyChanged = batched(() => this.update())

    connectedCallback() {
        this.style.display = "none"
        this.#build()
    }

    update() {
        if (this.isConnected) this.#build()
    }

    #build() {
        const props = this.#props

        while (this.#wrappers.length > props.angles.length) this.#wrappers.pop().remove()
        while (this.#wrappers.length < props.angles.length) {
            const wrapper = document.createElement("chart-each-angle-line")
            this.#wrappers.push(wrapper)
            this.append(wrapper)
        }

        this.nodes = [...this.#wrappers]

        props.angles.forEach((each, index) => {
            const appearance = isDefined(each.appearance) ? { ...props.appearance, ...each.appearance } : props.appearance

            Object.assign(this.#wrappers[index], {
                index,
                interactive: true,
                selected: each.selected,
                start: getValueFromOverride(this.#override, index, "start", each.start),
                angle: getValueFromOverride(this.#override, index, "angle", each.angle),
                length: getValueFromOverride(this.#override, index, "length", each.length),
                appearance,
                hoverText: { ...trendAngleDefaults.hoverText, ...props.hoverText },
                onDrag: this.#handleDragAngle,
                onDragComplete: this.#handleDragAngleComplete,
            })

            this.#wrappers[index].update()
        })

        // Hình tạm: đường góc bám con trỏ, nhãn độ sống ngay khi vẽ
        const drawing = isDefined(this.#current) && isDefined(this.#current.angle)

        if (drawing && this.#temporary === null) {
            this.#temporary = document.createElement("chart-interactive-angle-line")
            this.append(this.#temporary)
        } else if (!drawing && this.#temporary !== null) {
            this.#temporary.remove()
            this.#temporary = null
        }

        if (drawing)
            Object.assign(this.#temporary, {
                x1Value: this.#current.start[0],
                y1Value: this.#current.start[1],
                angle: this.#current.angle,
                length: this.#current.length,
                strokeStyle: props.appearance.strokeStyle,
                strokeWidth: props.appearance.strokeWidth,
                fontFamily: props.appearance.fontFamily,
                fontSize: props.appearance.fontSize,
                fontFill: props.appearance.fontFill,
            })

        if (this.#indicator === null) {
            this.#indicator = document.createElement("chart-mouse-location-indicator")
            this.append(this.#indicator)
        }

        Object.assign(this.#indicator, {
            enabled: props.enabled,
            snap: props.snap,
            shouldDisableSnap: props.shouldDisableSnap,
            snapTo: props.snapTo,
            r: props.currentPositionRadius,
            stroke: props.currentPositionStroke,
            opacity: props.currentPositionstrokeOpacity,
            strokeWidth: props.currentPositionStrokeWidth,
            onMouseDown: this.#handleStart,
            onClick: this.#handleEnd,
            onMouseMove: this.#handleDraw,
        })
    }

    /** Góc và độ dài đo từ pixel giữa neo và con trỏ — đại lượng nhãn sẽ hiển thị. */
    #measure(moreProps) {
        const {
            xScale,
            chartConfig: { yScale },
            mouseXY,
        } = moreProps
        const startX = xScale(this.#current.start[0])
        const startY = yScale(this.#current.start[1])
        return {
            angle: (Math.atan2(startY - mouseXY[1], mouseXY[0] - startX) * 180) / Math.PI,
            length: Math.max(1, Math.hypot(mouseXY[0] - startX, mouseXY[1] - startY)),
        }
    }

    #handleStart = (event, xyValue, moreProps) => {
        if (isNotDefined(this.#current) || isNotDefined(this.#current.start)) {
            this.#mouseMoved = false
            this.setInteractiveState({ current: { start: xyValue, angle: null, length: null } })
            this.#props.onStart?.(event, moreProps)
        }
    }

    #handleDraw = (event, xyValue, moreProps) => {
        if (isDefined(this.#current) && isDefined(this.#current.start)) {
            this.#mouseMoved = true
            this.setInteractiveState({ current: { start: this.#current.start, ...this.#measure(moreProps) } })
        }
    }

    /** The second click fixes the direction — but only if the pointer actually moved. */
    #handleEnd = (event, xyValue, moreProps) => {
        if (!this.#mouseMoved || !isDefined(this.#current) || !isDefined(this.#current.start)) return

        const newAngles = [
            ...this.#props.angles.map(each => ({ ...each, selected: false })),
            {
                start: this.#current.start,
                ...this.#measure(moreProps),
                selected: true,
                appearance: this.#props.appearance,
            },
        ]

        this.setInteractiveState({ current: null, override: null })
        this.#props.onComplete?.(event, newAngles, moreProps)
    }

    #handleDragAngle = (event, index, newValues) => {
        this.setInteractiveState({ override: { index, ...newValues } })
    }

    #handleDragAngleComplete = (event, moreProps) => {
        if (!isDefined(this.#override)) return

        const { index, ...changed } = this.#override

        const newAngles = this.#props.angles.map((each, position) =>
            position === index ? { ...each, ...changed, selected: true } : { ...each, selected: false },
        )

        this.setInteractiveState({ override: null })
        this.#props.onComplete?.(event, newAngles, moreProps)
    }
}

define("chart-trend-angle", TrendAngle)
