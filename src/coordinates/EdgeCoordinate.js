import { getStrokeDasharrayCanvas, isDefined } from "../core/utils/index.js"

/**
 * The little labelled tab that sits against an axis.
 *
 * One shape serves every coordinate readout in the library: the price under the cursor,
 * the last close pinned to the edge, a fixed price line. They differ only in what they
 * put in the box and where they anchor it, so the geometry lives here once.
 */
export const edgeGeometry = props => {
    const {
        coordinate: displayCoordinate,
        show,
        type,
        orient,
        edgeAt,
        hideLine,
        lineStrokeDasharray,
        fill,
        fontFamily,
        fontSize,
        textFill,
        lineStroke,
        stroke,
        strokeWidth,
        arrowWidth,
        rectWidth,
        rectHeight,
        rectRadius,
        x1,
        y1,
        x2,
        y2,
        dx,
    } = props

    if (!show) return null

    let coordinateBase
    let coordinate

    if (displayCoordinate !== undefined) {
        const textAnchor = "middle"

        let edgeXRect
        let edgeYRect
        let edgeXText
        let edgeYText

        if (type === "horizontal") {
            edgeXRect = dx + (orient === "right" ? edgeAt + 1 : edgeAt - rectWidth - 1)
            edgeYRect = y1 - rectHeight / 2 - strokeWidth
            edgeXText = dx + (orient === "right" ? edgeAt + rectWidth / 2 : edgeAt - rectWidth / 2)
            edgeYText = y1
        } else {
            const dy = orient === "bottom" ? strokeWidth - 1 : -strokeWidth + 1
            edgeXRect = x1 - rectWidth / 2
            edgeYRect = (orient === "bottom" ? edgeAt : edgeAt - rectHeight) + dy
            edgeXText = x1
            edgeYText = (orient === "bottom" ? edgeAt + rectHeight / 2 : edgeAt - rectHeight / 2) + dy
        }

        coordinateBase = {
            edgeXRect,
            edgeYRect,
            rectHeight: rectHeight + strokeWidth,
            rectWidth,
            rectRadius,
            fill,
            arrowWidth,
            stroke,
            strokeWidth,
        }
        coordinate = { edgeXText, edgeYText, textAnchor, fontFamily, fontSize, textFill, displayCoordinate }
    }

    const line = hideLine
        ? undefined
        : { stroke: lineStroke, strokeDasharray: lineStrokeDasharray, x1, y1, x2, y2 }

    return { coordinateBase, coordinate, line, orient }
}

const roundRect = (context, x, y, width, height, radius) => {
    context.beginPath()
    context.moveTo(x + radius, y)
    context.lineTo(x + width - radius, y)
    context.quadraticCurveTo(x + width, y, x + width, y + radius)
    context.lineTo(x + width, y + height - radius)
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    context.lineTo(x + radius, y + height)
    context.quadraticCurveTo(x, y + height, x, y + height - radius)
    context.lineTo(x, y + radius)
    context.quadraticCurveTo(x, y, x + radius, y)
    context.closePath()
}

/**
 * `fitToText` measures the string before deciding the box width — which is why a price
 * label grows for "1,234.56" but a time label can stay narrow.
 */
export const drawEdgeCoordinate = (context, props) => {
    const { coordinate, fitToText, fontSize, fontFamily, rectWidth } = props

    context.font = `${fontSize}px ${fontFamily}`
    context.textBaseline = "middle"

    const width = fitToText ? Math.round(context.measureText(coordinate).width + 10) : rectWidth

    const edge = edgeGeometry({ ...props, rectWidth: width })
    if (edge === null) return

    if (edge.line !== undefined && isDefined(edge.line)) {
        context.setLineDash(getStrokeDasharrayCanvas(edge.line.strokeDasharray))
        context.strokeStyle = edge.line.stroke
        context.lineWidth = 1
        context.beginPath()
        context.moveTo(edge.line.x1, edge.line.y1)
        context.lineTo(edge.line.x2, edge.line.y2)
        context.stroke()
    }

    context.setLineDash([])

    if (edge.coordinateBase === undefined) return

    const { arrowWidth, rectWidth: boxWidth, rectHeight, rectRadius } = edge.coordinateBase

    context.fillStyle = edge.coordinateBase.fill
    if (edge.coordinateBase.stroke !== undefined) {
        context.strokeStyle = edge.coordinateBase.stroke
        context.lineWidth = edge.coordinateBase.strokeWidth
    }

    let x = edge.coordinateBase.edgeXRect
    const y = edge.coordinateBase.edgeYRect
    const halfHeight = rectHeight / 2

    context.beginPath()

    // An arrow points the tab at the exact value; without one it is a plain box
    if (arrowWidth > 0 && edge.orient === "right") {
        x -= arrowWidth
        context.moveTo(x, y + halfHeight)
        context.lineTo(x + arrowWidth, y)
        context.lineTo(x + boxWidth + arrowWidth, y)
        context.lineTo(x + boxWidth + arrowWidth, y + rectHeight)
        context.lineTo(x + arrowWidth, y + rectHeight)
        context.closePath()
    } else if (arrowWidth > 0 && edge.orient === "left") {
        context.moveTo(x, y)
        context.lineTo(x + boxWidth, y)
        context.lineTo(x + boxWidth + arrowWidth, y + halfHeight)
        context.lineTo(x + boxWidth, y + rectHeight)
        context.lineTo(x, y + rectHeight)
        context.closePath()
    } else if (rectRadius) {
        roundRect(context, x - 0.5, y - 0.5, boxWidth, rectHeight, 3)
    } else {
        context.rect(x - 0.5, y, boxWidth, rectHeight)
    }

    context.fill()

    if (edge.coordinateBase.stroke !== undefined) context.stroke()

    if (edge.coordinate !== undefined) {
        context.fillStyle = edge.coordinate.textFill
        context.textAlign = edge.coordinate.textAnchor === "middle" ? "center" : edge.coordinate.textAnchor
        context.fillText(edge.coordinate.displayCoordinate, edge.coordinate.edgeXText, edge.coordinate.edgeYText)
    }
}
