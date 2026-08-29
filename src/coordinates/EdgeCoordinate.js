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
        gutterWidth,
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
            /**
             * A tab too wide for its column leans INTO the chart, not off the canvas.
             *
             * There is nothing past the outer edge — a label drawn there is simply gone, and
             * a price with its last two digits missing is worse than a price sitting on a
             * couple of candles. So when the text needs more room than the axis column has,
             * the overflow is taken from the plot side and the outer edge stays put.
             */
            const overflow = gutterWidth > 0 ? Math.max(0, rectWidth + 1 - gutterWidth) : 0
            const lean = orient === "right" ? -overflow : overflow

            edgeXRect = dx + lean + (orient === "right" ? edgeAt + 1 : edgeAt - rectWidth - 1)
            edgeYRect = y1 - rectHeight / 2 - strokeWidth
            edgeXText = dx + lean + (orient === "right" ? edgeAt + rectWidth / 2 : edgeAt - rectWidth / 2)
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

/**
 * How wide the axis column beside the plot is — the room a tab pinned to that axis has.
 *
 * It is the chart's own margin on that side, less whatever `yAxisPad` already pushed the
 * tab outwards by. `undefined` when the caller has no margin to give (the drawing
 * functions are called directly by the tests, with hand-built `moreProps`), and the tab
 * then sizes itself to its text alone.
 */
export const gutterWidthFor = (margin, side, pad = 0) => {
    if (margin === undefined || margin === null) return undefined

    const column = side === "left" ? margin.left : margin.right
    if (typeof column !== "number") return undefined

    return Math.max(0, column - pad)
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
 * How wide the tab has to be.
 *
 * `fitToText` measures the string — why a price label grows for "1,234.56" but a time
 * label can stay narrow. Without it the original used `rectWidth` flat, and a fixed 50px
 * box with a 13px "77375.89" in it let the text hang out of both ends of its own
 * background: over the axis line on one side, past the canvas edge on the other. Centred
 * text in a box too small for it is not clipped by the box — canvas has no such thing —
 * it just spills.
 *
 * So once the caller says how wide the axis column is (`gutterWidth`), the tab is sized
 * instead of assumed: never narrower than its text plus `rectPadding` a side, and it
 * FILLS the column. Filling is what removes the leftover white strip beside the label,
 * and it is also what turns the padding from a minimum into real air — the wider the
 * column, the more of it on both sides of the number.
 *
 * A caller with no column to name — the drawing functions are called directly, with
 * hand-built `moreProps`, by the golden tests — gets the original's flat `rectWidth`,
 * measurement and all: the string is not even measured, because the measuring is itself
 * a canvas call and the command stream is what those tests compare.
 */
const boxWidthFor = (context, { coordinate, fitToText, rectWidth, rectPadding = 4, gutterWidth }) => {
    // `- 1` keeps the hairline the box is drawn on inside the column instead of on its
    // very edge, mirroring the `+ 1` the tab is already offset by on the axis side.
    const column = gutterWidth > 0 ? gutterWidth - 1 : 0

    if (fitToText) return Math.max(Math.round(context.measureText(coordinate).width) + 10, column)
    if (column === 0) return rectWidth

    return Math.max(rectWidth, Math.round(context.measureText(coordinate).width) + 2 * rectPadding, column)
}

export const drawEdgeCoordinate = (context, props) => {
    const { fontSize, fontFamily } = props

    context.font = `${fontSize}px ${fontFamily}`
    context.textBaseline = "middle"

    const width = boxWidthFor(context, props)

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
