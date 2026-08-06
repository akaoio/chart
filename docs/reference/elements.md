# Element reference

**Generated from the source — do not edit.** `npm run docs:reference` rebuilds it, and
`npm test` fails if the committed file no longer matches the code.

Every custom element the library defines: **115** of them.

Properties are set in JavaScript, not as HTML attributes — most of them are functions,
scales or objects, which an attribute cannot carry:

```js
const series = document.createElement("chart-line-series")
series.yAccessor = datum => datum.close
```

A dash in the default column means the property has no default: nothing is set until you
set it. `ƒ` means the default is a function — see the file for what it does.

## The chart itself

### `<chart-canvas>`

The chart host.

`ChartCanvas` — [`src/core/ChartCanvas.js`](../../src/core/ChartCanvas.js)

| property | default |
|---|---|
| `clamp` | `false` |
| `data` | — |
| `disableInteraction` | `false` |
| `disablePan` | `false` |
| `disableZoom` | `false` |
| `displayXAccessor` | — |
| `flipXScale` | `false` |
| `height` | — |
| `maintainPointsPerPixelOnResize` | `true` |
| `margin` | `{"top":0,"right":40,"bottom":40,"left":0}` |
| `minPointsPerPxThreshold` | `0.01` |
| `mouseMoveEvent` | `true` |
| `onLoadAfter` | — |
| `onLoadBefore` | — |
| `padding` | `0` |
| `plotFull` | — |
| `pointsPerPxThreshold` | `2` |
| `postCalculator` | ƒ |
| `ratio` | — |
| `seriesName` | — |
| `useCrossHairStyleCursor` | `true` |
| `width` | — |
| `xAccessor` | ƒ |
| `xExtents` | `[null,null]` |
| `xScale` | — |
| `zoomAnchor` | ƒ |
| `zoomMultiplier` | `1.1` |

### `<chart-pane>`

One pane within a chart.

`Chart` — [`src/core/Chart.js`](../../src/core/Chart.js)

| property | default |
|---|---|
| `chartId` | — |
| `flipYScale` | — |
| `height` | — |
| `onContextMenu` | — |
| `onDoubleClick` | — |
| `origin` | — |
| `padding` | — |
| `yExtents` | — |
| `yExtentsCalculator` | — |
| `yPan` | — |
| `yPanEnabled` | — |
| `yScale` | — |

## Axes

### `<chart-axis-zoom-capture>`

The invisible strip over an axis that you drag to stretch or squash that scale.

`AxisZoomCapture` — [`src/axes/AxisZoomCapture.js`](../../src/axes/AxisZoomCapture.js)

| property | default |
|---|---|
| `axis` | `null` |
| `className` | — |
| `inverted` | `true` |
| `onContextMenu` | — |
| `onDoubleClick` | — |
| `zoomCursorClassName` | `""` |

### `<chart-x-axis>`

The time axis.

`XAxis` — [`src/axes/XAxis.js`](../../src/axes/XAxis.js)

| property | default |
|---|---|
| `axisAt` | `"bottom"` |
| `edgeClip` | `false` |
| `fontFamily` | `"-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif"` |
| `fontSize` | `12` |
| `fontWeight` | `400` |
| `getMouseDelta` | ƒ |
| `gridLinesStrokeDasharray` | — |
| `gridLinesStrokeStyle` | `"#E2E4EC"` |
| `gridLinesStrokeWidth` | `1` |
| `innerTickSize` | `4` |
| `onContextMenu` | — |
| `onDoubleClick` | — |
| `orient` | `"bottom"` |
| `outerTickSize` | `0` |
| `showDomain` | `true` |
| `showGridLines` | `false` |
| `showTickLabel` | `true` |
| `showTicks` | `true` |
| `strokeStyle` | `"#000000"` |
| `strokeWidth` | `1` |
| `tickFormat` | — |
| `tickInterval` | — |
| `tickIntervalFunction` | — |
| `tickLabelFill` | `"#000000"` |
| `tickPadding` | `4` |
| `ticks` | — |
| `tickStrokeDasharray` | — |
| `tickStrokeStyle` | `"#000000"` |
| `tickStrokeWidth` | `1` |
| `tickValues` | — |
| `xZoomHeight` | `25` |
| `zoomCursorClassName` | `"chart-ew-resize-cursor"` |
| `zoomEnabled` | `true` |

### `<chart-y-axis>`

The price axis.

`YAxis` — [`src/axes/YAxis.js`](../../src/axes/YAxis.js)

| property | default |
|---|---|
| `axisAt` | `"right"` |
| `fontFamily` | `"-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif"` |
| `fontSize` | `12` |
| `fontWeight` | `400` |
| `getMouseDelta` | ƒ |
| `gridLinesStrokeDasharray` | — |
| `gridLinesStrokeStyle` | `"#E2E4EC"` |
| `gridLinesStrokeWidth` | `1` |
| `innerTickSize` | `4` |
| `onContextMenu` | — |
| `onDoubleClick` | — |
| `orient` | `"right"` |
| `outerTickSize` | `0` |
| `showDomain` | `true` |
| `showGridLines` | `false` |
| `showTickLabel` | `true` |
| `showTicks` | `true` |
| `strokeStyle` | `"#000000"` |
| `strokeWidth` | `1` |
| `tickFormat` | — |
| `tickInterval` | — |
| `tickIntervalFunction` | — |
| `tickLabelFill` | `"#000000"` |
| `tickPadding` | `4` |
| `ticks` | — |
| `tickStrokeDasharray` | — |
| `tickStrokeStyle` | `"#000000"` |
| `tickStrokeWidth` | `1` |
| `tickValues` | — |
| `yZoomWidth` | `40` |
| `zoomCursorClassName` | `"chart-ns-resize-cursor"` |
| `zoomEnabled` | `true` |

## Series

### `<chart-alternate-data>`

Draw children from a different dataset than the rest of the chart.

`AlternateDataSeries` — [`src/series/AlternateDataSeries.js`](../../src/series/AlternateDataSeries.js)

No configurable properties.

### `<chart-alternating-fill-area-series>`

One area drawn twice, in two colours, clipped above and below a reference level.

`AlternatingFillAreaSeries` — [`src/series/AlternatingFillAreaSeries.js`](../../src/series/AlternatingFillAreaSeries.js)

| property | default |
|---|---|
| `baseAt` | — |
| `connectNulls` | `false` |
| `curve` | — |
| `fillStyle` | `{"top":"rgba(38, 166, 154, 0.1)","bottom":"rgba(239, 83, 80, 0.1)"}` |
| `strokeDasharray` | `{"top":"Solid","bottom":"Solid"}` |
| `strokeStyle` | `{"top":"#26a69a","bottom":"#ef5350"}` |
| `strokeWidth` | `{"top":2,"bottom":2}` |
| `yAccessor` | — |

### `<chart-area-only-series>`

The filled region between the data and a baseline.

`AreaOnlySeries` — [`src/series/AreaOnlySeries.js`](../../src/series/AreaOnlySeries.js)

| property | default |
|---|---|
| `base` | ƒ |
| `canvasClip` | — |
| `connectNulls` | `false` |
| `curve` | — |
| `defined` | ƒ |
| `fillStyle` | — |
| `yAccessor` | — |

### `<chart-area-series>`

A line with the region beneath it filled.

`AreaSeries` — [`src/series/AreaSeries.js`](../../src/series/AreaSeries.js)

| property | default |
|---|---|
| `baseAt` | — |
| `canvasClip` | — |
| `connectNulls` | — |
| `curve` | — |
| `fillStyle` | `"rgba(33, 150, 243, 0.1)"` |
| `strokeDasharray` | `"Solid"` |
| `strokeStyle` | `"#2196f3"` |
| `strokeWidth` | `3` |
| `yAccessor` | — |

### `<chart-bar-series>`

Bars, grouped by fill colour so the canvas state changes once per colour rather than once per bar — which is most of why a thousand-bar volume chart stays fast.

`BarSeries` — [`src/series/BarSeries.js`](../../src/series/BarSeries.js)

| property | default |
|---|---|
| `baseAt` | ƒ |
| `clip` | `true` |
| `fillStyle` | `"rgba(70, 130, 180, 0.5)"` |
| `strokeStyle` | — |
| `swapScales` | `false` |
| `width` | ƒ |
| `widthRatio` | `0.8` |
| `yAccessor` | — |

### `<chart-bollinger-series>`

Three lines and the band between them: a moving average with a channel drawn a fixed number of standard deviations either side.

`BollingerSeries` — [`src/series/BollingerSeries.js`](../../src/series/BollingerSeries.js)

| property | default |
|---|---|
| `fillStyle` | `"rgba(38, 166, 153, 0.05)"` |
| `strokeStyle` | `{"top":"#26a69a","middle":"#812828","bottom":"#26a69a"}` |
| `yAccessor` | ƒ |

### `<chart-candlestick-series>`

Wicks first, then bodies over them, each pass grouped by colour.

`CandlestickSeries` — [`src/series/CandlestickSeries.js`](../../src/series/CandlestickSeries.js)

| property | default |
|---|---|
| `candleStrokeWidth` | `0.5` |
| `clip` | `true` |
| `fill` | ƒ |
| `stroke` | `"none"` |
| `wickStroke` | ƒ |
| `width` | ƒ |
| `widthRatio` | `0.8` |
| `yAccessor` | ƒ |

### `<chart-elder-ray-series>`

Bull power and bear power as bars either side of zero.

`ElderRaySeries` — [`src/series/ElderRaySeries.js`](../../src/series/ElderRaySeries.js)

| property | default |
|---|---|
| `clip` | `true` |
| `fillStyle` | `{…}` |
| `straightLineStrokeDasharray` | `"Dash"` |
| `straightLineStrokeStyle` | `"rgba(0, 0, 0, 0.7)"` |
| `stroke` | `true` |
| `widthRatio` | `0.8` |
| `yAccessor` | — |

### `<chart-grouped-bar-series>`

Several bars per x, side by side in their own slots.

`GroupedBarSeries` — [`src/series/GroupedBarSeries.js`](../../src/series/GroupedBarSeries.js)

