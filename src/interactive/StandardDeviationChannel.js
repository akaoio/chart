import { isDefined, isNotDefined } from "../core/utils/index.js"
import { ElementBase, define, defineProperties, batched } from "../core/element.js"
import { getValueFromOverride, isHoverForInteractiveType, saveNodeType, terminate, toolChartId } from "./utils.js"

export const standardDeviationChannelDefaults = {
    enabled: true,
    snapTo: datum => datum.close,
    onStart: undefined,
    onComplete: undefined,
    appearance: {
        stroke: "#000000",
        fillOpacity: 0.2,
        strokeOpacity: 1,
        strokeWidth: 1,
        fill: "#8AAFE2",
        edgeStrokeWidth: 2,
        edgeStroke: "#000000",
        edgeFill: "#FFFFFF",
        r: 5,
    },
    currentPositionStroke: "#000000",
    currentPositionOpacity: 1,
    currentPositionStrokeWidth: 3,
    currentPositionRadius: 4,
    hoverText: {
        enable: true,
        bgHeight: "auto",
        bgWidth: "auto",
        text: "Click and drag the edge circles",
        selectedText: "",
    },
    channels: [],
}

/**
 * Regression channel over a chosen range: `<chart-standard-deviation-channel>`.
 *
 * Two clicks pick the range; the channel is then computed from the closes inside it.
 * Nothing about the line's position is chosen by hand, which is what separates this from
 * a trendline — it reports what the data did, not what the eye saw.
 */
export class StandardDeviationChannel extends ElementBase {
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
        this.#props = defineProperties(this, standardDeviationChannelDefaults)

        this.terminate = terminate.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
        this.getSelectionState = isHoverForInteractiveType("channels").bind(this)
    }

    /** Pane nào chứa công cụ này — thứ `chart-drawing-object-selector` cần khi đăng ký. */
    get chartId() {
        return toolChartId.call(this)
    }

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

        while (this.#wrappers.length > props.channels.length) this.#wrappers.pop().remove()
        while (this.#wrappers.length < props.channels.length) {
            const wrapper = document.createElement("chart-each-linear-regression-channel")
            this.#wrappers.push(wrapper)
            this.append(wrapper)
        }

        this.nodes = [...this.#wrappers]

        props.channels.forEach((each, index) => {
            const appearance = isDefined(each.appearance)
                ? { ...props.appearance, ...each.appearance }
                : props.appearance

            Object.assign(this.#wrappers[index], {
                index,
                selected: each.selected,
                x1Value: getValueFromOverride(this.#override, index, "x1Value", each.start[0]),
                x2Value: getValueFromOverride(this.#override, index, "x2Value", each.end[0]),
                appearance,
                snapTo: props.snapTo,
                hoverText: isDefined(each.hoverText) ? { ...props.hoverText, ...each.hoverText } : props.hoverText,
                onDrag: this.#handleDragLine,
                onDragComplete: this.#handleDragLineComplete,
            })

            this.#wrappers[index].update()
        })

        const drawing = isDefined(this.#current) && isDefined(this.#current.end)

        if (drawing && this.#temporary === null) {
            this.#temporary = document.createElement("chart-each-linear-regression-channel")
            this.append(this.#temporary)
        } else if (!drawing && this.#temporary !== null) {
            this.#temporary.remove()
            this.#temporary = null
        }

        if (drawing) {
            Object.assign(this.#temporary, {
                interactive: false,
                x1Value: this.#current.start[0],
                x2Value: this.#current.end[0],
                appearance: props.appearance,
                hoverText: props.hoverText,
            })
            this.#temporary.update()
        }

        if (this.#indicator === null) {
            this.#indicator = document.createElement("chart-mouse-location-indicator")
            this.append(this.#indicator)
        }

        Object.assign(this.#indicator, {
            enabled: props.enabled,
            snap: true,
            snapTo: props.snapTo,
            r: props.currentPositionRadius,
            stroke: props.currentPositionStroke,
            opacity: props.currentPositionOpacity,
            strokeWidth: props.currentPositionStrokeWidth,
            onMouseDown: this.#handleStart,
            onClick: this.#handleEnd,
            onMouseMove: this.#handleDrawLine,
        })
    }

    #handleStart = (event, xyValue) => {
        if (isNotDefined(this.#current) || isNotDefined(this.#current.start)) {
            this.#mouseMoved = false
            this.setInteractiveState({ current: { start: xyValue, end: null } })
            this.#props.onStart?.()
        }
    }

    #handleDrawLine = (event, xyValue) => {
        if (isDefined(this.#current) && isDefined(this.#current.start)) {
            this.#mouseMoved = true
            this.setInteractiveState({ current: { start: this.#current.start, end: xyValue } })
        }
    }

    #handleEnd = (event, xyValue, moreProps) => {
        if (!this.#mouseMoved || !isDefined(this.#current) || !isDefined(this.#current.start)) return

        const newChannels = [
            ...this.#props.channels.map(each => ({ ...each, selected: false })),
            { start: this.#current.start, end: xyValue, selected: true, appearance: this.#props.appearance },
        ]

        this.setInteractiveState({ current: null })
        this.#props.onComplete?.(event, newChannels, moreProps)
    }

    #handleDragLine = (event, index, newXYValue) => {
        this.setInteractiveState({ override: { index, ...newXYValue } })
    }

    #handleDragLineComplete = (event, moreProps) => {
        if (!isDefined(this.#override)) return

        const override = this.#override

        const newChannels = this.#props.channels.map((each, index) =>
            index === override.index
                ? {
                      ...each,
                      start: [override.x1Value, each.start[1]],
                      end: [override.x2Value, each.end[1]],
                      selected: true,
                  }
                : each,
        )

        this.setInteractiveState({ override: null })
        this.#props.onComplete?.(event, newChannels, moreProps)
    }
}

define("chart-standard-deviation-channel", StandardDeviationChannel)
