import { first, getStrokeDasharrayCanvas, last, withDefaults } from "../core/utils/index.js"
import { getMouseCanvas } from "../core/GenericComponent.js"
import { GenericComponent } from "../core/GenericComponent.js"
import { defineProperties, define } from "../core/element.js"

const defaultCustomSnapX = (props, moreProps) => {
    const { xScale, xAccessor, currentItem, mouseXY } = moreProps
    return props.snapX ? Math.round(xScale(xAccessor(currentItem))) : mouseXY[0]
}

export const cursorDefaults = {
    strokeStyle: "rgba(55, 71, 79, 0.8)",
    strokeDasharray: "ShortDash",
    snapX: true,
    customX: defaultCustomSnapX,
    disableYCursor: false,
    useXCursorShape: false,
    xCursorShapeStrokeStyle: "rgba(0, 0, 0, 0.5)",
    xCursorShapeFillStyle: undefined,
    xCursorShapeStrokeDasharray: undefined,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    ratio: 1,
}

const getXYCursor = (props, moreProps) => {
    const { mouseXY, currentItem, show, height, width } = moreProps
    const { customX, strokeStyle, strokeDasharray, disableYCursor } = props

    if (!show || currentItem === undefined) return undefined

    const yCursor = {
        x1: 0,
        x2: width,
        y1: mouseXY[1] + 0.5,
        y2: mouseXY[1] + 0.5,
        strokeStyle,
        strokeDasharray,
        isXCursor: false,
    }

    const x = customX(props, moreProps)
    const xCursor = { x1: x, x2: x, y1: 0, y2: height, strokeStyle, strokeDasharray, isXCursor: true }

    return disableYCursor ? [xCursor] : [yCursor, xCursor]
}

/**
 * The crosshair, optionally with a highlighted band instead of a vertical line.
 *
 * It resets the canvas transform and re-applies the margin itself, because it spans the
 * whole chart rather than living inside one pane — a crosshair that stopped at a pane
 * boundary would be useless for reading across stacked charts.
 */
export const drawCursor = (context, moreProps, props) => {
    const resolved = withDefaults(cursorDefaults, props)
    const cursors = getXYCursor(resolved, moreProps)
    if (cursors === undefined) return

    const { useXCursorShape } = resolved
    // margin và ratio là chuyện của cả chart chứ không của riêng con trỏ, nên chúng có
    // thể tới từ moreProps; phần tử thì lấy sẵn từ canvas và truyền qua props.
    const margin = props.margin ?? moreProps.margin ?? resolved.margin
    const ratio = props.ratio ?? moreProps.ratio ?? resolved.ratio

    context.save()
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.scale(ratio, ratio)
    context.translate(0.5 * ratio + margin.left, 0.5 * ratio + margin.top)

    cursors.forEach(line => {
        if (useXCursorShape && line.isXCursor) {
            const { xCursorShapeStrokeDasharray, xCursorShapeStrokeStyle, xCursorShapeFillStyle } = resolved
            const { currentItem } = moreProps

            if (xCursorShapeStrokeDasharray !== undefined) {
                const stroke =
                    xCursorShapeStrokeStyle instanceof Function
                        ? xCursorShapeStrokeStyle(currentItem)
                        : xCursorShapeStrokeStyle
                if (stroke !== undefined) context.strokeStyle = stroke
                context.setLineDash(getStrokeDasharrayCanvas(xCursorShapeStrokeDasharray))
            }

            context.beginPath()

            const fill =
                xCursorShapeFillStyle instanceof Function ? xCursorShapeFillStyle(currentItem) : xCursorShapeFillStyle
            if (fill !== undefined) context.fillStyle = fill

            context.beginPath()

            const { height, xScale, plotData, xAccessor } = moreProps
            const centerX = xScale(xAccessor(currentItem))
            const shapeWidth =
                Math.abs(xScale(xAccessor(last(plotData))) - xScale(xAccessor(first(plotData)))) / (plotData.length - 1)
            const xPos = centerX - shapeWidth / 2

            if (xCursorShapeStrokeDasharray === undefined) context.fillRect(xPos, 0, shapeWidth, height)
            else context.rect(xPos, 0, shapeWidth, height)

            context.fill()
        } else {
            if (line.strokeStyle !== undefined) context.strokeStyle = line.strokeStyle

            context.setLineDash(getStrokeDasharrayCanvas(line.strokeDasharray))
            context.beginPath()
            context.moveTo(line.x1, line.y1)
            context.lineTo(line.x2, line.y2)
        }

        context.stroke()
    })

    context.restore()
}

export class Cursor extends GenericComponent {
    static defaults = cursorDefaults
    #props

    constructor() {
        super()
        this.#props = defineProperties(this, cursorDefaults)
    }

    get clip() {
        return false
    }

    get drawOn() {
        return ["mousemove", "pan", "drag"]
    }

    canvasToDraw(contexts) {
        return getMouseCanvas(contexts)
    }

    canvasDraw(context, moreProps) {
        drawCursor(context, moreProps, { ...this.#props, margin: this.canvas?.margin, ratio: this.canvas?.ratio })
    }
}

define("chart-cursor", Cursor)
