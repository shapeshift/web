export const getFiatNumberFractionDigits = (num: number): number => {
  let fractionDigits: number

  if (num >= 1 || 0.000001 > num) return 0
  else if (1 > num && num >= 0.1) fractionDigits = 3
  else if (0.1 > num && num >= 0.01) fractionDigits = 4
  else if (0.01 > num && num >= 0.001) fractionDigits = 5
  else if (0.001 > num && num >= 0.0001) fractionDigits = 6
  else if (0.0001 > num && num >= 0.00001) fractionDigits = 7
  else if (0.00001 > num && num >= 0.000001) fractionDigits = 8
  else return 0

  return fractionDigits
}
