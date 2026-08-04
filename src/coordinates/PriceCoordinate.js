import { format } from "d3-format"
import { functor, withDefaults } from "../core/utils/index.js"
import { Series } from "../series/Series.js"
import { define } from "../core/element.js"
import { drawEdgeCoordinate } from "./EdgeCoordinate.js"

export const priceCoordinateDefaults = {
    displayFormat: format(".2f"),
    yAxisPad: 0,
    rectWidth: 50,
    rectHeight: 20,
    orient: "left",
    at: "left",
    price: 0,
    dx: 0,
    arrowWidth: 0,
    fill: "#BAB8b8",
    opacity: 1,
    lineOpacity: 0.2,
    lineStroke: "#000000",
    fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
    fontSize: 13,
    textFill: "#FFFFFF",
    strokeOpacity: 1,
    strokeWidth: 1,
    strokeDasharray: "Solid",
    stroke: undefined,
}

/**
 * A fixed price level with a label — an alert, an entry, a target.
 *
 * Unlike the mouse readout this one keeps its line, and it hides itself when the price
 * falls outside the visible range rather than clamping to the edge and lying about where
 * the level is.
 */
export const drawPriceCoordinate = (context, moreProps, props) => {
    const resolved = withDefaults(priceCoordinateDefaults, props)

    const {
        chartConfig: { yScale },
        width,
    } = moreProps

    const [lowerYValue, upperYValue] = yScale.domain()

    const { price, stroke, strokeDasharray, strokeOpacity, strokeWidth } = resolved
    const { orient, at, rectWidth, rectHeight, displayFormat, dx } = resolved
    const { fill, opacity, fontFamily, fontSize, textFill, arrowWidth, lineOpacity, lineStroke } = resolved

    const y = yScale(price)

    drawEdgeCoordinate(context, {
        coordinate: displayFormat(yScale.invert(y)),
        show: price <= upperYValue && price >= lowerYValue,
        type: "horizontal",
        orient,
        edgeAt: at === "right" ? width : 0,
        hideLine: false,
        lineOpacity,
        lineStroke,
        lineStrokeDasharray: strokeDasharray,
        stroke,
        strokeOpacity,
        strokeWidth,
        fill: functor(fill)(price),
        textFill: functor(textFill)(price),
        opacity,
        fontFamily,
        fontSize,
        rectWidth,
        rectHeight,
        arrowWidth,
        dx,
        x1: 0,
        x2: width,
        y1: y,
        y2: y,
    })
}

export class PriceCoordinate extends Series {
    static defaults = priceCoordinateDefaults

    get clip() {
        return false
    }

    canvasDraw(context, moreProps) {
        drawPriceCoordinate(context, moreProps, this.seriesProps)
    }
}

define("chart-price-coordinate", PriceCoordinate)
