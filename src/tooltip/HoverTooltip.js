import { max, sum } from "d3-array"
import { first, last, withDefaults } from "../core/utils/index.js"
import { GenericComponent } from "../core/GenericComponent.js"
import { defineProperties, define } from "../core/element.js"

const PADDING = 4
const X = 8
const Y = 8

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

const defaultBackgroundShapeCanvas = (props, { width, height }, context) => {
    const { toolTipFillStyle, toolTipStrokeStyle } = props

    context.beginPath()
    roundRect(context, 0, 0, width, height, 4)

    if (toolTipFillStyle !== undefined) {
        context.fillStyle = toolTipFillStyle
        context.shadowColor = "#898"
        context.shadowBlur = 4
        context.fill()
        context.shadowBlur = 0
    }

    if (toolTipStrokeStyle !== undefined) {
        context.strokeStyle = toolTipStrokeStyle
        context.stroke()
    }
}

/** Labels in one column, values in another, aligned on the widest label. */
const defaultTooltipCanvas = (props, content, context) => {
    const { fontSize = 14, fontFamily, fontFill } = props

    const startY = Y + fontSize * 0.9
    context.font = `bold ${fontSize}px ${fontFamily}`
    if (fontFill !== undefined) context.fillStyle = fontFill
    context.textAlign = "left"
    context.fillText(content.x, X, startY)

    const maxLabel = max(content.y, entry => context.measureText(entry.label).width) ?? 0

    for (let i = 0; i < content.y.length; i++) {
        const entry = content.y[i]
        const textY = (i + 1) * PADDING + startY + fontSize * (i + 1)

        context.font = `${fontSize}px ${fontFamily}`
        context.fillStyle = entry.stroke ?? fontFill
        context.fillText(entry.label, X, textY)

        if (fontFill !== undefined) context.fillStyle = fontFill
        context.fillText(entry.value, X * 2 + maxLabel, textY)
    }
}

const sumSizes = (...sizes) => ({
    width: Math.max(...sizes.map(size => size.width)),
    height: sum(sizes, size => size.height),
})

const calculateTooltipSize = (props, content, context) => {
    const { fontFamily, fontSize = 12, fontFill } = props

    context.font = `bold ${fontSize}px ${fontFamily}`
    if (fontFill !== undefined) context.fillStyle = fontFill
    context.textAlign = "left"

    const measureText = text => ({ width: context.measureText(text).width, height: fontSize + PADDING })

    const { width, height } = content.y
        .map(({ label, value }) => measureText(`${label}  ${value}`))
        .reduce((result, size) => sumSizes(result, size), measureText(String(content.x)))

    return { width: width + 2 * X, height: height + 2 * Y }
}

/** Flip to the other side of the pointer rather than running off the edge. */
const normalizeX = (x, bgSize, pointWidth, width) =>
    x < width / 2 ? x + pointWidth / 2 + PADDING : x - bgSize.width - pointWidth / 2 - PADDING

const normalizeY = (y, bgSize) => (y - bgSize.height <= 0 ? y + PADDING : y - bgSize.height - PADDING)

const defaultOrigin = (props, moreProps, bgSize, pointWidth) => {
    const { chartId, yAccessor } = props
    const { mouseXY, xAccessor, currentItem, xScale, chartConfig, width } = moreProps

    let y = last(mouseXY)

    const xValue = xAccessor(currentItem)
    let x = Math.round(xScale(xValue))

    if (chartId !== undefined && yAccessor !== undefined && chartConfig !== undefined && chartConfig.findIndex) {
        const yValue = yAccessor(currentItem)
        const chartIndex = chartConfig.findIndex(each => each.id === chartId)

        y = Math.round(chartConfig[chartIndex].yScale(yValue))
    }

    x = normalizeX(x, bgSize, pointWidth, width)
    y = normalizeY(y, bgSize)

    return [x, y]
}

export const hoverTooltipDefaults = {
    background: { fillStyle: "rgba(33, 148, 243, 0.1)" },
    toolTipFillStyle: "rgba(250, 250, 250, 1)",
    toolTipStrokeStyle: "rgba(33, 148, 243)",
    tooltipCanvas: defaultTooltipCanvas,
    origin: defaultOrigin,
    backgroundShapeCanvas: defaultBackgroundShapeCanvas,
    fontFill: "#000000",
    fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
    fontSize: 14,
    tooltip: undefined,
    chartId: undefined,
    yAccessor: undefined,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    ratio: 1,
}

/**
 * The floating panel that follows the cursor.
 *
 * The only tooltip drawn to canvas rather than SVG, because it has to be measured before
 * it can be placed: its size decides whether it sits left or right of the pointer, and
 * measuring text is something only the canvas can answer.
 */
export const drawHoverTooltip = (context, moreProps, props) => {
    const resolved = withDefaults(hoverTooltipDefaults, props)
    const { show, xScale, currentItem, plotData, xAccessor, displayXAccessor, height } = moreProps

    if (!show || currentItem === undefined) return

    const xValue = xAccessor(currentItem)
    if (xValue === undefined) return

    const content = resolved.tooltip.content({ currentItem, xAccessor: displayXAccessor })
    const centerX = xScale(xValue)
    const pointWidth =
        Math.abs(xScale(xAccessor(last(plotData))) - xScale(xAccessor(first(plotData)))) / (plotData.length - 1)

    const bgSize = calculateTooltipSize(resolved, content, context)
    const [x, y] = resolved.origin(resolved, moreProps, bgSize, pointWidth)

    const margin = props.margin ?? moreProps.margin ?? resolved.margin
    const ratio = props.ratio ?? moreProps.ratio ?? resolved.ratio

    const { backgroundShapeCanvas, tooltipCanvas, background } = resolved

    context.save()
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.scale(ratio, ratio)
    context.translate(0.5 * ratio + margin.left, 0.5 * ratio + margin.top)

    if (background?.fillStyle !== undefined) context.fillStyle = background.fillStyle

    context.beginPath()
    context.rect(centerX - pointWidth / 2, 0, pointWidth, height)
    context.fill()

    context.translate(x, y)

    backgroundShapeCanvas(resolved, bgSize, context)
    tooltipCanvas(resolved, content, context)

    context.restore()
}

export class HoverTooltip extends GenericComponent {
    #props

    constructor() {
        super()
        this.#props = defineProperties(this, hoverTooltipDefaults)
    }

    get drawOn() {
        return ["mousemove", "pan"]
    }

    canvasDraw(context, moreProps) {
        drawHoverTooltip(context, moreProps, {
            ...this.#props,
            margin: this.canvas?.margin,
            ratio: this.canvas?.ratio,
        })
    }
}

define("chart-hover-tooltip", HoverTooltip)
