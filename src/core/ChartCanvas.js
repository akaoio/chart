import { extent as d3Extent, max, min } from "d3-array"
import { functor, head, identity, isDefined, isNotDefined, last, shallowEqual } from "./utils/index.js"
import { clearCanvas } from "./utils/dom.js"
import { mouseBasedZoomAnchor } from "./zoom/zoomBehavior.js"
import {
    getChartConfigWithUpdatedYScales,
    getCurrentCharts,
    getCurrentItem,
    getNewChartConfig,
} from "./utils/ChartDataUtil.js"
import evaluator from "./utils/evaluator.js"
import { CanvasContainer } from "./CanvasContainer.js"
import { EventCapture } from "./EventCapture.js"
import { serveContext } from "./context.js"
import { define, ElementBase } from "./element.js"

const SVG = "http://www.w3.org/2000/svg"

const CURSOR_STYLES = `
:host { position: relative; display: block; }
.chart-grabbing-cursor { pointer-events: all; cursor: grabbing; }
.chart-crosshair-cursor { pointer-events: all; cursor: crosshair; }
.chart-tooltip-hover { pointer-events: all; cursor: pointer; }
.chart-avoid-interaction { pointer-events: none; }
.chart-enable-interaction { pointer-events: all; }
.chart-default-cursor { cursor: default; }
.chart-move-cursor { cursor: move; }
.chart-pointer-cursor { cursor: pointer; }
.chart-ns-resize-cursor { cursor: ns-resize; }
.chart-ew-resize-cursor { cursor: ew-resize; }
`

export const chartCanvasDefaults = {
    clamp: false,
    disablePan: false,
    disableInteraction: false,
    disableZoom: false,
    flipXScale: false,
    maintainPointsPerPixelOnResize: true,
    margin: { top: 0, right: 40, bottom: 40, left: 0 },
    minPointsPerPxThreshold: 1 / 100,
    mouseMoveEvent: true,
    padding: 0,
    pointsPerPxThreshold: 2,
    postCalculator: identity,
    useCrossHairStyleCursor: true,
    xAccessor: identity,
    xExtents: [min, max],
    zoomAnchor: mouseBasedZoomAnchor,
    zoomMultiplier: 1.1,
}

const getXScaleDirection = flipXScale => (flipXScale ? -1 : 1)

/** Point the x scale at the pixels available, honouring padding and direction. */
const setXRange = (xScale, dimensions, padding, direction = 1) => {
    if (xScale.rangeRoundPoints) {
        if (isNaN(padding)) throw new Error("padding has to be a number for ordinal scale")
        xScale.rangeRoundPoints([0, dimensions.width], padding)
    } else if (xScale.padding) {
        if (isNaN(padding)) throw new Error("padding has to be a number for ordinal scale")
        xScale.range([0, dimensions.width])
        xScale.padding(padding / 2)
    } else {
        const { left, right } = isNaN(padding) ? padding : { left: padding, right: padding }
        xScale.range(direction > 0 ? [left, dimensions.width - right] : [dimensions.width - right, left])
    }
    return xScale
}

const pinchCoordinates = ({ touch1Pos, touch2Pos }) => ({
    topLeft: [Math.min(touch1Pos[0], touch2Pos[0]), Math.min(touch1Pos[1], touch2Pos[1])],
    bottomRight: [Math.max(touch1Pos[0], touch2Pos[0]), Math.max(touch1Pos[1], touch2Pos[1])],
})

/** No interaction on a scale that cannot be inverted — there is no way back to data. */
const isInteractionEnabled = (xScale, xAccessor, data) =>
    !isNaN(xScale(xAccessor(head(data)))) && isDefined(xScale.invert)

/**
 * The chart host: `<chart-canvas>`.
 *
 * Owns the data pipeline, the canvases, and the subscription list every drawable
 * registers with. Panes and series are declared as its children and find it through the
 * context protocol in `context.js`.
 *
 * ## State is explicit, on purpose
 *
 * This is the one place the port deliberately parts company with the original. There,
 * pointer position and the item under it lived in `mutableState`, a field written to
 * directly so React would not re-render on every mouse move — the author's own words
 * call it a way around React.
 *
 * Here there is no React to route around, so it all lives in one state object, and that
 * object is the complete answer to "what is on screen". Read it with `getState()`,
 * restore it with `setState()`. Same state in, same picture out — which is what lets a
 * chart be scrubbed backwards and forwards in step with a narration rather than only
 * driven forwards by a live pointer.
 */
export class ChartCanvas extends ElementBase {
    #props = { ...chartCanvasDefaults }
    #state = null
    #connected = false
    #updateQueued = false

    #canvasContainer
    #eventCapture
    #svg
    #defs
    #paneGroup
    #contentGroup

    #subscriptions = []
    #lastSubscriptionId = 0

    #panInProgress = false
    #prevMouseXY
    #finalPinch
    #waitingForPan = false
    #waitingForMouseMove = false
    #waitingForPinchZoom = false

