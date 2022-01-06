// we don't want utils to mutate by default, so spreading here is ok
export const upsertArray = <T extends unknown>(arr: T[], item: T): T[] =>
  arr.includes(item) ? arr : [...arr, item]

// recursive function to check if two objects are equal
export const checkObjEquality = (a: any, b: any) => {
  if (a === b) return true
  if (typeof a != 'object' || typeof b != 'object' || a == null || b == null) return false
  let keysA = Object.keys(a),
    keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  for (let key of keysA) {
    if (!keysB.includes(key)) return false
    if (typeof a[key] === 'function' || typeof b[key] === 'function') {
      if (a[key].toString() !== b[key].toString()) return false
    } else {
      if (!checkObjEquality(a[key], b[key])) return false
    }
  }

  return true
}