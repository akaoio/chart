import { GenericChartComponent } from "../core/GenericChartComponent.js"
import { getMouseCanvas } from "../core/GenericComponent.js"
import { defineProperties, define } from "../core/element.js"

export const clickCallbackDefaults = {
    disablePan: false,
    onMouseDown: undefined,
    onClick: undefined,
    onDoubleClick: undefined,
    onContextMenu: undefined,
    onMouseMove: undefined,
    onPan: undefined,
    onPanEnd: undefined,
}

/**
 * An invisible listener: `<chart-click-callback>`.
 *
 * It draws nothing at all. Its only job is to sit in a pane and forward pointer events
 * with the chart's `moreProps` attached, so an application can find out *what data* was
 * clicked rather than only where on screen.
 */
export class ClickCallback extends GenericChartComponent {
    #props

    constructor() {
        super()
        this.#props = defineProperties(this, clickCallbackDefaults)
    }

    get drawOn() {
        return ["mousemove", "pan"]
    }

    get disablePan() {
        return this.#props.disablePan
    }

    canvasToDraw(contexts) {
        return getMouseCanvas(contexts)
    }

    onMouseDown(event, moreProps) {
        this.#props.onMouseDown?.(event, moreProps)
    }
    onClick(event, moreProps) {
        this.#props.onClick?.(event, moreProps)
    }
    onDoubleClick(event, moreProps) {
        this.#props.onDoubleClick?.(event, moreProps)
    }
    onContextMenu(event, moreProps) {
        this.#props.onContextMenu?.(event, moreProps)
    }
    onMouseMove(event, moreProps) {
        this.#props.onMouseMove?.(event, moreProps)
    }
    onPan(event, moreProps) {
        this.#props.onPan?.(event, moreProps)
    }
    onPanEnd(event, moreProps) {
        this.#props.onPanEnd?.(event, moreProps)
    }
}

define("chart-click-callback", ClickCallback)
