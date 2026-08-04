/**
 * What became of the original's `utils` package.
 *
 * It exported exactly two things, both React higher-order components:
 *
 *     withSize          wrapped a chart in react-virtualized-auto-sizer to give it
 *                       width and height
 *     withDeviceRatio   measured devicePixelRatio and passed it down
 *
 * Neither survives as a wrapper, because there is nothing left to wrap: `<chart-canvas>`
 * is an element, it has a box, and it can watch its own box. Leave `width`/`height`
 * unset and it measures itself with a `ResizeObserver`; leave `ratio` unset and it reads
 * `devicePixelRatio`. See `docs/parity/utils.md`.
 *
 * The helpers below are the same measurements as standalone functions, for code that
 * wants them without a chart.
 */

/**
 * Call `onResize(width, height)` now and whenever the element's box changes.
 * Returns a function that stops watching.
 */
export const observeSize = (element, onResize) => {
    const report = () => {
        const { width, height } = element.getBoundingClientRect()
        onResize(width, height)
    }

    report()

    const observer = new ResizeObserver(report)
    observer.observe(element)

    return () => observer.disconnect()
}

/**
 * Device pixels per CSS pixel.
 *
 * The original divided `devicePixelRatio` by a canvas "backing store ratio" read through
 * five vendor-prefixed properties. All five were removed from browsers years ago, so
 * that divisor has been 1 for a long time and the whole expression reduces to
 * `devicePixelRatio`. Simplified deliberately, not by oversight — the old spelling is
 * recorded in `docs/parity/utils.md`.
 */
export const getDeviceRatio = () => window.devicePixelRatio || 1
