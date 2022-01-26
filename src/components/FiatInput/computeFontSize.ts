const BASE_FONT_SIZE_PX = 16

const measureTextWidth = (ctx: CanvasRenderingContext2D, fontFamily: string, text: string) => {
  ctx.font = `${BASE_FONT_SIZE_PX}px ${fontFamily}`
  const textMetrics = ctx.measureText(text)
  // More accurate than textMetrics.width, see https://developer.mozilla.org/en-US/docs/Web/API/TextMetrics#measuring_text_width
  return Math.abs(textMetrics.actualBoundingBoxLeft) + Math.abs(textMetrics.actualBoundingBoxRight)
}

const getFittedTextSize = (maxWidth: number, actualWidth: number) => {
  const fontSize = (maxWidth / actualWidth) * BASE_FONT_SIZE_PX
  const fontSize1Dp = Math.round(fontSize * 10) / 10
  return fontSize1Dp
}

/**
 * Calculates the font size for an HTML element (if the text it presently displays is clipped) to
 * be set to that would avoid the clipping.
 * @param canvas The <canvas> element to be used to take text metric measurements.
 * @param input The <input> element to be examined for text clipping.
 * @param width The width that the text being displayed should not exceed.
 * @returns `null` if font size could not be computed; otherwise, returns the font size (in pixels)
 * that the element should be set to that would avoid text from clipping.
 */
export const computeFontSize = (
  canvas: HTMLCanvasElement,
  fontFamily: string,
  text: string,
  width: number
): number | null => {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return null
  }

  const textWidthAtBaseSize = measureTextWidth(ctx, fontFamily, text)
  return getFittedTextSize(width, textWidthAtBaseSize)
}
