import { isDefined, isNotDefined } from "../core/utils/index.js"
import { ElementBase, define, defineProperties } from "../core/element.js"
import { getValueFromOverride, isHoverForInteractiveType, saveNodeType, terminate } from "./utils.js"

export const trendLineDefaults = {
    type: "XLINE",
    enabled: true,
    snap: true,
    snapTo: undefined,
    onStart: undefined,
    onComplete: undefined,
    onSelect: undefined,
    currentPositionStroke: "#000000",
    currentPositionstrokeOpacity: 1,
    currentPositionStrokeWidth: 3,
    currentPositionRadius: 0,
    shouldDisableSnap: event => event.button === 2 || event.shiftKey,
    hoverText: {
        enable: true,
        bgHeight: "auto",
        bgWidth: "auto",
        text: "Click to select object",
        selectedText: "",
    },
    trends: [],
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
 * Draw trendlines by hand: `<chart-trend-line>`.
 *
 * Two clicks make a line — the first fixes one end, the second the other, with the line
 * following the pointer in between. Once drawn, a line can be moved whole or by either
 * end.
 *
 * **The tool does not own the lines.** It reports them through `onComplete` and expects
 * `trends` to be set back. That is deliberate: the application decides what to keep,
 * what to persist, and what to undo — a drawing tool that quietly owned its own state
 * could not be part of a document that gets saved.
 */
export class TrendLine extends ElementBase {
    #props
    #current = null
    #override = null
    #mouseMoved = false

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, trendLineDefaults)

        this.terminate = terminate.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
        this.getSelectionState = isHoverForInteractiveType("trends").bind(this)
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

    connectedCallback() {
        this.style.display = "none"
        this.#build()
    }

    update() {
        if (this.isConnected) this.#build()
    }

    #wrappers = []
    #temporary = null
    #indicator = null

    /**
     * Update children in place rather than rebuilding.
     *
     * Same reason as `EachTrendLine`: hover and drag state live on those elements, so
     * replacing them mid-gesture destroys the state the gesture needs. Wrappers are added
     * and removed only when the number of trendlines actually changes.
     */
    #build() {
        const props = this.#props

        while (this.#wrappers.length > props.trends.length) {
            this.#wrappers.pop().remove()
        }

        while (this.#wrappers.length < props.trends.length) {
            const wrapper = document.createElement("chart-each-trend-line")
            this.#wrappers.push(wrapper)
            this.append(wrapper)
        }

        this.nodes = [...this.#wrappers]

        props.trends.forEach((each, index) => {
            const appearance = isDefined(each.appearance)
                ? { ...props.appearance, ...each.appearance }
                : props.appearance

            Object.assign(this.#wrappers[index], {
                index,
                type: each.type ?? props.type,
                selected: each.selected,
                x1Value: getValueFromOverride(this.#override, index, "x1Value", each.start[0]),
                y1Value: getValueFromOverride(this.#override, index, "y1Value", each.start[1]),
                x2Value: getValueFromOverride(this.#override, index, "x2Value", each.end[0]),
                y2Value: getValueFromOverride(this.#override, index, "y2Value", each.end[1]),
                strokeStyle: appearance.strokeStyle,
                strokeWidth: appearance.strokeWidth,
                strokeDasharray: appearance.strokeDasharray,
                edgeStroke: appearance.edgeStroke,
                edgeFill: appearance.edgeFill,
                edgeStrokeWidth: appearance.edgeStrokeWidth,
                r: appearance.r,
                hoverText: { ...trendLineDefaults.hoverText, ...props.hoverText },
                onDrag: this.#handleDragLine,
                onDragComplete: this.#handleDragLineComplete,
            })

            this.#wrappers[index].update()
        })

        // The line being drawn right now, following the pointer
        const drawing = isDefined(this.#current) && isDefined(this.#current.end)

        if (drawing && this.#temporary === null) {
            this.#temporary = document.createElement("chart-interactive-straight-line")
            this.append(this.#temporary)
        } else if (!drawing && this.#temporary !== null) {
            this.#temporary.remove()
            this.#temporary = null
        }

        if (drawing) {
            Object.assign(this.#temporary, {
                type: props.type,
                x1Value: this.#current.start[0],
                y1Value: this.#current.start[1],
                x2Value: this.#current.end[0],
                y2Value: this.#current.end[1],
                strokeStyle: props.appearance.strokeStyle,
                strokeWidth: props.appearance.strokeWidth,
            })
        }

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
            onMouseMove: this.#handleDrawLine,
        })
    }

    #handleStart = (event, xyValue, moreProps) => {
        if (isNotDefined(this.#current) || isNotDefined(this.#current.start)) {
            this.#mouseMoved = false
            this.setInteractiveState({ current: { start: xyValue, end: null } })
            this.#props.onStart?.(event, moreProps)
        }
    }

    #handleDrawLine = (event, xyValue) => {
        if (isDefined(this.#current) && isDefined(this.#current.start)) {
            this.#mouseMoved = true
            this.setInteractiveState({ current: { start: this.#current.start, end: xyValue } })
        }
    }

    /**
     * The second click completes the line — but only if the pointer actually moved.
     * Without that check, a single click on empty chart would leave a zero-length line.
     */
    #handleEnd = (event, xyValue, moreProps) => {
        if (!this.#mouseMoved || !isDefined(this.#current) || !isDefined(this.#current.start)) return

        const newTrends = [
            ...this.#props.trends.map(each => ({ ...each, selected: false })),
            {
                start: this.#current.start,
                end: xyValue,
                selected: true,
                appearance: this.#props.appearance,
                type: this.#props.type,
            },
        ]

        this.setInteractiveState({ current: null, override: null })
        this.#props.onComplete?.(event, newTrends, moreProps)
    }

    #handleDragLine = (event, index, newXYValue) => {
        this.setInteractiveState({ override: { index, ...newXYValue } })
    }

    #handleDragLineComplete = (event, moreProps) => {
        if (!isDefined(this.#override)) return

        const override = this.#override

        const newTrends = this.#props.trends.map((each, index) =>
            index === override.index
                ? {
                      ...each,
                      start: [override.x1Value, override.y1Value],
                      end: [override.x2Value, override.y2Value],
                      selected: true,
                  }
                : { ...each, selected: false },
        )

        this.setInteractiveState({ override: null })
        this.#props.onComplete?.(event, newTrends, moreProps)
    }
}

define("chart-trend-line", TrendLine)
