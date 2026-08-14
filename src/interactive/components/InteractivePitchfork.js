import { hitSlop } from "../../core/utils/dom.js"
import { isDefined, isNotDefined } from "../../core/utils/index.js"
import { GenericChartComponent } from "../../core/GenericChartComponent.js"
import { getMouseCanvas } from "../../core/GenericComponent.js"
import { defineProperties, define } from "../../core/element.js"
import { generateLine, isHovering2 } from "./InteractiveStraightLine.js"

export const interactivePitchforkDefaults = {
    variant: "standard",
    p1: undefined,
    p2: undefined,
    p3: undefined,
    strokeStyle: "#000000",
    strokeWidth: 1,
    medianStrokeStyle: undefined,
    fillStyle: "rgba(138, 175, 226, 0.2)",
    tolerance: 4,
    selected: false,
    interactiveCursorClass: undefined,
    onHover: undefined,
    onUnHover: undefined,
    onDragStart: undefined,
    onDrag: undefined,
    onDragComplete: undefined,
}

/**
 * Where the median line starts, by variant. This is the only thing the three
 * pitchfork flavours disagree on: Andrews anchors at P1 itself, Schiff slides the
 * anchor halfway down toward P2's price, modified Schiff moves it to the midpoint of
 * the P1–P2 segment. (TradingView's "Inside pitchfork" is deliberately absent — its
 * anchor arithmetic is not published anywhere trustworthy enough to copy from.)
 */
export const pitchforkAnchor = (variant, p1, p2) => {
    switch (variant) {
        case "schiff":
            return [p1[0], (p1[1] + p2[1]) / 2]
        case "modifiedSchiff":
            return [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2]
        default:
        case "standard":
            return p1
    }
}

/**
 * The fractions a pitchfan splits the P2–P3 segment at — TradingView's defaults.
 * 0 and 1 are P2 and P3 themselves, so the fan's outer rays are the fork's tines'
 * base points aimed at the anchor instead of running parallel.
 */
export const PITCHFAN_LEVELS = [0, 0.25, 0.382, 0.5, 0.618, 0.75, 1]

/**
 * The rays of a pitchfork, in pixel space.
 *
 * The median runs from the variant's anchor through the midpoint of P2–P3; the two
 * tines run from P2 and from P3 with the median's direction. All three are RAYs, so
 * they extend to the edge of the pane and must be recomputed as the domain moves —
 * same shape as `gannFanLines`, and consumed the same way by draw and hit test.
 *
 * `variant: "fan"` — TradingView's Pitchfan — shares the three points and the whole
 * tool/wrapper machinery but changes the ray SET: every ray starts at the anchor and
 * passes through a `PITCHFAN_LEVELS` fraction of P2–P3. No band fill: a fan of seven
 * rays with a filled wedge would be noise, and TV draws none either.
 */
export const pitchforkLines = (props, moreProps) => {
    const { p1, p2, p3, variant } = { ...interactivePitchforkDefaults, ...props }
    const {
        xScale,
        chartConfig: { yScale },
    } = moreProps

    if (isNotDefined(p1) || isNotDefined(p2) || isNotDefined(p3)) return []

    const anchor = pitchforkAnchor(variant, p1, p2)
    const mid = [(p2[0] + p3[0]) / 2, (p2[1] + p3[1]) / 2]
    const direction = [mid[0] - anchor[0], mid[1] - anchor[1]]

    if (direction[0] === 0 && direction[1] === 0) return []

    const ray = (start, kind) => {
        const generated = generateLine({
            type: "RAY",
            start,
            end: [start[0] + direction[0], start[1] + direction[1]],
            xScale,
            yScale,
        })
        return {
            kind,
            x1: xScale(generated.x1),
            y1: yScale(generated.y1),
            x2: xScale(generated.x2),
            y2: yScale(generated.y2),
        }
    }

    if (variant === "fan") {
        return PITCHFAN_LEVELS.map(level => {
            const through = [p2[0] + level * (p3[0] - p2[0]), p2[1] + level * (p3[1] - p2[1])]
            const own = [through[0] - anchor[0], through[1] - anchor[1]]
            if (own[0] === 0 && own[1] === 0) return null
            const generated = generateLine({
                type: "RAY",
                start: anchor,
                end: through,
                xScale,
                yScale,
            })
            return {
                kind: "fan",
                level,
                x1: xScale(generated.x1),
                y1: yScale(generated.y1),
                x2: xScale(generated.x2),
                y2: yScale(generated.y2),
            }
        }).filter(line => line !== null)
    }

    return [ray(anchor, "median"), ray(p2, "tine"), ray(p3, "tine")]
}

export const drawInteractivePitchfork = (context, moreProps, props) => {
    const resolved = { ...interactivePitchforkDefaults, ...props }
    const { strokeStyle, medianStrokeStyle, strokeWidth, fillStyle } = resolved

    const lines = pitchforkLines(resolved, moreProps)
    if (lines.length === 0) return

    if (lines[0].kind !== "fan") {
        const [, tine2, tine3] = lines

        // the channel between the two tines, so the fork reads as a band not three sticks
        context.fillStyle = fillStyle
        context.beginPath()
        context.moveTo(tine2.x1, tine2.y1)
        context.lineTo(tine2.x2, tine2.y2)
        context.lineTo(tine3.x2, tine3.y2)
        context.lineTo(tine3.x1, tine3.y1)
        context.closePath()
        context.fill()
    }

    context.lineWidth = strokeWidth
    for (const line of lines) {
        context.strokeStyle = line.kind === "median" ? (medianStrokeStyle ?? strokeStyle) : strokeStyle
        context.beginPath()
        context.moveTo(line.x1, line.y1)
        context.lineTo(line.x2, line.y2)
        context.stroke()
    }
}

/**
 * Rays are unbounded, so the usual "between the ends" test would match far outside
 * the fork. Same guard as the Gann fan: the pointer must be inside the drawn
 * segment's box first.
 */
export const isPitchforkHover = (moreProps, props) => {
    const resolved = { ...interactivePitchforkDefaults, ...props }
    const { tolerance, onHover } = resolved
    if (!isDefined(onHover)) return false

    const {
        mouseXY: [mouseX, mouseY],
    } = moreProps
    const reach = tolerance + hitSlop(moreProps)

    for (const line of pitchforkLines(resolved, moreProps)) {
        const left = Math.min(line.x1, line.x2) - reach
        const right = Math.max(line.x1, line.x2) + reach
        const top = Math.min(line.y1, line.y2) - reach
        const bottom = Math.max(line.y1, line.y2) + reach
        const withinBounds = mouseX >= left && mouseX <= right && mouseY >= top && mouseY <= bottom
        if (withinBounds && isHovering2([line.x1, line.y1], [line.x2, line.y2], [mouseX, mouseY], reach)) return true
    }

    return false
}

/** An Andrews pitchfork (or its Schiff variants): a median from three points and two parallel tines. */
export class InteractivePitchfork extends GenericChartComponent {
    #props

    constructor() {
        super()
        this.#props = defineProperties(this, interactivePitchforkDefaults)
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
        return isPitchforkHover(moreProps, this.#props)
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
        drawInteractivePitchfork(context, moreProps, this.#props)
    }
}

define("chart-interactive-pitchfork", InteractivePitchfork)
