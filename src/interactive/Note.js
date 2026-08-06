import { isDefined } from "../core/utils/index.js"
import { ElementBase, define, defineProperties, batched } from "../core/element.js"
import { getValueFromOverride, isHoverForInteractiveType, saveNodeType, terminate, toolChartId } from "./utils.js"

export const noteDefaults = {
    enabled: true,
    kind: "note",
    text: undefined,
    snap: false,
    snapTo: undefined,
    shouldDisableSnap: event => event.button === 2 || event.shiftKey,
    currentPositionStroke: "#000000",
    currentPositionstrokeOpacity: 1,
    currentPositionStrokeWidth: 3,
    currentPositionRadius: 0,
    onComplete: undefined,
    onSelect: undefined,
    hoverText: {
        enable: true,
        bgHeight: "auto",
        bgWidth: "auto",
        text: "Click to select object",
        selectedText: "",
    },
    notes: [],
    appearance: {
        noteFill: "#FFF3B0",
        commentFill: "#FFFFFF",
        bgStroke: "#000000",
        strokeWidth: 1,
        textFill: "#000000",
        fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
        fontSize: 12,
    },
}

/**
 * Notes: `<chart-note>`.
 *
 * One click plants a text box at the pointer — `kind` picks the dress
 * (sticky-yellow note or flat comment), `text` is the user's own words and
 * each note remembers both. Editing the words is application UI, not chart
 * machinery: hand the new list back with a different `text`.
 */
export class Note extends ElementBase {
    #props
    #override = null

    #wrappers = []
    #indicator = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, noteDefaults)

        this.terminate = terminate.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
        this.getSelectionState = isHoverForInteractiveType("notes").bind(this)
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

        while (this.#wrappers.length > props.notes.length) this.#wrappers.pop().remove()
        while (this.#wrappers.length < props.notes.length) {
            const wrapper = document.createElement("chart-each-note")
            this.#wrappers.push(wrapper)
            this.append(wrapper)
        }

        this.nodes = [...this.#wrappers]

        props.notes.forEach((each, index) => {
            const appearance = isDefined(each.appearance) ? { ...props.appearance, ...each.appearance } : props.appearance

            Object.assign(this.#wrappers[index], {
                index,
                interactive: true,
                selected: each.selected,
                at: getValueFromOverride(this.#override, index, "at", each.at),
                text: each.text ?? props.text,
                kind: each.kind ?? props.kind,
                appearance,
                hoverText: { ...noteDefaults.hoverText, ...props.hoverText },
                onDrag: this.#handleDragNote,
                onDragComplete: this.#handleDragNoteComplete,
            })

            this.#wrappers[index].update()
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
            onClick: this.#handlePlace,
        })
    }

    /** One click, one note — kind and text are frozen into the object. */
    #handlePlace = (event, xyValue, moreProps) => {
        if (!this.#props.enabled) return

        const newNotes = [
            ...this.#props.notes.map(each => ({ ...each, selected: false })),
            {
                at: xyValue,
                text: this.#props.text,
                kind: this.#props.kind,
                selected: true,
                appearance: this.#props.appearance,
            },
        ]

        this.#props.onComplete?.(event, newNotes, moreProps)
    }

    #handleDragNote = (event, index, newValues) => {
        this.setInteractiveState({ override: { index, ...newValues } })
    }

    #handleDragNoteComplete = (event, moreProps) => {
        if (!isDefined(this.#override)) return

        const { index, at } = this.#override

        const newNotes = this.#props.notes.map((each, position) =>
            position === index ? { ...each, at, selected: true } : { ...each, selected: false },
        )

        this.setInteractiveState({ override: null })
        this.#props.onComplete?.(event, newNotes, moreProps)
    }
}

define("chart-note", Note)
