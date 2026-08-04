import { findContextEventually, serveContext } from "./context.js"
import { define, ElementBase } from "./element.js"

/**
 * One pane within a chart: `<chart-pane>`.
 *
 * A pane owns a slice of the vertical space and its own y scale. Price on top, volume
 * below, an oscillator under that — each is a pane, all sharing one x axis, which is why
 * they pan and zoom together but scale independently.
 *
 * It provides context to its own children while consuming the canvas's, so a series
 * inside it can reach both.
 *
 * Deviation from the original: the element is `<chart-pane>`, not `<chart-chart>`. The
 * class keeps the original's name; only the tag reads differently, because a tag has to
 * be lived with in markup and "pane" is what the thing actually is.
 */
export class Chart extends ElementBase {
    #props = { chartId: 0 }
    #canvas = null
    #cancelFind = () => {}
    #subscriptionId = null

    /**
     * The original's prop is `id`. Here it is `chartId`, because `id` on an element
     * already means the document-wide identifier and quietly redefining it would break
     * `getElementById` and CSS selectors. It also frees two charts on one page to both
     * have a pane called "price", which document ids may not.
     */
    static properties = [
        "chartId",
        "height",
        "origin",
        "padding",
        "yExtents",
        "yExtentsCalculator",
        "yScale",
        "yPan",
        "yPanEnabled",
        "flipYScale",
        "onContextMenu",
        "onDoubleClick",
    ]

    constructor() {
        super()

        for (const name of Chart.properties) {
            Object.defineProperty(this, name, {
                get: () => this.#props[name],
                set: value => {
                    this.#props[name] = value
                    this.#canvas?.requestUpdate()
                },
                configurable: true,
                enumerable: true,
            })
        }
    }

    connectedCallback() {
        // Declaration only — the drawing surface lives in the canvas's shadow root
        this.style.display = "none"

        if (this.hasAttribute("chart-id") && this.#props.chartId === 0) {
            this.#props.chartId = this.getAttribute("chart-id")
        }

        serveContext(this, "pane")

        this.#cancelFind = findContextEventually(this, "canvas", canvas => {
            this.#canvas = canvas
            this.#subscriptionId = `chart_${this.#props.chartId}`

            canvas.subscribe(this.#subscriptionId, { listener: this.#listener })
            canvas.requestUpdate()
        })
    }

    disconnectedCallback() {
        this.#cancelFind()
        if (this.#subscriptionId !== null) this.#canvas?.unsubscribe(this.#subscriptionId)

        this.#subscriptionId = null
        const canvas = this.#canvas
        this.#canvas = null
        canvas?.requestUpdate()
    }

    /** Only forward the events that landed inside this pane. */
    #listener = (type, moreProps, state, event) => {
        if (type !== "contextmenu" && type !== "dblclick") return

        const handler = type === "contextmenu" ? this.#props.onContextMenu : this.#props.onDoubleClick
        if (handler === undefined) return

        if (moreProps?.currentCharts?.indexOf(this.#props.chartId) > -1) handler(event, moreProps)
    }

    get canvas() {
        return this.#canvas
    }

    /** What the canvas reads to build this pane's configuration. */
    get chartProps() {
        const { chartId, ...rest } = this.#props
        return { ...rest, id: chartId }
    }

    get chartConfig() {
        return this.#canvas?.getState()?.chartConfigs.find(config => config.id === this.#props.chartId)
    }

    /** The SVG group positioned at this pane's origin. */
    get group() {
        return this.#canvas?.paneGroup(this.#props.chartId) ?? null
    }
}

define("chart-pane", Chart)
