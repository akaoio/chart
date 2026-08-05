import { getCurrentCharts } from "./utils/ChartDataUtil.js"
import { getTouchProps, mousePosition, pointerPosition, pointersPosition, touchPosition } from "./utils/dom.js"

/**
 * One invisible rectangle over the whole chart, turning raw pointer events into the
 * chart's own vocabulary: pan, drag, zoom, pinch, hover.
 *
 * ## Why listeners go on `window`, not on the rectangle
 *
 * Once a drag begins the pointer belongs to the gesture, not to whatever it happens to
 * be over. Someone panning fast will leave the chart, and the pan has to keep working
 * and has to end on mouse-up wherever that lands. So a gesture starts on the rectangle
 * and continues on `window`, exactly as the original does.
 *
 * ## Removing listeners in groups, without d3
 *
 * The original leans on a d3 feature with no platform equivalent: namespaced events.
 * `select(window).on("mousemove.pan", handler)` can later be undone with
 * `.on("mousemove.pan", null)` — by name, removing that one handler and disturbing no
 * other `mousemove` listener, without holding on to the function reference.
 *
 * `removeEventListener` needs the exact same function, so reproducing that by hand means
 * storing every handler and remembering to match them up. `AbortSignal` says the same
 * thing more directly: every listener of a gesture shares one controller, and aborting
 * it drops all of them at once. It cannot get out of step, because there is nothing to
 * keep in step — and `disconnectedCallback` aborting the lot means a chart removed
 * mid-drag leaves nothing behind on `window`.
 */
export class EventCapture {
    #element
    #owner

    // one controller per gesture — abort() is the whole teardown
    #gesture = null

    #focus = false
    #mouseInside = false
    #mouseInteraction = true
    #clicked = false
    #dragHappened = false
    #panHappened = false
    #panEndTimeout
    #lastNewPos
    #dx = 0
    #dy = 0

    #panInProgress = false
    #dragInProgress = false
    #panStart
    #dragStartPosition
    #pinchZoomStart
    #cursorOverrideClass

    /** `owner` supplies live props and the handlers, the way React passed them down. */
    constructor(owner) {
        this.#owner = owner

        this.#element = document.createElementNS("http://www.w3.org/2000/svg", "rect")
        this.#element.style.opacity = 0

        // A finger on the chart is there to drag the chart and to pinch the chart — not
        // to scroll or zoom the page. Say so, or the browser claims both gestures for
        // itself and the chart's own `touchmove` never runs.
        this.#element.style.touchAction = "none"

        // The class attribute carries the cursor and gets rewritten, so identity lives
        // on a separate attribute that nothing overwrites.
        this.#element.setAttribute("data-event-capture", "")
    }

    get element() {
        return this.#element
    }

    get panInProgress() {
        return this.#panInProgress
    }

