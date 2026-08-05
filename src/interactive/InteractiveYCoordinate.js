import { format } from "d3-format"
import { isDefined } from "../core/utils/index.js"
import { ElementBase, define, defineProperties, batched } from "../core/element.js"
import { getValueFromOverride, isHoverForInteractiveType, saveNodeType, terminate, toolChartId } from "./utils.js"

export const interactiveYCoordinateToolDefaults = {
    enabled: true,
    yCoordinateList: [],
    onChoosePosition: undefined,
    onDragComplete: undefined,
    onSelect: undefined,
    onDelete: undefined,
    defaultPriceCoordinate: {
        bgFill: "#FFFFFF",
        bgOpacity: 1,
        stroke: "#6574CD",
        strokeOpacity: 1,
        strokeDasharray: "ShortDash2",
        strokeWidth: 1,
        textFill: "#6574CD",
        fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
        fontSize: 12,
        fontStyle: "normal",
        fontWeight: "normal",
        text: "Alert",
        textBox: {
            height: 24,
            left: 20,
            padding: { left: 10, right: 5 },
            closeIcon: { padding: { left: 5, right: 8 }, width: 8 },
        },
        edge: {
            stroke: "#6574CD",
            strokeOpacity: 1,
            strokeWidth: 1,
            fill: "#FFFFFF",
            fillOpacity: 1,
            orient: "right",
            at: "right",
            arrowWidth: 10,
            dx: 0,
            rectWidth: 50,
            rectHeight: 20,
            displayFormat: format(".2f"),
        },
    },
    hoverText: {
        enable: true,
        bgHeight: 18,
        bgWidth: 175,
        text: "Click and drag the edge circles",
    },
}

/**
 * Price alerts: `<chart-interactive-y-coordinate-tool>`.
 *
 * There is nothing to draw here — alerts arrive already made, in `yCoordinateList`. The
 * tool only lets them be dragged to another price or deleted. `defaultPriceCoordinate` is
 * published for the application to spread into a new alert of its own.
 */
export class InteractiveYCoordinate extends ElementBase {
    #props
    #override = null

    #wrappers = []

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, interactiveYCoordinateToolDefaults)

        this.terminate = terminate.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
        this.getSelectionState = isHoverForInteractiveType("yCoordinateList").bind(this)
    }

    /** Pane nào chứa công cụ này — thứ `chart-drawing-object-selector` cần khi đăng ký. */
    get chartId() {
        return toolChartId.call(this)
    }

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
        const list = this.#props.yCoordinateList

        while (this.#wrappers.length > list.length) this.#wrappers.pop().remove()
        while (this.#wrappers.length < list.length) {
            const wrapper = document.createElement("chart-each-interactive-y-coordinate")
            this.#wrappers.push(wrapper)
            this.append(wrapper)
        }

        this.nodes = [...this.#wrappers]

        list.forEach((each, index) => {
            Object.assign(this.#wrappers[index], {
                ...each,
                index,
                selected: each.selected,
                yValue: getValueFromOverride(this.#override, index, "yValue", each.yValue),
                onDelete: this.#handleDelete,
                onDrag: this.#handleDrag,
                onDragComplete: this.#handleDragComplete,
            })

            this.#wrappers[index].update()
        })
    }

    #handleDelete = (event, index, moreProps) => {
        if (index === undefined) return
        this.#props.onDelete?.(event, this.#props.yCoordinateList[index], moreProps)
    }

    #handleDrag = (event, index, yValue) => {
        this.setInteractiveState({ override: { index, yValue } })
    }

    #handleDragComplete = (event, moreProps) => {
        if (!isDefined(this.#override)) return

        const { index, yValue } = this.#override

        const newAlertList = this.#props.yCoordinateList.map((each, at) =>
            at === index ? { ...each, yValue, selected: true } : { ...each, selected: false },
        )

        this.setInteractiveState({ override: null })
        this.#props.onDragComplete?.(event, newAlertList, moreProps, newAlertList[index])
    }
}

define("chart-interactive-y-coordinate-tool", InteractiveYCoordinate)
