import { getCurrentItem } from "../utils/ChartDataUtil.js"
import { last } from "../utils/index.js"

/**
 * What a zoom holds still.
 *
 * Scrolling to zoom has to keep *something* fixed or the chart slides around under the
 * pointer. These three answers each feel right in a different situation, and the chart
 * takes one as configuration.
 */

/** Keep the point under the pointer where it is — the usual choice for a mouse. */
export const mouseBasedZoomAnchor = ({ xScale, xAccessor, mouseXY, plotData }) =>
    xAccessor(getCurrentItem(xScale, xAccessor, mouseXY, plotData))

/** Keep the newest visible point fixed — right for live data you want to stay on. */
export const lastVisibleItemBasedZoomAnchor = ({ xAccessor, plotData }) => xAccessor(last(plotData))

/** Keep the right edge fixed, data or no data. */
export const rightDomainBasedZoomAnchor = ({ xScale }) => xScale.domain()[1]
