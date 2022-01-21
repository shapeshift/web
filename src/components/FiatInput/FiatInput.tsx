import { useMediaQuery } from '@chakra-ui/media-query'
import { Input, InputProps } from '@chakra-ui/react'
import { useRef } from 'react'
import { width as rightSidebarWidth } from 'components/Layout/RightSidebar'
import { breakpoints, theme } from 'theme/theme'

import { computeFontSize } from './computeFontSize'

const parentPadding = 2 * 24
const defaultFontSizeCss = '5xl'
const defaultFontSizeRem = theme.fontSizes[defaultFontSizeCss]
const maxFontSize = parseInt(defaultFontSizeRem) * 16

const getLgFontSize = (canvas: HTMLCanvasElement, fontFamily: string, text: string) => {
  const maxWidth = rightSidebarWidth - parentPadding
  const maxFontSize = computeFontSize(canvas, fontFamily, text, maxWidth - 10)
  return `${maxFontSize}px`
}

const getSmToLgResponsiveFontSize = (
  canvas: HTMLCanvasElement,
  fontFamily: string,
  text: string
) => {
  const maxBreakpoint = parseInt(breakpoints['lg'])
  const minBreakpoint = 500
  const maxWidth = maxBreakpoint - parentPadding
  const minWidth = parseInt(breakpoints['sm']) - parentPadding

  let lgMaxFontSize = computeFontSize(canvas, fontFamily, text, maxWidth)!
  let smMaxFontSize = computeFontSize(canvas, fontFamily, text, minWidth)!
  lgMaxFontSize = lgMaxFontSize >= maxFontSize ? maxFontSize : lgMaxFontSize
  smMaxFontSize = smMaxFontSize >= maxFontSize ? maxFontSize : smMaxFontSize

  // Calculate a clamp expr for linear interpolation, y = mx + b
  // https://css-tricks.com/linearly-scale-font-size-with-css-clamp-based-on-the-viewport/
  const m = (lgMaxFontSize - smMaxFontSize) / (maxBreakpoint - minBreakpoint)
  const mAsVw = m * 100
  const b = smMaxFontSize - minBreakpoint * m

  return `clamp(${smMaxFontSize}px, ${b}px + ${mAsVw}vw, ${lgMaxFontSize}px)`
}

export const FiatInput = (props: InputProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [isLargerThanLg] = useMediaQuery(`(min-width: ${breakpoints['lg']})`)

  let fontSizeCss = defaultFontSizeCss
  if (canvasRef.current && inputRef.current && !!props.value) {
    const fontFamily = getComputedStyle(inputRef.current)?.fontFamily
    const text = inputRef.current.value

    if (isLargerThanLg) {
      fontSizeCss = getLgFontSize(canvasRef.current, fontFamily, text)
    } else {
      fontSizeCss = getSmToLgResponsiveFontSize(canvasRef.current, fontFamily, text)
    }
  }

  return (
    <>
      <canvas ref={canvasRef} width={0} height={0} />
      <Input
        ref={inputRef}
        variant='unstyled'
        size='xl'
        textAlign='center'
        fontSize={fontSizeCss}
        mb={6}
        placeholder='$0.00'
        {...props}
      />
    </>
  )
}
