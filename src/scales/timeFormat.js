import { timeSecond, timeMinute, timeHour, timeDay, timeWeek, timeMonth, timeYear } from "d3-time"
import { timeFormat as d3TimeFormat } from "d3-time-format"

const formatMillisecond = d3TimeFormat(".%L")
const formatSecond = d3TimeFormat(":%S")
const formatMinute = d3TimeFormat("%H:%M")
const formatHour = d3TimeFormat("%H:%M")
const formatDay = d3TimeFormat("%e")
const formatWeek = d3TimeFormat("%e")
const formatMonth = d3TimeFormat("%b")
const formatYear = d3TimeFormat("%Y")

/**
 * Label a date at the coarsest resolution that still identifies it: a date on a year
 * boundary reads "2023", one mid-month reads "15", one mid-hour reads "13:45".
 *
 * Each test asks whether truncating to a unit moves the date — if it does, the date
 * carries detail below that unit and needs the finer format.
 */
export const timeFormat = date =>
    (timeSecond(date) < date
        ? formatMillisecond
        : timeMinute(date) < date
          ? formatSecond
          : timeHour(date) < date
            ? formatMinute
            : timeDay(date) < date
              ? formatHour
              : timeMonth(date) < date
                ? timeWeek(date) < date
                    ? formatDay
                    : formatWeek
                : timeYear(date) < date
                  ? formatMonth
                  : formatYear)(date)
