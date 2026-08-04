import { GenericChartComponent } from "../core/GenericChartComponent.js"
import { getAxisCanvas } from "../core/GenericComponent.js"
import { defineProperties } from "../core/element.js"

/**
 * Base for every series element.
 *
 * A series is two things kept apart on purpose:
 *
 *   - a **drawing function** `(context, moreProps, props)` — no DOM, no element, just
 *     canvas commands. This is where the original's `drawOnCanvas` body lands, almost
 *     unchanged, and it is what the tests drive directly.
 *   - a **thin element** that collects properties and hands them to that function.
 *
 * Splitting them is what makes drawing provable: the test can call the function in Node
 * against a recording canvas and compare the command stream with the original's, command
 * for command. An element extending `HTMLElement` could not be built outside a browser.
 *
 * A subclass declares `static defaults` and any extra `static properties`; both become
 * settable JS properties that trigger a redraw.
 */
export class Series extends GenericChartComponent {
    #props

    constructor() {
        super()

        const { defaults = {}, properties = [] } = new.target
        this.#props = defineProperties(this, defaults, properties)
    }

    /** What the drawing function receives. */
    get seriesProps() {
        return this.#props
    }

    get drawOn() {
        return ["pan"]
    }

    canvasToDraw(contexts) {
        return getAxisCanvas(contexts)
    }
}
