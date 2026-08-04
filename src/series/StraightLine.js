import { getStrokeDasharrayCanvas, withDefaults } from "../core/utils/index.js"
import { Series } from "./Series.js"
import { define } from "../core/element.js"

export const straightLineDefaults = {
    lineWidth: 1,
    lineDash: "Solid",
    strokeStyle: "rgba(0, 0, 0, 0.5)",
    type: "horizontal",
    yValue: undefined,
    xValue: undefined,
}

/** A single reference line across the pane — a price level, or a moment in time. */
export const drawStraightLine = (context, moreProps, props) => {
    const { type, strokeStyle, lineWidth, lineDash, yValue, xValue } = withDefaults(straightLineDefaults, props)

    const {
        xScale,
        chartConfig: { yScale, width, height },
    } = moreProps

    context.beginPath()

    if (strokeStyle !== undefined) context.strokeStyle = strokeStyle
    if (lineWidth !== undefined) context.lineWidth = lineWidth
    if (lineDash !== undefined) {
        context.setLineDash(typeof lineDash === "string" ? getStrokeDasharrayCanvas(lineDash) : lineDash)
    }

    const { x1, y1, x2, y2 } =
        type === "horizontal"
            ? { x1: 0, y1: Math.round(yScale(yValue)), x2: width, y2: Math.round(yScale(yValue)) }
            : { x1: Math.round(xScale(xValue)), y1: 0, x2: Math.round(xScale(xValue)), y2: height }

    context.moveTo(x1, y1)
    context.lineTo(x2, y2)
    context.stroke()
}

export class StraightLine extends Series {
    static defaults = straightLineDefaults

    canvasDraw(context, moreProps) {
        drawStraightLine(context, moreProps, this.seriesProps)
    }
}

define("chart-straight-line", StraightLine)
