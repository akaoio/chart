/** True when two objects hold the same keys bound to the same references. */
export const shallowEqual = (a, b) => {
    if (a === b) return true
    if (!(a instanceof Object) || !(b instanceof Object)) return false

    const keys = Object.keys(a)

    for (const key of keys) {
        if (!(key in b)) return false
    }

    for (const key of keys) {
        if (a[key] !== b[key]) return false
    }

    return keys.length === Object.keys(b).length
}
