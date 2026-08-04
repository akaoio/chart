// copied from https://github.com/d3fc/d3fc-rebind/blob/master/src/rebind.js

/**
 * Expose a source object's methods on a target, keeping the target chainable.
 *
 * Without this, `sma().windowSize(20).stroke("red")` could not work: `windowSize` belongs
 * to the calculator and `stroke` to the indicator's appearance, and each returns *itself*.
 * Rebinding swaps that return value for the target, so both read as one object.
 */
const createReboundMethod = (target, source, name) => {
    const method = source[name]
    if (typeof method !== "function") {
        throw new Error(`Attempt to rebind ${name} which isn't a function on the source object`)
    }

    return (...args) => {
        const value = method.apply(source, args)
        return value === source ? target : value
    }
}

export default function rebind(target, source, ...names) {
    for (const name of names) {
        target[name] = createReboundMethod(target, source, name)
    }
    return target
}
