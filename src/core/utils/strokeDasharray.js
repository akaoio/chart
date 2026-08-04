/** Every dash pattern the series accept. */
export const strokeDashTypes = [
    "Solid",
    "ShortDash",
    "ShortDash2",
    "ShortDot",
    "ShortDashDot",
    "ShortDashDotDot",
    "Dot",
    "Dash",
    "LongDash",
    "DashDot",
    "LongDashDot",
    "LongDashDotDot",
]

/** As an SVG `stroke-dasharray` string. Unknown types fall back to solid. */
export const getStrokeDasharray = type => {
    switch (type) {
        default:
        case "Solid":
            return "none"
        case "ShortDash":
            return "6, 2"
        case "ShortDash2":
            return "6, 3"
        case "ShortDot":
            return "2, 2"
        case "ShortDashDot":
            return "6, 2, 2, 2"
        case "ShortDashDotDot":
            return "6, 2, 2, 2, 2, 2"
        case "Dot":
            return "2, 6"
        case "Dash":
            return "4, 6"
        case "LongDash":
            return "16, 6"
        case "DashDot":
            return "8, 6, 2, 6"
        case "LongDashDot":
            return "16, 6, 2, 6"
        case "LongDashDotDot":
            return "16, 6, 2, 6, 2, 6"
    }
}

/** As the number array `CanvasRenderingContext2D.setLineDash` wants. Solid is empty. */
export const getStrokeDasharrayCanvas = type => {
    const parts = getStrokeDasharray(type).split(",")
    if (parts.length === 1) return []

    return parts.map(Number)
}
