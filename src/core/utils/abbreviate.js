/**
 * Units the axis is allowed to fold into a suffix, widest first.
 *
 * `K` and `M` only. A price axis never reaches `B`, and a suffix nobody can read at a
 * glance is worse than the digits it replaced — one line adds another the day some
 * series needs it.
 */
const UNITS = [
    [6, "M"],
    [3, "K"],
]

/**
 * Move the decimal point of a number's own decimal TEXT, not of the number.
 *
 * `77375.89 / 1000` is `77.37588999999999` in binary floating point. Dividing would put
 * that artefact on the axis, and an axis that invents digits is worse than one that
 * shows long numbers. Shifting the point inside the decimal string cannot round
 * anything, because nothing is computed.
 *
 * Returns `undefined` when the shift is not worth making: exponent notation, and any
 * value small enough that the short form would start `0.` — `0.08K` is not an
 * improvement on `80`.
 */
const shiftDecimalPoint = (text, places) => {
    const negative = text.startsWith("-")
    const magnitude = negative ? text.slice(1) : text

    if (!/^\d+(?:\.\d+)?$/.test(magnitude)) return undefined

    const [whole, fraction = ""] = magnitude.split(".")
    const point = whole.length - places
    if (point < 1) return undefined

    const digits = whole + fraction
    const head = digits.slice(0, point)
    const tail = digits.slice(point).replace(/0+$/, "")

    return `${negative ? "-" : ""}${head}${tail === "" ? "" : `.${tail}`}`
}

/**
 * `80,000` → `80K`, `1,000,000` → `1M`.
 *
 * Two conditions, both required, and they are what keeps this honest:
 *
 *   - **exact** — every digit survives the fold, so the short label and the long one are
 *     the same number. `1,500` → `1.5K` qualifies; nothing is ever rounded away here.
 *   - **shorter** — `77375.89` would fold to `77.37589K`, one character longer for the
 *     same value, so it stays as it was. The point of the suffix is a narrower column;
 *     a fold that widens it has no reason to happen.
 *
 * `full` is the label the axis would otherwise show, thousands separators and all — it
 * is both the fallback and the length being measured against.
 */
export const abbreviateNumber = (value, full = String(value)) => {
    if (!Number.isFinite(value)) return full

    for (const [places, suffix] of UNITS) {
        if (Math.abs(value) < 10 ** places) continue

        const shifted = shiftDecimalPoint(String(value), places)
        if (shifted === undefined) continue

        const short = `${shifted}${suffix}`
        return short.length < full.length ? short : full
    }

    return full
}
