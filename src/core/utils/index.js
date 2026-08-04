/**
 * Pure helpers, ported from `packages/core/src/utils/index.ts`.
 *
 * The original also exports `d3Window`, `clearCanvas`, `mousePosition` and
 * `touchPosition` from this file. Those need a DOM or a canvas context and belong with
 * the chart body, so they land in a later stage rather than here.
 */

export { identity } from "./identity.js"
export { noop } from "./noop.js"
export { shallowEqual } from "./shallowEqual.js"
export { default as zipper } from "./zipper.js"
export { default as slidingWindow } from "./slidingWindow.js"
export { default as accumulatingWindow } from "./accumulatingWindow.js"
export * from "./closestItem.js"
export * from "./barWidth.js"
export * from "./strokeDasharray.js"

/**
 * Merge defaults the way React's `defaultProps` did, which is not the way object spread
 * does it.
 *
 * `{ ...defaults, ...props }` lets a property that is explicitly `undefined` overwrite
 * the default with nothing. React treated `undefined` as "not supplied" and substituted
 * the default. That difference is invisible until one component forwards an optional
 * prop it did not receive — `<AreaOnlySeries base={baseAt} />` with no `baseAt` — and
 * then the default silently disappears.
 */
export const withDefaults = (defaults, props = {}) => {
    const merged = { ...defaults }

    for (const [key, value] of Object.entries(props)) {
        if (value !== undefined) merged[key] = value
    }

    return merged
}

/** -1, 0 or 1. */
export const sign = value => (value > 0) - (value < 0)

/**
 * Build an accessor that walks a chain of keys.
 *
 * Note the asymmetry, which is the original's behaviour and is preserved: the default
 * value is returned when the walk stops early on a null or undefined link, but not when
 * the walk completes and simply lands on `undefined`.
 */
export const path = (location = []) => {
    const keys = Array.isArray(location) ? location : [location]
    const { length } = keys

    return function (object, defaultValue) {
        if (length === 0) return isDefined(object) ? object : defaultValue

        let index = 0
        while (object != null && index < length) {
            object = object[keys[index++]]
        }
        return index === length ? object : defaultValue
    }
}

/** Wrap a plain value so it can be called like an accessor. */
export const functor = value => (typeof value === "function" ? value : () => value)

/** Of one or several candidates, the one nearest to `currentValue`. */
export function getClosestValue(inputValue, currentValue) {
    const values = Array.isArray(inputValue) ? inputValue : [inputValue]

    const difference = values
        .map(each => each - currentValue)
        .reduce((left, right) => (Math.abs(left) < Math.abs(right) ? left : right))

    return currentValue + difference
}

/** First item; with an accessor, the first whose accessed value is defined. */
export function head(array, accessor) {
    if (accessor && array) {
        for (let i = 0; i < array.length; i++) {
            const value = array[i]
            if (isDefined(accessor(value))) return value
        }
        return undefined
    }

    return array ? array[0] : undefined
}

export const first = head

/** Last item; with an accessor, the last whose accessed value is defined. */
export function last(array, accessor) {
    if (accessor && array) {
        for (let i = array.length - 1; i >= 0; i--) {
            const value = array[i]
            if (isDefined(accessor(value))) return value
        }
        return undefined
    }

    const length = array ? array.length : 0
    return length ? array[length - 1] : undefined
}

export const isDefined = value => value !== null && value !== undefined

export const isNotDefined = value => !isDefined(value)

export const isObject = value => isDefined(value) && typeof value === "object" && !Array.isArray(value)

/** Map an object's values into an array. Keys are visited in `Object.keys` order. */
export function mapObject(object = {}, iteratee = value => value) {
    return Object.keys(object).map(key => iteratee(object[key], key, object))
}
