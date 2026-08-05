import { interpolateNumber } from "d3-interpolate"
import { last } from "../core/utils/index.js"
import { GenericChartComponent } from "../core/GenericChartComponent.js"
import { defineProperties, define } from "../core/element.js"

export const zoomButtonsDefaults = {
    fill: "#ffffff",
    fillOpacity: 0.75,
    heightFromBase: 32,
    r: 16,
    stroke: "#e0e3eb",
    strokeWidth: 1,
    textFill: "#000000",
    zoomMultiplier: 1.5,
    onReset: undefined,
}

/**
 * Zoom in, zoom out, reset — as real SVG buttons: `<chart-zoom-buttons>`.
 *
 * The visible circle and the clickable circle are separate: the one on top is
 * transparent and slightly larger in effect, so the button is easy to hit without making
 * the drawn circle bigger than it should look.
 */
export const renderZoomButtons = (moreProps, props) => {
    const { width, height } = moreProps.chartConfig
    const { heightFromBase, r, fill, fillOpacity, stroke, strokeWidth, textFill, onReset } = props

    const centerX = Math.round(width / 2)
    const y = height - heightFromBase

    const zoomOutX = centerX - 16 - r * 2
    const zoomInX = centerX - 8
    const resetX = centerX + 16 + r * 2

    const face = x => ({
        tag: "circle",
        attrs: { className: "chart-button", cx: x - r / 2, cy: y + r / 2, fill, fillOpacity, stroke, strokeWidth, r },
    })

    const hit = (x, name, onClick) => ({
        tag: "circle",
        attrs: { className: `chart-enable-interaction ${name}`, onClick, cx: x - r / 2, cy: y + r / 2, r, fill: "none" },
    })

    const glyph = (transform, d) => ({
        tag: "g",
        attrs: { transform },
        children: [{ tag: "path", attrs: { d, fill: textFill } }],
    })

    return {
        tag: "g",
        attrs: { className: "chart-zoom-buttons" },
        children: [
            face(zoomOutX),
            glyph(`translate (${zoomOutX - 20}, ${y - 8 + r / 4})`, "M19,13H5V11H19V13Z"),
            face(zoomInX),
            glyph(`translate (${zoomInX - 20}, ${y - 8 + r / 4})`, "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"),
            face(resetX),
            glyph(
                `translate (${resetX - r}, ${y - 4 + r / 4})`,
                "M2.35 2.35A7.958 7.958 0 018 0a8 8 0 110 16c-3.73 0-6.84-2.55-7.73-6h2.08c.82 2.33 3.04 4 5.65 4A6 6 0 108 2c-1.66 0-3.14.69-4.22 1.78L7 7H0V0l2.35 2.35z",
            ),
            hit(zoomOutX, "out", props.onZoomOut),
            hit(zoomInX, "in", props.onZoomIn),
            hit(resetX, "reset", onReset),
        ],
    }
}

/**
 * Zoom in six steps rather than one jump.
 *
 * The eye loses its place if the chart teleports; stepping through interpolated domains
 * keeps the same candles identifiable throughout. The steps are unevenly spaced — quick
 * at first, slowing towards the end.
 */
export const zoomSteps = (xScale, plotData, xAccessor, direction, zoomMultiplier) => {
    const cx = xScale(xAccessor(last(plotData)))
    const factor = direction > 0 ? zoomMultiplier : 1 / zoomMultiplier

    const [start, end] = xScale.domain()
    const [newStart, newEnd] = xScale
        .range()
        .map(x => cx + (x - cx) * factor)
        .map(xScale.invert)

    const left = interpolateNumber(start, newStart)
    const right = interpolateNumber(end, newEnd)

    return [0.25, 0.3, 0.5, 0.6, 0.75, 1].map(at => [left(at), right(at)])
}

export class ZoomButtons extends GenericChartComponent {
    #props
    #interval

    constructor() {
        super()
        this.#props = defineProperties(this, zoomButtonsDefaults)
    }

    get drawOn() {
        return ["pan"]
    }

    disconnectedCallback() {
        window.clearInterval(this.#interval)
        this.#interval = undefined
        super.disconnectedCallback()
    }

    #zoom(direction) {
        if (this.#interval) return

        const canvas = this.canvas
        const { xScale, plotData, xAccessor } = canvas.contextValues

        const steps = zoomSteps(xScale, plotData, xAccessor, direction, this.#props.zoomMultiplier)

        this.#interval = window.setInterval(() => {
            canvas.xAxisZoom(steps.shift())
            if (steps.length === 0) {
                window.clearInterval(this.#interval)
                this.#interval = undefined
            }
        }, 10)
    }

    svgDraw(moreProps) {
        return renderZoomButtons(moreProps, {
            ...this.#props,
            onZoomIn: () => this.#zoom(-1),
            onZoomOut: () => this.#zoom(1),
        })
    }
}

define("chart-zoom-buttons", ZoomButtons)
