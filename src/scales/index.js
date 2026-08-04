export {
    default as discontinuousTimeScaleProvider,
    discontinuousTimeScaleProviderBuilder,
} from "./discontinuousTimeScaleProvider.js"
export { default as financeDiscontinuousScale } from "./financeDiscontinuousScale.js"
export * from "./timeFormat.js"

/**
 * The pass-through provider: keep the scale you were given and read x straight off the
 * data. Use it when the x axis really is continuous — anything not tied to a trading
 * calendar.
 */
export const defaultScaleProvider = xScale => (data, xAccessor) => ({
    data,
    xScale,
    xAccessor,
    displayXAccessor: xAccessor,
})
