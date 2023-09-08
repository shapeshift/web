export const isValidDate = (date: string | number | Date) => !isNaN(new Date(date).valueOf())