    #props() {
        return this.#owner.eventCaptureProps
    }

    /** Begin a gesture: any listener added with this signal dies when the gesture ends. */
    #startGesture() {
        this.#gesture?.abort()
        this.#gesture = new AbortController()
        return this.#gesture.signal
    }

    #endGesture() {
        this.#gesture?.abort()
        this.#gesture = null

        // Hover tracking is not part of any gesture, so it has to come back afterwards
        if (this.#mouseInside) this.#trackHover()
    }

    #trackHover() {
        this.#hover?.abort()
        this.#hover = new AbortController()
        window.addEventListener("mousemove", this.#handleMouseMove, { signal: this.#hover.signal })
    }

    #hover = null

    connect() {
        const { disableInteraction } = this.#props()
        if (disableInteraction) return

        this.#lifetime = new AbortController()
        const { signal } = this.#lifetime

        this.#element.addEventListener("mouseenter", this.#handleEnter, { signal })
        this.#element.addEventListener("mouseleave", this.#handleLeave, { signal })
        this.#element.addEventListener("wheel", this.#handleWheel, { passive: false, signal })
        this.#element.addEventListener("mousedown", this.#handleMouseDown, { signal })
        this.#element.addEventListener("click", this.#handleClick, { signal })
        this.#element.addEventListener("contextmenu", this.#handleRightClick, { signal })
        this.#element.addEventListener("touchstart", this.#handleTouchStart, { signal })
        this.#element.addEventListener("touchmove", this.#handleTouchMove, { signal })
    }

    #lifetime = null

    /** Everything this ever attached, anywhere, goes away here. */
    disconnect() {
        this.#lifetime?.abort()
        this.#hover?.abort()
        this.#gesture?.abort()
        this.#lifetime = this.#hover = this.#gesture = null
        window.clearTimeout(this.#panEndTimeout)
    }

    resize(width, height) {
        this.#element.setAttribute("width", Math.max(0, width))
        this.#element.setAttribute("height", Math.max(0, height))
    }

    setCursorClass(cursorOverrideClass) {
        if (cursorOverrideClass === this.#cursorOverrideClass) return

        this.#cursorOverrideClass = cursorOverrideClass ?? undefined
        this.#applyCursor()
    }

    #applyCursor() {
        const { disableInteraction, useCrossHairStyleCursor } = this.#props()

        const className = disableInteraction
            ? undefined
            : this.#cursorOverrideClass !== undefined
              ? this.#cursorOverrideClass
              : !useCrossHairStyleCursor
                ? undefined
                : this.#panInProgress
                  ? "chart-grabbing-cursor"
                  : "chart-crosshair-cursor"

        this.#element.setAttribute("class", className ?? "")
    }

    #handleEnter = event => {
        const { onMouseEnter } = this.#props()
        if (onMouseEnter === undefined) return

        this.#mouseInside = true
        if (!this.#panInProgress && !this.#dragInProgress) this.#trackHover()

        onMouseEnter(event)
    }

    #handleLeave = event => {
        const { onMouseLeave } = this.#props()
        if (onMouseLeave === undefined) return

        this.#mouseInside = false
        if (!this.#panInProgress && !this.#dragInProgress) this.#hover?.abort()

        onMouseLeave(event)
    }

    /**
     * A wheel means zoom when it is mostly vertical, and pan otherwise — which is how a
     * trackpad's two-finger swipe becomes a pan without any gesture recognition.
     *
     * Wheel panning has no natural end, so a timer declares one 100ms after the last
     * tick. That is the original's approach and it is kept.
     */
    #handleWheel = event => {
        const { pan, onPan, zoom, onZoom } = this.#props()
        if (!pan && !zoom) return

        const yZoom = Math.abs(event.deltaY) > Math.abs(event.deltaX) && Math.abs(event.deltaY) > 0
        const mouseXY = mousePosition(event)
        event.preventDefault()

        if (zoom && this.#focus && yZoom && !this.#panInProgress) {
            onZoom?.(event.deltaY > 0 ? 1 : -1, mouseXY, event)
        } else if (this.#focus) {
            if (this.#shouldPan() && this.#panStart !== undefined) {
                const { panStartXScale, chartsToPan } = this.#panStart
                this.#lastNewPos = mouseXY
                this.#panHappened = true

                this.#dx -= event.deltaX
                this.#dy += event.deltaY

                onPan?.(mouseXY, panStartXScale, { dx: this.#dx, dy: this.#dy }, chartsToPan, event)
            } else {
                const { xScale, chartConfig } = this.#props()

                this.#dx = 0
                this.#dy = 0
                this.#panInProgress = true
                this.#panStart = {
                    panStartXScale: xScale,
                    panOrigin: mouseXY,
                    chartsToPan: getCurrentCharts(chartConfig, mouseXY),
                }
                this.#applyCursor()
            }
            this.#queuePanEnd(event)
        }
    }

    #queuePanEnd(event) {
        window.clearTimeout(this.#panEndTimeout)
        this.#panEndTimeout = window.setTimeout(() => this.#handlePanEnd(event), 100)
    }

    #handleMouseMove = event => {
        const { onMouseMove, mouseMove } = this.#props()
        if (onMouseMove === undefined) return

        if (this.#mouseInteraction && mouseMove && !this.#panInProgress) {
            onMouseMove(pointerPosition(event, this.#element), "mouse", event)
        }
    }

    /**
     * A second click within 400ms is a double click. Neither fires if the pointer was
     * panning or dragging — otherwise letting go of a pan would register as a click.
     */
    #handleClick = event => {
        const mouseXY = mousePosition(event)
        const { onClick, onDoubleClick } = this.#props()

        if (this.#panHappened || this.#dragHappened) return

        if (this.#clicked && onDoubleClick !== undefined) {
            onDoubleClick(mouseXY, event)
            this.#clicked = false
        } else if (onClick !== undefined) {
            onClick(mouseXY, event)
            this.#clicked = true
            setTimeout(() => {
                this.#clicked = false
            }, 400)
        }
    }

    #handleRightClick = event => {
        event.stopPropagation()
        event.preventDefault()

        const { onContextMenu, onPanEnd } = this.#props()
        const mouseXY = mousePosition(event, this.#element.getBoundingClientRect())

        if (this.#panStart !== undefined) {
            const { panStartXScale, panOrigin, chartsToPan } = this.#panStart

            if (this.#panHappened && onPanEnd !== undefined) {
                onPanEnd(mouseXY, panStartXScale, { dx: panOrigin[0], dy: panOrigin[1] }, chartsToPan, event)
            }

            this.#endGesture()
            this.#panInProgress = false
            this.#panStart = undefined
            this.#applyCursor()
        }

        onContextMenu?.(mouseXY, event)
    }

    #handleDrag = event => {
        const { onDrag } = this.#props()
        if (onDrag === undefined || this.#dragStartPosition === undefined) return

        this.#dragHappened = true
        onDrag({ startPos: this.#dragStartPosition, mouseXY: pointerPosition(event, this.#element) }, event)
    }

    cancelDrag() {
        this.#endGesture()
        this.#dragInProgress = false
        this.#mouseInteraction = true
    }

    #handleDragEnd = event => {
        const mouseXY = pointerPosition(event, this.#element)
        this.#endGesture()

        if (this.#dragHappened) this.#props().onDragComplete?.({ mouseXY }, event)

        this.#dragInProgress = false
        this.#mouseInteraction = true
    }

    /**
     * Pan only if nothing objects and nothing is selected.
     *
     * Every subscriber gets a say: panning needs unanimous consent, while a single
     * draggable component is enough to claim the gesture as a drag instead. That is how
     * dragging a trendline moves the line rather than the whole chart.
     */
    #canPan() {
        const { getAllPanConditions, pan: initialPanEnabled } = this.#props()

        return getAllPanConditions().reduce(
            (result, condition) => ({
                draggable: result.draggable || condition.draggable,
                panEnabled: result.panEnabled && condition.panEnabled,
            }),
            { draggable: false, panEnabled: initialPanEnabled },
        )
    }

    #handleMouseDown = event => {
        if (event.button !== 0) return

        const { xScale, chartConfig, onMouseDown, onDragStart } = this.#props()

        this.#panHappened = false
        this.#dragHappened = false
        this.#focus = true

        if (!this.#panInProgress && this.#mouseInteraction) {
            const mouseXY = mousePosition(event)
            const currentCharts = getCurrentCharts(chartConfig, mouseXY)
            const { panEnabled, draggable: somethingSelected } = this.#canPan()

            if (panEnabled && !somethingSelected) {
                this.#panInProgress = true
                this.#panStart = { panStartXScale: xScale, panOrigin: mouseXY, chartsToPan: currentCharts }
                this.#applyCursor()

                const signal = this.#startGesture()
                window.addEventListener("mousemove", this.#handlePan, { signal })
                window.addEventListener("mouseup", this.#handlePanEnd, { signal })
            } else if (somethingSelected) {
                this.#panInProgress = false
                this.#dragInProgress = true
                this.#panStart = undefined
                this.#dragStartPosition = mouseXY

                onDragStart?.({ startPos: mouseXY }, event)

                const signal = this.#startGesture()
                window.addEventListener("mousemove", this.#handleDrag, { signal })
                window.addEventListener("mouseup", this.#handleDragEnd, { signal })
            }

            onMouseDown?.(mouseXY, currentCharts, event)
        }

        event.preventDefault()
    }

    #shouldPan() {
        const { pan, onPan } = this.#props()
        return pan && onPan && this.#panStart !== undefined
    }

    #handlePan = event => {
        if (!this.#shouldPan() || this.#panStart === undefined) return

        this.#panHappened = true
        const { panStartXScale, panOrigin, chartsToPan } = this.#panStart

        let mouseXY
        let dx
        let dy

        if (this.#mouseInteraction) {
            mouseXY = pointerPosition(event, this.#element)
            dx = mouseXY[0] - panOrigin[0]
            dy = mouseXY[1] - panOrigin[1]
        } else {
            // Touch reports the opposite sign: the content follows the finger
            mouseXY = pointersPosition(event, this.#element)[0]
            dx = panOrigin[0] - mouseXY[0]
            dy = panOrigin[1] - mouseXY[1]
        }

        this.#lastNewPos = mouseXY
        this.#dx = dx
        this.#dy = dy

        this.#props().onPan?.(mouseXY, panStartXScale, { dx, dy }, chartsToPan, event)
    }

    #handlePanEnd = event => {
        const { pan: panEnabled, onPanEnd } = this.#props()
        if (this.#panStart === undefined) return

        const { panStartXScale, chartsToPan } = this.#panStart
        this.#endGesture()

        if (this.#panHappened && panEnabled && onPanEnd && this.#lastNewPos !== undefined) {
            onPanEnd(this.#lastNewPos, panStartXScale, { dx: this.#dx, dy: this.#dy }, chartsToPan, event)
        }

        this.#dx = 0
        this.#dy = 0
        this.#panInProgress = false
        this.#panStart = undefined
        this.#applyCursor()
    }

    #handleTouchMove = event => {
        const { onMouseMove } = this.#props()
        if (onMouseMove === undefined) return

        onMouseMove(touchPosition(getTouchProps(event.touches[0]), event), "touch", event)
    }

    #handleTouchStart = event => {
        this.#mouseInteraction = false

        const { pan: panEnabled, chartConfig, onMouseMove, xScale, onPanEnd } = this.#props()

        if (event.touches.length === 1) {
            this.#panHappened = false
            const touchXY = touchPosition(getTouchProps(event.touches[0]), event)
            onMouseMove?.(touchXY, "touch", event)

            if (panEnabled) {
                this.#panInProgress = true
                this.#panStart = {
                    panStartXScale: xScale,
                    panOrigin: touchXY,
                    chartsToPan: getCurrentCharts(chartConfig, touchXY),
                }

                const signal = this.#startGesture()
                window.addEventListener("touchmove", this.#handlePan, { signal })
                window.addEventListener("touchend", this.#handlePanEnd, { signal })
                window.addEventListener("touchcancel", this.#handlePanEnd, { signal })
            }
        } else if (event.touches.length === 2) {
            // A second finger turns a pan into a pinch: end the pan, start the zoom
            if (this.#panInProgress && panEnabled && onPanEnd && this.#panStart !== undefined) {
                const { panStartXScale, panOrigin, chartsToPan } = this.#panStart

                const signal = this.#startGesture()
                window.addEventListener("touchmove", this.#handlePinchZoom, { signal })
                window.addEventListener("touchend", this.#handlePinchZoomEnd, { signal })
                window.addEventListener("touchcancel", this.#handlePinchZoomEnd, { signal })

                const touch1Pos = touchPosition(getTouchProps(event.touches[0]), event)
                const touch2Pos = touchPosition(getTouchProps(event.touches[1]), event)

                if (this.#panHappened && this.#lastNewPos !== undefined) {
                    onPanEnd(
                        this.#lastNewPos,
                        panStartXScale,
                        { dx: panOrigin[0], dy: panOrigin[1] },
                        chartsToPan,
                        event,
                    )
                }

                this.#panInProgress = false
                this.#pinchZoomStart = {
                    xScale,
                    touch1Pos,
                    touch2Pos,
                    range: xScale.range(),
                    chartsToPan,
                }
            }
        }
    }

    #handlePinchZoom = event => {
        if (this.#pinchZoomStart === undefined) return

        const { xScale, zoom: zoomEnabled, onPinchZoom } = this.#props()
        if (!zoomEnabled || onPinchZoom === undefined) return

        const [touch1Pos, touch2Pos] = pointersPosition(event, this.#element)
        const { chartsToPan, ...initialPinch } = this.#pinchZoomStart

        onPinchZoom(initialPinch, { touch1Pos, touch2Pos, xScale }, event)
    }

    #handlePinchZoomEnd = event => {
        this.#endGesture()
        if (this.#pinchZoomStart === undefined) return

        const { chartsToPan, ...initialPinch } = this.#pinchZoomStart
        const { zoom: zoomEnabled, onPinchZoomEnd } = this.#props()

        if (zoomEnabled && onPinchZoomEnd) onPinchZoomEnd(initialPinch, event)

        this.#pinchZoomStart = undefined
    }
}
