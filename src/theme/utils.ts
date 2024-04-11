/**
 * Add opacity information to a hex color
 * @param amount opacity value from 0 to 100
 * @param hexColor
 */
export function opacify(amount: number, hexColor: string): string {
  if (!hexColor.startsWith('#')) {
    return hexColor
  }

  let normalizedHexColor = hexColor

  // Expand short hex code to full form
  if (hexColor.length === 4) {
    normalizedHexColor =
      '#' + hexColor[1] + hexColor[1] + hexColor[2] + hexColor[2] + hexColor[3] + hexColor[3]
  }

  if (normalizedHexColor.length !== 7) {
    throw new Error(
      `opacify: provided color ${hexColor} was not in hexadecimal format (e.g. #000000 or #000)`,
    )
  }

  if (amount < 0 || amount > 100) {
    throw new Error('opacify: provided amount should be between 0 and 100')
  }

  const opacityHex = Math.round((amount / 100) * 255)
    .toString(16)
    .padStart(2, '0')
  return `${normalizedHexColor}${opacityHex}`
}

export function lightenColor(hex: string, percent: number): string {
  // Remove the hash sign if it's there
  hex = hex.replace(/^#/, '')

  // Convert hex to RGB
  let r = parseInt(hex.substring(0, 2), 16)
  let g = parseInt(hex.substring(2, 4), 16)
  let b = parseInt(hex.substring(4, 6), 16)

  // Calculate the lightening factor
  let lightening = 1 + percent

  // Apply lightening with a cap at 255
  r = Math.min(255, Math.round(r * lightening))
  g = Math.min(255, Math.round(g * lightening))
  b = Math.min(255, Math.round(b * lightening))

  // Convert back to hex
  const result = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
    .toString(16)
    .padStart(2, '0')}`

  return result
}
