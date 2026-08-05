import { pairs } from "d3-array"
import { isDefined, isNotDefined } from "../../core/utils/index.js"
import { GenericChartComponent } from "../../core/GenericChartComponent.js"
import { getMouseCanvas } from "../../core/GenericComponent.js"
import { defineProperties, define } from "../../core/element.js"
import { generateLine, isHovering2 } from "./InteractiveStraightLine.js"

export const gannFanDefaults = {
    strokeWidth: 1,
    tolerance: 4,
    selected: false,
    startXY: undefined,
    endXY: undefined,
    strokeStyle: undefined,
    fillStyle: [],
    fontFamily: undefined,
    fontSize: undefined,
    fontFill: undefined,
    interactiveCursorClass: undefined,
    onHover: undefined,
    onUnHover: undefined,
    onDragStart: undefined,
    onDrag: undefined,
    onDragComplete: undefined,
}

const lineTo = (start, endX, endY, text) => ({ start, end: [endX, endY], text })

/**
 * The nine rays of a Gann fan.
 *
 * One line is the 1/1 the user drew; the other eight divide its rise and its run by 2, 3,
 * 4 and 8 — the ratios Gann held that price and time move in. Every ray starts at the
 * same point and runs to the edge of the chart, and the wedges between them are filled.
 */
export const gannFanLines = (props, moreProps) => {
    const { startXY, endXY } = props
    const {
        xScale,
        chartConfig: { yScale },
    } = moreProps

    if (isNotDefined(startXY) || isNotDefined(endXY)) return []

    const [x1, y1] = startXY
    const [x2, y2] = endXY

    const dx = x2 - x1
    const dy = y2 - y1

    if (dx === 0 || dy === 0) return []

    const lines = [
        lineTo(startXY, x1 + dx / 8, y2, "1/8"),
        lineTo(startXY, x1 + dx / 4, y2, "1/4"),
        lineTo(startXY, x1 + dx / 3, y2, "1/3"),
        lineTo(startXY, x1 + dx / 2, y2, "1/2"),
        { start: startXY, end: endXY, text: "1/1" },
        lineTo(startXY, x2, y1 + dy / 2, "2/1"),
        lineTo(startXY, x2, y1 + dy / 3, "3/1"),
        lineTo(startXY, x2, y1 + dy / 4, "4/1"),
        lineTo(startXY, x2, y1 + dy / 8, "8/1"),
    ]

    return lines.map(line => {
        const generated = generateLine({ type: "RAY", start: line.start, end: line.end, xScale, yScale })

        return {
            x1: xScale(generated.x1),
            y1: yScale(generated.y1),
            x2: xScale(generated.x2),
            y2: yScale(generated.y2),
            label: { x: xScale(line.end[0]), y: yScale(line.end[1]), text: line.text },
        }
    })
}

export const drawGannFan = (context, moreProps, props) => {
    const resolved = { ...gannFanDefaults, ...props }
    const { strokeStyle, strokeWidth, fillStyle, fontFamily, fontSize, fontFill } = resolved

    const lines = gannFanLines(resolved, moreProps)

    context.lineWidth = strokeWidth
    context.strokeStyle = strokeStyle
    context.font = `${fontSize}px ${fontFamily}`
    context.fillStyle = fontFill

    lines.forEach(line => {
        context.beginPath()
        context.moveTo(line.x1, line.y1)
        context.lineTo(line.x2, line.y2)
        context.stroke()
        context.beginPath()
        context.fillText(line.label.text, line.label.x, line.label.y)
    })

    // the wedge between each neighbouring pair, so the fan reads as bands not lines
    pairs(lines).forEach(([line1, line2], index) => {
        context.fillStyle = fillStyle[index]

        context.beginPath()
        context.moveTo(line1.x1, line1.y1)
        context.lineTo(line1.x2, line1.y2)
        context.lineTo(line2.x2, line2.y2)
        context.closePath()
        context.fill()
    })
}

/**
 * Rays are unbounded, so the usual "between the ends" test would match far outside the
 * fan. This checks the pointer is inside the drawn segment's box first.
 */
export const isGannFanHover = (moreProps, props) => {
    const resolved = { ...gannFanDefaults, ...props }
    const { tolerance, onHover } = resolved
    if (!isDefined(onHover)) return false

    const { mouseXY } = moreProps
    const [mouseX, mouseY] = mouseXY

    for (const line of gannFanLines(resolved, moreProps)) {
        const left = Math.min(line.x1, line.x2)
        const right = Math.max(line.x1, line.x2)
        const top = Math.min(line.y1, line.y2)
        const bottom = Math.max(line.y1, line.y2)

        const withinBounds = mouseX >= left && mouseX <= right && mouseY >= top && mouseY <= bottom

        if (withinBounds && isHovering2([line.x1, line.y1], [line.x2, line.y2], mouseXY, tolerance)) return true
    }

    return false
}

export class GannFan extends GenericChartComponent {
    #props

    constructor() {
        super()
        this.#props = defineProperties(this, gannFanDefaults)
    }

    get drawOn() {
        return ["mousemove", "mouseleave", "pan", "drag"]
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
        return isGannFanHover(moreProps, this.#props)
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
        drawGannFan(context, moreProps, this.#props)
    }
}

define("chart-gann-fan", GannFan)
