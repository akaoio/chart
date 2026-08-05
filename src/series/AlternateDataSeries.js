import { findContextEventually, serveContext } from "../core/context.js"
import { define, ElementBase } from "../core/element.js"

/**
 * Draw children from a different dataset than the rest of the chart: `<chart-alternate-data>`.
 *
 * Used when one series has its own history — a benchmark, a second instrument, a
 * forecast — that does not line up row for row with the chart's data. The children see
 * the alternate rows narrowed to the window currently on screen, so they pan and zoom
 * with everything else.
 *
 * It works by standing in front of the chart: it answers the `"canvas"` context request
 * itself and forwards everything to the real chart except `plotData`. Children cannot
 * tell the difference, which is exactly the point — no series needs to know it is being
 * fed something else.
 */
export class AlternateDataSeries extends ElementBase {
    #canvas = null
    #cancelFind = () => {}
    #data = []

    get data() {
        return this.#data
    }

    set data(rows) {
        this.#data = rows ?? []
        this.#canvas?.redraw()
    }

    connectedCallback() {
        this.style.display = "none"

        // Serve "canvas" before looking for one, so children asking upward stop here
        serveContext(this, "canvas")

        this.#cancelFind = findContextEventually(this, "canvas", canvas => {
            this.#canvas = canvas
        })
    }

    disconnectedCallback() {
        this.#cancelFind()
        this.#canvas = null
    }

    /** Our rows inside the window that `plotData` of the chart's spans. */
    #narrow(plotData, xAccessor) {
        if (!plotData?.length || !xAccessor) return []

        const start = xAccessor(plotData[0])
        const end = xAccessor(plotData[plotData.length - 1])

        return this.#data.filter(datum => {
            const at = xAccessor(datum)
            return at > start && at < end
        })
    }

    /** Only the rows falling inside the window the chart is showing. */
    get contextValues() {
        const values = this.#canvas?.contextValues
        if (!values) return values

        return { ...values, plotData: this.#narrow(values.plotData, values.xAccessor) }
    }

    /**
     * Stand in front of the chart for events too, not just for context.
     *
     * Pan and zoom are the hot path: nothing re-renders, the chart computes a new state and
     * hands it straight to every subscriber — and that state carries the chart's own
     * `plotData`. A component keeps what it was handed and lets it outrank its context, so
     * a child of ours would spend the whole drag drawing the host's rows and snap back to
     * the guest's on release. Visibly: a sparse guest line welds itself to the candles the
     * moment you touch them.
     *
     * The original has this too — its `getMoreProps` spreads `this.moreProps` last just the
     * same. Not kept: which dataset a series draws is the one thing this element is for, and
     * there is no reading under which "the host's, but only while the mouse is down" is it.
     */
    subscribe(id, rest) {
        const { listener } = rest

        this.#canvas?.subscribe(id, {
            ...rest,
            listener:
                listener === undefined
                    ? undefined
                    : (type, props, state, event) => listener(type, this.#rewrite(props), state, event),
        })
    }

    /** Any broadcast carrying `plotData` gets the guest's rows in its place. */
    #rewrite(props) {
        if (props?.plotData === undefined) return props

        return { ...props, plotData: this.#narrow(props.plotData, this.#canvas?.contextValues?.xAccessor) }
    }

    // Everything else is the real chart's job
    getState() {
        return this.#canvas?.getState() ?? null
    }
    getMutableState() {
        return this.#canvas?.getMutableState() ?? { mouseXY: [0, 0], currentItem: null, currentCharts: [] }
    }
    getCanvasContexts() {
        return this.#canvas?.getCanvasContexts() ?? {}
    }
    generateSubscriptionId() {
        return this.#canvas?.generateSubscriptionId()
    }
    unsubscribe(id) {
        this.#canvas?.unsubscribe(id)
    }
    amIOnTop(id) {
        return this.#canvas?.amIOnTop(id) ?? false
    }
    setCursorClass(className) {
        this.#canvas?.setCursorClass(className)
    }
    paneGroup(chartId) {
        return this.#canvas?.paneGroup(chartId) ?? null
    }
    redraw() {
        this.#canvas?.redraw()
    }
    requestUpdate() {
        this.#canvas?.requestUpdate()
    }
    get margin() {
        return this.#canvas?.margin
    }
    get ratio() {
        return this.#canvas?.ratio
    }
}

define("chart-alternate-data", AlternateDataSeries)
