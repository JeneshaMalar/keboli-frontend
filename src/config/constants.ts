export const DATE_FORMATS = {
    SHORT: {
        month: 'short' as const,
        day: 'numeric' as const,
        year: 'numeric' as const,
    },
    /** Threshold in minutes before switching from relative to absolute time display */
    RELATIVE_THRESHOLD_MINS: 60,
};

export const PAGINATION = {
    DEFAULT_PAGE_SIZE: 10,
};
