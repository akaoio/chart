import { word } from "../core/i18n.js"
import { isDefined, isNotDefined } from "../core/utils/index.js"
import { ElementBase, define, defineProperties, batched } from "../core/element.js"
import { isHoverForInteractiveType, saveNodeType, terminate, toolChartId } from "./utils.js"
import { getSlope, getYIntercept } from "./components/InteractiveStraightLine.js"

export const disjointChannelDefaults = {
    enabled: true,
    variant: "disjoint",
    onStart: undefined,
    onComplete: undefined,
    onSelect: undefined,
    currentPositionStroke: "#000000",
    currentPositionOpacity: 1,
    currentPositionStrokeWidth: 3,
    currentPositionRadius: 4,
    hoverText: { enable: true, bgHeight: 18, bgWidth: 120, text: word("selectObject") },
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
 * A channel whose two edges need not be parallel: `<chart-disjoint-channel>`.
 *
 * The same three clicks as `chart-equidistant-channel` — baseline, then width — but the
 * object it completes carries TWO offsets (`dy`, `dy2`), one per end, and the wrapper's
 * second-line handles move them independently. Two variants share the machine, exactly
 * the way `chart-pattern` shares one click-counter across its table:
 *
 *   variant: "disjoint"  — third stage sets both offsets equal (the channel is born
 *                          parallel); pulling one handle later is what un-parallels it.
 *   variant: "flat"      — TV's Flat Top/Bottom: the third stage drags a horizontal
 *                          LEVEL, and the offsets are derived so the second line lies
 *                          on it (`dy = level − y1`, `dy2 = level − y2`); the wrapper
 *                          keeps them linked afterwards.
 */
export class DisjointChannel extends ElementBase {
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
        this.#props = defineProperties(this, disjointChannelDefaults)

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
        const overrideIndex = isDefined(this.#override) ? this.#override.index : null

        while (this.#wrappers.length > props.channels.length) this.#wrappers.pop().remove()
        while (this.#wrappers.length < props.channels.length) {
            const wrapper = document.createElement("chart-each-disjoint-channel")
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
                dy2: live.dy2,
                flat: live.flat === true,
                appearance,
                onDrag: this.#handleDragChannel,
                onDragComplete: this.#handleDragChannelComplete,
            })

            this.#wrappers[index].update()
        })

        const drawing = isDefined(this.#current) && isDefined(this.#current.endXY)

        if (drawing && this.#temporary === null) {
            this.#temporary = document.createElement("chart-each-disjoint-channel")
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
                dy2: this.#current.dy2,
                flat: this.#props.variant === "flat",
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
     * Before the baseline is finished the pointer *is* the second point; afterwards the
     * variants part ways: "disjoint" measures how far off the line it sits, "flat"
     * reads its y as the horizontal level the second line will lie on.
     */
    #handleDrawChannel = (event, xyValue) => {
        const current = this.#current
        if (!isDefined(current) || !isDefined(current.startXY)) return

        this.#mouseMoved = true

        if (isNotDefined(current.dy)) {
            this.setInteractiveState({ current: { startXY: current.startXY, endXY: xyValue } })
            return
        }

        if (this.#props.variant === "flat") {
            const level = xyValue[1]
            this.setInteractiveState({
                current: {
                    ...current,
                    dy: level - current.startXY[1],
                    dy2: level - current.endXY[1],
                },
            })
            return
        }

        const slope = getSlope(current.startXY, current.endXY)
        const intercept = getYIntercept(slope, current.endXY)
        const offset = xyValue[1] - (slope * xyValue[0] + intercept)

        this.setInteractiveState({ current: { ...current, dy: offset, dy2: offset } })
    }

    /** The second click does not finish the channel — it opens the width stage. */
    #handleEnd = (event, xyValue, moreProps) => {
        const current = this.#current
        if (!this.#mouseMoved || !isDefined(current) || !isDefined(current.startXY)) return

        if (isNotDefined(current.dy)) {
            this.setInteractiveState({ current: { ...current, dy: 0, dy2: 0 } })
            return
        }

        const newChannels = [
            ...this.#props.channels.map(each => ({ ...each, selected: false })),
            { ...current, flat: this.#props.variant === "flat", selected: true, appearance: this.#props.appearance },
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

define("chart-disjoint-channel", DisjointChannel)
