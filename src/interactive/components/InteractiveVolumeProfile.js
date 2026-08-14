import { hitSlop } from "../../core/utils/dom.js"
import { isNotDefined } from "../../core/utils/index.js"
import { GenericChartComponent } from "../../core/GenericChartComponent.js"
import { getMouseCanvas } from "../../core/GenericComponent.js"
import { defineProperties, define } from "../../core/element.js"

export const interactiveVolumeProfileDefaults = {
    start: undefined,
    end: undefined,
    bins: 24,
    maxProfileWidthPercent: 30,
    strokeStyle: "#000000",
    strokeWidth: 1,
    fillUp: "rgba(106, 185, 117, 0.5)",
    fillDown: "rgba(224, 122, 122, 0.5)",
    tolerance: 7,
    selected: false,
    interactiveCursorClass: undefined,
    onHover: undefined,
    onUnHover: undefined,
    onDragStart: undefined,
    onDrag: undefined,
    onDragComplete: undefined,
}

/**
 * A fixed-range volume profile (chart#5 cụm 4): two anchors pick a run of bars, and
 * volume-at-price is recomputed from those rows on every draw — the object stores the
 * range, never the histogram. The price axis of the profile is the range's own
 * high–low; each bin becomes one horizontal bar growing from the range's left edge,
 * up/down volume split by the bar's direction, widest bin at `maxProfileWidthPercent`
 * of the range's width. Computed once per pass; draw and hit test read the same box.
 */
export const volumeProfileGeometry = (props, moreProps) => {
    const resolved = { ...interactiveVolumeProfileDefaults, ...props }
    const { start, end, bins } = resolved
    const {
        xScale,
        chartConfig: { yScale },
        xAccessor,
        fullData,
    } = moreProps

    if (isNotDefined(start) || isNotDefined(end) || !fullData?.length) return null

    const [left, right] = start[0] <= end[0] ? [start[0], end[0]] : [end[0], start[0]]
    const rows = fullData.filter(row => {
        const x = xAccessor(row)
        return x >= left && x <= right
    })
    if (rows.length === 0) return null

    let low = Infinity
    let high = -Infinity
    for (const row of rows) {
        if (row.low < low) low = row.low
        if (row.high > high) high = row.high
    }
    if (!(high > low)) return null

    const step = (high - low) / bins
    const upVolume = new Array(bins).fill(0)
    const downVolume = new Array(bins).fill(0)
    for (const row of rows) {
        const typical = (row.high + row.low + row.close) / 3
        const bin = Math.min(bins - 1, Math.floor((typical - low) / step))
        if (row.close >= row.open) upVolume[bin] += row.volume ?? 0
        else downVolume[bin] += row.volume ?? 0
    }

    const box = {
        x1: xScale(left),
        x2: xScale(right),
        yTop: yScale(high),
        yBottom: yScale(low),
    }
    const biggest = Math.max(...upVolume.map((up, i) => up + downVolume[i]))
    if (!(biggest > 0)) return null

    const maxWidth = ((box.x2 - box.x1) * resolved.maxProfileWidthPercent) / 100
    const bars = upVolume.map((up, i) => {
        const total = up + downVolume[i]
        const y1 = yScale(low + (i + 1) * step)
        const y2 = yScale(low + i * step)
        return {
            y1,
            y2,
            upWidth: (up / biggest) * maxWidth,
            totalWidth: (total / biggest) * maxWidth,
        }
    })

    return { box, bars }
}

export const drawInteractiveVolumeProfile = (context, moreProps, props) => {
    const resolved = { ...interactiveVolumeProfileDefaults, ...props }
    const geometry = volumeProfileGeometry(resolved, moreProps)
    if (geometry === null) return

    const { box, bars } = geometry

    for (const bar of bars) {
        const height = Math.max(1, Math.abs(bar.y2 - bar.y1) - 1)
        const top = Math.min(bar.y1, bar.y2)
        context.fillStyle = resolved.fillUp
        context.fillRect(box.x1, top, bar.upWidth, height)
        context.fillStyle = resolved.fillDown
        context.fillRect(box.x1 + bar.upWidth, top, bar.totalWidth - bar.upWidth, height)
    }

    context.lineWidth = resolved.strokeWidth
    context.strokeStyle = resolved.strokeStyle
    context.strokeRect(box.x1, box.yTop, box.x2 - box.x1, box.yBottom - box.yTop)
}

/** Trúng ở viền hộp phạm vi — lòng hộp là dữ liệu, không phải thân kéo. */
export const isVolumeProfileHover = (moreProps, props) => {
    const resolved = { ...interactiveVolumeProfileDefaults, ...props }
    if (resolved.onHover === undefined) return false

    const geometry = volumeProfileGeometry(resolved, moreProps)
    if (geometry === null) return false

    const {
        mouseXY: [x, y],
    } = moreProps
    const reach = resolved.tolerance + hitSlop(moreProps)
    const { box } = geometry

    const nearX = x >= Math.min(box.x1, box.x2) - reach && x <= Math.max(box.x1, box.x2) + reach
    const nearY = y >= Math.min(box.yTop, box.yBottom) - reach && y <= Math.max(box.yTop, box.yBottom) + reach
    if (!nearX || !nearY) return false

    const onVerticalEdge = Math.abs(x - box.x1) <= reach || Math.abs(x - box.x2) <= reach
    const onHorizontalEdge = Math.abs(y - box.yTop) <= reach || Math.abs(y - box.yBottom) <= reach
    return onVerticalEdge || onHorizontalEdge
}

/** A fixed-range volume profile: two anchors, the histogram recomputed from rows on each draw. */
export class InteractiveVolumeProfile extends GenericChartComponent {
    #props

    constructor() {
        super()
        this.#props = defineProperties(this, interactiveVolumeProfileDefaults)
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
        return isVolumeProfileHover(moreProps, this.#props)
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
        drawInteractiveVolumeProfile(context, moreProps, this.#props)
    }
}

define("chart-interactive-volume-profile", InteractiveVolumeProfile)
