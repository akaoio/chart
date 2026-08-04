/**
 * Binary search for the pair of items bracketing a value.
 *
 * When the value sits exactly on an item, or falls outside the array, both sides
 * collapse to the same index. Comparison goes through `valueOf()` so the same code
 * serves numbers and dates — `===` on two equal Dates is false.
 */
export const getClosestItemIndexes = (array, value, accessor) => {
    let low = 0
    let high = array.length - 1

    while (high - low > 1) {
        const middle = Math.round((low + high) / 2)
        if (accessor(array[middle]) <= value) {
            low = middle
        } else {
            high = middle
        }
    }

    const lowValue = accessor(array[low])
    const highValue = accessor(array[high])

    if (lowValue?.valueOf() === value?.valueOf()) high = low
    if (highValue?.valueOf() === value?.valueOf()) low = high

    if (lowValue < value && highValue < value) low = high
    if (lowValue > value && highValue > value) high = low

    return { left: low, right: high }
}

/** Of the two bracketing items, the nearer one. */
export const getClosestItem = (array, value, accessor) => {
    const { left, right } = getClosestItemIndexes(array, value, accessor)
    if (left === right) return array[left]

    const leftValue = accessor(array[left])
    const rightValue = accessor(array[right])

    return Math.abs(leftValue.valueOf() - value.valueOf()) < Math.abs(rightValue.valueOf() - value.valueOf())
        ? array[left]
        : array[right]
}