| property | default |
|---|---|
| `baseAt` | ƒ |
| `clip` | `true` |
| `direction` | `"up"` |
| `fillStyle` | `"rgba(70, 130, 180, 0.5)"` |
| `spaceBetweenBar` | `5` |
| `stroke` | `false` |
| `swapScales` | `false` |
| `width` | ƒ |
| `widthRatio` | `0.8` |
| `yAccessor` | — |

### `<chart-kagi-series>`

Every step is drawn as a right angle: across at the old level, then vertically.

`KagiSeries` — [`src/series/KagiSeries.js`](../../src/series/KagiSeries.js)

| property | default |
|---|---|
| `currentValueStroke` | `"#000000"` |
| `fill` | `{"yang":"none","yin":"none"}` |
| `stroke` | `{"yang":"#26a69a","yin":"#ef5350"}` |
| `strokeWidth` | `2` |

### `<chart-line-series>`

A line through the data.

`LineSeries` — [`src/series/LineSeries.js`](../../src/series/LineSeries.js)

| property | default |
|---|---|
| `canvasClip` | — |
| `connectNulls` | `false` |
| `curve` | — |
| `defined` | ƒ |
| `highlightOnHover` | `false` |
| `hoverStrokeWidth` | `4` |
| `hoverTolerance` | `6` |
| `onClick` | — |
| `onContextMenu` | — |
| `onDoubleClick` | — |
| `onHover` | — |
| `onUnHover` | — |
| `strokeDasharray` | `"Solid"` |
| `strokeStyle` | `"#2196f3"` |
| `strokeWidth` | `1` |
| `yAccessor` | — |

### `<chart-macd-series>`

MACD: two moving averages turned into a momentum reading.

`MACDSeries` — [`src/series/MACDSeries.js`](../../src/series/MACDSeries.js)

| property | default |
|---|---|
| `clip` | `true` |
| `fillStyle` | `{"divergence":"rgba(70, 130, 180, 0.6)"}` |
| `strokeStyle` | `{"macd":"#0093FF","signal":"#D84315","zero":"rgba(0, 0, 0, 0.3)"}` |
| `width` | ƒ |
| `widthRatio` | `0.5` |
| `yAccessor` | — |

### `<chart-ohlc-series>`

The open-high-low-close bar: high to low, with open ticking left and close right.

`OHLCSeries` — [`src/series/OHLCSeries.js`](../../src/series/OHLCSeries.js)

| property | default |
|---|---|
| `clip` | `true` |
| `stroke` | ƒ |
| `strokeWidth` | `1` |
| `yAccessor` | ƒ |

### `<chart-overlay-bar-series>`

Several bars sharing one x, drawn over one another from the last accessor backwards.

`OverlayBarSeries` — [`src/series/OverlayBarSeries.js`](../../src/series/OverlayBarSeries.js)

| property | default |
|---|---|
| `baseAt` | ƒ |
| `clip` | `true` |
| `direction` | `"up"` |
| `fillStyle` | `"#4682B4"` |
| `stroke` | `false` |
| `width` | ƒ |
| `widthRatio` | `0.5` |
| `yAccessor` | — |

### `<chart-point-and-figure-series>`

Rising columns are crosses; falling columns are circles.

`PointAndFigureSeries` — [`src/series/PointAndFigureSeries.js`](../../src/series/PointAndFigureSeries.js)

| property | default |
|---|---|
| `clip` | `true` |
| `fill` | `{"up":"none","down":"none"}` |
| `stroke` | `{"up":"#6BA583","down":"#FF0000"}` |
| `strokeWidth` | `1` |

### `<chart-renko-series>`

Renko bricks: one fixed-size block per price move, time ignored.

`RenkoSeries` — [`src/series/RenkoSeries.js`](../../src/series/RenkoSeries.js)

| property | default |
|---|---|
| `clip` | `true` |
| `fill` | `{"up":"#26a69a","down":"#ef5350","partial":"#4682B4"}` |
| `stroke` | `{"up":"none","down":"none"}` |
| `yAccessor` | ƒ |

### `<chart-rsi-series>`

RSI, with the line changing colour where it leaves the normal band.

`RSISeries` — [`src/series/RSISeries.js`](../../src/series/RSISeries.js)

| property | default |
|---|---|
| `middle` | `50` |
| `overBought` | `30` |
| `overSold` | `70` |
| `strokeDasharray` | `{…}` |
| `strokeStyle` | `{…}` |
| `strokeWidth` | `{"outsideThreshold":1,"insideThreshold":1,"top":1,"middle":1,"bottom":1}` |
| `yAccessor` | — |

### `<chart-sar-series>`

Parabolic SAR: a dot per period, above the price while falling and below while rising.

`SARSeries` — [`src/series/SARSeries.js`](../../src/series/SARSeries.js)

| property | default |
|---|---|
| `fillStyle` | `{"falling":"#4682B4","rising":"#15EC2E"}` |
| `highlightOnHover` | `false` |
| `onClick` | — |
| `onContextMenu` | — |
| `onDoubleClick` | — |
| `strokeStyle` | — |
| `yAccessor` | — |

### `<chart-scatter-series>`

Grouped by fill then stroke, so the canvas state changes once per combination.

`ScatterSeries` — [`src/series/ScatterSeries.js`](../../src/series/ScatterSeries.js)

| property | default |
|---|---|
| `marker` | — |
| `markerProps` | — |
| `markerProvider` | — |
| `yAccessor` | — |

### `<chart-stacked-bar-series>`

Several bars per x, each starting where the one before ended.

`StackedBarSeries` — [`src/series/StackedBarSeries.js`](../../src/series/StackedBarSeries.js)

| property | default |
|---|---|
| `baseAt` | ƒ |
| `clip` | `true` |
| `direction` | `"up"` |
| `fillStyle` | `"rgba(70, 130, 180, 0.5)"` |
| `spaceBetweenBar` | `0` |
| `stroke` | `false` |
| `swapScales` | `false` |
| `width` | ƒ |
| `widthRatio` | `0.8` |
| `yAccessor` | — |

### `<chart-stochastic-series>`

%K against its own average %D, with the two threshold levels marked.

`StochasticSeries` — [`src/series/StochasticSeries.js`](../../src/series/StochasticSeries.js)

| property | default |
|---|---|
| `middle` | `50` |
| `overBought` | `20` |
| `overSold` | `80` |
| `strokeStyle` | `{…}` |
| `yAccessor` | — |

### `<chart-straight-line>`

A single reference line across the pane — a price level, or a moment in time.

`StraightLine` — [`src/series/StraightLine.js`](../../src/series/StraightLine.js)

| property | default |
|---|---|
| `lineDash` | `"Solid"` |
| `lineWidth` | `1` |
| `strokeStyle` | `"rgba(0, 0, 0, 0.5)"` |
| `type` | `"horizontal"` |
| `xValue` | — |
| `yValue` | — |

### `<chart-svg>`

An escape hatch into SVG.

`SVGComponent` — [`src/series/SVGComponent.js`](../../src/series/SVGComponent.js)

No configurable properties.

### `<chart-volume-profile-series>`

How much was traded at each price, rather than at each moment.

`VolumeProfileSeries` — [`src/series/VolumeProfileSeries.js`](../../src/series/VolumeProfileSeries.js)

| property | default |
|---|---|
| `absoluteChange` | ƒ |
| `bins` | `20` |
| `bySession` | `false` |
| `fill` | ƒ |
| `maxProfileWidthPercent` | `50` |
| `orient` | `"left"` |
| `partialEndOK` | `true` |
| `partialStartOK` | `true` |
| `sessionBackGround` | `"rgba(70, 130, 180, 0.3)"` |
| `sessionStart` | ƒ |
| `showSessionBackground` | `false` |
| `source` | ƒ |
| `stroke` | `"#FFFFFF"` |
| `volume` | ƒ |

## Coordinates

### `<chart-cross-hair-cursor>`

Two dashed lines following the pointer.

`CrossHairCursor` — [`src/coordinates/CrossHairCursor.js`](../../src/coordinates/CrossHairCursor.js)

| property | default |
|---|---|
| `customX` | ƒ |
| `margin` | `{"top":0,"right":0,"bottom":0,"left":0}` |
| `ratio` | `1` |
| `snapX` | `true` |
| `strokeDasharray` | `"Dash"` |
| `strokeStyle` | `"rgba(55, 71, 79, 0.8)"` |
| `strokeWidth` | `1` |

### `<chart-current-coordinate>`

A dot on the series at the pointer's x position.

`CurrentCoordinate` — [`src/coordinates/CurrentCoordinate.js`](../../src/coordinates/CurrentCoordinate.js)

| property | default |
|---|---|
| `fillStyle` | `"#2196f3"` |
| `r` | `3` |
| `strokeStyle` | — |
| `yAccessor` | — |

### `<chart-cursor>`

The crosshair, optionally with a highlighted band instead of a vertical line.

`Cursor` — [`src/coordinates/Cursor.js`](../../src/coordinates/Cursor.js)

| property | default |
|---|---|
| `customX` | ƒ |
| `disableYCursor` | `false` |
| `margin` | `{"top":0,"right":0,"bottom":0,"left":0}` |
| `ratio` | `1` |
| `snapX` | `true` |
| `strokeDasharray` | `"ShortDash"` |
| `strokeStyle` | `"rgba(55, 71, 79, 0.8)"` |
| `useXCursorShape` | `false` |
| `xCursorShapeFillStyle` | — |
| `xCursorShapeStrokeDasharray` | — |
| `xCursorShapeStrokeStyle` | `"rgba(0, 0, 0, 0.5)"` |

### `<chart-edge-indicator>`

The value of the first or last visible point, pinned to the axis.

`EdgeIndicator` — [`src/coordinates/EdgeIndicator.js`](../../src/coordinates/EdgeIndicator.js)

| property | default |
|---|---|
| `arrowWidth` | `0` |
| `displayFormat` | ƒ |
| `dx` | `0` |
| `edgeAt` | `"right"` |
| `fill` | `"#8a8a8a"` |
| `fitToText` | `false` |
| `fontFamily` | `"-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif"` |
| `fontSize` | `13` |
| `fullWidth` | — |
| `hideLine` | `false` |
| `itemType` | `"last"` |
| `lineOpacity` | `1` |
| `lineStroke` | `"#000000"` |
| `lineStrokeDasharray` | `"ShortDot"` |
| `opacity` | `1` |
| `orient` | `"right"` |
| `rectHeight` | `20` |
| `rectWidth` | `50` |
| `stroke` | ƒ |
| `strokeOpacity` | `1` |
| `strokeWidth` | `1` |
| `textFill` | `"#FFFFFF"` |
| `type` | `"horizontal"` |
| `yAccessor` | — |
| `yAxisPad` | `0` |

