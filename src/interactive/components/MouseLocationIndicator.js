import { functor, getClosestValue, shallowEqual } from "../../core/utils/index.js"
import { getXValue } from "../../core/utils/ChartDataUtil.js"
import { GenericChartComponent } from "../../core/GenericChartComponent.js"
import { getMouseCanvas } from "../../core/GenericComponent.js"
import { defineProperties, define } from "../../core/element.js"

export const mouseLocationIndicatorDefaults = {
    enabled: false,
    snap: true,
    snapTo: undefined,
    shouldDisableSnap: functor(false),
    stroke: "#000000",
    strokeWidth: 1,
    opacity: 1,
    disablePan: true,
    r: 0,
    onMouseMove: undefined,
    onMouseDown: undefined,
    onClick: undefined,
}

/**
 * Turns pointer position into a data value, and reports it.
 *
 * This is what every drawing tool listens to instead of raw mouse coordinates. Snapping
 * is the reason: a trendline should attach to a candle's close, not to whatever pixel the
 * hand happened to stop on — but holding shift or right-clicking suspends that, for when
 * a line genuinely belongs between two points.
 */
export const locationFromEvent = (event, moreProps, props) => {
    const { xAccessor, plotData, mouseXY, currentItem, xScale } = moreProps
    const { yScale } = moreProps.chartConfig
    const { enabled, snap, shouldDisableSnap, snapTo } = { ...mouseLocationIndicatorDefaults, ...props }

    if (!enabled || currentItem === undefined || currentItem === null || event == null) return undefined

    const snapping = snap && !shouldDisableSnap(event)

    const xValue = snapping ? xAccessor(currentItem) : getXValue(xScale, xAccessor, mouseXY, plotData)
    const yValue =
        snapping && snapTo !== undefined
            ? getClosestValue(snapTo(currentItem), yScale.invert(mouseXY[1]))
            : yScale.invert(mouseXY[1])

    return { xValue, yValue, x: xScale(xValue), y: yScale(yValue) }
}

export class MouseLocationIndicator extends GenericChartComponent {
    #props
    #position = {}

    constructor() {
        super()
        this.#props = defineProperties(this, mouseLocationIndicatorDefaults)
    }

    get drawOn() {
        return ["mousemove", "pan"]
    }

    /** While drawing, panning would fight the pointer — so it is switched off. */
    get disablePan() {
        return this.#props.enabled && this.#props.disablePan
    }

    canvasToDraw(contexts) {
        return getMouseCanvas(contexts)
    }

    #report(event, moreProps, handler) {
        const position = locationFromEvent(event, moreProps, this.#props)
        if (position === undefined) return

        this.#position = { x: position.x, y: position.y }
        handler?.(event, [position.xValue, position.yValue], moreProps)
    }

    onMouseDown(event, moreProps) {
        this.#report(event, moreProps, this.#props.onMouseDown)
    }

    onClick(event, moreProps) {
        this.#report(event, moreProps, this.#props.onClick)
    }

    onMouseMove(event, moreProps) {
        if (shallowEqual(moreProps.mousXY, moreProps.prevMouseXY)) return
        this.#report(event, moreProps, this.#props.onMouseMove)
    }

    onPan(event, moreProps) {
        this.onMouseMove(event, moreProps)
    }

    canvasDraw(context, moreProps) {
        const { enabled, r, stroke, strokeWidth } = this.#props
        const { x, y } = this.#position

        if (!enabled || !moreProps.show || x === undefined) return

        context.lineWidth = strokeWidth
        context.strokeStyle = stroke
        context.moveTo(x, y)
        context.beginPath()
        context.arc(x, y, r, 0, 2 * Math.PI, false)
        context.stroke()
    }
}

define("chart-mouse-location-indicator", MouseLocationIndicator)
