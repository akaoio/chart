import { findContextEventually } from "./context.js"
import { identity } from "./utils/index.js"

const SVG = "http://www.w3.org/2000/svg"

/**
 * Events that should wake a component listening for something else.
 *
 * A crosshair asks to be redrawn on `mousemove`; it also needs redrawing when the mouse
 * leaves, when a pan ends, when a click lands. Rather than have every component list all
 * of those, near-synonyms fold into the one event that matters.
 */
const ALIASES = {
    mouseleave: "mousemove", // so interactive pieces redraw after the pointer exits
    panend: "pan",
    pinchzoom: "pan",
    mousedown: "mousemove",
    click: "mousemove",
    contextmenu: "mousemove",
    dblclick: "mousemove",
    dragstart: "drag",
    dragend: "drag",
    dragcancel: "drag",
    zoom: "zoom",
}

/**
 * Base class for everything that draws: `class LineSeries extends GenericComponent`.
 *
 * A subclass says what it draws (`canvasDraw` or `svgDraw`), which canvas to draw on
 * (`canvasToDraw`), and which events should make it redraw (`drawOn`). Everything else —
 * finding the chart, subscribing, receiving events, cleaning up — happens here.
 *
 * This is the contract the whole library is built on. Ports of the ~38 leaf components
 * in later stages are mostly a matter of moving the original's `canvasDraw` body across
 * unchanged; the machinery it plugs into is this class.
 */
export class GenericComponent extends HTMLElement {
    #canvas = null
    #cancelFind = () => {}
    #subscriberId = null
    #svgGroup = null

    #dragInProgress = false
    #evaluationInProgress = false
    #iSetTheCursorClass = false

    /** Live values from the chart, plus whatever the last event carried. */
    moreProps = {}

    // ── what subclasses override ──────────────────────────────────────────────────

    /** Events that trigger a redraw. */
    get drawOn() {
        return []
    }

    /** Draw to canvas. Leave undefined for an SVG component. */
    canvasDraw(context, moreProps) {}

    /** Which of the three canvases. Default is the topmost, cleared every mouse move. */
    canvasToDraw(contexts) {
        return contexts.mouseCoord
    }

    /** Return SVG nodes to place in the chart. Leave undefined for a canvas component. */
    svgDraw(moreProps) {
        return null
    }

    get usesCanvas() {
        return this.constructor.prototype.canvasDraw !== GenericComponent.prototype.canvasDraw
    }

    get usesSvg() {
        return this.constructor.prototype.svgDraw !== GenericComponent.prototype.svgDraw
    }

    get clip() {
        return true
    }

    get edgeClip() {
        return false
    }

    get selected() {
        return false
    }

    get disablePan() {
        return false
    }

    get enableDragOnHover() {
        return false
    }

    get interactiveCursorClass() {
        return undefined
    }

    /** Is the pointer over this component? Interactive components override this. */
    isHoverTest(moreProps, event) {
        return false
    }

    // ── lifecycle ─────────────────────────────────────────────────────────────────

    connectedCallback() {
        this.style.display = "none"

        this.#cancelFind = findContextEventually(this, "canvas", canvas => {
            this.#canvas = canvas
            this.#subscriberId = canvas.generateSubscriptionId()

            canvas.subscribe(this.#subscriberId, {
                chartId: this.chartId,
                clip: this.clip,
                edgeClip: this.edgeClip,
                listener: this.listener,
                draw: this.draw,
                getPanConditions: this.getPanConditions,
            })