### `<chart-mouse-coordinate-x>`

The time readout under the cursor, in a tab against the x axis.

`MouseCoordinateX` — [`src/coordinates/MouseCoordinateX.js`](../../src/coordinates/MouseCoordinateX.js)

| property | default |
|---|---|
| `at` | `"bottom"` |
| `customX` | ƒ |
| `displayFormat` | — |
| `fill` | `"#4C525E"` |
| `fitToText` | `true` |
| `fontFamily` | `"-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif"` |
| `fontSize` | `13` |
| `opacity` | `1` |
| `orient` | `"bottom"` |
| `rectHeight` | `20` |
| `rectRadius` | — |
| `rectWidth` | `80` |
| `snapX` | `true` |
| `stroke` | — |
| `strokeOpacity` | `1` |
| `strokeWidth` | `1` |
| `textFill` | `"#FFFFFF"` |
| `yAxisPad` | `0` |

### `<chart-mouse-coordinate-x-v2>`

The date under the pointer, drawn as a pointed callout rather than a plain box.

`MouseCoordinateXV2` — [`src/coordinates/MouseCoordinateXV2.js`](../../src/coordinates/MouseCoordinateXV2.js)

| property | default |
|---|---|
| `at` | `"bottom"` |
| `bg` | `{…}` |
| `displayFormat` | — |
| `drawCoordinate` | ƒ |
| `dx` | `7` |
| `dy` | `7` |
| `orient` | `"bottom"` |
| `text` | `{…}` |
| `xPosition` | ƒ |

### `<chart-mouse-coordinate-y>`

The price readout beside the cursor.

`MouseCoordinateY` — [`src/coordinates/MouseCoordinateY.js`](../../src/coordinates/MouseCoordinateY.js)

| property | default |
|---|---|
| `arrowWidth` | `0` |
| `at` | `"right"` |
| `displayFormat` | — |
| `dx` | `0` |
| `fill` | `"#4C525E"` |
| `fitToText` | `false` |
| `fontFamily` | `"-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif"` |
| `fontSize` | `13` |
| `opacity` | `1` |
| `orient` | `"right"` |
| `rectHeight` | `20` |
| `rectWidth` | `50` |
| `stroke` | — |
| `strokeOpacity` | `1` |
| `strokeWidth` | `1` |
| `textFill` | `"#FFFFFF"` |
| `yAccessor` | — |
| `yAxisPad` | `0` |

### `<chart-price-coordinate>`

A fixed price level with a label — an alert, an entry, a target.

`PriceCoordinate` — [`src/coordinates/PriceCoordinate.js`](../../src/coordinates/PriceCoordinate.js)

| property | default |
|---|---|
| `arrowWidth` | `0` |
| `at` | `"left"` |
| `displayFormat` | ƒ |
| `dx` | `0` |
| `fill` | `"#BAB8b8"` |
| `fontFamily` | `"-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif"` |
| `fontSize` | `13` |
| `lineOpacity` | `0.2` |
| `lineStroke` | `"#000000"` |
| `opacity` | `1` |
| `orient` | `"left"` |
| `price` | `0` |
| `rectHeight` | `20` |
| `rectWidth` | `50` |
| `stroke` | — |
| `strokeDasharray` | `"Solid"` |
| `strokeOpacity` | `1` |
| `strokeWidth` | `1` |
| `textFill` | `"#FFFFFF"` |
| `yAxisPad` | `0` |

## Tooltips

### `<chart-bollinger-band-tooltip>`

The three band values, with the settings that produced them spelled out.

`BollingerBandTooltip` — [`src/tooltip/BollingerBandTooltip.js`](../../src/tooltip/BollingerBandTooltip.js)

| property | default |
|---|---|
| `className` | `"chart-tooltip chart-bollingerband-tooltip"` |
| `displayFormat` | ƒ |
| `displayInit` | `"n/a"` |
| `displayValuesFor` | ƒ |
| `fontFamily` | — |
| `fontSize` | — |
| `fontWeight` | — |
| `labelFill` | — |
| `labelFontWeight` | — |
| `onClick` | — |
| `options` | — |
| `origin` | `[8,8]` |
| `textFill` | — |
| `yAccessor` | ƒ |

### `<chart-group-tooltip>`

Several labelled values as one block; the layout decides how they are arranged.

`GroupTooltip` — [`src/tooltip/GroupTooltip.js`](../../src/tooltip/GroupTooltip.js)

| property | default |
|---|---|
| `className` | `"chart-tooltip chart-group-tooltip"` |
| `displayFormat` | ƒ |
| `displayInit` | `""` |
| `displayValuesFor` | ƒ |
| `fontFamily` | — |
| `fontSize` | — |
| `fontWeight` | — |
| `layout` | `"horizontal"` |
| `onClick` | — |
| `options` | — |
| `origin` | `[0,0]` |
| `position` | — |
| `verticalSize` | `13` |
| `width` | `60` |

### `<chart-hover-tooltip>`

The floating panel that follows the cursor.

`HoverTooltip` — [`src/tooltip/HoverTooltip.js`](../../src/tooltip/HoverTooltip.js)

| property | default |
|---|---|
| `background` | `{"fillStyle":"rgba(33, 148, 243, 0.1)"}` |
| `backgroundShapeCanvas` | ƒ |
| `chartId` | — |
| `fontFamily` | `"-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif"` |
| `fontFill` | `"#000000"` |
| `fontSize` | `14` |
| `margin` | `{"top":0,"right":0,"bottom":0,"left":0}` |
| `origin` | ƒ |
| `ratio` | `1` |
| `tooltip` | — |
| `tooltipCanvas` | ƒ |
| `toolTipFillStyle` | `"rgba(250, 250, 250, 1)"` |
| `toolTipStrokeStyle` | `"rgba(33, 148, 243)"` |
| `yAccessor` | — |

### `<chart-macd-tooltip>`

Each number is coloured to match the line it came from, so the legend is the tooltip.

`MACDTooltip` — [`src/tooltip/MACDTooltip.js`](../../src/tooltip/MACDTooltip.js)

| property | default |
|---|---|
| `appearance` | — |
| `className` | `"chart-tooltip"` |
| `displayFormat` | ƒ |
| `displayInit` | `"n/a"` |
| `displayValuesFor` | ƒ |
| `fontFamily` | — |
| `fontSize` | — |
| `fontWeight` | — |
| `labelFill` | — |
| `labelFontWeight` | — |
| `onClick` | — |
| `options` | — |
| `origin` | `[0,0]` |
| `yAccessor` | — |

### `<chart-moving-average-tooltip>`

One moving average in the legend: a colour swatch, its name, and its value.

`MovingAverageTooltip` — [`src/tooltip/MovingAverageTooltip.js`](../../src/tooltip/MovingAverageTooltip.js)

| property | default |
|---|---|
| `className` | `"chart-tooltip chart-moving-average-tooltip"` |
| `displayFormat` | ƒ |
| `displayInit` | `"n/a"` |
| `displayValuesFor` | ƒ |
| `fontFamily` | — |
| `fontSize` | — |
| `fontWeight` | — |
| `labelFill` | — |
| `onClick` | — |
| `options` | — |
| `origin` | `[0,10]` |
| `textFill` | — |
| `width` | `65` |

### `<chart-ohlc-tooltip>`

Open, high, low, close and the change — the header line of nearly every price chart.

`OHLCTooltip` — [`src/tooltip/OHLCTooltip.js`](../../src/tooltip/OHLCTooltip.js)

| property | default |
|---|---|
| `accessor` | ƒ |
| `changeFormat` | ƒ |
| `className` | `"chart-tooltip-hover"` |
| `displayTexts` | `{"o":"O: ","h":" H: ","l":" L: ","c":" C: ","na":"n/a"}` |
| `displayValuesFor` | ƒ |
| `fontFamily` | `"-apple-system, system-ui, 'Helvetica Neue', Ubuntu, sans-serif"` |
| `fontSize` | — |
| `fontWeight` | — |
| `labelFill` | — |
| `labelFontWeight` | — |
| `ohlcFormat` | ƒ |
| `onClick` | — |
| `origin` | `[0,0]` |
| `percentFormat` | ƒ |
| `textFill` | — |

### `<chart-rsi-tooltip>`

The RSI reading, with its window size in the label.

`RSITooltip` — [`src/tooltip/RSITooltip.js`](../../src/tooltip/RSITooltip.js)

| property | default |
|---|---|
| `className` | `"chart-tooltip"` |
| `displayFormat` | ƒ |
| `displayInit` | `"n/a"` |
| `displayValuesFor` | ƒ |
| `fontFamily` | — |
| `fontSize` | — |
| `fontWeight` | — |
| `labelFill` | — |
| `labelFontWeight` | — |
| `onClick` | — |
| `options` | — |
| `origin` | `[0,0]` |
| `textFill` | — |
| `yAccessor` | — |

### `<chart-single-value-tooltip>`

One labelled value, following the cursor.

`SingleValueTooltip` — [`src/tooltip/SingleValueTooltip.js`](../../src/tooltip/SingleValueTooltip.js)

| property | default |
|---|---|
| `className` | `"chart-tooltip"` |
| `displayValuesFor` | ƒ |
| `fontFamily` | — |
| `fontSize` | — |
| `fontWeight` | — |
| `labelFill` | `"#4682B4"` |
| `labelFontWeight` | — |
| `onClick` | — |
| `origin` | `[0,0]` |
| `valueFill` | `"#000000"` |
| `xAccessor` | ƒ |
| `xDisplayFormat` | ƒ |
| `xInitDisplay` | `"n/a"` |
| `xLabel` | — |
| `yAccessor` | ƒ |
| `yDisplayFormat` | ƒ |
| `yInitDisplay` | `"n/a"` |
| `yLabel` | — |

### `<chart-stochastic-tooltip>`

%K and %D, each in its own line colour.

