import { isDefined, isNotDefined } from "../core/utils/index.js"
import { ElementBase, define, defineProperties, batched } from "../core/element.js"
import { getValueFromOverride, isHoverForInteractiveType, saveNodeType, terminate, toolChartId } from "./utils.js"

export const pitchforkDefaults = {
    enabled: true,
    variant: "standard",
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
    forks: [],
    appearance: {
        strokeStyle: "#000000",
        strokeWidth: 1,
        medianStrokeStyle: undefined,
        fillStyle: "rgba(138, 175, 226, 0.2)",
        edgeStrokeWidth: 1,
        edgeFill: "#FFFFFF",
        edgeStroke: "#000000",
        r: 6,
    },
}

/**
 * Pitchforks: `<chart-pitchfork>`.
 *
 * Three clicks — the handle, then the two prong bases; the median runs from the
 * handle through their midpoint and the tines run parallel from each base. `variant`
 * (`standard` | `schiff` | `modifiedSchiff`) only moves where the median is anchored.
 *
 * Máy trạng thái ba-bấm giống hệt kênh song song: chưa đủ điểm thì con trỏ LÀ điểm
 * tiếp theo, mỗi cú bấm đóng đinh một điểm.
 */
export class Pitchfork extends ElementBase {
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
        this.#props = defineProperties(this, pitchforkDefaults)

        this.terminate = terminate.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
        this.getSelectionState = isHoverForInteractiveType("forks").bind(this)
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

        while (this.#wrappers.length > props.forks.length) this.#wrappers.pop().remove()
        while (this.#wrappers.length < props.forks.length) {
            const wrapper = document.createElement("chart-each-pitchfork")
            this.#wrappers.push(wrapper)
            this.append(wrapper)
        }

        this.nodes = [...this.#wrappers]

        props.forks.forEach((each, index) => {
            const appearance = isDefined(each.appearance) ? { ...props.appearance, ...each.appearance } : props.appearance

            Object.assign(this.#wrappers[index], {
                index,
                variant: each.variant ?? props.variant,
                selected: each.selected,
                p1: getValueFromOverride(this.#override, index, "p1", each.p1),
                p2: getValueFromOverride(this.#override, index, "p2", each.p2),
                p3: getValueFromOverride(this.#override, index, "p3", each.p3),
                strokeStyle: appearance.strokeStyle,
                strokeWidth: appearance.strokeWidth,
                medianStrokeStyle: appearance.medianStrokeStyle,
                fillStyle: appearance.fillStyle,
                edgeStroke: appearance.edgeStroke,
                edgeFill: appearance.edgeFill,
                edgeStrokeWidth: appearance.edgeStrokeWidth,
                r: appearance.r,
                hoverText: { ...pitchforkDefaults.hoverText, ...props.hoverText },
                onDrag: this.#handleDragFork,
                onDragComplete: this.#handleDragForkComplete,
            })

            this.#wrappers[index].update()
        })

        // The fork being drawn right now: one point pending → a plain line preview,
        // two points pending → a real fork with the pointer as the third prong.
        const drawing = isDefined(this.#current) && isDefined(this.#current.end)

        if (drawing && this.#temporary === null) {
            this.#temporary = document.createElement(isDefined(this.#current.p2) ? "chart-interactive-pitchfork" : "chart-interactive-straight-line")
            this.append(this.#temporary)
        } else if (!drawing && this.#temporary !== null) {
            this.#temporary.remove()
            this.#temporary = null
        }

        if (drawing) {
            const wantsFork = isDefined(this.#current.p2)
            const isFork = this.#temporary.tagName.toLowerCase() === "chart-interactive-pitchfork"
            // click hai đổi hình tạm từ đường sang phuộc — thay phần tử, vì hình đổi hẳn loại
            if (wantsFork !== isFork) {
                this.#temporary.remove()
                this.#temporary = document.createElement(wantsFork ? "chart-interactive-pitchfork" : "chart-interactive-straight-line")
                this.append(this.#temporary)
            }

            if (wantsFork)
                Object.assign(this.#temporary, {
                    variant: props.variant,
                    p1: this.#current.p1,
                    p2: this.#current.p2,
                    p3: this.#current.end,
                    strokeStyle: props.appearance.strokeStyle,
                    strokeWidth: props.appearance.strokeWidth,
                    medianStrokeStyle: props.appearance.medianStrokeStyle,
                    fillStyle: props.appearance.fillStyle,
                })
            else
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

    /** Click two pins the second point; click three completes the fork. */
    #handleClick = (event, xyValue, moreProps) => {
        const current = this.#current
        if (!this.#mouseMoved || !isDefined(current) || !isDefined(current.p1)) return

        if (isNotDefined(current.p2)) {
            this.setInteractiveState({ current: { ...current, p2: xyValue } })
            return
        }

        const newForks = [
            ...this.#props.forks.map(each => ({ ...each, selected: false })),
            {
                p1: current.p1,
                p2: current.p2,
                p3: xyValue,
                selected: true,
                appearance: this.#props.appearance,
                variant: this.#props.variant,
            },
        ]

        this.setInteractiveState({ current: null, override: null })
        this.#props.onComplete?.(event, newForks, moreProps)
    }

    #handleDragFork = (event, index, newPoints) => {
        this.setInteractiveState({ override: { index, ...newPoints } })
    }

    #handleDragForkComplete = (event, moreProps) => {
        if (!isDefined(this.#override)) return

        const { index, p1, p2, p3 } = this.#override

        const newForks = this.#props.forks.map((each, at) =>
            at === index ? { ...each, p1, p2, p3, selected: true } : { ...each, selected: false },
        )

        this.setInteractiveState({ override: null })
        this.#props.onComplete?.(event, newForks, moreProps)
    }
}

define("chart-pitchfork", Pitchfork)
