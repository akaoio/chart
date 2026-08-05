import { isDefined, isNotDefined } from "../core/utils/index.js"
import { ElementBase, define, defineProperties, batched } from "../core/element.js"
import { isHoverForInteractiveType, saveNodeType, terminate } from "./utils.js"
import { getSlope, getYIntercept } from "./components/InteractiveStraightLine.js"

export const equidistantChannelDefaults = {
    enabled: true,
    onStart: undefined,
    onComplete: undefined,
    onSelect: undefined,
    currentPositionStroke: "#000000",
    currentPositionOpacity: 1,
    currentPositionStrokeWidth: 3,
    currentPositionRadius: 4,
    hoverText: { enable: true, bgHeight: 18, bgWidth: 120, text: "Click to select object" },
    channels: [],
    appearance: {
        stroke: "#000000",
        strokeOpacity: 1,
        strokeWidth: 1,
        fill: "#8AAFE2",
        fillOpacity: 0.7,
        edgeStroke: "#000000",
        edgeFill: "#FFFFFF",
        edgeFill2: "#250B98",
        edgeStrokeWidth: 1,
        r: 5,
    },
}

/**
 * A parallel price channel drawn in **three** clicks: `<chart-equidistant-channel>`.
 *
 * First two set the baseline; the third sets the channel's width. That third stage is
 * why the tool tracks `dy` separately — until it exists the drawing is one line, and the
 * pointer is measured against that line's slope rather than against a second point.
 */
export class EquidistantChannel extends ElementBase {
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
        this.#props = defineProperties(this, equidistantChannelDefaults)

        this.terminate = terminate.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
        this.getSelectionState = isHoverForInteractiveType("channels").bind(this)
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
        const overrideIndex = isDefined(this.#override) ? this.#override.index : null

        while (this.#wrappers.length > props.channels.length) this.#wrappers.pop().remove()
        while (this.#wrappers.length < props.channels.length) {
            const wrapper = document.createElement("chart-each-equidistant-channel")
            this.#wrappers.push(wrapper)
            this.append(wrapper)
        }

        this.nodes = [...this.#wrappers]

        props.channels.forEach((each, index) => {
            const appearance = isDefined(each.appearance)
                ? { ...props.appearance, ...each.appearance }
                : props.appearance

            const live = index === overrideIndex ? this.#override : each

            Object.assign(this.#wrappers[index], {
                index,
                selected: each.selected,
                hoverText: props.hoverText,
                startXY: live.startXY,
                endXY: live.endXY,
                dy: live.dy,
                appearance,
                onDrag: this.#handleDragChannel,
                onDragComplete: this.#handleDragChannelComplete,
            })

            this.#wrappers[index].update()
        })

        const drawing = isDefined(this.#current) && isDefined(this.#current.endXY)

        if (drawing && this.#temporary === null) {
            this.#temporary = document.createElement("chart-each-equidistant-channel")
            this.append(this.#temporary)
        } else if (!drawing && this.#temporary !== null) {
            this.#temporary.remove()
            this.#temporary = null
        }

        if (drawing) {
            Object.assign(this.#temporary, {
                interactive: false,
                startXY: this.#current.startXY,
                endXY: this.#current.endXY,
                dy: this.#current.dy,
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
            snap: false,
            r: props.currentPositionRadius,
            stroke: props.currentPositionStroke,
            opacity: props.currentPositionOpacity,
            strokeWidth: props.currentPositionStrokeWidth,
            onMouseDown: this.#handleStart,
            onClick: this.#handleEnd,
            onMouseMove: this.#handleDrawChannel,
        })
    }

    #handleStart = (event, xyValue) => {
        if (isNotDefined(this.#current) || isNotDefined(this.#current.startXY)) {
            this.#mouseMoved = false
            this.setInteractiveState({ current: { startXY: xyValue, endXY: null } })
            this.#props.onStart?.()
        }
    }

    /**
     * Before the baseline is finished the pointer *is* the second point; afterwards it
     * measures how far off that line it sits, and that distance becomes the width.
     */
    #handleDrawChannel = (event, xyValue) => {
        const current = this.#current
        if (!isDefined(current) || !isDefined(current.startXY)) return

        this.#mouseMoved = true

        if (isNotDefined(current.dy)) {
            this.setInteractiveState({ current: { startXY: current.startXY, endXY: xyValue } })
            return
        }

        const slope = getSlope(current.startXY, current.endXY)
        const intercept = getYIntercept(slope, current.endXY)

        this.setInteractiveState({ current: { ...current, dy: xyValue[1] - (slope * xyValue[0] + intercept) } })
    }

    /** The second click does not finish the channel — it opens the width stage. */
    #handleEnd = (event, xyValue, moreProps) => {
        const current = this.#current
        if (!this.#mouseMoved || !isDefined(current) || !isDefined(current.startXY)) return

        if (isNotDefined(current.dy)) {
            this.setInteractiveState({ current: { ...current, dy: 0 } })
            return
        }

        const newChannels = [
            ...this.#props.channels.map(each => ({ ...each, selected: false })),
            { ...current, selected: true, appearance: this.#props.appearance },
        ]

        this.setInteractiveState({ current: null })
        this.#props.onComplete?.(event, newChannels, moreProps)
    }

    #handleDragChannel = (event, index, newXYValue) => {
        this.setInteractiveState({ override: { index, ...newXYValue } })
    }

    #handleDragChannelComplete = (event, moreProps) => {
        if (!isDefined(this.#override)) return

        const { index, ...rest } = this.#override

        const newChannels = this.#props.channels.map((each, at) =>
            at === index ? { ...each, ...rest, selected: true } : each,
        )

        this.setInteractiveState({ override: null })
        this.#props.onComplete?.(event, newChannels, moreProps)
    }
}

define("chart-equidistant-channel", EquidistantChannel)