`StochasticTooltip` — [`src/tooltip/StochasticTooltip.js`](../../src/tooltip/StochasticTooltip.js)

| property | default |
|---|---|
| `appearance` | — |
| `className` | `"chart-tooltip"` |
| `displayFormat` | ƒ |
| `displayInit` | `"n/a"` |
| `displayValuesFor` | ƒ |
| `fontFamily` | — |
| `fontSize` | — |
| `fontWeight` | — |
| `label` | `"STO"` |
| `labelFill` | — |
| `onClick` | — |
| `options` | — |
| `origin` | `[0,0]` |
| `yAccessor` | — |

## Annotations

### `<chart-annotate>`

Place an annotation on every data point matching a condition.

`Annotate` — [`src/annotations/Annotate.js`](../../src/annotations/Annotate.js)

| property | default |
|---|---|
| `className` | `"chart-enable-interaction chart-annotate chart-default-cursor"` |
| `usingProps` | — |
| `when` | — |
| `with` | — |

### `<chart-label>`

Large text behind the chart — a watermark, usually the instrument name.

`Label` — [`src/annotations/Label.js`](../../src/annotations/Label.js)

| property | default |
|---|---|
| `canvasOriginX` | — |
| `canvasOriginY` | — |
| `datum` | — |
| `fillStyle` | `"#dcdcdc"` |
| `fontFamily` | `"-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif"` |
| `fontSize` | `64` |
| `fontWeight` | `"bold"` |
| `margin` | `{"top":0,"right":0,"bottom":0,"left":0}` |
| `ratio` | `1` |
| `rotate` | `0` |
| `selectCanvas` | ƒ |
| `text` | — |
| `textAlign` | `"center"` |
| `x` | ƒ |
| `y` | — |

## Interactive

### `<chart-arrow>`

Arrows.

`ArrowTool` — [`src/interactive/ArrowTool.js`](../../src/interactive/ArrowTool.js)

| property | default |
|---|---|
| `appearance` | `{…}` |
| `arrows` | `[]` |
| `currentPositionRadius` | `0` |
| `currentPositionStroke` | `"#000000"` |
| `currentPositionstrokeOpacity` | `1` |
| `currentPositionStrokeWidth` | `3` |
| `enabled` | `true` |
| `hoverText` | `{…}` |
| `onComplete` | — |
| `onSelect` | — |
| `onStart` | — |
| `shouldDisableSnap` | ƒ |
| `snap` | `false` |
| `snapTo` | — |

### `<chart-arrow-mark>`

Arrow marks.

`ArrowMark` — [`src/interactive/ArrowMark.js`](../../src/interactive/ArrowMark.js)

| property | default |
|---|---|
| `appearance` | `{…}` |
| `currentPositionRadius` | `0` |
| `currentPositionStroke` | `"#000000"` |
| `currentPositionstrokeOpacity` | `1` |
| `currentPositionStrokeWidth` | `3` |
| `enabled` | `true` |
| `hoverText` | `{…}` |
| `marks` | `[]` |
| `mode` | `"up"` |
| `onComplete` | — |
| `onSelect` | — |
| `shouldDisableSnap` | ƒ |
| `snap` | `false` |
| `snapTo` | — |

### `<chart-axis-line>`

Axis-anchored lines.

`AxisLine` — [`src/interactive/AxisLine.js`](../../src/interactive/AxisLine.js)

| property | default |
|---|---|
| `appearance` | `{…}` |
| `currentPositionRadius` | `0` |
| `currentPositionStroke` | `"#000000"` |
| `currentPositionstrokeOpacity` | `1` |
| `currentPositionStrokeWidth` | `3` |
| `enabled` | `true` |
| `hoverText` | `{…}` |
| `lines` | `[]` |
| `mode` | `"horizontal"` |
| `onComplete` | — |
| `onSelect` | — |
| `onStart` | — |
| `shouldDisableSnap` | ƒ |
| `snap` | `false` |
| `snapTo` | — |

### `<chart-brush>`

Drag a box over the chart to select a range.

`Brush` — [`src/interactive/Brush.js`](../../src/interactive/Brush.js)

| property | default |
|---|---|
| `enabled` | `false` |
| `fillStyle` | `"#3h3h3h"` |
| `onBrush` | — |
| `strokeDashArray` | `"ShortDash"` |
| `strokeStyle` | `"#000000"` |
| `type` | `"2D"` |

### `<chart-callout>`

Callouts.

`Callout` — [`src/interactive/Callout.js`](../../src/interactive/Callout.js)

| property | default |
|---|---|
| `appearance` | `{…}` |
| `callouts` | `[]` |
| `currentPositionRadius` | `0` |
| `currentPositionStroke` | `"#000000"` |
| `currentPositionstrokeOpacity` | `1` |
| `currentPositionStrokeWidth` | `3` |
| `defaultText` | `"Callout"` |
| `enabled` | `true` |
| `hoverText` | `{…}` |
| `onComplete` | — |
| `onSelect` | — |
| `onStart` | — |
| `shouldDisableSnap` | ƒ |
| `snap` | `false` |
| `snapTo` | — |

### `<chart-channel-with-area>`

Two parallel lines with the space between them filled.

`ChannelWithArea` — [`src/interactive/components/ChannelWithArea.js`](../../src/interactive/components/ChannelWithArea.js)

| property | default |
|---|---|
| `dy` | — |
| `endXY` | — |
| `fillStyle` | — |
| `interactiveCursorClass` | — |
| `onDrag` | — |
| `onDragComplete` | — |
| `onDragStart` | — |
| `onHover` | — |
| `onUnHover` | — |
| `selected` | `false` |
| `startXY` | — |
| `strokeStyle` | — |
| `strokeWidth` | `1` |
| `tolerance` | `4` |
| `type` | `"LINE"` |

### `<chart-click-callback>`

An invisible listener.

`ClickCallback` — [`src/interactive/ClickCallback.js`](../../src/interactive/ClickCallback.js)

| property | default |
|---|---|
| `disablePan` | `false` |
| `onClick` | — |
| `onContextMenu` | — |
| `onDoubleClick` | — |
| `onMouseDown` | — |
| `onMouseMove` | — |
| `onPan` | — |
| `onPanEnd` | — |

### `<chart-clickable-circle>`

A grab handle at the end of a drawn object.

`ClickableCircle` — [`src/interactive/components/ClickableCircle.js`](../../src/interactive/components/ClickableCircle.js)

| property | default |
|---|---|
| `className` | `"chart-interactive-line-edge"` |
| `cx` | — |
| `cy` | — |
| `fillStyle` | `"#FFFFFF"` |
| `interactiveCursorClass` | — |
| `onDrag` | — |
| `onDragComplete` | — |
| `onDragStart` | — |
| `r` | `6` |
| `show` | `false` |
| `strokeStyle` | `"#000000"` |
| `strokeWidth` | `1` |
| `xyProvider` | — |

### `<chart-clickable-shape>`

The ✕ that deletes an alert line.

`ClickableShape` — [`src/interactive/components/ClickableShape.js`](../../src/interactive/components/ClickableShape.js)

| property | default |
|---|---|
| `fontFamily` | — |
| `fontSize` | — |
| `fontStyle` | — |
| `fontWeight` | — |
| `hovering` | `false` |
| `interactiveCursorClass` | — |
| `onClick` | — |
| `onHover` | — |
| `onUnHover` | — |
| `show` | `false` |
| `strokeStyle` | — |
| `strokeWidth` | `1` |
| `text` | — |
| `textBox` | — |
| `yValue` | — |

### `<chart-cyclic-lines>`

Cyclic lines.

`CyclicLines` — [`src/interactive/CyclicLines.js`](../../src/interactive/CyclicLines.js)

| property | default |
|---|---|
| `appearance` | `{…}` |
| `currentPositionRadius` | `0` |
| `currentPositionStroke` | `"#000000"` |
| `currentPositionstrokeOpacity` | `1` |
| `currentPositionStrokeWidth` | `3` |
| `cycles` | `[]` |
| `enabled` | `true` |
| `hoverText` | `{…}` |
| `onComplete` | — |
| `onSelect` | — |
| `onStart` | — |
| `shouldDisableSnap` | ƒ |
| `snap` | `false` |
| `snapTo` | — |

### `<chart-drawing-object-selector>`

Decides which drawn object a click belongs to, across every tool at once.

`DrawingObjectSelector` — [`src/interactive/DrawingObjectSelector.js`](../../src/interactive/DrawingObjectSelector.js)

| property | default |
|---|---|
| `drawingObjectMap` | — |
| `enabled` | `true` |
| `getInteractiveNodes` | — |
| `onDoubleClick` | — |
| `onSelect` | — |

### `<chart-each-arrow>`

One arrow: the shaft, a handle at the tail, a handle at the head.

`EachArrow` — [`src/interactive/wrapper/EachArrow.js`](../../src/interactive/wrapper/EachArrow.js)

| property | default |
|---|---|
| `appearance` | `{…}` |
| `end` | — |
| `hoverText` | `{"enable":false}` |
| `index` | — |
| `interactive` | `true` |
| `onDrag` | ƒ |
| `onDragComplete` | ƒ |
| `selected` | `false` |
| `start` | — |

### `<chart-each-arrow-mark>`

One arrow mark: a ▲ or ▼ glyph riding an InteractiveText box — draggable like any label.

`EachArrowMark` — [`src/interactive/wrapper/EachArrowMark.js`](../../src/interactive/wrapper/EachArrowMark.js)

| property | default |
|---|---|
| `appearance` | `{…}` |
| `at` | — |
| `hoverText` | `{"enable":false}` |
| `index` | — |
| `interactive` | `true` |
| `mode` | `"up"` |
| `onDrag` | ƒ |
| `onDragComplete` | ƒ |
| `selected` | `false` |

### `<chart-each-axis-line>`

One axis-anchored line and the machinery that lets it be adjusted.

`EachAxisLine` — [`src/interactive/wrapper/EachAxisLine.js`](../../src/interactive/wrapper/EachAxisLine.js)

