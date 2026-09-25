import { timeFormatFor } from "../core/i18n.js"
import { timeSecond, timeMinute, timeHour, timeDay, timeWeek, timeMonth, timeYear } from "d3-time"
import { timeFormat as d3TimeFormat } from "d3-time-format"

const labels = format => ({
    millisecond: format(".%L"),
    second: format(":%S"),
    minute: format("%H:%M"),
    hour: format("%H:%M"),
    day: format("%e"),
    week: format("%e"),
    month: format("%b"),
    year: format("%Y"),
})

/**
 * Label a date at the coarsest resolution that still identifies it: a date on a year
 * boundary reads "2023", one mid-month reads "15", one mid-hour reads "13:45".
 *
 * Each test asks whether truncating to a unit moves the date — if it does, the date
 * carries detail below that unit and needs the finer format.
 */
const labelling =
    ({ millisecond, second, minute, hour, day, week, month, year }) =>
    date =>
        (timeSecond(date) < date
            ? millisecond
            : timeMinute(date) < date
              ? second
              : timeHour(date) < date
                ? minute
                : timeDay(date) < date
                  ? hour
                  : timeMonth(date) < date
                    ? timeWeek(date) < date
                        ? day
                        : week
                    : timeYear(date) < date
                      ? month
                      : year)(date)

export const timeFormat = labelling(labels(d3TimeFormat))

const byLocale = new Map()

/** Cùng bậc thang ấy, nói theo `locale` — tên tháng của ngôn ngữ biểu đồ, không của d3 toàn cục. */
export const timeFormatIn = locale => {
    if (!locale) return timeFormat
    if (!byLocale.has(locale)) byLocale.set(locale, labelling(labels(timeFormatFor(locale))))
    return byLocale.get(locale)
}
