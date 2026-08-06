import { isDefined } from "../core/utils/index.js"
import { ElementBase, define, defineProperties, batched } from "../core/element.js"
import { getValueFromOverride, isHoverForInteractiveType, saveNodeType, terminate, toolChartId } from "./utils.js"

export const axisLineDefaults = {
    enabled: true,
    mode: "horizontal",
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
    lines: [],
    appearance: {
        strokeStyle: "#000000",
        strokeWidth: 1,
        strokeDasharray: "Solid",
        edgeStrokeWidth: 1,
        edgeFill: "#FFFFFF",
        edgeStroke: "#000000",
        r: 6,
    },
}

/**
 * Axis-anchored lines: `<chart-axis-line>`.
 *
 * One click places a line at the pointer. `mode` decides its shape: `horizontal` and
 * `vertical` run across the whole pane, `horizontalRay` runs from the click to the
 * right edge, `cross` is both at once. Each placed line remembers its own mode, so one
 * tool instance can hold a mixed list.
 *
 * TradingView xếp bốn công cụ này thành bốn nút riêng — nhưng hình học chỉ là một cái
 * neo một điểm, nên ở đây là một phần tử với `mode`, và ứng dụng muốn bốn nút thì đặt
 * bốn giá trị mode. Báo cáo qua `onComplete` như mọi công cụ khác: tool không giữ danh
 * sách của riêng nó.
 */
export class AxisLine extends ElementBase {
    #props
    #override = null

    #wrappers = []
    #indicator = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, axisLineDefaults)

        this.terminate = terminate.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
        this.getSelectionState = isHoverForInteractiveType("lines").bind(this)
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

        while (this.#wrappers.length > props.lines.length) this.#wrappers.pop().remove()
        while (this.#wrappers.length < props.lines.length) {
            const wrapper = document.createElement("chart-each-axis-line")
            this.#wrappers.push(wrapper)
            this.append(wrapper)
        }

        this.nodes = [...this.#wrappers]

        props.lines.forEach((each, index) => {
            const appearance = isDefined(each.appearance) ? { ...props.appearance, ...each.appearance } : props.appearance

            Object.assign(this.#wrappers[index], {
                index,
                mode: each.mode ?? props.mode,
                selected: each.selected,
                xValue: getValueFromOverride(this.#override, index, "xValue", each.at[0]),
                yValue: getValueFromOverride(this.#override, index, "yValue", each.at[1]),
                strokeStyle: appearance.strokeStyle,
                strokeWidth: appearance.strokeWidth,
                strokeDasharray: appearance.strokeDasharray,
                edgeStroke: appearance.edgeStroke,
                edgeFill: appearance.edgeFill,
                edgeStrokeWidth: appearance.edgeStrokeWidth,
                r: appearance.r,
                hoverText: { ...axisLineDefaults.hoverText, ...props.hoverText },
                onDrag: this.#handleDragLine,
                onDragComplete: this.#handleDragLineComplete,
            })

            this.#wrappers[index].update()
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
            onClick: this.#handlePlace,
        })
    }

    /** One click, one line — there is nothing to rubber-band. */
    #handlePlace = (event, xyValue, moreProps) => {
        if (!this.#props.enabled) return

        const newLines = [
            ...this.#props.lines.map(each => ({ ...each, selected: false })),
            {
                at: xyValue,
                mode: this.#props.mode,
                selected: true,
                appearance: this.#props.appearance,
            },
        ]

        this.#props.onComplete?.(event, newLines, moreProps)
    }

    #handleDragLine = (event, index, newXYValue) => {
        this.setInteractiveState({ override: { index, ...newXYValue } })
    }

    #handleDragLineComplete = (event, moreProps) => {
        if (!isDefined(this.#override)) return

        const override = this.#override

        const newLines = this.#props.lines.map((each, index) =>
            index === override.index
                ? { ...each, at: [override.xValue, override.yValue], selected: true }
                : { ...each, selected: false },
        )

        this.setInteractiveState({ override: null })
        this.#props.onComplete?.(event, newLines, moreProps)
    }
}

define("chart-axis-line", AxisLine)
