import { isDefined, isNotDefined } from "../core/utils/index.js"
import { ElementBase, define, defineProperties, batched } from "../core/element.js"
import { isHoverForInteractiveType, saveNodeType, terminate } from "./utils.js"

export const fibonacciRetracementDefaults = {
    enabled: true,
    type: "RAY",
    retracements: [],
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
    currentPositionStroke: "#000000",
    currentPositionOpacity: 1,
    currentPositionStrokeWidth: 3,
    currentPositionRadius: 4,
    appearance: {
        strokeStyle: "#000000",
        strokeWidth: 1,
        fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
        fontSize: 11,
        fontFill: "#000000",
        edgeStroke: "#000000",
        edgeFill: "#FFFFFF",
        nsEdgeFill: "#000000",
        edgeStrokeWidth: 1,
        r: 5,
    },
}

/**
 * Fibonacci retracement levels: `<chart-fibonacci-retracement>`.
 *
 * Drag from a swing high to a swing low and the six ratios are drawn between them,
 * labelled with both the price and the percentage. Two clicks, like a trendline — but
 * what appears is six lines, not one.
 */
export class FibonacciRetracement extends ElementBase {
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
        this.#props = defineProperties(this, fibonacciRetracementDefaults)

        this.terminate = terminate.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
        this.getSelectionState = isHoverForInteractiveType("retracements").bind(this)
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

        while (this.#wrappers.length > props.retracements.length) this.#wrappers.pop().remove()
        while (this.#wrappers.length < props.retracements.length) {
            const wrapper = document.createElement("chart-each-fib-retracement")
            this.#wrappers.push(wrapper)
            this.append(wrapper)
        }

        this.nodes = [...this.#wrappers]

        props.retracements.forEach((each, index) => {
            const appearance = isDefined(each.appearance)
                ? { ...props.appearance, ...each.appearance }
                : props.appearance

            const live = index === overrideIndex ? this.#override : each

            Object.assign(this.#wrappers[index], {
                index,
                type: each.type ?? props.type,
                selected: each.selected,
                x1: live.x1,
                y1: live.y1,
                x2: live.x2,
                y2: live.y2,
                hoverText: isDefined(each.hoverText) ? { ...props.hoverText, ...each.hoverText } : props.hoverText,
                appearance,
                onDrag: this.#handleDrag,
                onDragComplete: this.#handleDragComplete,
            })

            this.#wrappers[index].update()
        })

        const drawing = isDefined(this.#current) && isDefined(this.#current.x2)

        if (drawing && this.#temporary === null) {
            this.#temporary = document.createElement("chart-each-fib-retracement")
            this.append(this.#temporary)
        } else if (!drawing && this.#temporary !== null) {
            this.#temporary.remove()
            this.#temporary = null
        }

        if (drawing) {
            Object.assign(this.#temporary, {
                interactive: false,
                type: props.type,
                appearance: props.appearance,
                hoverText: props.hoverText,
                x1: this.#current.x1,
                y1: this.#current.y1,
                x2: this.#current.x2,
                y2: this.#current.y2,
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
            onMouseMove: this.#handleDrawRetracement,
        })
    }

    #handleStart = (event, xyValue, moreProps) => {
        if (isNotDefined(this.#current) || isNotDefined(this.#current.x1)) {
            this.#mouseMoved = false
            this.setInteractiveState({ current: { x1: xyValue[0], y1: xyValue[1], x2: null, y2: null } })
            this.#props.onStart?.(moreProps)
        }
    }

    #handleDrawRetracement = (event, xyValue) => {
        if (isDefined(this.#current) && isDefined(this.#current.x1)) {
            this.#mouseMoved = true
            this.setInteractiveState({ current: { ...this.#current, x2: xyValue[0], y2: xyValue[1] } })
        }
    }

    #handleEnd = (event, xyValue, moreProps) => {
        if (!this.#mouseMoved || !isDefined(this.#current) || !isDefined(this.#current.x1)) return

        const newRetracements = this.#props.retracements.concat({
            ...this.#current,
            x2: xyValue[0],
            y2: xyValue[1],
            selected: true,
            appearance: this.#props.appearance,
            type: this.#props.type,
        })

        this.setInteractiveState({ current: null })
        this.#props.onComplete?.(event, newRetracements, moreProps)
    }

    #handleDrag = (event, index, xy) => {
        this.setInteractiveState({ override: { index, ...xy } })
    }

    #handleDragComplete = (event, moreProps) => {
        if (!isDefined(this.#override)) return

        const { index, ...rest } = this.#override

        const newRetracements = this.#props.retracements.map((each, at) =>
            at === index ? { ...each, ...rest, selected: true } : each,
        )

        this.setInteractiveState({ override: null })
        this.#props.onComplete?.(event, newRetracements, moreProps)
    }
}

define("chart-fibonacci-retracement", FibonacciRetracement)
