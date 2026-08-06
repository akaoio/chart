import { isDefined } from "../core/utils/index.js"
import { ElementBase, define, defineProperties, batched } from "../core/element.js"
import { getValueFromOverride, isHoverForInteractiveType, saveNodeType, terminate, toolChartId } from "./utils.js"

export const tableToolDefaults = {
    enabled: true,
    cells: [
        ["", ""],
        ["", ""],
    ],
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
    tables: [],
    appearance: {
        bgFill: "#FFFFFF",
        bgStroke: "#000000",
        strokeWidth: 1,
        fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
        fontSize: 12,
        fontFill: "#000000",
        padding: 8,
    },
}

/**
 * Tables: `<chart-table>`.
 *
 * Một cú bấm đặt một bảng neo MÀN HÌNH — đứng yên khi cuộn, đúng kiểu Table
 * của TradingView. Ô là chữ trong `cells` (mảng hàng × cột); sửa nội dung ô
 * là UI ứng dụng — trao lại danh sách với `cells` mới.
 */
export class TableTool extends ElementBase {
    #props
    #override = null

    #wrappers = []
    #indicator = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, tableToolDefaults)

        this.terminate = terminate.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
        this.getSelectionState = isHoverForInteractiveType("tables").bind(this)
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

        while (this.#wrappers.length > props.tables.length) this.#wrappers.pop().remove()
        while (this.#wrappers.length < props.tables.length) {
            const wrapper = document.createElement("chart-each-anchored-box")
            this.#wrappers.push(wrapper)
            this.append(wrapper)
        }

        this.nodes = [...this.#wrappers]

        props.tables.forEach((each, index) => {
            const appearance = isDefined(each.appearance) ? { ...props.appearance, ...each.appearance } : props.appearance

            Object.assign(this.#wrappers[index], {
                index,
                interactive: true,
                selected: each.selected,
                at: getValueFromOverride(this.#override, index, "at", each.at),
                lines: undefined,
                cells: each.cells ?? props.cells,
                appearance,
                hoverText: { ...tableToolDefaults.hoverText, ...props.hoverText },
                onDrag: this.#handleDragTable,
                onDragComplete: this.#handleDragTableComplete,
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

    /** Một cú bấm — bảng đặt theo TỈ LỆ pane, ô chép từ `cells` của công cụ. */
    #handlePlace = (event, xyValue, moreProps) => {
        if (!this.#props.enabled) return

        const {
            mouseXY,
            chartConfig: { width, height },
        } = moreProps

        const newTables = [
            ...this.#props.tables.map(each => ({ ...each, selected: false })),
            {
                at: [mouseXY[0] / width, mouseXY[1] / height],
                cells: this.#props.cells.map(row => [...row]),
                selected: true,
                appearance: this.#props.appearance,
            },
        ]

        this.#props.onComplete?.(event, newTables, moreProps)
    }

    #handleDragTable = (event, index, newValues) => {
        this.setInteractiveState({ override: { index, ...newValues } })
    }

    #handleDragTableComplete = (event, moreProps) => {
        if (!isDefined(this.#override)) return

        const { index, at } = this.#override

        const newTables = this.#props.tables.map((each, position) =>
            position === index ? { ...each, at, selected: true } : { ...each, selected: false },
        )

        this.setInteractiveState({ override: null })
        this.#props.onComplete?.(event, newTables, moreProps)
    }
}

define("chart-table", TableTool)
