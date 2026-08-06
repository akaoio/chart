import { isDefined, isNotDefined } from "../core/utils/index.js"
import { ElementBase, define, defineProperties, batched } from "../core/element.js"
import { getValueFromOverride, isHoverForInteractiveType, saveNodeType, terminate, toolChartId } from "./utils.js"

export const priceNoteDefaults = {
    enabled: true,
    text: undefined,
    yDisplayFormat: value => value.toFixed(2),
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
    priceNotes: [],
    appearance: {
        strokeStyle: "#000000",
        strokeWidth: 1,
        bgFill: "#FFFFFF",
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
 * Price notes: `<chart-price-note>`.
 *
 * Hai cú bấm đúng cách TradingView: neo đầu ghim GIÁ, neo thứ hai đặt nhãn —
 * đường kẻ nối hai neo, nhãn đọc giá của neo đầu (kèm `text` nếu có). Giá
 * suy từ neo mỗi lần vẽ nên kéo neo là chữ đổi theo, không bao giờ cũ.
 */
export class PriceNote extends ElementBase {
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
        this.#props = defineProperties(this, priceNoteDefaults)

        this.terminate = terminate.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
        this.getSelectionState = isHoverForInteractiveType("priceNotes").bind(this)
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

        while (this.#wrappers.length > props.priceNotes.length) this.#wrappers.pop().remove()
        while (this.#wrappers.length < props.priceNotes.length) {
            const wrapper = document.createElement("chart-each-price-note")
            this.#wrappers.push(wrapper)
            this.append(wrapper)
        }

        this.nodes = [...this.#wrappers]

        props.priceNotes.forEach((each, index) => {
            const appearance = isDefined(each.appearance) ? { ...props.appearance, ...each.appearance } : props.appearance

            Object.assign(this.#wrappers[index], {
                index,
                interactive: true,
                selected: each.selected,
                at: getValueFromOverride(this.#override, index, "at", each.at),
                label: getValueFromOverride(this.#override, index, "label", each.label),
                text: each.text ?? props.text,
                yDisplayFormat: props.yDisplayFormat,
                appearance,
                hoverText: { ...priceNoteDefaults.hoverText, ...props.hoverText },
                onDrag: this.#handleDragNote,
                onDragComplete: this.#handleDragNoteComplete,
            })

            this.#wrappers[index].update()
        })

        // Hình tạm: đường nối bám con trỏ từ neo giá tới chỗ nhãn sẽ đặt
        const drawing = isDefined(this.#current) && isDefined(this.#current.label)

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
                x1Value: this.#current.at[0],
                y1Value: this.#current.at[1],
                x2Value: this.#current.label[0],
                y2Value: this.#current.label[1],
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
        if (isNotDefined(this.#current) || isNotDefined(this.#current.at)) {
            this.#mouseMoved = false
            this.setInteractiveState({ current: { at: xyValue, label: null } })
            this.#props.onStart?.(event, moreProps)
        }
    }

    #handleDraw = (event, xyValue) => {
        if (isDefined(this.#current) && isDefined(this.#current.at)) {
            this.#mouseMoved = true
            this.setInteractiveState({ current: { at: this.#current.at, label: xyValue } })
        }
    }

    /** The second click parks the label — but only if the pointer actually moved. */
    #handleEnd = (event, xyValue, moreProps) => {
        if (!this.#mouseMoved || !isDefined(this.#current) || !isDefined(this.#current.at)) return

        const newNotes = [
            ...this.#props.priceNotes.map(each => ({ ...each, selected: false })),
            {
                at: this.#current.at,
                label: xyValue,
                text: this.#props.text,
                selected: true,
                appearance: this.#props.appearance,
            },
        ]

        this.setInteractiveState({ current: null, override: null })
        this.#props.onComplete?.(event, newNotes, moreProps)
    }

    #handleDragNote = (event, index, newValues) => {
        this.setInteractiveState({ override: { index, ...newValues } })
    }

    #handleDragNoteComplete = (event, moreProps) => {
        if (!isDefined(this.#override)) return

        const { index, at, label } = this.#override

        const newNotes = this.#props.priceNotes.map((each, position) =>
            position === index ? { ...each, at, label, selected: true } : { ...each, selected: false },
        )

        this.setInteractiveState({ override: null })
        this.#props.onComplete?.(event, newNotes, moreProps)
    }
}

define("chart-price-note", PriceNote)
