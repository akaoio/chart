import { isDefined, isNotDefined, mapObject } from "../core/utils/index.js"

/**
 * While an object is being dragged, its stored coordinates are stale — the live position
 * lives in an `override`. This reads through it: the override wins for the object being
 * dragged, everything else answers as normal.
 */
export const getValueFromOverride = (override, index, key, defaultValue) => {
    if (isDefined(override) && override.index === index) return override[key]
    return defaultValue
}

/** End an in-progress drawing or drag. Bound to the tool, so `this` is the element. */
export function terminate() {
    this.setInteractiveState({ current: null, override: null })
}

/**
 * Keep a handle on each child node so the tool can ask them things later — chiefly
 * "is the pointer over you". Passing `undefined` forgets that node.
 */
export function saveNodeType(type) {
    return node => {
        if (isDefined(this.nodes)) {
            if (isNotDefined(node) && isDefined(this.nodes[type])) delete this.nodes[type]
            else this.nodes[type] = node
        } else {
            this.nodes = []
        }
    }
}

/** Ask every drawn object whether the pointer is over it, and mark the ones that say yes. */
export function isHoverForInteractiveType(interactiveType) {
    return function (moreProps) {
        if (isDefined(this.nodes)) {
            const selectedNodes = this.nodes.map(node => node.isHover(moreProps))

            return this.interactiveProps[interactiveType].map((each, index) => ({
                ...each,
                selected: selectedNodes[index],
            }))
        }
    }
}

export function isHover(moreProps) {
    return mapObject(this.nodes, node => node.isHover(moreProps)).reduce((a, b) => a || b)
}

const getMouseXY = (moreProps, [originX, originY]) => {
    if (Array.isArray(moreProps.mouseXY)) {
        const [x, y] = moreProps.mouseXY
        return [x - originX, y - originY]
    }
    return moreProps.mouseXY
}

/**
 * Narrow the chart-wide `moreProps` to one pane, with the pointer moved into that pane's
 * coordinates — so a tool drawn in the volume pane measures from the volume pane's corner.
 */
export const getMorePropsForChart = (moreProps, chartId) => {
    const chartConfig = moreProps.chartConfig.find(each => each.id === chartId)

    return { ...moreProps, chartConfig, mouseXY: getMouseXY(moreProps, chartConfig.origin) }
}

/** Of every interactive group, only the objects the user has selected. */
export const getSelected = interactives =>
    interactives
        .map(each => ({ ...each, objects: each.objects.filter(object => object.selected) }))
        .filter(each => each.objects.length > 0)
