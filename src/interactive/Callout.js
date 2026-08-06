import { isDefined, isNotDefined } from "../core/utils/index.js"
import { ElementBase, define, defineProperties, batched } from "../core/element.js"
import { getValueFromOverride, isHoverForInteractiveType, saveNodeType, terminate, toolChartId } from "./utils.js"

export const calloutDefaults = {
    enabled: true,
    defaultText: "Callout",
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
    callouts: [],
    appearance: {
        strokeStyle: "#000000",
        strokeWidth: 1,
        bgFill: "#FFFFFF",
        bgStroke: "#000000",
        textFill: "#000000",
        fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
        fontSize: 12,
        edgeStroke: "#000000",
        edgeFill: "#FFFFFF",
        edgeStrokeWidth: 1,
        r: 5,
    },
}

/**
 * Callouts: `<chart-callout>`.
 *
 * Two clicks — first the anchor (what the note points at), then where the
 * text box sits; a leg connects the two. The words come from `defaultText`
 * at placement and live on each object afterwards, so the application can
 * offer editing however it likes.
 */
export class Callout extends ElementBase {
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
        this.#props = defineProperties(this, calloutDefaults)

        this.terminate = terminate.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
        this.getSelectionState = isHoverForInteractiveType("callouts").bind(this)
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

        while (this.#wrappers.length > props.callouts.length) this.#wrappers.pop().remove()
        while (this.#wrappers.length < props.callouts.length) {
            const wrapper = document.createElement("chart-each-callout")
            this.#wrappers.push(wrapper)
            this.append(wrapper)
        }

        this.nodes = [...this.#wrappers]

        props.callouts.forEach((each, index) => {
            const appearance = isDefined(each.appearance) ? { ...props.appearance, ...each.appearance } : props.appearance

            Object.assign(this.#wrappers[index], {
                index,
                interactive: true,
                selected: each.selected,
                anchor: getValueFromOverride(this.#override, index, "anchor", each.anchor),
                at: getValueFromOverride(this.#override, index, "at", each.at),
                text: each.text ?? props.defaultText,
                appearance,
                hoverText: { ...calloutDefaults.hoverText, ...props.hoverText },
                onDrag: this.#handleDragCallout,
                onDragComplete: this.#handleDragCalloutComplete,
            })

            this.#wrappers[index].update()
        })

        // Hình tạm: chân callout bám con trỏ từ mũi neo
        const drawing = isDefined(this.#current) && isDefined(this.#current.end)

        if (drawing && this.#temporary === null) {
            this.#temporary = document.createElement("chart-interactive-straight-line")
            this.append(this.#temporary)
        } else if (!drawing && this.#temporary !== null) {
            this.#temporary.remove()
            this.#temporary = null
        }

        if (drawing)
            Object.assign(this.#temporary, {
                type: "LINE",
                x1Value: this.#current.anchor[0],
                y1Value: this.#current.anchor[1],
                x2Value: this.#current.end[0],
                y2Value: this.#current.end[1],
                strokeStyle: props.appearance.strokeStyle,
                strokeWidth: props.appearance.strokeWidth,
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

    #handleStart = (event, xyValue, moreProps) => {
        if (isNotDefined(this.#current) || isNotDefined(this.#current.anchor)) {
            this.#mouseMoved = false
            this.setInteractiveState({ current: { anchor: xyValue, end: null } })
            this.#props.onStart?.(event, moreProps)
        }
    }

    #handleDraw = (event, xyValue) => {
        if (isDefined(this.#current) && isDefined(this.#current.anchor)) {
            this.#mouseMoved = true
            this.setInteractiveState({ current: { anchor: this.#current.anchor, end: xyValue } })
        }
    }

    /** The second click parks the box — but only if the pointer actually moved. */
    #handleEnd = (event, xyValue, moreProps) => {
        if (!this.#mouseMoved || !isDefined(this.#current) || !isDefined(this.#current.anchor)) return

        const newCallouts = [
            ...this.#props.callouts.map(each => ({ ...each, selected: false })),
            {
                anchor: this.#current.anchor,
                at: xyValue,
                text: this.#props.defaultText,
                selected: true,
                appearance: this.#props.appearance,
            },
        ]

        this.setInteractiveState({ current: null, override: null })
        this.#props.onComplete?.(event, newCallouts, moreProps)
    }

    #handleDragCallout = (event, index, newPoints) => {
        this.setInteractiveState({ override: { index, ...newPoints } })
    }

    #handleDragCalloutComplete = (event, moreProps) => {
        if (!isDefined(this.#override)) return

        const { index, anchor, at } = this.#override

        const newCallouts = this.#props.callouts.map((each, position) =>
            position === index ? { ...each, anchor, at, selected: true } : { ...each, selected: false },
        )

        this.setInteractiveState({ override: null })
        this.#props.onComplete?.(event, newCallouts, moreProps)
    }
}

define("chart-callout", Callout)
