import { functor, withDefaults } from "../core/utils/index.js"
import { GenericComponent } from "../core/GenericComponent.js"
import { defineProperties, define } from "../core/element.js"

export const labelDefaults = {
    fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
    fontSize: 64,
    fontWeight: "bold",
    fillStyle: "#dcdcdc",
    rotate: 0,
    textAlign: "center",
    x: ({ xScale, xAccessor, datum }) => xScale(xAccessor(datum)),
    y: undefined,
    text: undefined,
    datum: undefined,
    selectCanvas: canvases => canvases.bg,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    ratio: 1,
    canvasOriginX: undefined,
    canvasOriginY: undefined,
}

/**
 * Large text behind the chart — a watermark, usually the instrument name.
 *
 * It goes on the background canvas and subscribes to nothing, so it is painted once and
 * then left alone while everything above it redraws.
 */
export const drawLabel = (context, moreProps, props) => {
    const resolved = withDefaults(labelDefaults, props)
    const { textAlign, fontFamily, fontSize, fontWeight, rotate } = resolved

    const margin = props.margin ?? moreProps.margin ?? resolved.margin
    const ratio = props.ratio ?? moreProps.ratio ?? resolved.ratio
    const canvasOriginX = props.canvasOriginX ?? moreProps.canvasOriginX

    context.save()
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.scale(ratio, ratio)

    if (canvasOriginX !== undefined) {
        context.translate(canvasOriginX, props.canvasOriginY ?? moreProps.canvasOriginY)
    } else {
        context.translate(margin.left + 0.5 * ratio, margin.top + 0.5 * ratio)
    }

    const { xScale, chartConfig, xAccessor, plotData } = moreProps
    const yScale = Array.isArray(chartConfig) || !chartConfig ? undefined : chartConfig.yScale

    const { x, y, datum, fillStyle, text } = resolved
    const xPos = functor(x)({ xScale, xAccessor, datum, plotData })
    const yPos = functor(y)({ yScale, datum, plotData })

    context.save()
    context.translate(xPos, yPos)

    if (rotate !== undefined) context.rotate((rotate / 180) * Math.PI)

    if (fontFamily !== undefined) context.font = `${fontWeight} ${fontSize}px ${fontFamily}`

    const fill = functor(fillStyle)(datum)
    if (fill !== undefined) context.fillStyle = fill
    if (textAlign !== undefined) context.textAlign = textAlign

    context.beginPath()
    context.fillText(functor(text)(datum), 0, 0)
    context.restore()
}

export class Label extends GenericComponent {
    #props

    constructor() {
        super()
        this.#props = defineProperties(this, labelDefaults)
    }

    get drawOn() {
        return []
    }

    canvasToDraw(contexts) {
        return this.#props.selectCanvas(contexts)
    }

    canvasDraw(context, moreProps) {
        drawLabel(context, moreProps, { ...this.#props, margin: this.canvas?.margin, ratio: this.canvas?.ratio })
    }
}

define("chart-label", Label)
