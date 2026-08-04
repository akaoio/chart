import { min } from "d3-array"
import { identity } from "./identity.js"

/**
 * `d3.zip` that calls a function instead of building an array.
 *
 * Length is the shortest input, so ragged input truncates rather than padding.
 * The default `combine` is `identity`, which takes only its first argument — so
 * zipping without combining gives back the first array, not tuples.
 */
export default function zipper() {
    let combine = identity

    function zip(...arrays) {
        if (arrays.length === 0) return []

        const length = min(arrays, array => array.length) ?? 0

        const zipped = new Array(length)
        for (let i = 0; i < length; i++) {
            zipped[i] = combine(...arrays.map(array => array[i]))
        }
        return zipped
    }

    zip.combine = function (value) {
        if (!arguments.length) return combine
        combine = value
        return zip
    }

    return zip
}
