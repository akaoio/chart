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

    /** Only the rows falling inside the window the chart is showing. */
    get contextValues() {
        const values = this.#canvas?.contextValues
        if (!values) return values

        const { plotData, xAccessor } = values
        if (!plotData?.length || !xAccessor) return { ...values, plotData: [] }

        const start = xAccessor(plotData[0])
        const end = xAccessor(plotData[plotData.length - 1])

        return {
            ...values,
            plotData: this.#data.filter(datum => {
                const at = xAccessor(datum)
                return at > start && at < end
            }),
        }
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
    subscribe(id, rest) {
        this.#canvas?.subscribe(id, rest)
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
