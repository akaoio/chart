import { isDefined, isNotDefined } from "../core/utils/index.js"
import { ElementBase, define, defineProperties, batched } from "../core/element.js"
import { isHoverForInteractiveType, saveNodeType, terminate, toolChartId } from "./utils.js"

export const barsPatternDefaults = {
    enabled: true,
    onStart: undefined,
    onComplete: undefined,
    onSelect: undefined,
    currentPositionStroke: "#000000",
    currentPositionOpacity: 1,
    currentPositionStrokeWidth: 3,
    currentPositionRadius: 4,
    hoverText: { enable: true, bgHeight: 18, bgWidth: 120, text: "Click to select object" },
    patterns: [],
    appearance: {
        upStyle: "rgba(106, 185, 117, 0.6)",
        downStyle: "rgba(224, 122, 122, 0.6)",
        edgeStroke: "#000000",
        edgeFill: "#FFFFFF",
        edgeStrokeWidth: 1,
        r: 5,
    },
}

/**
 * TradingView's Bars Pattern: `<chart-bars-pattern>`, three clicks.
 *
 * Two clicks bracket the SOURCE bars; from then on their ghost rides the pointer —
 * the anchor previews wherever the mouse goes — and the third click sets it down.
 * The completed object is `{ from, to, at }`: range and anchor, never the bars,
 * which the leaf re-reads from the rows on every draw.
 */
export class BarsPattern extends ElementBase {
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
        this.#props = defineProperties(this, barsPatternDefaults)

        this.terminate = terminate.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
        this.getSelectionState = isHoverForInteractiveType("patterns").bind(this)
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

        while (this.#wrappers.length > props.patterns.length) this.#wrappers.pop().remove()
        while (this.#wrappers.length < props.patterns.length) {
            const wrapper = document.createElement("chart-each-bars-pattern")
            this.#wrappers.push(wrapper)
            this.append(wrapper)
        }

        this.nodes = [...this.#wrappers]

        props.patterns.forEach((each, index) => {
            const appearance = isDefined(each.appearance)
                ? { ...props.appearance, ...each.appearance }
                : props.appearance

            const live = index === overrideIndex ? this.#override : each

            Object.assign(this.#wrappers[index], {
                index,
                selected: each.selected,
                hoverText: props.hoverText,
                from: live.from,
                to: live.to,
                at: live.at,
                appearance,
                onDrag: this.#handleDrag,
                onDragComplete: this.#handleDragComplete,
            })

            this.#wrappers[index].update()
        })

        const drawing = isDefined(this.#current) && isDefined(this.#current.at)

        if (drawing && this.#temporary === null) {
            this.#temporary = document.createElement("chart-each-bars-pattern")
            this.append(this.#temporary)
        } else if (!drawing && this.#temporary !== null) {
            this.#temporary.remove()
            this.#temporary = null
        }

        if (drawing) {
            Object.assign(this.#temporary, {
                interactive: false,
                from: this.#current.from,
                to: this.#current.to,
                at: this.#current.at,
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
            onClick: this.#handleClick,
            onMouseMove: this.#handleMove,
        })
    }

    #handleStart = (event, xyValue) => {
        if (isNotDefined(this.#current) || isNotDefined(this.#current.from)) {
            this.#mouseMoved = false
            this.setInteractiveState({ current: { from: xyValue[0], to: null, at: null } })
            this.#props.onStart?.()
        }
    }

    /** Trước khi dải nguồn khép, con trỏ là mép TO; sau đó nó là chỗ dán — bóng bám theo. */
    #handleMove = (event, xyValue) => {
        const current = this.#current
        if (!isDefined(current) || !isDefined(current.from)) return

        this.#mouseMoved = true

        if (isNotDefined(current.at)) {
            this.setInteractiveState({ current: { ...current, to: xyValue[0] } })
            return
        }

        this.setInteractiveState({ current: { ...current, at: xyValue } })
    }

    /** Bấm hai khép dải nguồn và thả bóng lên con trỏ; bấm ba đặt bóng xuống. */
    #handleClick = (event, xyValue, moreProps) => {
        const current = this.#current
        if (!this.#mouseMoved || !isDefined(current) || !isDefined(current.from)) return

        if (isNotDefined(current.at)) {
            this.setInteractiveState({ current: { ...current, to: xyValue[0], at: xyValue } })
            return
        }

        const newPatterns = [
            ...this.#props.patterns.map(each => ({ ...each, selected: false })),
            { from: current.from, to: current.to, at: xyValue, selected: true, appearance: this.#props.appearance },
        ]

        this.setInteractiveState({ current: null })
        this.#props.onComplete?.(event, newPatterns, moreProps)
    }

    #handleDrag = (event, index, newValues) => {
        this.setInteractiveState({ override: { index, ...newValues } })
    }

    #handleDragComplete = (event, moreProps) => {
        if (!isDefined(this.#override)) return

        const { index, ...rest } = this.#override

        const newPatterns = this.#props.patterns.map((each, at) =>
            at === index ? { ...each, ...rest, selected: true } : each,
        )

        this.setInteractiveState({ override: null })
        this.#props.onComplete?.(event, newPatterns, moreProps)
    }
}

define("chart-bars-pattern", BarsPattern)
