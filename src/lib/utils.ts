// we don't want utils to mutate by default, so spreading here is ok
export const upsertArray = <T extends unknown>(arr: T[], item: T): T[] =>
  arr.includes(item) ? arr : [...arr, item]