| property | default |
|---|---|
| `edgeFill` | `"#FFFFFF"` |
| `edgeInteractiveCursor` | `"chart-move-cursor"` |
| `edgeStroke` | `"#000000"` |
| `edgeStrokeWidth` | `2` |
| `hoverText` | `{"enable":false}` |
| `index` | — |
| `lineInteractiveCursor` | `"chart-move-cursor"` |
| `mode` | `"horizontal"` |
| `onDrag` | ƒ |
| `onDragComplete` | ƒ |
| `r` | `5` |
| `selected` | `false` |
| `strokeDasharray` | `"Solid"` |
| `strokeStyle` | `"#000000"` |
| `strokeWidth` | `1` |
| `xValue` | — |
| `yValue` | — |

### `<chart-each-callout>`

One callout: a text box, a leg from the box to the anchor, and a handle on the anchor.

`EachCallout` — [`src/interactive/wrapper/EachCallout.js`](../../src/interactive/wrapper/EachCallout.js)

| property | default |
|---|---|
| `anchor` | — |
| `appearance` | `{…}` |
| `at` | — |
| `hoverText` | `{"enable":false}` |
| `index` | — |
| `interactive` | `true` |
| `onDrag` | ƒ |
| `onDragComplete` | ƒ |
| `selected` | `false` |
| `text` | `"Callout"` |

### `<chart-each-cyclic-lines>`

One set of cyclic lines and its two anchors.

`EachCyclicLines` — [`src/interactive/wrapper/EachCyclicLines.js`](../../src/interactive/wrapper/EachCyclicLines.js)

| property | default |
|---|---|
| `appearance` | `{…}` |
| `end` | — |
| `hoverText` | `{"enable":false}` |
| `index` | — |
| `interactive` | `true` |
| `offsets` | — |
| `onDrag` | ƒ |
| `onDragComplete` | ƒ |
| `selected` | `false` |
| `start` | — |

### `<chart-each-equidistant-channel>`

One equidistant channel, with five grab points.

`EachEquidistantChannel` — [`src/interactive/wrapper/EachEquidistantChannel.js`](../../src/interactive/wrapper/EachEquidistantChannel.js)

| property | default |
|---|---|
| `appearance` | `{…}` |
| `dy` | — |
| `endXY` | — |
| `hoverText` | `{"enable":false}` |
| `index` | — |
| `interactive` | `true` |
| `onDrag` | ƒ |
| `onDragComplete` | ƒ |
| `selected` | `false` |
| `startXY` | — |

### `<chart-each-fib-extension>`

One drawn extension: six level rays, their labels, and three point handles.

`EachFibExtension` — [`src/interactive/wrapper/EachFibExtension.js`](../../src/interactive/wrapper/EachFibExtension.js)

| property | default |
|---|---|
| `appearance` | `{…}` |
| `hoverText` | `{"enable":false}` |
| `index` | — |
| `interactive` | `true` |
| `onDrag` | ƒ |
| `onDragComplete` | ƒ |
| `p1` | — |
| `p2` | — |
| `p3` | — |
| `selected` | `false` |
| `yDisplayFormat` | ƒ |

### `<chart-each-fib-retracement>`

One Fibonacci retracement: six levels between a high and a low.

`EachFibRetracement` — [`src/interactive/wrapper/EachFibRetracement.js`](../../src/interactive/wrapper/EachFibRetracement.js)

| property | default |
|---|---|
| `appearance` | `{…}` |
| `hoverText` | `{"enable":false}` |
| `index` | — |
| `interactive` | `true` |
| `onDrag` | ƒ |
| `onDragComplete` | ƒ |
| `selected` | `false` |
| `type` | `"RETRACEMENT"` |
| `x1` | — |
| `x2` | — |
| `y1` | — |
| `y2` | — |
| `yDisplayFormat` | ƒ |

### `<chart-each-fib-shape>`

One drawn Fibonacci construction: the shape body and one handle per anchor.

`EachFibShape` — [`src/interactive/wrapper/EachFibShape.js`](../../src/interactive/wrapper/EachFibShape.js)

| property | default |
|---|---|
| `appearance` | `{…}` |
| `hoverText` | `{"enable":false}` |
| `index` | — |
| `interactive` | `true` |
| `levels` | — |
| `onDrag` | ƒ |
| `onDragComplete` | ƒ |
| `points` | — |
| `selected` | `false` |
| `variant` | `"arcs"` |

### `<chart-each-gann-fan>`

One Gann fan, adjustable by the two points that define its 1/1 ray.

`EachGannFan` — [`src/interactive/wrapper/EachGannFan.js`](../../src/interactive/wrapper/EachGannFan.js)

| property | default |
|---|---|
| `appearance` | `{…}` |
| `endXY` | — |
| `hoverText` | `{…}` |
| `index` | — |
| `interactive` | `true` |
| `onDrag` | ƒ |
| `onDragComplete` | ƒ |
| `selected` | `false` |
| `startXY` | — |

### `<chart-each-info-line>`

One info line: a bounded trend segment whose midpoint label reads the measurement out — price change, percent, bar count.

`EachInfoLine` — [`src/interactive/wrapper/EachInfoLine.js`](../../src/interactive/wrapper/EachInfoLine.js)

| property | default |
|---|---|
| `appearance` | `{…}` |
| `end` | — |
| `hoverText` | `{"enable":false}` |
| `index` | — |
| `interactive` | `true` |
| `onDrag` | ƒ |
| `onDragComplete` | ƒ |
| `selected` | `false` |
| `start` | — |
| `yDisplayFormat` | ƒ |

### `<chart-each-interactive-y-coordinate>`

One price alert: a line across the pane, a label at the left, and a ✕ to remove it.

`EachInteractiveYCoordinate` — [`src/interactive/wrapper/EachInteractiveYCoordinate.js`](../../src/interactive/wrapper/EachInteractiveYCoordinate.js)

| property | default |
|---|---|
| `bgFill` | — |
| `draggable` | `false` |
| `edge` | — |
| `fontFamily` | — |
| `fontSize` | — |
| `fontStyle` | — |
| `fontWeight` | — |
| `index` | — |
| `onDelete` | ƒ |
| `onDrag` | ƒ |
| `onDragComplete` | ƒ |
| `selected` | `false` |
| `stroke` | — |
| `strokeDasharray` | — |
| `strokeWidth` | `1` |
| `text` | — |
| `textBox` | — |
| `textFill` | — |
| `yValue` | — |

### `<chart-each-linear-regression-channel>`

One regression channel, adjustable only by its two ends.

`EachLinearRegressionChannel` — [`src/interactive/wrapper/EachLinearRegressionChannel.js`](../../src/interactive/wrapper/EachLinearRegressionChannel.js)

| property | default |
|---|---|
| `appearance` | `{…}` |
| `edgeInteractiveCursor` | `"chart-move-cursor"` |
| `hoverText` | `{…}` |
| `index` | — |
| `interactive` | `true` |
| `onDrag` | ƒ |
| `onDragComplete` | ƒ |
| `selected` | `false` |
| `snapTo` | ƒ |
| `x1Value` | — |
| `x2Value` | — |

### `<chart-each-measure>`

One measurement box, its two defining corners, and whole-body drag — the same three-part layout as `EachShape`, with the readout living inside the leaf.

`EachMeasure` — [`src/interactive/wrapper/EachMeasure.js`](../../src/interactive/wrapper/EachMeasure.js)

| property | default |
|---|---|
| `bodyInteractiveCursor` | `"chart-move-cursor"` |
| `edgeFill` | `"#FFFFFF"` |
| `edgeInteractiveCursor` | `"chart-move-cursor"` |
| `edgeStroke` | `"#2962FF"` |
| `edgeStrokeWidth` | `2` |
| `fillStyle` | `"rgba(41, 98, 255, 0.16)"` |
| `fontFamily` | `"-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif"` |
| `fontSize` | `11` |
| `formatDuration` | — |
| `formatPercent` | — |
| `formatPrice` | — |
| `hoverText` | `{"enable":false}` |
| `index` | — |
| `labelFill` | `"#2962FF"` |
| `mode` | `"both"` |
| `onDrag` | ƒ |
| `onDragComplete` | ƒ |
| `r` | `5` |
| `selected` | `false` |
| `strokeStyle` | `"#2962FF"` |
| `strokeWidth` | `1` |
| `textFill` | `"#FFFFFF"` |
| `x1Value` | — |
| `x2Value` | — |
| `y1Value` | — |
| `y2Value` | — |

### `<chart-each-pattern>`

One drawn pattern: the polyline body and one handle per vertex.

`EachPattern` — [`src/interactive/wrapper/EachPattern.js`](../../src/interactive/wrapper/EachPattern.js)

| property | default |
|---|---|
| `appearance` | `{…}` |
| `fillTriangles` | `false` |
| `hoverText` | `{"enable":false}` |
| `index` | — |
| `interactive` | `true` |
| `labels` | `[]` |
| `onDrag` | ƒ |
| `onDragComplete` | ƒ |
| `points` | — |
| `selected` | `false` |

### `<chart-each-pitchfork>`

One pitchfork, its three point handles, and whole-body drag.

`EachPitchfork` — [`src/interactive/wrapper/EachPitchfork.js`](../../src/interactive/wrapper/EachPitchfork.js)

| property | default |
|---|---|
| `bodyInteractiveCursor` | `"chart-move-cursor"` |
| `edgeFill` | `"#FFFFFF"` |
| `edgeInteractiveCursor` | `"chart-move-cursor"` |
| `edgeStroke` | `"#000000"` |
| `edgeStrokeWidth` | `2` |
| `fillStyle` | `"rgba(138, 175, 226, 0.2)"` |
| `hoverText` | `{"enable":false}` |
| `index` | — |
| `medianStrokeStyle` | — |
| `onDrag` | ƒ |
| `onDragComplete` | ƒ |
| `p1` | — |
| `p2` | — |
| `p3` | — |
| `r` | `5` |
| `selected` | `false` |
| `strokeStyle` | `"#000000"` |
| `strokeWidth` | `1` |
| `variant` | `"standard"` |

### `<chart-each-position>`

One position plan and its five draggable parts.

`EachPosition` — [`src/interactive/wrapper/EachPosition.js`](../../src/interactive/wrapper/EachPosition.js)

