import { isDefined, isNotDefined } from "../core/utils/index.js"
import { ElementBase, define, defineProperties, batched } from "../core/element.js"
import { getValueFromOverride, isHoverForInteractiveType, saveNodeType, terminate, toolChartId } from "./utils.js"

export const imageToolDefaults = {
    enabled: true,
    src: undefined,
    opacity: 1,
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
    images: [],
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
 * Images: `<chart-image-tool>`.
 *
 * Hai cú bấm định hai góc — ảnh căng giữa hai neo dữ liệu nên co giãn cùng
 * biểu đồ, đúng cách Image của TradingView. `src` là dataURL do ứng dụng
 * đưa (upload là UI ứng dụng); chưa có ảnh thì vẽ khung chờ có nhãn.
 */
export class ImageTool extends ElementBase {
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
        this.#props = defineProperties(this, imageToolDefaults)

        this.terminate = terminate.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
        this.getSelectionState = isHoverForInteractiveType("images").bind(this)
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

        while (this.#wrappers.length > props.images.length) this.#wrappers.pop().remove()
        while (this.#wrappers.length < props.images.length) {
            const wrapper = document.createElement("chart-each-image")
            this.#wrappers.push(wrapper)
            this.append(wrapper)
        }

        this.nodes = [...this.#wrappers]

        props.images.forEach((each, index) => {
            const appearance = isDefined(each.appearance) ? { ...props.appearance, ...each.appearance } : props.appearance

            Object.assign(this.#wrappers[index], {
                index,
                interactive: true,
                selected: each.selected,
                start: getValueFromOverride(this.#override, index, "start", each.start),
                end: getValueFromOverride(this.#override, index, "end", each.end),
                src: each.src,
                opacity: each.opacity ?? props.opacity,
                appearance,
                hoverText: { ...imageToolDefaults.hoverText, ...props.hoverText },
                onDrag: this.#handleDragImage,
                onDragComplete: this.#handleDragImageComplete,
            })

            this.#wrappers[index].update()
        })

        // Hình tạm: khung ảnh bám con trỏ ngay từ điểm thứ hai
        const drawing = isDefined(this.#current) && isDefined(this.#current.end)

        if (drawing && this.#temporary === null) {
            this.#temporary = document.createElement("chart-interactive-image")
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
                src: props.src,
                opacity: props.opacity,
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

    /** The second click fixes the far corner — but only if the pointer actually moved. */
    #handleEnd = (event, xyValue, moreProps) => {
        if (!this.#mouseMoved || !isDefined(this.#current) || !isDefined(this.#current.start)) return

        const newImages = [
            ...this.#props.images.map(each => ({ ...each, selected: false })),
            {
                start: this.#current.start,
                end: xyValue,
                src: this.#props.src,
                opacity: this.#props.opacity,
                selected: true,
                appearance: this.#props.appearance,
            },
        ]

        this.setInteractiveState({ current: null, override: null })
        this.#props.onComplete?.(event, newImages, moreProps)
    }

    #handleDragImage = (event, index, newPoints) => {
        this.setInteractiveState({ override: { index, ...newPoints } })
    }

    #handleDragImageComplete = (event, moreProps) => {
        if (!isDefined(this.#override)) return

        const { index, start, end } = this.#override

        const newImages = this.#props.images.map((each, position) =>
            position === index ? { ...each, start, end, selected: true } : { ...each, selected: false },
        )

        this.setInteractiveState({ override: null })
        this.#props.onComplete?.(event, newImages, moreProps)
    }
}

define("chart-image-tool", ImageTool)