    // Named as in the original, which is honest about what it is: while a pan is in
    // flight the previous frame's result is fed back in, so the data cannot run away
    // past the edge faster than the domain follows it.

    static properties = [
        "data",
        "xAccessor",
        "displayXAccessor",
        "xScale",
        "xExtents",
        "margin",
        "width",
        "height",
        "ratio",
        "padding",
        "clamp",
        "flipXScale",
        "plotFull",
        "postCalculator",
        "pointsPerPxThreshold",
        "minPointsPerPxThreshold",
        "maintainPointsPerPixelOnResize",
        "disableInteraction",
        "disablePan",
        "disableZoom",
        "mouseMoveEvent",
        "useCrossHairStyleCursor",
        "zoomAnchor",
        "zoomMultiplier",
        "seriesName",
        "onLoadBefore",
        "onLoadAfter",
    ]

    constructor() {
        super()

        this.attachShadow({ mode: "open" })

        const style = document.createElement("style")
        style.textContent = CURSOR_STYLES

        this.#canvasContainer = new CanvasContainer()

        this.#svg = document.createElementNS(SVG, "svg")
        this.#svg.style.position = "absolute"
        this.#defs = document.createElementNS(SVG, "defs")

        this.#contentGroup = document.createElementNS(SVG, "g")
        this.#eventCapture = new EventCapture(this)

        this.#paneGroup = document.createElementNS(SVG, "g")
        this.#paneGroup.setAttribute("class", "chart-avoid-interaction")

        this.#contentGroup.append(this.#eventCapture.element, this.#paneGroup)
        this.#svg.append(this.#defs, this.#contentGroup)
        this.shadowRoot.append(style, this.#canvasContainer.element, this.#svg)

        for (const name of ChartCanvas.properties) {
            Object.defineProperty(this, name, {
                get: () => this.#props[name],
                set: value => {
                    this.#props[name] = value
                    this.requestUpdate()
                },
                configurable: true,
                enumerable: true,
            })
        }
    }

    connectedCallback() {
        serveContext(this, "canvas")
        this.#connected = true

        if (this.#props.width === undefined || this.#props.height === undefined) this.#measureSelf()
        if (this.#props.ratio === undefined) this.#props.ratio = window.devicePixelRatio || 1

        this.#eventCapture.connect()
        this.requestUpdate()
    }

    disconnectedCallback() {
        this.#connected = false
        this.#eventCapture.disconnect()
        this.#resizeObserver?.disconnect()
        this.#resizeObserver = null
    }

    #resizeObserver = null

    /**
     * Size from the element's own box when not told otherwise.
     *
     * This is what the original's `withSize` and `withDeviceRatio` wrappers existed to
     * do. A custom element already has a box and can watch it, so the wrappers have
     * nothing left to wrap — see `docs/parity/utils.md`.
     */
    #measureSelf() {
        const apply = () => {
            const { width, height } = this.getBoundingClientRect()
            if (width === 0 && height === 0) return

            this.#props.width = width
            this.#props.height = height
            this.requestUpdate()
        }

        apply()
        this.#resizeObserver = new ResizeObserver(apply)
        this.#resizeObserver.observe(this)
    }

    // ─── the data pipeline ────────────────────────────────────────────────────────

    #dimensions() {
        const { margin, height = 0, width = 0 } = this.#props
        return { height: height - margin.top - margin.bottom, width: width - margin.left - margin.right }
    }

    /** Every child pane's configuration, read off the elements themselves. */
    #chartPropsList() {
        return [...this.querySelectorAll("chart-pane")].map(pane => pane.chartProps)
    }

    #calculateFullData() {
        const {
            data: fullData,
            plotFull,
            xScale,
            clamp,
            pointsPerPxThreshold,
            flipXScale,
            xAccessor,
            displayXAccessor,
            minPointsPerPxThreshold,
        } = this.#props

        const useWholeData = plotFull !== undefined ? plotFull : xAccessor === identity

        const { filterData } = evaluator({
            xScale,
            useWholeData,
            clamp,
            pointsPerPxThreshold,
            minPointsPerPxThreshold,
            flipXScale,
        })

