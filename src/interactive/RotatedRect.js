import { isDefined, isNotDefined } from "../core/utils/index.js"
import { ElementBase, define, defineProperties, batched } from "../core/element.js"
import { isHoverForInteractiveType, saveNodeType, terminate, toolChartId } from "./utils.js"

export const rotatedRectDefaults = {
    enabled: true,
    onStart: undefined,
    onComplete: undefined,
    onSelect: undefined,
    currentPositionStroke: "#000000",
    currentPositionOpacity: 1,
    currentPositionStrokeWidth: 3,
    currentPositionRadius: 4,
    hoverText: { enable: true, bgHeight: 18, bgWidth: 120, text: "Click to select object" },
    rects: [],
    appearance: {
        stroke: "#000000",
        strokeWidth: 1,
        fill: "rgba(138, 175, 226, 0.35)",
        edgeStroke: "#000000",
        edgeFill: "#FFFFFF",
        edgeStrokeWidth: 1,
        r: 5,
    },
}

/**
 * TradingView's Rotated Rectangle: `<chart-rotated-rect>`, three clicks.
 *
 * The first two clicks lay one EDGE; the third pulls the width out of it. The
 * completed object carries the three data anchors and nothing else — the corners are
 * pixel-space business and live in the leaf. Same three-beat machine as the channel
 * tools: click, click, then the pointer previews the third anchor until the last
 * click commits it.
 */
export class RotatedRect extends ElementBase {
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
        this.#props = defineProperties(this, rotatedRectDefaults)

        this.terminate = terminate.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
        this.getSelectionState = isHoverForInteractiveType("rects").bind(this)
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

        while (this.#wrappers.length > props.rects.length) this.#wrappers.pop().remove()
        while (this.#wrappers.length < props.rects.length) {
            const wrapper = document.createElement("chart-each-rotated-rect")
            this.#wrappers.push(wrapper)
            this.append(wrapper)
        }

        this.nodes = [...this.#wrappers]

        props.rects.forEach((each, index) => {
            const appearance = isDefined(each.appearance)
                ? { ...props.appearance, ...each.appearance }
                : props.appearance

            const live = index === overrideIndex ? this.#override : each

            Object.assign(this.#wrappers[index], {
                index,
                selected: each.selected,
                hoverText: props.hoverText,
                p1: live.p1,
                p2: live.p2,
                p3: live.p3,
                appearance,
                onDrag: this.#handleDrag,
                onDragComplete: this.#handleDragComplete,
            })

            this.#wrappers[index].update()
        })

        const drawing = isDefined(this.#current) && isDefined(this.#current.p2)

        if (drawing && this.#temporary === null) {
            this.#temporary = document.createElement("chart-each-rotated-rect")
            this.append(this.#temporary)
        } else if (!drawing && this.#temporary !== null) {
            this.#temporary.remove()
            this.#temporary = null
        }

        if (drawing) {
            Object.assign(this.#temporary, {
                interactive: false,
                p1: this.#current.p1,
                p2: this.#current.p2,
                p3: this.#current.p3,
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
        if (isNotDefined(this.#current) || isNotDefined(this.#current.p1)) {
            this.#mouseMoved = false
            this.setInteractiveState({ current: { p1: xyValue, p2: null, p3: null } })
            this.#props.onStart?.()
        }
    }

    /** Trước khi cạnh khép, con trỏ là P2; sau đó nó là P3 — bề rộng xem trước. */
    #handleMove = (event, xyValue) => {
        const current = this.#current
        if (!isDefined(current) || !isDefined(current.p1)) return

        this.#mouseMoved = true

        if (isNotDefined(current.p3)) {
            this.setInteractiveState({ current: { ...current, p2: xyValue } })
            return
        }

        this.setInteractiveState({ current: { ...current, p3: xyValue } })
    }

    /** Bấm hai chưa xong — nó mở màn kéo bề rộng; bấm ba mới chốt. */
    #handleClick = (event, xyValue, moreProps) => {
        const current = this.#current
        if (!this.#mouseMoved || !isDefined(current) || !isDefined(current.p1)) return

        if (isNotDefined(current.p3)) {
            this.setInteractiveState({ current: { ...current, p3: xyValue } })
            return
        }

        const newRects = [
            ...this.#props.rects.map(each => ({ ...each, selected: false })),
            { ...current, selected: true, appearance: this.#props.appearance },
        ]

        this.setInteractiveState({ current: null })
        this.#props.onComplete?.(event, newRects, moreProps)
    }

    #handleDrag = (event, index, newAnchors) => {
        this.setInteractiveState({ override: { index, ...newAnchors } })
    }

    #handleDragComplete = (event, moreProps) => {
        if (!isDefined(this.#override)) return

        const { index, ...rest } = this.#override

        const newRects = this.#props.rects.map((each, at) =>
            at === index ? { ...each, ...rest, selected: true } : each,
        )

        this.setInteractiveState({ override: null })
        this.#props.onComplete?.(event, newRects, moreProps)
    }
}

define("chart-rotated-rect", RotatedRect)
