/** Which d3 time-format pattern each level of detail prints with. */
export const defaultFormatters = {
    yearFormat: "%Y",
    quarterFormat: "%b",
    monthFormat: "%b",
    weekFormat: "%e",
    dayFormat: "%e",
    hourFormat: "%H:%M",
    minuteFormat: "%H:%M",
    secondFormat: "%H:%M:%S",
    milliSecondFormat: ".%L",
}

/**
 * The ladder of significance, coarsest first.
 *
 * Every point in the data is tested against these in order and takes the level of the
 * first one that matches, so "the first trading day of a new decade" outranks "a
 * Tuesday". The axis then draws only the levels it has room for, which is how the same
 * chart shows years when zoomed out and minutes when zoomed in.
 *
 * The index in this array is not the level: level counts up from the bottom, so the
 * last entry is level 0 and the first is level 22.
 */
export const levelDefinition = [
    /* 22 */ (row, date) => row.startOfYear && date.getFullYear() % 12 === 0 && "yearFormat",
    /* 21 */ (row, date) => row.startOfYear && date.getFullYear() % 4 === 0 && "yearFormat",
    /* 20 */ (row, date) => row.startOfYear && date.getFullYear() % 2 === 0 && "yearFormat",
    /* 19 */ row => row.startOfYear && "yearFormat",
    /* 18 */ row => row.startOfQuarter && "quarterFormat",
    /* 17 */ row => row.startOfMonth && "monthFormat",
    /* 16 */ row => row.startOfWeek && "weekFormat",
    /* 15 */ (row, date, i) => row.startOfDay && i % 2 === 0 && "dayFormat",
    /* 14 */ row => row.startOfDay && "dayFormat",
    /* 13 */ row => row.startOfHalfDay && "hourFormat",
    /* 12 */ row => row.startOfQuarterDay && "hourFormat",
    /* 11 */ row => row.startOfEighthOfADay && "hourFormat",
    /* 10 */ (row, date) => row.startOfHour && date.getHours() % 2 === 0 && "hourFormat",
    /*  9 */ row => row.startOfHour && "hourFormat",
    /*  8 */ row => row.startOf30Minutes && "minuteFormat",
    /*  7 */ row => row.startOf15Minutes && "minuteFormat",
    /*  6 */ row => row.startOf5Minutes && "minuteFormat",
    /*  5 */ row => row.startOfMinute && "minuteFormat",
    /*  4 */ row => row.startOf30Seconds && "secondFormat",
    /*  3 */ row => row.startOf15Seconds && "secondFormat",
    /*  2 */ row => row.startOf5Seconds && "secondFormat",
    /*  1 */ row => row.startOfSecond && "secondFormat",
    /*  0 */ () => "milliSecondFormat",
]
