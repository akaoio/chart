import { getStrokeDasharrayCanvas } from "../core/utils/index.js"
import { GenericChartComponent } from "../core/GenericChartComponent.js"
import { getMouseCanvas } from "../core/GenericComponent.js"
import { defineProperties, define } from "../core/element.js"

export const brushDefaults = {
    enabled: false,
    type: "2D",
    strokeStyle: "#000000",
    fillStyle: "#3h3h3h",
    strokeDashArray: "ShortDash",
    onBrush: undefined,
}

/**
 * Drag a box over the chart to select a range: `<chart-brush>`.
 *
 * Unlike the drawing tools this leaves nothing behind — it reports the two corners
 * through `onBrush` and clears itself. What that selection *means* is the application's
 * decision: zoom to it, export it, annotate it.
 *
 * Panning is switched off while it is enabled, because both want the same drag.
 */
export class Brush extends GenericChartComponent {
    #props
    #x1y1 = null
    #start = null
    #end = null
    #rect = null
    #zoomHappening = false

    constructor() {
        super()
        this.#props = defineProperties(this, brushDefaults)
    }

    get drawOn() {
        return ["mousemove", "pan", "drag"]
    }

    get disablePan() {
        return this.#props.enabled
    }

    canvasToDraw(contexts) {
        return getMouseCanvas(contexts)
    }

    terminate() {
        this.#zoomHappening = false
        this.#x1y1 = null
        this.#start = null
        this.#end = null
        this.#rect = null
        this.canvas?.redraw()
    }

    onMouseDown(event, moreProps) {
        if (!this.#props.enabled) return

        const {
            mouseXY: [, mouseY],
            currentItem,
            chartConfig: { yScale },
            xAccessor,
            xScale,
        } = moreProps

        this.#zoomHappening = false
        // x snaps to the data point, y follows the pointer exactly
        this.#x1y1 = [xScale(xAccessor(currentItem)), mouseY]
        this.#start = { item: currentItem, xValue: xAccessor(currentItem), yValue: yScale.invert(mouseY) }
    }

    onMouseMove(event, moreProps) {
        if (!this.#props.enabled || this.#x1y1 == null) return

        this.#zoomHappening = true

        const {
            mouseXY: [, mouseY],
            currentItem,
            chartConfig: { yScale },
            xAccessor,
            xScale,
        } = moreProps

        const [x2, y2] = [xScale(xAccessor(currentItem)), mouseY]
        const [x1, y1] = this.#x1y1

        this.#end = { item: currentItem, xValue: xAccessor(currentItem), yValue: yScale.invert(mouseY) }
        this.#rect = {
            x: Math.min(x1, x2),
            y: Math.min(y1, y2),
            height: Math.abs(y2 - y1),
            width: Math.abs(x2 - x1),
        }
    }

    onClick(event, moreProps) {
        if (!this.#props.enabled) return

        // Only report if the pointer actually travelled — a bare click is not a selection
        if (this.#zoomHappening) this.#props.onBrush?.({ start: this.#start, end: this.#end }, moreProps)

        this.#rect = null
        this.#x1y1 = null
        this.#zoomHappening = false
    }

    canvasDraw(context, moreProps) {
        if (!this.#props.enabled || this.#rect === null) return

        const { x, y, height, width } = this.#rect
        const { strokeStyle, fillStyle, strokeDashArray } = this.#props

        context.strokeStyle = strokeStyle
        context.fillStyle = fillStyle
        context.setLineDash(getStrokeDasharrayCanvas(strokeDashArray))
        context.beginPath()
        context.fillRect(x, y, width, height)
        context.strokeRect(x, y, width, height)
    }
}

define("chart-brush", Brush)
