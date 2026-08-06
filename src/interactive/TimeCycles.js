import { isDefined, isNotDefined } from "../core/utils/index.js"
import { ElementBase, define, defineProperties, batched } from "../core/element.js"
import { getValueFromOverride, isHoverForInteractiveType, saveNodeType, terminate, toolChartId } from "./utils.js"

export const timeCyclesDefaults = {
    enabled: true,
    mode: "cycles",
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
    waves: [],
    appearance: {
        strokeStyle: "#000000",
        strokeWidth: 1,
        edgeStroke: "#000000",
        edgeFill: "#FFFFFF",
        edgeStrokeWidth: 1,
        r: 5,
    },
}

/**
 * Time cycles: `<chart-time-cycles>`.
 *
 * Hai cú bấm định một chu kỳ. Mode `cycles`: bán nguyệt úp lên đường nền của
 * neo đầu, lặp về phía phải. Mode `sine`: neo đầu là đỉnh, neo thứ hai là
 * đáy kế tiếp — đường sin trải hết bề ngang pane. Mỗi sóng nhớ mode của
 * mình lúc đặt.
 */
export class TimeCycles extends ElementBase {
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
        this.#props = defineProperties(this, timeCyclesDefaults)

        this.terminate = terminate.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
        this.getSelectionState = isHoverForInteractiveType("waves").bind(this)
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

        while (this.#wrappers.length > props.waves.length) this.#wrappers.pop().remove()
        while (this.#wrappers.length < props.waves.length) {
            const wrapper = document.createElement("chart-each-wave")
            this.#wrappers.push(wrapper)
            this.append(wrapper)
        }

        this.nodes = [...this.#wrappers]

        props.waves.forEach((each, index) => {
            const appearance = isDefined(each.appearance) ? { ...props.appearance, ...each.appearance } : props.appearance

            Object.assign(this.#wrappers[index], {
                index,
                interactive: true,
                selected: each.selected,
                start: getValueFromOverride(this.#override, index, "start", each.start),
                end: getValueFromOverride(this.#override, index, "end", each.end),
                mode: each.mode ?? props.mode,
                appearance,
                hoverText: { ...timeCyclesDefaults.hoverText, ...props.hoverText },
                onDrag: this.#handleDragWave,
                onDragComplete: this.#handleDragWaveComplete,
            })

            this.#wrappers[index].update()
        })

        // Hình tạm: sóng bám con trỏ ngay từ điểm thứ hai
        const drawing = isDefined(this.#current) && isDefined(this.#current.end)

        if (drawing && this.#temporary === null) {
            this.#temporary = document.createElement("chart-interactive-wave")
            this.append(this.#temporary)
        } else if (!drawing && this.#temporary !== null) {
            this.#temporary.remove()
            this.#temporary = null
        }

        if (drawing)
            Object.assign(this.#temporary, {
                x1Value: this.#current.start[0],
                y1Value: this.#current.start[1],
                x2Value: this.#current.end[0],
                y2Value: this.#current.end[1],
                mode: props.mode,
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
        if (isNotDefined(this.#current) || isNotDefined(this.#current.start)) {
            this.#mouseMoved = false
            this.setInteractiveState({ current: { start: xyValue, end: null } })
            this.#props.onStart?.(event, moreProps)
        }
    }

    #handleDraw = (event, xyValue) => {
        if (isDefined(this.#current) && isDefined(this.#current.start)) {
            this.#mouseMoved = true
            this.setInteractiveState({ current: { start: this.#current.start, end: xyValue } })
        }
    }

    /** The second click fixes the period — but only if the pointer actually moved. */
    #handleEnd = (event, xyValue, moreProps) => {
        if (!this.#mouseMoved || !isDefined(this.#current) || !isDefined(this.#current.start)) return

        const newWaves = [
            ...this.#props.waves.map(each => ({ ...each, selected: false })),
            {
                start: this.#current.start,
                end: xyValue,
                mode: this.#props.mode,
                selected: true,
                appearance: this.#props.appearance,
            },
        ]

        this.setInteractiveState({ current: null, override: null })
        this.#props.onComplete?.(event, newWaves, moreProps)
    }

    #handleDragWave = (event, index, newPoints) => {
        this.setInteractiveState({ override: { index, ...newPoints } })
    }

    #handleDragWaveComplete = (event, moreProps) => {
        if (!isDefined(this.#override)) return

        const { index, start, end } = this.#override

        const newWaves = this.#props.waves.map((each, position) =>
            position === index ? { ...each, start, end, selected: true } : { ...each, selected: false },
        )

        this.setInteractiveState({ override: null })
        this.#props.onComplete?.(event, newWaves, moreProps)
    }
}

define("chart-time-cycles", TimeCycles)
