import { findContextEventually } from "./context.js"
import { ElementBase } from "./element.js"
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
export class GenericComponent extends ElementBase {
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

            // Only draw once the chart knows what it is showing. Usually it does not yet:
            // children connect before the canvas has computed anything, and its own first
            // pass will call this component moments later. Drawing regardless would hand
            // every series an empty chartConfig — which the original series do not expect
            // and do not survive.
            //
            // Và đợi hết microtask rồi mới vẽ, cùng lý do với lần vẽ lại khi đổi property:
            // gắn vào cây xong mới đặt property là cách viết DOM tự nhiên, mà `append` gọi
            // connectedCallback ngay tức khắc — vẽ ngay tại đó là vẽ một phần tử chưa cấu
            // hình xong, rồi nổ ở chỗ hàm vẽ đọc phải một prop chưa ai đặt.
            if (canvas.getState() !== null) {
                queueMicrotask(() => {
                    if (!this.isConnected || canvas.getState() === null) return
                    this.refreshFromContext()
                    this.draw({ force: true })
                })
            }
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
            chartConfigs,
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

    /**
     * Find an event hook, ignoring same-named element properties.
     *
     * A component may take a `onClick` property *and* override the `onClick` hook — and
     * a property defined on the instance shadows a method on the prototype, so a plain
     * `this.onClick` would silently call the property instead of the override. Looking
     * the hook up on the prototype chain keeps the two apart: properties are data the
     * component reads, hooks are behaviour the framework calls.
     */
    #hook(name) {
        let prototype = Object.getPrototypeOf(this)

        while (prototype !== null) {
            const descriptor = Object.getOwnPropertyDescriptor(prototype, name)
            if (descriptor !== undefined) return typeof descriptor.value === "function" ? descriptor.value : undefined

            prototype = Object.getPrototypeOf(prototype)
        }

        return undefined
    }

    #call(name, ...args) {
        this.#hook(name)?.apply(this, args)
    }

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
                this.#call("onUnHover", event, this.getMoreProps())
                break

            case "contextmenu":
                this.#call("onContextMenu", event, this.getMoreProps())
                if (this.moreProps.hovering) this.#call("onContextMenuWhenHover", event, this.getMoreProps())
                break

            case "mousedown":
                this.#call("onMouseDown", event, this.getMoreProps())
                break

            case "click": {
                const moreProps = this.getMoreProps()
                if (moreProps.hovering) this.#call("onClickWhenHover", event, moreProps)
                else this.#call("onClickOutside", event, moreProps)

                this.#call("onClick", event, moreProps)
                break
            }

            case "mousemove": {
                const previouslyHovering = this.moreProps.hovering
                this.moreProps.hovering = this.isHover(event)

                this.#updateCursor(previouslyHovering)

                const moreProps = this.getMoreProps()

                if (this.moreProps.hovering && !previouslyHovering) this.#call("onHover", event, moreProps)
                if (previouslyHovering && !this.moreProps.hovering) this.#call("onUnHover", event, moreProps)

                this.#call("onMouseMove", event, moreProps)
                break
            }

            case "dblclick": {
                const moreProps = this.getMoreProps()
                this.#call("onDoubleClick", event, moreProps)
                if (this.moreProps.hovering) this.#call("onDoubleClickWhenHover", event, moreProps)
                break
            }

            case "pan":
                this.moreProps.hovering = false
                this.#call("onPan", event, this.getMoreProps())
                break

            case "panend":
                this.#call("onPanEnd", event, this.getMoreProps())
                break

            case "dragstart":
                if (this.getPanConditions().draggable && this.#canvas?.amIOnTop(this.#subscriberId)) {
                    this.#dragInProgress = true
                    this.#call("onDragStart", event, this.getMoreProps())
                }
                break

            case "drag":
                if (this.#dragInProgress) this.#call("onDrag", event, this.getMoreProps())
                break

            case "dragend":
                if (this.#dragInProgress) this.#call("onDragComplete", event, this.getMoreProps())
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

        if (hovering && !this.selected && onTop && this.#hook("onHover") !== undefined) {
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
        if (content) this.#svgGroup.append(...buildSvg(content))
    }

    /** Where SVG output goes. A pane-bound component overrides this with its pane's group. */
    svgParent() {
        return this.#canvas?.paneGroup(this.chartId) ?? null
    }
}

/**
 * Turn an SVG description into real nodes.
 *
 * SVG components return `{ tag, attrs, children }` rather than elements, for the same
 * reason series return drawing functions: a description can be produced and checked
 * outside a browser, and the element is then a thin shell around it.
 *
 * The names in those descriptions are React's — `className`, `strokeWidth`, `fontSize` —
 * because that is what the original wrote and the port keeps its shape. SVG attributes
 * are `class`, `stroke-width`, `font-size`, so the names are translated here, on the way
 * into the document. Setting them verbatim does not fail loudly: the browser stores an
 * attribute nobody reads, and the element simply renders unstyled.
 */

/** Names that are camelCase in SVG too, and must survive untouched. */
const KEEP_AS_IS = new Set(["viewBox", "preserveAspectRatio", "textLength", "lengthAdjust", "gradientTransform"])

export const attributeName = name => {
    if (name === "className") return "class"
    if (KEEP_AS_IS.has(name)) return name
    return name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)
}

export const buildSvg = description => {
    if (description === null || description === undefined || description === false) return []
    if (Array.isArray(description)) return description.flatMap(buildSvg)

    if (typeof description === "string" || typeof description === "number") {
        return [document.createTextNode(String(description))]
    }

    if (description instanceof Node) return [description]

    const node = document.createElementNS(SVG, description.tag)

    for (const [name, value] of Object.entries(description.attrs ?? {})) {
        if (value === undefined || value === null || value === false) continue
        if (typeof value === "function") {
            node.addEventListener(name.replace(/^on/, "").toLowerCase(), value)
            continue
        }
        node.setAttribute(attributeName(name), String(value))
    }

    node.append(...buildSvg(description.children ?? []))

    return [node]
}

export const getAxisCanvas = contexts => contexts.axes
export const getMouseCanvas = contexts => contexts.mouseCoord
export const getBackgroundCanvas = contexts => contexts.bg

/** Exported for tests and for components that need to reason about event folding. */
