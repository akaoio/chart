import { hitSlop } from "../../core/utils/dom.js"
import { getStrokeDasharrayCanvas } from "../../core/utils/index.js"
import { GenericChartComponent } from "../../core/GenericChartComponent.js"
import { getMouseCanvas } from "../../core/GenericComponent.js"
import { defineProperties, define } from "../../core/element.js"

export const interactivePositionDefaults = {
    x1Value: undefined,
    x2Value: undefined,
    entry: undefined,
    target: undefined,
    stop: undefined,
    profitFill: "rgba(38, 166, 154, 0.2)",
    lossFill: "rgba(239, 83, 80, 0.2)",
    strokeStyle: "#787B86",
    strokeWidth: 1,
    entryStrokeDasharray: "ShortDash2",
    textFill: "#FFFFFF",
    profitLabelFill: "#26A69A",
    lossLabelFill: "#EF5350",
    fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
    fontSize: 11,
    formatPrice: value => value.toFixed(2),
    tolerance: 4,
    selected: false,
    interactiveCursorClass: undefined,
    onHover: undefined,
    onUnHover: undefined,
    onDragStart: undefined,
    onDrag: undefined,
    onDragComplete: undefined,
}

/** Both zones in pixels plus the numbers the labels print. */
export const positionGeometry = (props, moreProps) => {
    const resolved = { ...interactivePositionDefaults, ...props }
    const { x1Value, x2Value, entry, target, stop } = resolved
    const {
        xScale,
        chartConfig: { yScale },
    } = moreProps

    const left = Math.min(xScale(x1Value), xScale(x2Value))
    const width = Math.abs(xScale(x2Value) - xScale(x1Value))
    const entryY = yScale(entry)
    const targetY = yScale(target)
    const stopY = yScale(stop)

    const reward = Math.abs(target - entry)
    const risk = Math.abs(entry - stop)

    return {
        left,
        width,
        entryY,
        targetY,
        stopY,
        profit: { y: Math.min(entryY, targetY), height: Math.abs(targetY - entryY) },
        loss: { y: Math.min(entryY, stopY), height: Math.abs(stopY - entryY) },
        reward,
        risk,
        ratio: risk === 0 ? undefined : reward / risk,
        targetPercent: entry === 0 ? 0 : ((target - entry) / Math.abs(entry)) * 100,
        stopPercent: entry === 0 ? 0 : ((stop - entry) / Math.abs(entry)) * 100,
    }
}

export const drawInteractivePosition = (context, moreProps, props) => {
    const resolved = { ...interactivePositionDefaults, ...props }
    const geometry = positionGeometry(resolved, moreProps)
    const { left, width, entryY, targetY, stopY } = geometry

    context.fillStyle = resolved.profitFill
    context.fillRect(left, geometry.profit.y, width, geometry.profit.height)
    context.fillStyle = resolved.lossFill
    context.fillRect(left, geometry.loss.y, width, geometry.loss.height)

    context.lineWidth = resolved.strokeWidth
    context.strokeStyle = resolved.strokeStyle
    context.strokeRect(left, Math.min(geometry.profit.y, geometry.loss.y), width, geometry.profit.height + geometry.loss.height)

    context.setLineDash(getStrokeDasharrayCanvas(resolved.entryStrokeDasharray))
    context.beginPath()
    context.moveTo(left, entryY)
    context.lineTo(left + width, entryY)
    context.stroke()
    context.setLineDash([])

    context.font = `${resolved.fontSize}px ${resolved.fontFamily}`
    const centerX = left + width / 2
    const lineHeight = resolved.fontSize + 6

    const label = (text, fill, y) => {
        const boxWidth = context.measureText(text).width + 12
        context.fillStyle = fill
        context.fillRect(centerX - boxWidth / 2, y - lineHeight / 2, boxWidth, lineHeight)
        context.fillStyle = resolved.textFill
        context.textAlign = "center"
        context.textBaseline = "middle"
        context.fillText(text, centerX, y)
        context.textAlign = "start"
        context.textBaseline = "alphabetic"
    }

    const sign = value => (value >= 0 ? "+" : "")
    label(
        `${resolved.formatPrice(resolved.target)} (${sign(geometry.targetPercent)}${geometry.targetPercent.toFixed(2)}%)`,
        resolved.profitLabelFill,
        targetY,
    )
    label(
        `${resolved.formatPrice(resolved.stop)} (${sign(geometry.stopPercent)}${geometry.stopPercent.toFixed(2)}%)`,
        resolved.lossLabelFill,
        stopY,
    )
    if (geometry.ratio !== undefined) label(`R/R: ${geometry.ratio.toFixed(2)}`, resolved.strokeStyle, entryY)
}

export const isPositionHover = (moreProps, props) => {
    const resolved = { ...interactivePositionDefaults, ...props }
    const {
        mouseXY: [mouseX, mouseY],
    } = moreProps
    const tolerance = resolved.tolerance + hitSlop(moreProps)
    const geometry = positionGeometry(resolved, moreProps)

    const top = Math.min(geometry.profit.y, geometry.loss.y)
    const height = geometry.profit.height + geometry.loss.height

    return (
        mouseX >= geometry.left - tolerance &&
        mouseX <= geometry.left + geometry.width + tolerance &&
        mouseY >= top - tolerance &&
        mouseY <= top + height + tolerance
    )
}

/**
 * A position plan drawn on the chart: entry, target and stop levels over a bar span,
 * with the profit and loss zones filled and the risk/reward ratio read out. Long or
 * short is not a mode — it is simply where target and stop sit relative to entry.
 */
export class InteractivePosition extends GenericChartComponent {
    #props

    constructor() {
        super()
        this.#props = defineProperties(this, interactivePositionDefaults)
    }

    get drawOn() {
        return ["mousemove", "pan", "drag"]
    }

    get selected() {
        return this.#props.selected
    }

    get interactiveCursorClass() {
        return this.#props.interactiveCursorClass
    }

    canvasToDraw(contexts) {
        return getMouseCanvas(contexts)
    }

    isHoverTest(moreProps) {
        if (this.#props.onHover === undefined) return false
        return isPositionHover(moreProps, this.#props)
    }

    onHover(event, moreProps) {
        this.#props.onHover?.(event, moreProps)
    }
    onUnHover(event, moreProps) {
        this.#props.onUnHover?.(event, moreProps)
    }
    onDragStart(event, moreProps) {
        this.#props.onDragStart?.(event, moreProps)
    }
    onDrag(event, moreProps) {
        this.#props.onDrag?.(event, moreProps)
    }
    onDragComplete(event, moreProps) {
        this.#props.onDragComplete?.(event, moreProps)
    }

    canvasDraw(context, moreProps) {
        drawInteractivePosition(context, moreProps, this.#props)
    }
}

define("chart-interactive-position", InteractivePosition)
