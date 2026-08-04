import { withDefaults } from "../core/utils/index.js"
import { getMouseCanvas } from "../core/GenericComponent.js"
import { Series } from "../series/Series.js"
import { define } from "../core/element.js"

export const currentCoordinateDefaults = { fillStyle: "#2196f3", r: 3, strokeStyle: undefined, yAccessor: undefined }

/** A dot on the series at the pointer's x position. */
export const drawCurrentCoordinate = (context, moreProps, props) => {
    const { fillStyle, r, strokeStyle, yAccessor } = withDefaults(currentCoordinateDefaults, props)

    const {
        show,
        xScale,
        chartConfig: { yScale },
        currentItem,
        xAccessor,
    } = moreProps

    if (!show || currentItem === undefined) return

    const yValue = yAccessor(currentItem)
    if (yValue === undefined) return

    const fill = fillStyle instanceof Function ? fillStyle(currentItem) : fillStyle
    if (fill !== undefined) context.fillStyle = fill

    const stroke = strokeStyle instanceof Function ? strokeStyle(currentItem) : strokeStyle
    if (stroke !== undefined) context.strokeStyle = stroke

    context.beginPath()
    context.arc(Math.round(xScale(xAccessor(currentItem))), Math.round(yScale(yValue)), r, 0, 2 * Math.PI, false)
    context.fill()

    if (stroke !== undefined) context.stroke()
}

export class CurrentCoordinate extends Series {
    static defaults = currentCoordinateDefaults

    get drawOn() {
        return ["mousemove", "pan"]
    }

    canvasToDraw(contexts) {
        return getMouseCanvas(contexts)
    }

    canvasDraw(context, moreProps) {
        drawCurrentCoordinate(context, moreProps, this.seriesProps)
    }
}

define("chart-current-coordinate", CurrentCoordinate)
