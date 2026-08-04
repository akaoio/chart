import { GenericComponent } from "./GenericComponent.js"
import { findContextEventually } from "./context.js"
import { isDefined } from "./utils/index.js"

const ALWAYS_TRUE_TYPES = ["drag", "dragend"]

/**
 * Base class for anything that draws **inside a pane** — which is nearly everything:
 * series, axes, coordinates, annotations.
 *
 * Two things separate it from `GenericComponent`. It moves the canvas origin to its
 * pane's corner and clips to that pane's box, so drawing code can work in pane
 * coordinates and simply cannot spill into a neighbouring pane. And it ignores events
 * that happened in some other pane, so hovering the volume chart does not light up the
 * crosshair on the price chart.
 */
export class GenericChartComponent extends GenericComponent {
    #pane = null
    #cancelFindPane = () => {}

    connectedCallback() {
        this.#cancelFindPane = findContextEventually(this, "pane", pane => {
            this.#pane = pane
        })

        super.connectedCallback()
    }

    disconnectedCallback() {
        this.#cancelFindPane()
        this.#pane = null
        super.disconnectedCallback()
    }

    get pane() {
        return this.#pane
    }

    get chartId() {
        return this.#pane?.chartId
    }

    get chartConfig() {
        return this.#pane?.chartConfig
    }

    svgParent() {
        return this.#pane?.group ?? null
    }

    /**
     * Move to the pane's corner, scale for the display, and clip.
     *
     * The half-pixel offset is what makes a one-pixel line look like one pixel: canvas
     * coordinates sit between pixels, so a line drawn on a whole number straddles two
     * and comes out grey and two wide.
     */
    preCanvasDraw(context, moreProps) {
        super.preCanvasDraw(context, moreProps)

        const canvas = this.canvas
        if (!canvas) return

        const chartConfig = moreProps.chartConfig
        if (!isDefined(chartConfig) || Array.isArray(chartConfig)) return

        const { margin, ratio } = canvas
        const { width, height, origin } = chartConfig

        context.save()

        const canvasOriginX = 0.5 * ratio + origin[0] + margin.left
        const canvasOriginY = 0.5 * ratio + origin[1] + margin.top

        context.setTransform(1, 0, 0, 1, 0, 0)
        context.scale(ratio, ratio)

        if (this.edgeClip) {
            context.beginPath()
            context.rect(-1, canvasOriginY - 10, width + margin.left + margin.right + 1, height + 20)
            context.clip()
        }

        context.translate(canvasOriginX, canvasOriginY)

        if (this.clip) {
            context.beginPath()
            context.rect(-1, -1, width + 1, height + 1)
            context.clip()
        }

        this.#saved = true
    }

    #saved = false

    postCanvasDraw(context, moreProps) {
        if (this.#saved) {
            context.restore()
            this.#saved = false
        }
        super.postCanvasDraw(context, moreProps)
    }

    /**
     * Narrow the broadcast to this pane, and put pointer coordinates into pane space so
     * drawing code never has to think about where its pane sits on the page.
     */
    updateMoreProps(moreProps) {
        super.updateMoreProps(moreProps)

        const chartConfigList = moreProps.chartConfig
        if (chartConfigList && Array.isArray(chartConfigList)) {
            this.moreProps.chartConfig = chartConfigList.find(each => each.id === this.chartId)
        }

        if (isDefined(this.moreProps.chartConfig)) {
            const [originX, originY] = this.moreProps.chartConfig.origin

            if (isDefined(moreProps.mouseXY)) {
                this.moreProps.mouseXY = [moreProps.mouseXY[0] - originX, moreProps.mouseXY[1] - originY]
            }
            if (isDefined(moreProps.startPos)) {
                this.moreProps.startPos = [moreProps.startPos[0] - originX, moreProps.startPos[1] - originY]
            }
        }
    }

    preEvaluate() {}

    shouldTypeProceed(type, moreProps) {
        if ((type === "mousemove" || type === "click") && this.disablePan) return true

        if (ALWAYS_TRUE_TYPES.indexOf(type) === -1 && isDefined(moreProps) && isDefined(moreProps.currentCharts)) {
            return moreProps.currentCharts.indexOf(this.chartId) > -1
        }

        return true
    }

    refreshFromContext() {
        super.refreshFromContext()

        const chartConfigs = this.canvas?.contextValues?.chartConfigs
        if (Array.isArray(chartConfigs)) {
            this.moreProps.chartConfig = chartConfigs.find(each => each.id === this.chartId)
        }
    }
}