| property | default |
|---|---|
| `bodyInteractiveCursor` | `"chart-move-cursor"` |
| `edgeFill` | `"#FFFFFF"` |
| `edgeInteractiveCursor` | `"chart-ns-resize-cursor"` |
| `edgeStroke` | `"#787B86"` |
| `edgeStrokeWidth` | `2` |
| `entry` | — |
| `fontFamily` | `"-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif"` |
| `fontSize` | `11` |
| `formatPrice` | — |
| `hoverText` | `{"enable":false}` |
| `index` | — |
| `lossFill` | `"rgba(239, 83, 80, 0.2)"` |
| `lossLabelFill` | `"#EF5350"` |
| `onDrag` | ƒ |
| `onDragComplete` | ƒ |
| `profitFill` | `"rgba(38, 166, 154, 0.2)"` |
| `profitLabelFill` | `"#26A69A"` |
| `r` | `5` |
| `selected` | `false` |
| `spanInteractiveCursor` | `"chart-ew-resize-cursor"` |
| `stop` | — |
| `strokeStyle` | `"#787B86"` |
| `strokeWidth` | `1` |
| `target` | — |
| `textFill` | `"#FFFFFF"` |
| `x1Value` | — |
| `x2Value` | — |

### `<chart-each-price-label>`

One price label: a box whose text IS its own y value.

`EachPriceLabel` — [`src/interactive/wrapper/EachPriceLabel.js`](../../src/interactive/wrapper/EachPriceLabel.js)

| property | default |
|---|---|
| `appearance` | `{…}` |
| `at` | — |
| `hoverText` | `{"enable":false}` |
| `index` | — |
| `interactive` | `true` |
| `onDrag` | ƒ |
| `onDragComplete` | ƒ |
| `selected` | `false` |
| `yDisplayFormat` | ƒ |

### `<chart-each-shape>`

One drawn shape, its two corner handles, and whole-body drag.

`EachShape` — [`src/interactive/wrapper/EachShape.js`](../../src/interactive/wrapper/EachShape.js)

| property | default |
|---|---|
| `bodyInteractiveCursor` | `"chart-move-cursor"` |
| `edgeFill` | `"#FFFFFF"` |
| `edgeInteractiveCursor` | `"chart-move-cursor"` |
| `edgeStroke` | `"#000000"` |
| `edgeStrokeWidth` | `2` |
| `fillStyle` | `"rgba(138, 175, 226, 0.35)"` |
| `hoverText` | `{"enable":false}` |
| `index` | — |
| `onDrag` | ƒ |
| `onDragComplete` | ƒ |
| `r` | `5` |
| `selected` | `false` |
| `shape` | `"rectangle"` |
| `strokeDasharray` | `"Solid"` |
| `strokeStyle` | `"#000000"` |
| `strokeWidth` | `1` |
| `x1Value` | — |
| `x2Value` | — |
| `y1Value` | — |
| `y2Value` | — |

### `<chart-each-text>`

One label on the chart, draggable by its box.

`EachText` — [`src/interactive/wrapper/EachText.js`](../../src/interactive/wrapper/EachText.js)

| property | default |
|---|---|
| `bgFill` | — |
| `bgStroke` | — |
| `bgStrokeWidth` | `1` |
| `fontFamily` | — |
| `fontSize` | — |
| `fontStyle` | — |
| `fontWeight` | — |
| `hoverText` | `{…}` |
| `index` | — |
| `onDrag` | ƒ |
| `onDragComplete` | ƒ |
| `position` | — |
| `selected` | `false` |
| `text` | — |
| `textFill` | — |

### `<chart-each-trend-line>`

One trendline, and the machinery that lets it be adjusted.

`EachTrendLine` — [`src/interactive/wrapper/EachTrendLine.js`](../../src/interactive/wrapper/EachTrendLine.js)

| property | default |
|---|---|
| `edgeFill` | `"#FFFFFF"` |
| `edgeInteractiveCursor` | `"chart-move-cursor"` |
| `edgeStroke` | `"#000000"` |
| `edgeStrokeWidth` | `2` |
| `hoverText` | `{"enable":false}` |
| `index` | — |
| `lineInteractiveCursor` | `"chart-move-cursor"` |
| `onDrag` | ƒ |
| `onDragComplete` | ƒ |
| `r` | `5` |
| `selected` | `false` |
| `strokeDasharray` | `"Solid"` |
| `strokeStyle` | `"#000000"` |
| `strokeWidth` | `1` |
| `type` | `"XLINE"` |
| `x1Value` | — |
| `x2Value` | — |
| `y1Value` | — |
| `y2Value` | — |

### `<chart-equidistant-channel>`

A parallel price channel drawn in **three** clicks.

`EquidistantChannel` — [`src/interactive/EquidistantChannel.js`](../../src/interactive/EquidistantChannel.js)

| property | default |
|---|---|
| `appearance` | `{…}` |
| `channels` | `[]` |
| `currentPositionOpacity` | `1` |
| `currentPositionRadius` | `4` |
| `currentPositionStroke` | `"#000000"` |
| `currentPositionStrokeWidth` | `3` |
| `enabled` | `true` |
| `hoverText` | `{…}` |
| `onComplete` | — |
| `onSelect` | — |
| `onStart` | — |

### `<chart-fib-extension>`

Trend-based fib extension.

`FibExtension` — [`src/interactive/FibExtension.js`](../../src/interactive/FibExtension.js)

| property | default |
|---|---|
| `appearance` | `{…}` |
| `currentPositionRadius` | `0` |
| `currentPositionStroke` | `"#000000"` |
| `currentPositionstrokeOpacity` | `1` |
| `currentPositionStrokeWidth` | `3` |
| `enabled` | `true` |
| `extensions` | `[]` |
| `hoverText` | `{…}` |
| `onComplete` | — |
| `onSelect` | — |
| `onStart` | — |
| `shouldDisableSnap` | ƒ |
| `snap` | `false` |
| `snapTo` | — |

### `<chart-fib-shape>`

Fibonacci shapes.

`FibShape` — [`src/interactive/FibShape.js`](../../src/interactive/FibShape.js)

| property | default |
|---|---|
| `appearance` | `{…}` |
| `currentPositionRadius` | `0` |
| `currentPositionStroke` | `"#000000"` |
| `currentPositionstrokeOpacity` | `1` |
| `currentPositionStrokeWidth` | `3` |
| `enabled` | `true` |
| `fibShapes` | `[]` |
| `hoverText` | `{…}` |
| `levels` | — |
| `onComplete` | — |
| `onSelect` | — |
| `onStart` | — |
| `shouldDisableSnap` | ƒ |
| `snap` | `false` |
| `snapTo` | — |
| `variant` | `"arcs"` |

### `<chart-fib-time-zone>`

Fib time zones.

`FibTimeZone` — [`src/interactive/FibTimeZone.js`](../../src/interactive/FibTimeZone.js)

| property | default |
|---|---|
| `appearance` | `{…}` |
| `currentPositionRadius` | `0` |
| `currentPositionStroke` | `"#000000"` |
| `currentPositionstrokeOpacity` | `1` |
| `currentPositionStrokeWidth` | `3` |
| `enabled` | `true` |
| `hoverText` | `{…}` |
| `offsets` | `[0,1,2,3,5,8,13,21,34,55,89,144,233,377]` |
| `onComplete` | — |
| `onSelect` | — |
| `onStart` | — |
| `shouldDisableSnap` | ƒ |
| `snap` | `false` |
| `snapTo` | — |
| `zones` | `[]` |

### `<chart-fibonacci-retracement>`

Fibonacci retracement levels.

`FibonacciRetracement` — [`src/interactive/FibonacciRetracement.js`](../../src/interactive/FibonacciRetracement.js)

| property | default |
|---|---|
| `appearance` | `{…}` |
| `currentPositionOpacity` | `1` |
| `currentPositionRadius` | `4` |
| `currentPositionStroke` | `"#000000"` |
| `currentPositionStrokeWidth` | `3` |
| `enabled` | `true` |
| `hoverText` | `{…}` |
| `onComplete` | — |
| `onSelect` | — |
| `onStart` | — |
| `retracements` | `[]` |
| `type` | `"RAY"` |

### `<chart-gann-fan>`

The nine rays of a Gann fan, spreading from one point.

`GannFan` — [`src/interactive/components/GannFan.js`](../../src/interactive/components/GannFan.js)

| property | default |
|---|---|
| `endXY` | — |
| `fillStyle` | `[]` |
| `fontFamily` | — |
| `fontFill` | — |
| `fontSize` | — |
| `interactiveCursorClass` | — |
| `onDrag` | — |
| `onDragComplete` | — |
| `onDragStart` | — |
| `onHover` | — |
| `onUnHover` | — |
| `selected` | `false` |
| `startXY` | — |
| `strokeStyle` | — |
| `strokeWidth` | `1` |
| `tolerance` | `4` |

### `<chart-gann-fan-tool>`

Gann fans.

`GannFan` — [`src/interactive/GannFan.js`](../../src/interactive/GannFan.js)

| property | default |
|---|---|
| `appearance` | `{…}` |
| `currentPositionOpacity` | `1` |
| `currentPositionRadius` | `4` |
| `currentPositionStroke` | `"#000000"` |
| `currentPositionStrokeWidth` | `3` |
| `enabled` | `true` |
| `fans` | `[]` |
| `hoverText` | `{…}` |
| `onComplete` | — |
| `onSelect` | — |
| `onStart` | — |

### `<chart-hover-text>`

The hint that follows the cursor while a drawn object can be grabbed.

`HoverTextNearMouse` — [`src/interactive/components/HoverTextNearMouse.js`](../../src/interactive/components/HoverTextNearMouse.js)

| property | default |
|---|---|
| `bgFill` | `"#FA9325"` |
| `bgHeight` | `"auto"` |
| `bgOpacity` | `0.5` |
| `bgWidth` | `"auto"` |
| `fill` | `"#000000"` |
| `fontFamily` | `"-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif"` |
| `fontSize` | `12` |
| `show` | `false` |
| `text` | `""` |

### `<chart-info-line>`

Info line.

`InfoLine` — [`src/interactive/InfoLine.js`](../../src/interactive/InfoLine.js)

