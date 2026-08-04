export { default as rebind } from "./rebind.js"
export { default as merge } from "./merge.js"
export { default as mappedSlidingWindow } from "./mappedSlidingWindow.js"

// slidingWindow, zipper, functor, path, identity đều dùng chung với core — bản gốc chép
// chúng sang đây một lần nữa, ở đây thì không cần.
export { slidingWindow, zipper, functor, path, identity } from "../../core/utils/index.js"
