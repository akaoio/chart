import { GenericChartComponent } from "../core/GenericChartComponent.js"
import { define } from "../core/element.js"

/**
 * An escape hatch into SVG: `<chart-svg>`.
 *
 * Set `render` to a function of `moreProps` returning SVG nodes, and they are placed in
 * the pane and refreshed when the chart changes. Everything else in the library draws to
 * canvas; this exists for the few things that want to be real DOM — something selectable,
 * focusable, or styled by a stylesheet.
 */
export class SVGComponent extends GenericChartComponent {
    render = null

    get drawOn() {
        return []
    }

    svgDraw(moreProps) {
        return this.render ? this.render(moreProps) : null
    }
}

define("chart-svg", SVGComponent)