| property | default |
|---|---|
| `appearance` | `{…}` |
| `currentPositionRadius` | `0` |
| `currentPositionStroke` | `"#000000"` |
| `currentPositionstrokeOpacity` | `1` |
| `currentPositionStrokeWidth` | `3` |
| `enabled` | `true` |
| `hoverText` | `{…}` |
| `infoLines` | `[]` |
| `onComplete` | — |
| `onSelect` | — |
| `onStart` | — |
| `shouldDisableSnap` | ƒ |
| `snap` | `false` |
| `snapTo` | — |
| `yDisplayFormat` | ƒ |

### `<chart-interactive-arrow>`

An arrow the user drew: a bounded line with a filled head at its end.

`InteractiveArrow` — [`src/interactive/components/InteractiveArrow.js`](../../src/interactive/components/InteractiveArrow.js)

| property | default |
|---|---|
| `headSize` | `10` |
| `interactiveCursorClass` | — |
| `onDrag` | — |
| `onDragComplete` | — |
| `onDragStart` | — |
| `onHover` | — |
| `onUnHover` | — |
| `selected` | `false` |
| `strokeStyle` | `"#000000"` |
| `strokeWidth` | `2` |
| `tolerance` | `7` |
| `x1Value` | — |
| `x2Value` | — |
| `y1Value` | — |
| `y2Value` | — |

### `<chart-interactive-cycles>`

Cyclic lines: two points set the period, vertical lines repeat rightward to the domain edge.

`InteractiveCycles` — [`src/interactive/components/InteractiveCycles.js`](../../src/interactive/components/InteractiveCycles.js)

| property | default |
|---|---|
| `interactiveCursorClass` | — |
| `offsets` | — |
| `onDrag` | — |
| `onDragComplete` | — |
| `onDragStart` | — |
| `onHover` | — |
| `onUnHover` | — |
| `selected` | `false` |
| `strokeStyle` | `"#000000"` |
| `strokeWidth` | `1` |
| `tolerance` | `4` |
| `x1Value` | — |
| `x2Value` | — |
| `y1Value` | — |
| `y2Value` | — |

### `<chart-interactive-fib-shape>`

One Fibonacci construction: fan, arcs, circles, spiral or wedge over the same anchors.

`InteractiveFibShape` — [`src/interactive/components/InteractiveFibShape.js`](../../src/interactive/components/InteractiveFibShape.js)

| property | default |
|---|---|
| `fontFamily` | `"-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif"` |
| `fontFill` | `"#000000"` |
| `fontSize` | `11` |
| `interactiveCursorClass` | — |
| `levels` | — |
| `onDrag` | — |
| `onDragComplete` | — |
| `onDragStart` | — |
| `onHover` | — |
| `onUnHover` | — |
| `points` | — |
| `selected` | `false` |
| `strokeStyle` | `"#000000"` |
| `strokeWidth` | `1` |
| `tolerance` | `7` |
| `variant` | `"arcs"` |

### `<chart-interactive-label>`

A label placed by a provider function rather than by data coordinates.

`Text` — [`src/interactive/components/Text.js`](../../src/interactive/components/Text.js)

| property | default |
|---|---|
| `fillStyle` | `"#000000"` |
| `fontFamily` | `"-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif"` |
| `fontSize` | `12` |
| `selected` | `false` |
| `text` | `""` |
| `xyProvider` | — |

### `<chart-interactive-measure>`

A measurement box between two points: price change, percent, bar count and elapsed time, depending on `mode` (`price`, `date` or `both`).

`InteractiveMeasure` — [`src/interactive/components/InteractiveMeasure.js`](../../src/interactive/components/InteractiveMeasure.js)

| property | default |
|---|---|
| `fillStyle` | `"rgba(41, 98, 255, 0.16)"` |
| `fontFamily` | `"-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif"` |
| `fontSize` | `11` |
| `formatDuration` | ƒ |
| `formatPercent` | ƒ |
| `formatPrice` | ƒ |
| `interactiveCursorClass` | — |
| `labelFill` | `"#2962FF"` |
| `mode` | `"both"` |
| `onDrag` | — |
| `onDragComplete` | — |
| `onDragStart` | — |
| `onHover` | — |
| `onUnHover` | — |
| `selected` | `false` |
| `strokeStyle` | `"#2962FF"` |
| `strokeWidth` | `1` |
| `textFill` | `"#FFFFFF"` |
| `tolerance` | `4` |
| `x1Value` | — |
| `x2Value` | — |
| `y1Value` | — |
| `y2Value` | — |

### `<chart-interactive-pitchfork>`

An Andrews pitchfork (or its Schiff variants): a median from three points and two parallel tines.

`InteractivePitchfork` — [`src/interactive/components/InteractivePitchfork.js`](../../src/interactive/components/InteractivePitchfork.js)

| property | default |
|---|---|
| `fillStyle` | `"rgba(138, 175, 226, 0.2)"` |
| `interactiveCursorClass` | — |
| `medianStrokeStyle` | — |
| `onDrag` | — |
| `onDragComplete` | — |
| `onDragStart` | — |
| `onHover` | — |
| `onUnHover` | — |
| `p1` | — |
| `p2` | — |
| `p3` | — |
| `selected` | `false` |
| `strokeStyle` | `"#000000"` |
| `strokeWidth` | `1` |
| `tolerance` | `4` |
| `variant` | `"standard"` |

### `<chart-interactive-polyline>`

A hand-drawn polyline through N points, with per-vertex labels — the body every pattern tool shares.

`InteractivePolyline` — [`src/interactive/components/InteractivePolyline.js`](../../src/interactive/components/InteractivePolyline.js)

| property | default |
|---|---|
| `fillStyle` | `"rgba(138, 175, 226, 0.2)"` |
| `fillTriangles` | `false` |
| `fontFamily` | `"-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif"` |
| `fontFill` | `"#000000"` |
| `fontSize` | `11` |
| `interactiveCursorClass` | — |
| `labels` | `[]` |
| `onDrag` | — |
| `onDragComplete` | — |
| `onDragStart` | — |
| `onHover` | — |
| `onUnHover` | — |
| `points` | `[]` |
| `selected` | `false` |
| `strokeStyle` | `"#000000"` |
| `strokeWidth` | `1` |
| `tolerance` | `4` |

### `<chart-interactive-position>`

A position plan drawn on the chart: entry, target and stop levels over a bar span, with the profit and loss zones filled and the risk/reward ratio read out.

`InteractivePosition` — [`src/interactive/components/InteractivePosition.js`](../../src/interactive/components/InteractivePosition.js)

| property | default |
|---|---|
| `entry` | — |
| `entryStrokeDasharray` | `"ShortDash2"` |
| `fontFamily` | `"-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif"` |
| `fontSize` | `11` |
| `formatPrice` | ƒ |
| `interactiveCursorClass` | — |
| `lossFill` | `"rgba(239, 83, 80, 0.2)"` |
| `lossLabelFill` | `"#EF5350"` |
| `onDrag` | — |
| `onDragComplete` | — |
| `onDragStart` | — |
| `onHover` | — |
| `onUnHover` | — |
| `profitFill` | `"rgba(38, 166, 154, 0.2)"` |
| `profitLabelFill` | `"#26A69A"` |
| `selected` | `false` |
| `stop` | — |
| `strokeStyle` | `"#787B86"` |
| `strokeWidth` | `1` |
| `target` | — |
| `textFill` | `"#FFFFFF"` |
| `tolerance` | `4` |
| `x1Value` | — |
| `x2Value` | — |

### `<chart-interactive-shape>`

A filled rectangle or ellipse the user drew, spanned between two data-space corners.

`InteractiveShape` — [`src/interactive/components/InteractiveShape.js`](../../src/interactive/components/InteractiveShape.js)

| property | default |
|---|---|
| `fillStyle` | `"rgba(138, 175, 226, 0.35)"` |
| `interactiveCursorClass` | — |
| `onDrag` | — |
| `onDragComplete` | — |
| `onDragStart` | — |
| `onHover` | — |
| `onUnHover` | — |
| `selected` | `false` |
| `shape` | `"rectangle"` |
| `strokeDasharray` | `"Solid"` |
| `strokeStyle` | `"#000000"` |
| `strokeWidth` | `1` |
| `tolerance` | `4` |
| `x1Value` | — |
| `x2Value` | — |
| `y1Value` | — |
| `y2Value` | — |

### `<chart-interactive-straight-line>`

A straight line the user drew — bounded, one-ended or crossing the whole pane.

`InteractiveStraightLine` — [`src/interactive/components/InteractiveStraightLine.js`](../../src/interactive/components/InteractiveStraightLine.js)

| property | default |
|---|---|
| `edgeFill` | `"#FFFFFF"` |
| `edgeStroke` | `"#000000"` |
| `edgeStrokeWidth` | `3` |
| `interactiveCursorClass` | — |
| `onDrag` | — |
| `onDragComplete` | — |
| `onDragStart` | — |
| `onHover` | — |
| `onUnHover` | — |
| `r` | `10` |
| `selected` | `false` |
| `strokeDasharray` | `"Solid"` |
| `strokeStyle` | — |
| `strokeWidth` | `1` |
| `tolerance` | `7` |
| `type` | `"LINE"` |
| `withEdge` | `false` |
| `x1Value` | — |
| `x2Value` | — |
| `y1Value` | — |
| `y2Value` | — |

### `<chart-interactive-text>`

A label the user placed on the chart.

`InteractiveText` — [`src/interactive/components/InteractiveText.js`](../../src/interactive/components/InteractiveText.js)

| property | default |
|---|---|
| `bgFillStyle` | — |
| `bgStroke` | — |
| `bgStrokeWidth` | — |
| `fontFamily` | — |
| `fontSize` | — |
| `fontStyle` | — |
| `fontWeight` | `"normal"` |
| `interactiveCursorClass` | — |
| `onDrag` | — |
| `onDragComplete` | — |
| `onDragStart` | — |
| `onHover` | — |
| `onUnHover` | — |
| `position` | — |
| `selected` | `false` |
| `text` | — |
| `textFill` | — |
| `tolerance` | `4` |
| `type` | `"SD"` |

### `<chart-interactive-text-tool>`

Labels on the chart.

`InteractiveText` — [`src/interactive/InteractiveText.js`](../../src/interactive/InteractiveText.js)

