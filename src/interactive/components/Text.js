import { GenericChartComponent } from "../../core/GenericChartComponent.js"
import { getMouseCanvas } from "../../core/GenericComponent.js"
import { defineProperties, define } from "../../core/element.js"

export const interactiveTextDefaults = {
    selected: false,
    text: "",
    fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
    fontSize: 12,
    fillStyle: "#000000",
    xyProvider: undefined,
}

/** A label placed by a provider function rather than by data coordinates. */
export const drawText = (context, moreProps, props) => {
    const { xyProvider, fontFamily, fontSize, fillStyle, text } = { ...interactiveTextDefaults, ...props }

    const [x, y] = xyProvider(moreProps)

    context.font = `${fontSize}px ${fontFamily}`
    context.fillStyle = fillStyle
    context.beginPath()
    context.fillText(text, x, y)
}

export class Text extends GenericChartComponent {
    #props

    constructor() {
        super()
        this.#props = defineProperties(this, interactiveTextDefaults)
    }

    get drawOn() {
        return ["mousemove", "pan", "drag"]
    }

    get selected() {
        return this.#props.selected
    }

    isHoverTest() {
        return false
    }

    canvasToDraw(contexts) {
        return getMouseCanvas(contexts)
    }

    canvasDraw(context, moreProps) {
        drawText(context, moreProps, this.#props)
    }
}

define("chart-interactive-label", Text)