            this.refreshFromContext()
            this.draw({ force: true })
        })
    }

    disconnectedCallback() {
        this.#cancelFind()

        if (this.#subscriberId !== null) {
            this.#canvas?.unsubscribe(this.#subscriberId)
            if (this.#iSetTheCursorClass) this.#canvas?.setCursorClass(null)
        }

        this.#svgGroup?.remove()
        this.#svgGroup = null
        this.#subscriberId = null
        this.#canvas = null
    }

    get canvas() {
        return this.#canvas
    }

    get chartId() {
        return undefined
    }

    get context() {
        return this.#canvas?.contextValues
    }

    /** Pull the current chart values in, keeping anything events have added. */
    refreshFromContext() {
        const canvas = this.#canvas
        if (!canvas) return

        const { xScale, plotData, chartConfigs } = canvas.contextValues

        this.moreProps = {
            ...this.moreProps,
            ...canvas.getMutableState(),
            xScale,
            plotData,
            chartConfig: chartConfigs,
        }
    }

    updateMoreProps(moreProps) {
        Object.assign(this.moreProps, moreProps)
    }

    getMoreProps() {
        const context = this.#canvas?.contextValues ?? {}

        return {
            xScale: context.xScale,
            plotData: context.plotData,
            chartConfigs: context.chartConfigs,
            xAccessor: context.xAccessor,
            displayXAccessor: context.displayXAccessor,
            width: context.width,
            height: context.height,
            chartId: this.chartId,
            fullData: context.fullData,
            ...this.moreProps,
        }
    }

    // ── the subscription contract ─────────────────────────────────────────────────

    listener = (type, moreProps, state, event) => {
        if (moreProps !== undefined) this.updateMoreProps(moreProps)

        this.#evaluationInProgress = true
        this.evaluateType(type, event)
        this.#evaluationInProgress = false
    }

    /** Called before an event is acted on; subclasses may filter it out. */
    shouldTypeProceed(type, moreProps) {
        return true
    }

    preEvaluate(type, moreProps, event) {}

    evaluateType(type, event) {
        const resolved = ALIASES[type] || type
        if (this.drawOn.indexOf(resolved) === -1) return

        this.preEvaluate(type, this.moreProps, event)
        if (!this.shouldTypeProceed(type, this.moreProps)) return

        switch (type) {
            case "zoom":
            case "mouseenter":
                // deliberately no redraw for these
                break

            case "mouseleave":
                this.moreProps.hovering = false
                this.onUnHover?.(event, this.getMoreProps())
                break

            case "contextmenu":
                this.onContextMenu?.(event, this.getMoreProps())
                if (this.moreProps.hovering) this.onContextMenuWhenHover?.(event, this.getMoreProps())
                break

            case "mousedown":
                this.onMouseDown?.(event, this.getMoreProps())
                break

            case "click": {
                const moreProps = this.getMoreProps()
                if (moreProps.hovering) this.onClickWhenHover?.(event, moreProps)
                else this.onClickOutside?.(event, moreProps)

                this.onClick?.(event, moreProps)
                break
            }

            case "mousemove": {
                const previouslyHovering = this.moreProps.hovering
                this.moreProps.hovering = this.isHover(event)

                this.#updateCursor(previouslyHovering)

                const moreProps = this.getMoreProps()

                if (this.moreProps.hovering && !previouslyHovering) this.onHover?.(event, moreProps)
                if (previouslyHovering && !this.moreProps.hovering) this.onUnHover?.(event, moreProps)

                this.onMouseMove?.(event, moreProps)
                break
            }

            case "dblclick": {
                const moreProps = this.getMoreProps()
                this.onDoubleClick?.(event, moreProps)
                if (this.moreProps.hovering) this.onDoubleClickWhenHover?.(event, moreProps)
                break
            }

            case "pan":
                this.moreProps.hovering = false
                this.onPan?.(event, this.getMoreProps())
                break

            case "panend":
                this.onPanEnd?.(event, this.getMoreProps())
                break

            case "dragstart":
                if (this.getPanConditions().draggable && this.#canvas?.amIOnTop(this.#subscriberId)) {
                    this.#dragInProgress = true
                    this.onDragStart?.(event, this.getMoreProps())
                }
                break

            case "drag":
                if (this.#dragInProgress) this.onDrag?.(event, this.getMoreProps())
                break

            case "dragend":
                if (this.#dragInProgress) this.onDragComplete?.(event, this.getMoreProps())
                this.#dragInProgress = false
                break

            case "dragcancel":
                if (this.#dragInProgress || this.#iSetTheCursorClass) this.#canvas?.setCursorClass(null)
                break
        }
    }

    /**
     * Only the topmost hovered component gets to set the cursor, and it must put it back
     * when the pointer leaves — otherwise a chart ends up stuck showing a move cursor
     * over empty space.
     */
    #updateCursor(previouslyHovering) {
        const canvas = this.#canvas
        if (!canvas) return

        const hovering = this.moreProps.hovering
        const onTop = canvas.amIOnTop(this.#subscriberId)

        if (hovering && !this.selected && onTop && this.onHover !== undefined) {
            canvas.setCursorClass("chart-pointer-cursor")
            this.#iSetTheCursorClass = true
        } else if (hovering && this.selected && onTop) {
            canvas.setCursorClass(this.interactiveCursorClass)
            this.#iSetTheCursorClass = true
        } else if (previouslyHovering && !hovering && this.#iSetTheCursorClass) {
            this.#iSetTheCursorClass = false
            canvas.setCursorClass(null)
        }
    }

    isHover(event) {
        return this.isHoverTest(this.getMoreProps(), event)
    }

    getPanConditions = () => ({
        draggable: !!(this.selected && this.moreProps.hovering) || !!(this.enableDragOnHover && this.moreProps.hovering),
        panEnabled: !this.disablePan,
    })

    draw = ({ trigger, force = false } = {}) => {
        const type = ALIASES[trigger] || trigger
        const shouldDraw = this.drawOn.indexOf(type) > -1 || this.selected || force
        if (!shouldDraw) return

        // A forced draw follows a state change, so the chart's values have moved on and
        // have to be picked up again. During an interaction they arrive with the event
        // instead, already applied by the listener.
        if (force) this.refreshFromContext()

        if (this.usesCanvas) this.drawOnCanvas()
        else this.drawOnSvg()
    }

    preCanvasDraw(context, moreProps) {}

    postCanvasDraw(context, moreProps) {}

    drawOnCanvas() {
        const canvas = this.#canvas
        if (!canvas) return

        const contexts = canvas.getCanvasContexts()
        const context = this.canvasToDraw(contexts)
        if (context === undefined) return

        const moreProps = this.getMoreProps()

        this.preCanvasDraw(context, moreProps)
        this.canvasDraw(context, moreProps)
        this.postCanvasDraw(context, moreProps)
    }

    /** SVG components own one `<g>` inside the chart's surface and refill it on redraw. */
    drawOnSvg() {
        if (!this.usesSvg) return

        const parent = this.svgParent()
        if (parent === null) return

        if (this.#svgGroup === null) {
            this.#svgGroup = document.createElementNS(SVG, "g")
        }
        if (this.#svgGroup.parentNode !== parent) parent.append(this.#svgGroup)

        const suffix = this.chartId !== undefined ? `-${this.chartId}` : ""
        this.#svgGroup.style.clipPath = this.clip ? `url(#chart-area-clip${suffix})` : ""

        this.#svgGroup.textContent = ""
        const content = this.svgDraw(this.getMoreProps())
        if (content) this.#svgGroup.append(...(Array.isArray(content) ? content : [content]))
    }

    /** Where SVG output goes. A pane-bound component overrides this with its pane's group. */
    svgParent() {
        return this.#canvas?.paneGroup(this.chartId) ?? null
    }
}

export const getAxisCanvas = contexts => contexts.axes
export const getMouseCanvas = contexts => contexts.mouseCoord
export const getBackgroundCanvas = contexts => contexts.bg

/** Exported for tests and for components that need to reason about event folding. */
export const eventAliases = ALIASES