| property | default |
|---|---|
| `defaultText` | `{…}` |
| `enabled` | `true` |
| `hoverText` | `{…}` |
| `onChoosePosition` | — |
| `onDragComplete` | — |
| `onSelect` | — |
| `textList` | `[]` |

### `<chart-interactive-y-coordinate>`

A price alert: a line across the pane with a label at the left and a ✕ to remove it.

`InteractiveYCoordinate` — [`src/interactive/components/InteractiveYCoordinate.js`](../../src/interactive/components/InteractiveYCoordinate.js)

| property | default |
|---|---|
| `bgFillStyle` | — |
| `edge` | — |
| `fontFamily` | — |
| `fontSize` | — |
| `fontStyle` | — |
| `fontWeight` | `"normal"` |
| `hovering` | `false` |
| `interactiveCursorClass` | — |
| `onDrag` | — |
| `onDragComplete` | — |
| `onDragStart` | — |
| `onHover` | — |
| `onUnHover` | — |
| `selected` | `false` |
| `strokeDasharray` | — |
| `strokeStyle` | — |
| `strokeWidth` | `1` |
| `text` | — |
| `textBox` | — |
| `textFill` | — |
| `tolerance` | `4` |
| `yValue` | — |

### `<chart-interactive-y-coordinate-tool>`

Price alerts.

`InteractiveYCoordinate` — [`src/interactive/InteractiveYCoordinate.js`](../../src/interactive/InteractiveYCoordinate.js)

| property | default |
|---|---|
| `defaultPriceCoordinate` | `{…}` |
| `enabled` | `true` |
| `hoverText` | `{…}` |
| `onChoosePosition` | — |
| `onDelete` | — |
| `onDragComplete` | — |
| `onSelect` | — |
| `yCoordinateList` | `[]` |

### `<chart-linear-regression-channel>`

A least-squares fit through the closes between two x values, with a band either side.

`LinearRegressionChannelWithArea` — [`src/interactive/components/LinearRegressionChannelWithArea.js`](../../src/interactive/components/LinearRegressionChannelWithArea.js)

| property | default |
|---|---|
| `fillStyle` | — |
| `interactiveCursorClass` | — |
| `onDrag` | — |
| `onDragComplete` | — |
| `onDragStart` | — |
| `onHover` | — |
| `onUnHover` | — |
| `selected` | `false` |
| `strokeStyle` | — |
| `strokeWidth` | `1` |
| `tolerance` | `4` |
| `type` | `"SD"` |
| `x1Value` | — |
| `x2Value` | — |

### `<chart-measure>`

Measurement boxes.

`Measure` — [`src/interactive/Measure.js`](../../src/interactive/Measure.js)

| property | default |
|---|---|
| `appearance` | `{…}` |
| `currentPositionRadius` | `0` |
| `currentPositionStroke` | `"#000000"` |
| `currentPositionstrokeOpacity` | `1` |
| `currentPositionStrokeWidth` | `3` |
| `enabled` | `true` |
| `hoverText` | `{…}` |
| `measures` | `[]` |
| `mode` | `"both"` |
| `onComplete` | — |
| `onSelect` | — |
| `onStart` | — |
| `shouldDisableSnap` | ƒ |
| `snap` | `false` |
| `snapTo` | — |

### `<chart-mouse-location-indicator>`

Turns pointer position into a data value, and reports it to whichever tool is drawing.

`MouseLocationIndicator` — [`src/interactive/components/MouseLocationIndicator.js`](../../src/interactive/components/MouseLocationIndicator.js)

| property | default |
|---|---|
| `disablePan` | `true` |
| `enabled` | `false` |
| `onClick` | — |
| `onMouseDown` | — |
| `onMouseMove` | — |
| `opacity` | `1` |
| `r` | `0` |
| `shouldDisableSnap` | ƒ |
| `snap` | `true` |
| `snapTo` | — |
| `stroke` | `"#000000"` |
| `strokeWidth` | `1` |

### `<chart-path>`

Free path.

`PathTool` — [`src/interactive/PathTool.js`](../../src/interactive/PathTool.js)

| property | default |
|---|---|
| `appearance` | `{…}` |
| `currentPositionRadius` | `0` |
| `currentPositionStroke` | `"#000000"` |
| `currentPositionstrokeOpacity` | `1` |
| `currentPositionStrokeWidth` | `3` |
| `enabled` | `true` |
| `hoverText` | `{…}` |
| `onComplete` | — |
| `onSelect` | — |
| `onStart` | — |
| `paths` | `[]` |
| `shouldDisableSnap` | ƒ |
| `snap` | `false` |
| `snapTo` | — |

### `<chart-pattern>`

Pattern tools.

`PatternTool` — [`src/interactive/PatternTool.js`](../../src/interactive/PatternTool.js)

| property | default |
|---|---|
| `appearance` | `{…}` |
| `currentPositionRadius` | `0` |
| `currentPositionStroke` | `"#000000"` |
| `currentPositionstrokeOpacity` | `1` |
| `currentPositionStrokeWidth` | `3` |
| `enabled` | `true` |
| `hoverText` | `{…}` |
| `onComplete` | — |
| `onSelect` | — |
| `onStart` | — |
| `patterns` | `[]` |
| `shouldDisableSnap` | ƒ |
| `snap` | `false` |
| `snapTo` | — |
| `variant` | `"xabcd"` |

### `<chart-pitchfork>`

Pitchforks.

`Pitchfork` — [`src/interactive/Pitchfork.js`](../../src/interactive/Pitchfork.js)

| property | default |
|---|---|
| `appearance` | `{…}` |
| `currentPositionRadius` | `0` |
| `currentPositionStroke` | `"#000000"` |
| `currentPositionstrokeOpacity` | `1` |
| `currentPositionStrokeWidth` | `3` |
| `enabled` | `true` |
| `forks` | `[]` |
| `hoverText` | `{…}` |
| `onComplete` | — |
| `onSelect` | — |
| `onStart` | — |
| `shouldDisableSnap` | ƒ |
| `snap` | `false` |
| `snapTo` | — |
| `variant` | `"standard"` |

### `<chart-position-tool>`

Position plans.

`PositionTool` — [`src/interactive/PositionTool.js`](../../src/interactive/PositionTool.js)

| property | default |
|---|---|
| `appearance` | `{…}` |
| `barSpan` | `20` |
| `currentPositionRadius` | `0` |
| `currentPositionStroke` | `"#000000"` |
| `currentPositionstrokeOpacity` | `1` |
| `currentPositionStrokeWidth` | `3` |
| `enabled` | `true` |
| `hoverText` | `{…}` |
| `onComplete` | — |
| `onSelect` | — |
| `onStart` | — |
| `positions` | `[]` |
| `riskReward` | `2` |
| `shouldDisableSnap` | ƒ |
| `side` | `"long"` |
| `snap` | `false` |
| `snapTo` | — |
| `stopFraction` | `0.02` |

### `<chart-price-label>`

Price labels.

`PriceLabel` — [`src/interactive/PriceLabel.js`](../../src/interactive/PriceLabel.js)

| property | default |
|---|---|
| `appearance` | `{…}` |
| `currentPositionRadius` | `0` |
| `currentPositionStroke` | `"#000000"` |
| `currentPositionstrokeOpacity` | `1` |
| `currentPositionStrokeWidth` | `3` |
| `enabled` | `true` |
| `hoverText` | `{…}` |
| `labels` | `[]` |
| `onComplete` | — |
| `onSelect` | — |
| `shouldDisableSnap` | ƒ |
| `snap` | `false` |
| `snapTo` | — |
| `yDisplayFormat` | ƒ |

### `<chart-shape-tool>`

Rectangles and ellipses.

`ShapeTool` — [`src/interactive/ShapeTool.js`](../../src/interactive/ShapeTool.js)

| property | default |
|---|---|
| `appearance` | `{…}` |
| `currentPositionRadius` | `0` |
| `currentPositionStroke` | `"#000000"` |
| `currentPositionstrokeOpacity` | `1` |
| `currentPositionStrokeWidth` | `3` |
| `enabled` | `true` |
| `hoverText` | `{…}` |
| `onComplete` | — |
| `onSelect` | — |
| `onStart` | — |
| `shape` | `"rectangle"` |
| `shapes` | `[]` |
| `shouldDisableSnap` | ƒ |
| `snap` | `false` |
| `snapTo` | — |

### `<chart-standard-deviation-channel>`

Regression channel over a chosen range.

`StandardDeviationChannel` — [`src/interactive/StandardDeviationChannel.js`](../../src/interactive/StandardDeviationChannel.js)

| property | default |
|---|---|
| `appearance` | `{…}` |
| `channels` | `[]` |
| `currentPositionOpacity` | `1` |
| `currentPositionRadius` | `4` |
| `currentPositionStroke` | `"#000000"` |
| `currentPositionStrokeWidth` | `3` |
| `enabled` | `true` |
| `hoverText` | `{…}` |
| `onComplete` | — |
| `onStart` | — |
| `snapTo` | ƒ |

### `<chart-trend-line>`

Draw trendlines by hand.

`TrendLine` — [`src/interactive/TrendLine.js`](../../src/interactive/TrendLine.js)

| property | default |
|---|---|
| `appearance` | `{…}` |
| `currentPositionRadius` | `0` |
| `currentPositionStroke` | `"#000000"` |
| `currentPositionstrokeOpacity` | `1` |
| `currentPositionStrokeWidth` | `3` |
| `enabled` | `true` |
| `hoverText` | `{…}` |
| `onComplete` | — |
| `onSelect` | — |
| `onStart` | — |
| `shouldDisableSnap` | ƒ |
| `snap` | `true` |
| `snapTo` | — |
| `trends` | `[]` |
| `type` | `"XLINE"` |

### `<chart-zoom-buttons>`

Zoom in, zoom out, reset — as real SVG buttons.

`ZoomButtons` — [`src/interactive/ZoomButtons.js`](../../src/interactive/ZoomButtons.js)

| property | default |
|---|---|
| `fill` | `"#ffffff"` |
| `fillOpacity` | `0.75` |
| `heightFromBase` | `32` |
| `onReset` | — |
| `r` | `16` |
| `stroke` | `"#e0e3eb"` |
| `strokeWidth` | `1` |
| `textFill` | `"#000000"` |
| `zoomMultiplier` | `1.5` |