        return {
            xAccessor,
            displayXAccessor: displayXAccessor ?? xAccessor,
            xScale: xScale.copy(),
            fullData,
            filterData,
        }
    }

    /** Khung nhìn x mà `xExtents` yêu cầu — tức hình lúc chart mới mở. */
    #initialXExtent() {
        const { xAccessor: inputXAccessor, xExtents: xExtentsProp, data } = this.#props

        return typeof xExtentsProp === "function"
            ? xExtentsProp(data)
            : d3Extent(xExtentsProp.map(functor).map(each => each(data, inputXAccessor)))
    }

    #calculateState() {
        const { xAccessor: inputXAccessor, padding, flipXScale } = this.#props

        const dimensions = this.#dimensions()

        const extent = this.#initialXExtent()

        const { xAccessor, displayXAccessor, xScale, fullData, filterData } = this.#calculateFullData()

        const updatedXScale = setXRange(xScale, dimensions, padding, getXScaleDirection(flipXScale))
        const { plotData, domain } = filterData(fullData, extent, inputXAccessor, updatedXScale)

        return {
            plotData,
            xScale: updatedXScale.domain(domain),
            xAccessor,
            displayXAccessor,
            fullData,
            filterData,
        }
    }

    #resetChart() {
        const state = this.#calculateState()
        const { xAccessor, displayXAccessor, fullData, xScale } = state

        const plotData = this.#props.postCalculator(state.plotData)
        const dimensions = this.#dimensions()

        return {
            ...state,
            xScale,
            plotData,
            chartConfigs: getChartConfigWithUpdatedYScales(
                getNewChartConfig(dimensions, this.#chartPropsList()),
                { plotData, xAccessor, displayXAccessor, fullData },
                xScale.domain(),
            ),
            ...this.#pointerState(),
        }
    }

    #pointerState() {
        return {
            mouseXY: this.#state?.mouseXY ?? [0, 0],
            currentItem: this.#state?.currentItem ?? null,
            currentCharts: this.#state?.currentCharts ?? [],
        }
    }

    /**
     * Fold new data into the existing view rather than starting over.
     *
     * The rule that matters: if the newest point was on screen it stays on screen, so a
     * live chart keeps up by itself; if the user had scrolled back into history, their
     * position is left alone and new data arriving does not yank them forward.
     */
    #updateChart(newState, initialXScale, lastItemWasVisible, initialChartConfig) {
        const { fullData, xScale, xAccessor, displayXAccessor, filterData } = newState
        const { postCalculator, padding, flipXScale, maintainPointsPerPixelOnResize } = this.#props

        const lastItem = last(fullData)
        const lastXItem = xAccessor(lastItem)
        const [start, end] = initialXScale.domain()

        const dimensions = this.#dimensions()
        const updatedXScale = setXRange(xScale, dimensions, padding, getXScaleDirection(flipXScale))

        let initialPlotData

        if (!lastItemWasVisible || end >= lastXItem) {
            // a resize, or history: keep the domain, refit the range
            const [rangeStart, rangeEnd] = initialXScale.range()
            const [newRangeStart, newRangeEnd] = updatedXScale.range()
            const newDomainExtent =
                ((newRangeEnd - newRangeStart) / (rangeEnd - rangeStart)) * (end.valueOf() - start.valueOf())
            const newStart = maintainPointsPerPixelOnResize ? end.valueOf() - newDomainExtent : start

            const response = filterData(fullData, [newStart, end], xAccessor, updatedXScale, {
                fallbackStart: start,
                fallbackEnd: { lastItem, lastItemX: initialXScale(lastXItem) },
            })
            initialPlotData = response.plotData
            updatedXScale.domain(response.domain)
        } else if (lastItemWasVisible && end < lastXItem) {
            // new data arrived while pinned to the right edge: slide along with it
            const dx = initialXScale(lastXItem) - initialXScale.range()[1]
            const [newStart, newEnd] = initialXScale
                .range()
                .map(x => x + dx)
                .map(initialXScale.invert)

            const response = filterData(fullData, [newStart, newEnd], xAccessor, updatedXScale)
            initialPlotData = response.plotData
            updatedXScale.domain(response.domain)
        }

        const plotData = postCalculator(initialPlotData)

        return {
            xScale: updatedXScale,
            xAccessor,
            displayXAccessor,
            chartConfigs: getChartConfigWithUpdatedYScales(
                getNewChartConfig(dimensions, this.#chartPropsList(), initialChartConfig),
                { plotData, xAccessor, displayXAccessor, fullData },
                updatedXScale.domain(),
            ),
            plotData,
            fullData,
            filterData,
            ...this.#pointerState(),
        }
    }

    // ─── update scheduling ────────────────────────────────────────────────────────

    /** Coalesce a burst of property writes into one recalculation. */
    requestUpdate() {
        if (!this.#connected || this.#updateQueued) return

        this.#updateQueued = true
        queueMicrotask(() => {
            this.#updateQueued = false
            if (this.#connected) this.#update()
        })
    }

    #update() {
        const { data, xScale, width, height } = this.#props
        if (!data || !xScale || width === undefined || height === undefined) return

        const previous = this.#state
        const shouldReset =
            previous === null ||
            !isInteractionEnabled(previous.xScale, previous.xAccessor, previous.plotData) ||
            !shallowEqual(this.#lastSeriesName, this.#props.seriesName) ||
            !shallowEqual(this.#lastXExtents, this.#props.xExtents)

        if (shouldReset) {
            this.#state = this.#resetChart()
        } else {
            const [start, end] = previous.xScale.domain()
            const calculated = this.#calculateFullData()
            const previousX = calculated.xAccessor(last(previous.fullData))

            this.#state = this.#updateChart(
                calculated,
                previous.xScale,
                previousX <= end && previousX >= start,
                previous.chartConfigs,
            )
        }

        this.#lastSeriesName = this.#props.seriesName
        this.#lastXExtents = this.#props.xExtents

        this.#render()

        if (!this.#panInProgress) {
            this.clearThreeCanvas()
            this.draw({ force: true })
        }
    }

    #lastSeriesName
    #lastXExtents

    #render() {
        const { width, height, margin, ratio } = this.#props
        const dimensions = this.#dimensions()

        this.#canvasContainer.resize(width, height, ratio)

        this.#svg.setAttribute("width", width)
        this.#svg.setAttribute("height", height)
        this.#contentGroup.setAttribute("transform", `translate(${margin.left + 0.5}, ${margin.top + 0.5})`)
        this.#eventCapture.resize(dimensions.width, dimensions.height)
        this.#eventCapture.refreshCursor()

        this.#renderClipPaths(dimensions)
        this.#renderPanes()
    }

    #renderClipPaths(dimensions) {
        this.#defs.textContent = ""

        const clip = (id, width, height) => {
            const path = document.createElementNS(SVG, "clipPath")
            path.setAttribute("id", id)
            const rect = document.createElementNS(SVG, "rect")
            rect.setAttribute("x", 0)
            rect.setAttribute("y", 0)
            rect.setAttribute("width", Math.max(0, width))
            rect.setAttribute("height", Math.max(0, height))
            path.append(rect)
            this.#defs.append(path)
        }

        clip("chart-area-clip", dimensions.width, dimensions.height)
        for (const config of this.#state.chartConfigs) {
            clip(`chart-area-clip-${config.id}`, config.width, config.height)
        }
    }

    /** One `<g>` per pane, positioned at that pane's origin — the SVG drawing surface. */
    #renderPanes() {
        const wanted = new Set()

        for (const config of this.#state.chartConfigs) {
            const id = String(config.id)
            wanted.add(id)

            let group = this.#paneGroup.querySelector(`[data-pane="${CSS.escape(id)}"]`)
            if (group === null) {
                group = document.createElementNS(SVG, "g")
                group.setAttribute("data-pane", id)
                this.#paneGroup.append(group)
            }
            group.setAttribute("transform", `translate(${config.origin[0]}, ${config.origin[1]})`)
        }

        for (const group of [...this.#paneGroup.children]) {
            if (!wanted.has(group.getAttribute("data-pane"))) group.remove()
        }
    }

    /** The SVG group a pane's children should draw into. */
    paneGroup(chartId) {
        return this.#paneGroup.querySelector(`[data-pane="${CSS.escape(String(chartId))}"]`)
    }

    // ─── state, read and written ──────────────────────────────────────────────────

    /** A snapshot fully describing what is on screen. */
    getState() {
        return this.#state
    }

    /**
     * Put the chart into a given state and redraw.
     *
     * The counterpart of `getState`, and the reason state is explicit here at all: hand
     * back a snapshot taken earlier and the chart returns to exactly that picture.
     */
    setState(state) {
        this.#state = { ...this.#state, ...state }
        if (!this.#connected) return

        this.#render()
        this.clearThreeCanvas()
        this.draw({ force: true })
    }

    getMutableState() {
        if (this.#state === null) return { mouseXY: [0, 0], currentItem: null, currentCharts: [] }

        const { mouseXY, currentItem, currentCharts } = this.#state
        return { mouseXY, currentItem, currentCharts }
    }

    // ─── what children see ────────────────────────────────────────────────────────

    get chartId() {
        return -1
    }

    get margin() {
        return this.#props.margin
    }

    get ratio() {
        return this.#props.ratio
    }

    /**
     * Children connect before the canvas has computed anything — element callbacks run
     * in tree order, and the first calculation is deferred so a burst of property writes
     * only costs one pass. So this has to answer safely before there is any state, and
     * children get their real values from the redraw that follows.
     */
    get contextValues() {
        const dimensions = this.#dimensions()

        if (this.#state === null) {
            return {
                chartId: -1,
                width: dimensions.width,
                height: dimensions.height,
                margin: this.#props.margin,
                ratio: this.#props.ratio,
                fullData: [],
                plotData: [],
                chartConfigs: [],
                xScale: undefined,
                xAccessor: undefined,
                displayXAccessor: undefined,
            }
        }

        return {
            chartId: -1,
            width: dimensions.width,
            height: dimensions.height,
            margin: this.#props.margin,
            ratio: this.#props.ratio,
            fullData: this.#state.fullData,
            plotData: this.#state.plotData,
            chartConfigs: this.#state.chartConfigs,
            xScale: this.#state.xScale,
            xAccessor: this.#state.xAccessor,
            displayXAccessor: this.#state.displayXAccessor,
        }
    }

    getCanvasContexts() {
        return this.#canvasContainer.getCanvasContexts()
    }

    generateSubscriptionId() {
        return ++this.#lastSubscriptionId
    }

    subscribe(id, rest) {
        const { getPanConditions = functor({ draggable: false, panEnabled: true }) } = rest
        this.#subscriptions = this.#subscriptions.concat({ id, ...rest, getPanConditions })
    }

    unsubscribe(id) {
        this.#subscriptions = this.#subscriptions.filter(each => each.id !== id)
    }

    getAllPanConditions = () => this.#subscriptions.map(each => each.getPanConditions())

    setCursorClass(className) {
        this.#eventCapture.setCursorClass(className)
    }

    /**
     * Of everything currently draggable, is this the one that should respond?
     *
     * Last subscriber wins, and subscription order is DOM order — so the thing declared
     * last, drawn on top, is also the thing the pointer grabs.
     */
    amIOnTop(id) {
        const draggable = this.#subscriptions.filter(each => each.getPanConditions().draggable)
        return draggable.length > 0 && last(draggable).id === id
    }

    // ─── drawing ──────────────────────────────────────────────────────────────────

    clearBothCanvas() {
        const { axes, mouseCoord } = this.getCanvasContexts()
        if (axes && mouseCoord) clearCanvas([axes, mouseCoord], this.#props.ratio)
    }

    clearMouseCanvas() {
        const { mouseCoord } = this.getCanvasContexts()
        if (mouseCoord) clearCanvas([mouseCoord], this.#props.ratio)
    }

    clearThreeCanvas() {
        const { bg, axes, mouseCoord } = this.getCanvasContexts()
        if (bg && axes && mouseCoord) clearCanvas([bg, axes, mouseCoord], this.#props.ratio)
    }

    /** Tell every subscriber what happened. No filtering: they decide if they care. */
    triggerEvent(type, props, event) {
        const state = { ...this.#state, subscriptions: this.#subscriptions }
        this.#subscriptions.forEach(each => each.listener?.(type, props, state, event))
    }

    draw(props) {
        this.#subscriptions.forEach(each => {
            if (isDefined(each.draw)) each.draw(props)
        })
    }

    redraw = () => {
        this.clearThreeCanvas()
        this.draw({ force: true })
    }

    // ─── interaction ──────────────────────────────────────────────────────────────

    /** Props the EventCapture reads; live, so it always sees the current scale. */
    get eventCaptureProps() {
        const dimensions = this.#dimensions()
        const interaction = this.#state
            ? isInteractionEnabled(this.#state.xScale, this.#state.xAccessor, this.#state.plotData)
            : false

        return {
            mouseMove: this.#props.mouseMoveEvent && interaction,
            zoom: !this.#props.disableZoom && interaction,
            pan: !this.#props.disablePan && interaction,
            useCrossHairStyleCursor: this.#props.useCrossHairStyleCursor && interaction,
            disableInteraction: this.#props.disableInteraction,
            width: dimensions.width,
            height: dimensions.height,
            chartConfig: this.#state?.chartConfigs ?? [],
            xScale: this.#state?.xScale,
            xAccessor: this.#state?.xAccessor,
            getAllPanConditions: this.getAllPanConditions,
            onContextMenu: this.handleContextMenu,
            onClick: this.handleClick,
            onDoubleClick: this.handleDoubleClick,
            onMouseDown: this.handleMouseDown,
            onMouseMove: this.handleMouseMove,
            onMouseEnter: this.handleMouseEnter,
            onMouseLeave: this.handleMouseLeave,
            onDragStart: this.handleDragStart,
            onDrag: this.handleDrag,
            onDragComplete: this.handleDragEnd,
            onZoom: this.handleZoom,
            onPinchZoom: this.handlePinchZoom,
            onPinchZoomEnd: this.handlePinchZoomEnd,
            onPan: this.handlePan,
            onPanEnd: this.handlePanEnd,
        }
    }

    #calculateStateForDomain(newDomain) {
        const { xAccessor, displayXAccessor, xScale: initialXScale, chartConfigs, plotData, filterData, fullData } =
            this.#state

        const { plotData: beforePlotData, domain } = filterData(fullData, newDomain, xAccessor, initialXScale)

        const nextPlotData = this.#props.postCalculator(beforePlotData)
        const updatedScale = initialXScale.copy().domain(domain)

        return {
            xScale: updatedScale,
            plotData: nextPlotData,
            chartConfigs: getChartConfigWithUpdatedYScales(
                chartConfigs,
                { plotData: nextPlotData, xAccessor, displayXAccessor, fullData },
                updatedScale.domain(),
            ),
        }
    }

    /** Report when the view has run off either end of the data, so more can be loaded. */
    #reportEdges(xScale) {
        const { xAccessor, fullData } = this.#state
        const { onLoadBefore, onLoadAfter } = this.#props

        const scaleStart = head(xScale.domain())
        const dataStart = xAccessor(head(fullData))
        const scaleEnd = last(xScale.domain())
        const dataEnd = xAccessor(last(fullData))

        if (scaleStart < dataStart) onLoadBefore?.(scaleStart, dataStart)
        if (dataEnd < scaleEnd) onLoadAfter?.(dataEnd, scaleEnd)
    }

    handleContextMenu = (mouseXY, event) => {
        const { xAccessor, chartConfigs, plotData, xScale } = this.#state

        this.triggerEvent(
            "contextmenu",
            {
                mouseXY,
                currentItem: getCurrentItem(xScale, xAccessor, mouseXY, plotData),
                currentCharts: getCurrentCharts(chartConfigs, mouseXY),
            },
            event,
        )
    }

    handleZoom = (zoomDirection, mouseXY, event) => {
        if (this.#panInProgress) return

        const { xAccessor, xScale: initialXScale, plotData: initialPlotData } = this.#state
        const { zoomMultiplier, zoomAnchor } = this.#props

        const item = zoomAnchor({ xScale: initialXScale, xAccessor, mouseXY, plotData: initialPlotData })

        const cx = initialXScale(item)
        const c = zoomDirection > 0 ? zoomMultiplier : 1 / zoomMultiplier
        const newDomain = initialXScale
            .range()
            .map(x => cx + (x - cx) * c)
            .map(initialXScale.invert)

        const { xScale, plotData, chartConfigs } = this.#calculateStateForDomain(newDomain)

        const currentItem = getCurrentItem(xScale, xAccessor, mouseXY, plotData)
        const currentCharts = getCurrentCharts(chartConfigs, mouseXY)

        this.clearThreeCanvas()

        this.#state = { ...this.#state, mouseXY, currentItem, currentCharts }

        this.triggerEvent(
            "zoom",
            { xScale, plotData, chartConfigs, mouseXY, currentCharts, currentItem, show: true },
            event,
        )

        this.setState({ xScale, plotData, chartConfigs })
        this.#reportEdges(xScale)
    }

    xAxisZoom = newDomain => {
        const { xScale, plotData, chartConfigs } = this.#calculateStateForDomain(newDomain)
        this.clearThreeCanvas()
        this.setState({ xScale, plotData, chartConfigs })
        this.#reportEdges(xScale)
    }

    yAxisZoom = (chartId, newDomain) => {
        this.clearThreeCanvas()
        this.setState({
            chartConfigs: this.#state.chartConfigs.map(each =>
                each.id === chartId
                    ? { ...each, yScale: each.yScale.copy().domain(newDomain), yPanEnabled: true }
                    : each,
            ),
        })
    }

    /**
     * Về đúng hình lúc mở: khung nhìn x quay lại `xExtents`, và mọi pane bỏ khung giá
     * người dùng tự đặt.
     *
     * Bản gốc không có phép này — `<ZoomButtons>` của nó có nút reset nhưng nút ấy chỉ
     * gọi `onReset`, mà ngay câu chuyện mẫu của chính bản gốc cũng không truyền gì vào.
     * Nghĩa là cái nút vẽ ra rồi nằm đó, bấm không ăn. Ở đây nó có việc để làm; ứng dụng
     * vẫn đặt `onReset` của riêng mình được và khi ấy phép này không chạy.
     */
    reset = () => {
        this.clearThreeCanvas()

        this.setState(this.#resetChart())

        this.#reportEdges(this.#state.xScale)
    }

    /**
     * Về đúng mức zoom mặc định, giữ nguyên chỗ đang xem.
     *
     * "Mặc định" là bề rộng khung nhìn mà `xExtents` yêu cầu — bao nhiêu phiên trên màn
     * hình lúc chart mới mở. Tâm khung nhìn không đổi: chỉ có kích cỡ nến trở lại như cũ,
     * còn đang xem quãng nào thì vẫn ở quãng ấy. Muốn về hẳn hình lúc mở, cả zoom lẫn chỗ
     * xem, thì đó là `reset()`.
     */
    resetXDomain = () => {
        const [from, to] = this.#state.xScale.domain()
        const [initialFrom, initialTo] = this.#initialXExtent()

        const span = initialTo.valueOf() - initialFrom.valueOf()
        const centre = (from.valueOf() + to.valueOf()) / 2

        this.xAxisZoom([centre - span / 2, centre + span / 2])
    }

    resetYDomain = chartId => {
        let changed = false

        const chartConfigs = this.#state.chartConfigs.map(each => {
            if ((isNotDefined(chartId) || each.id === chartId) && !shallowEqual(each.yScale.domain(), each.realYDomain)) {
                changed = true
                return { ...each, yScale: each.yScale.domain(each.realYDomain), yPanEnabled: false }
            }
            return each
        })

        if (changed) {
            this.clearThreeCanvas()
            this.setState({ chartConfigs })
        }
    }

    #panHelper(mouseXY, initialXScale, { dx, dy }, chartsToPan) {
        const { xAccessor, displayXAccessor, chartConfigs, filterData, fullData } = this.#state

        const newDomain = initialXScale
            .range()
            .map(x => x - dx)
            .map(initialXScale.invert)

        const { plotData: beforePlotData, domain } = filterData(fullData, newDomain, xAccessor, initialXScale, {
            ignoreThresholds: true,
        })

        const updatedScale = initialXScale.copy().domain(domain)
        const plotData = this.#props.postCalculator(beforePlotData)

        const updatedConfigs = getChartConfigWithUpdatedYScales(
            chartConfigs,
            { plotData, xAccessor, displayXAccessor, fullData },
            updatedScale.domain(),
            dy,
            chartsToPan,
        )

        return {
            xScale: updatedScale,
            plotData,
            chartConfigs: updatedConfigs,
            mouseXY,
            currentCharts: getCurrentCharts(updatedConfigs, mouseXY),
            currentItem: getCurrentItem(updatedScale, xAccessor, mouseXY, plotData),
        }
    }

    /**
     * Pan is the hot path: no re-render, no diffing. Compute, tell everyone, redraw on
     * the next frame — and drop any further pan events until that frame has happened,
     * so a fast mouse cannot queue up more work than the display can show.
     */
    handlePan = (mousePosition, panStartXScale, dxdy, chartsToPan, event) => {
        if (this.#waitingForPan) return
        this.#waitingForPan = true

        const newState = this.#panHelper(mousePosition, panStartXScale, dxdy, chartsToPan)

        this.#panInProgress = true

        this.triggerEvent("pan", newState, event)

        /**
         * Chỉ ghi lại phần con trỏ, KHÔNG ghi đè thang và dữ liệu.
         *
         * `#panHelper` tính từ mốc lúc bắt đầu kéo: `dx`/`dy` là quãng đường tính từ chỗ
         * đặt tay xuống, còn thang x thì được truyền vào (`panStartXScale`). Thang y thì
         * không — nó lấy từ `#state`. Nạp kết quả của khung hình này vào `#state` nghĩa
         * là khung sau lại cộng tiếp quãng đường ấy lên một thang **đã dịch rồi**, và độ
         * dịch phình theo bình phương: kéo 100px thì nến đi xa gấp ba.
         *
         * Bản gốc không dính vì nó không `setState` trong lúc kéo — trạng thái chỉ chốt
         * lại ở `panend`. Chỗ này làm đúng như thế.
         */
        this.#state = {
            ...this.#state,
            mouseXY: newState.mouseXY,
            currentItem: newState.currentItem,
            currentCharts: newState.currentCharts,
        }

        requestAnimationFrame(() => {
            this.#waitingForPan = false
            this.clearBothCanvas()
            this.draw({ trigger: "pan" })
        })
    }

    handlePanEnd = (mousePosition, panStartXScale, dxdy, chartsToPan, event) => {
        const state = this.#panHelper(mousePosition, panStartXScale, dxdy, chartsToPan)

        this.#panInProgress = false

        this.triggerEvent("panend", state, event)

        requestAnimationFrame(() => {
            this.clearThreeCanvas()
            this.setState({
                xScale: state.xScale,
                plotData: state.plotData,
                chartConfigs: state.chartConfigs,
                mouseXY: state.mouseXY,
                currentItem: state.currentItem,
                currentCharts: state.currentCharts,
            })
            this.#reportEdges(state.xScale)
        })
    }

    handleMouseDown = (mouseXY, currentCharts, event) => {
        this.triggerEvent("mousedown", this.getMutableState(), event)
    }

    handleMouseEnter = event => {
        this.triggerEvent("mouseenter", { show: true }, event)
    }

    /**
     * `immediate` là để phục vụ một cú đặt xuống, không phải để đi lang thang.
     *
     * Phép chặn một-lần-mỗi-khung-hình dưới đây là đúng cho việc rê chuột: con trỏ sinh ra
     * hàng trăm sự kiện mỗi giây và màn hình chỉ vẽ được 60 lần. Nhưng nó **cũng** chặn lời
     * gọi mà `EventCapture` dùng để thiết lập `hovering` ngay trước khi quyết định "cú này
     * là pan hay là kéo một đối tượng" — nếu khung hình trước còn đang chờ, lời gọi ấy bị
     * bỏ, phép quyết định đọc trạng thái cũ, và cú chạm đầu tiên sau một lần vẽ quyết định
     * sai. Không thấy được bằng mắt: chỉ là "lần đầu vuốt thì nó pan thay vì kéo".
     *
     * Nên chỗ nào phải đúng-ngay thì nói ra. Vẫn dồn phần vẽ vào khung hình sau như cũ;
     * `immediate` chỉ bỏ phép chặn, không bỏ phép dồn.
     */
    handleMouseMove = (mouseXY, eventType, event, { immediate = false } = {}) => {
        if (this.#waitingForMouseMove && !immediate) return
        this.#waitingForMouseMove = true

        const { chartConfigs, plotData, xScale, xAccessor } = this.#state
        const currentCharts = getCurrentCharts(chartConfigs, mouseXY)
        const currentItem = getCurrentItem(xScale, xAccessor, mouseXY, plotData)

        this.triggerEvent(
            "mousemove",
            {
                show: true,
                mouseXY,
                prevMouseXY: this.#prevMouseXY,
                currentItem,
                currentCharts,
                // Thiết bị nào đang chạm vào chart. Bản gốc nhận `eventType` ở đây rồi không
                // dùng vào việc gì, nên không phần tử nào biết nó đang bị ngón tay trỏ vào —
                // mà phép dò trúng thì phải biết, vì ngón tay to hơn con trỏ. Xem `hitSlop`.
                inputType: eventType,
            },
            event,
        )

        this.#prevMouseXY = mouseXY
        this.#state = { ...this.#state, mouseXY, currentItem, currentCharts }

        requestAnimationFrame(() => {
            this.clearMouseCanvas()
            this.draw({ trigger: "mousemove" })
            this.#waitingForMouseMove = false
        })
    }

    handleMouseLeave = event => {
        this.triggerEvent("mouseleave", { show: false }, event)
        this.clearMouseCanvas()
        this.draw({ trigger: "mouseleave" })
    }

    handleDragStart = ({ startPos }, event) => {
        this.triggerEvent("dragstart", { startPos }, event)
    }

    handleDrag = ({ startPos, mouseXY }, event) => {
        const { chartConfigs, plotData, xScale, xAccessor } = this.#state

        const currentCharts = getCurrentCharts(chartConfigs, mouseXY)
        const currentItem = getCurrentItem(xScale, xAccessor, mouseXY, plotData)

        this.triggerEvent("drag", { startPos, mouseXY, currentItem, currentCharts }, event)

        this.#state = { ...this.#state, mouseXY, currentItem, currentCharts }

        requestAnimationFrame(() => {
            this.clearMouseCanvas()
            this.draw({ trigger: "drag" })
        })
    }

    handleDragEnd = ({ mouseXY }, event) => {
        this.triggerEvent("dragend", { mouseXY }, event)

        requestAnimationFrame(() => {
            this.clearMouseCanvas()
            this.draw({ trigger: "dragend" })
        })
    }

    handleClick = (mouseXY, event) => {
        this.triggerEvent("click", this.getMutableState(), event)

        requestAnimationFrame(() => {
            this.clearMouseCanvas()
            this.draw({ trigger: "click" })
        })
    }

    handleDoubleClick = (mouseXY, event) => {
        this.triggerEvent("dblclick", {}, event)
    }

    cancelDrag() {
        this.#eventCapture.cancelDrag()
        this.triggerEvent("dragcancel")
    }

    #pinchZoomHelper(initialPinch, finalPinch) {
        const { xScale: initialPinchXScale } = initialPinch
        const { xScale: initialXScale, chartConfigs, plotData: initialPlotData, xAccessor, displayXAccessor, filterData, fullData } =
            this.#state

        const { topLeft: iTL, bottomRight: iBR } = pinchCoordinates(initialPinch)
        const { topLeft: fTL, bottomRight: fBR } = pinchCoordinates(finalPinch)

        const e = initialPinchXScale.range()[1]

        const xDash = Math.round(-(iBR[0] * fTL[0] - iTL[0] * fBR[0]) / (iTL[0] - iBR[0]))
        const yDash = Math.round(
            e + ((e - iBR[0]) * (e - fTL[0]) - (e - iTL[0]) * (e - fBR[0])) / (e - iTL[0] - (e - iBR[0])),
        )

        const x = Math.round((-xDash * iTL[0]) / (-xDash + fTL[0]))
        const y = Math.round(e - ((yDash - e) * (e - iTL[0])) / (yDash + (e - fTL[0])))

        const newDomain = [x, y].map(initialPinchXScale.invert)

        const { plotData: beforePlotData, domain } = filterData(fullData, newDomain, xAccessor, initialPinchXScale)

        const plotData = this.#props.postCalculator(beforePlotData)
        const updatedScale = initialXScale.copy().domain(domain)
        const mouseXY = finalPinch.touch1Pos

        const updatedConfigs = getChartConfigWithUpdatedYScales(
            chartConfigs,
            { plotData, xAccessor, displayXAccessor, fullData },
            updatedScale.domain(),
        )

        return {
            chartConfigs: updatedConfigs,
            xScale: updatedScale,
            plotData,
            mouseXY,
            currentItem: getCurrentItem(updatedScale, xAccessor, mouseXY, plotData),
            xAccessor,
            fullData,
        }
    }

    handlePinchZoom = (initialPinch, finalPinch, event) => {
        if (this.#waitingForPinchZoom) return
        this.#waitingForPinchZoom = true

        this.triggerEvent("pinchzoom", this.#pinchZoomHelper(initialPinch, finalPinch), event)
        this.#finalPinch = finalPinch

        requestAnimationFrame(() => {
            this.clearBothCanvas()
            this.draw({ trigger: "pinchzoom" })
            this.#waitingForPinchZoom = false
        })
    }

    handlePinchZoomEnd = (initialPinch, event) => {
        if (!this.#finalPinch) return

        const state = this.#pinchZoomHelper(initialPinch, this.#finalPinch)
        this.triggerEvent("pinchzoom", state, event)
        this.#finalPinch = undefined

        this.clearThreeCanvas()
        this.setState({ xScale: state.xScale, plotData: state.plotData, chartConfigs: state.chartConfigs })
        this.#reportEdges(state.xScale)
    }
}

define("chart-canvas", ChartCanvas)
