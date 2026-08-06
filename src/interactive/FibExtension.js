import { isDefined, isNotDefined } from "../core/utils/index.js"
import { ElementBase, define, defineProperties, batched } from "../core/element.js"
import { getValueFromOverride, isHoverForInteractiveType, saveNodeType, terminate, toolChartId } from "./utils.js"

export const fibExtensionDefaults = {
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
    extensions: [],
    appearance: {
        strokeStyle: "#000000",
        strokeWidth: 1,
        fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
        fontSize: 10,
        fontFill: "#000000",
        edgeStroke: "#000000",
        edgeFill: "#FFFFFF",
        edgeStrokeWidth: 1,
        r: 5,
    },
}

/**
 * Trend-based fib extension: `<chart-fib-extension>`.
 *
 * Three clicks — swing start, swing end, pull-back — and six ratio levels
 * project rightward from the pull-back: C + (B − A) · r. TradingView calls
 * this "Trend-based fib extension"; the three-click machine is the
 * pitchfork's, the level composition is the retracement's.
 */
export class FibExtension extends ElementBase {
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
        this.#props = defineProperties(this, fibExtensionDefaults)

        this.terminate = terminate.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
        this.getSelectionState = isHoverForInteractiveType("extensions").bind(this)
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

        while (this.#wrappers.length > props.extensions.length) this.#wrappers.pop().remove()
        while (this.#wrappers.length < props.extensions.length) {
            const wrapper = document.createElement("chart-each-fib-extension")
            this.#wrappers.push(wrapper)
            this.append(wrapper)
        }

        this.nodes = [...this.#wrappers]

        props.extensions.forEach((each, index) => {
            const appearance = isDefined(each.appearance) ? { ...props.appearance, ...each.appearance } : props.appearance

            Object.assign(this.#wrappers[index], {
                index,
                interactive: true,
                selected: each.selected,
                p1: getValueFromOverride(this.#override, index, "p1", each.p1),
                p2: getValueFromOverride(this.#override, index, "p2", each.p2),
                p3: getValueFromOverride(this.#override, index, "p3", each.p3),
                appearance,
                hoverText: { ...fibExtensionDefaults.hoverText, ...props.hoverText },
                onDrag: this.#handleDragExtension,
                onDragComplete: this.#handleDragExtensionComplete,
            })

            this.#wrappers[index].update()
        })

        // Hình tạm: một điểm là đoạn thẳng, hai điểm là nguyên bộ mức bám con trỏ
        const drawing = isDefined(this.#current) && isDefined(this.#current.end)

        if (drawing && this.#temporary === null) {
            this.#temporary = document.createElement(isDefined(this.#current.p2) ? "chart-each-fib-extension" : "chart-interactive-straight-line")
            this.append(this.#temporary)
        } else if (!drawing && this.#temporary !== null) {
            this.#temporary.remove()
            this.#temporary = null
        }

        if (drawing) {
            const wantsLevels = isDefined(this.#current.p2)
            const isLevels = this.#temporary.tagName.toLowerCase() === "chart-each-fib-extension"
            if (wantsLevels !== isLevels) {
                this.#temporary.remove()
                this.#temporary = document.createElement(wantsLevels ? "chart-each-fib-extension" : "chart-interactive-straight-line")
                this.append(this.#temporary)
            }

            if (wantsLevels) {
                Object.assign(this.#temporary, {
                    interactive: false,
                    selected: false,
                    p1: this.#current.p1,
                    p2: this.#current.p2,
                    p3: this.#current.end,
                    appearance: props.appearance,
                })
                this.#temporary.update()
            } else
                Object.assign(this.#temporary, {
                    type: "LINE",
                    x1Value: this.#current.p1[0],
                    y1Value: this.#current.p1[1],
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
            onClick: this.#handleClick,
            onMouseMove: this.#handleDraw,
        })
    }

    #handleStart = (event, xyValue, moreProps) => {
        if (isNotDefined(this.#current) || isNotDefined(this.#current.p1)) {
            this.#mouseMoved = false
            this.setInteractiveState({ current: { p1: xyValue, p2: undefined, end: null } })
            this.#props.onStart?.(event, moreProps)
        }
    }

    #handleDraw = (event, xyValue) => {
        if (isDefined(this.#current) && isDefined(this.#current.p1)) {
            this.#mouseMoved = true
            this.setInteractiveState({ current: { ...this.#current, end: xyValue } })
        }
    }

    /** Click two pins the swing end; click three completes the extension. */
    #handleClick = (event, xyValue, moreProps) => {
        const current = this.#current
        if (!this.#mouseMoved || !isDefined(current) || !isDefined(current.p1)) return

        if (isNotDefined(current.p2)) {
            this.setInteractiveState({ current: { ...current, p2: xyValue } })
            return
        }

        const newExtensions = [
            ...this.#props.extensions.map(each => ({ ...each, selected: false })),
            {
                p1: current.p1,
                p2: current.p2,
                p3: xyValue,
                selected: true,
                appearance: this.#props.appearance,
            },
        ]

        this.setInteractiveState({ current: null, override: null })
        this.#props.onComplete?.(event, newExtensions, moreProps)
    }

    #handleDragExtension = (event, index, newPoints) => {
        this.setInteractiveState({ override: { index, ...newPoints } })
    }

    #handleDragExtensionComplete = (event, moreProps) => {
        if (!isDefined(this.#override)) return

        const { index, p1, p2, p3 } = this.#override

        const newExtensions = this.#props.extensions.map((each, at) =>
            at === index ? { ...each, p1, p2, p3, selected: true } : { ...each, selected: false },
        )

        this.setInteractiveState({ override: null })
        this.#props.onComplete?.(event, newExtensions, moreProps)
    }
}

define("chart-fib-extension", FibExtension)
