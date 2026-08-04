/**
 * The three stacked canvases everything is drawn on.
 *
 * Splitting them is what keeps interaction cheap: the crosshair moves on every pointer
 * event and only its layer is cleared, while the series underneath stay where they are.
 *
 *     bg          gridlines and anything static
 *     axes        series, axes — redrawn on pan and zoom
 *     mouseCoord  crosshair, tooltips — redrawn on every mouse move
 *
 * The canvas is sized in device pixels and displayed at CSS pixels, which is what makes
 * lines land on whole pixels instead of blurring across two.
 */
export class CanvasContainer {
    #element
    #canvases = {}

    constructor() {
        this.#element = document.createElement("div")
        this.#element.style.position = "absolute"

        for (const name of ["bg", "axes", "mouseCoord"]) {
            const canvas = document.createElement("canvas")
            canvas.style.position = "absolute"
            this.#element.append(canvas)
            this.#canvases[name] = canvas
        }
    }

    get element() {
        return this.#element
    }

    resize(width, height, ratio) {
        Object.assign(this.#element.style, { width: `${width}px`, height: `${height}px` })

        for (const canvas of Object.values(this.#canvases)) {
            canvas.width = width * ratio
            canvas.height = height * ratio
            canvas.style.width = `${width}px`
            canvas.style.height = `${height}px`
        }
    }

    getCanvasContexts() {
        return {
            bg: this.#canvases.bg.getContext("2d") ?? undefined,
            axes: this.#canvases.axes.getContext("2d") ?? undefined,
            mouseCoord: this.#canvases.mouseCoord.getContext("2d") ?? undefined,
        }
    }
}
