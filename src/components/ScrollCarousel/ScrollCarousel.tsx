import { ArrowBackIcon, ArrowForwardIcon } from '@chakra-ui/icons'
import type { BoxProps, ThemeTypings } from '@chakra-ui/react'
import { Box, Grid, IconButton, useBreakpointValue, useToken } from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import type { PropsWithChildren } from 'react'
import { Children, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslate } from 'react-polyglot'

export type FeatureListProps = {
  slidesToShow?: Record<ThemeTypings['breakpoints'] | string, number>
  slideGap?: number
} & PropsWithChildren &
  BoxProps

const arrowbackIcon = <ArrowBackIcon />
const arrowForwardIcon = <ArrowForwardIcon />
const opacity0 = { opacity: 0 }
const displayMdBlock = { base: 'none', md: 'block' }
const gridStyle = {
  '::-webkit-scrollbar': {
    display: 'none',
  },
  '::WebkitOverflowScrolling': 'touch',
}

export const ScrollCarousel: React.FC<FeatureListProps> = ({
  children,
  slidesToShow = {
    base: 1,
    xl: 2,
    '2xl': 3,
    '3xl': 4,
  },
  slideGap = 4,
  ...rest
}) => {
  const translate = useTranslate()
  const gridColumns = useBreakpointValue(slidesToShow, { ssr: false, fallback: '4' }) ?? 4
  const offsetColumn = bnOrZero(gridColumns).minus(1)
  const ref = useRef<HTMLDivElement>(null)
  const gridGap = useToken('sizes', slideGap)
  const [isScrollEnd, setIsScrollEnd] = useState(false)
  const [isScrollStart, setIsScrollStart] = useState(true)

  const handleScroll = useCallback(() => {
    if (!ref.current) return
    const scrollWidth = ref.current.scrollWidth
    const scrollOffset = ref.current.offsetWidth
    const scrollLeft = ref.current.scrollLeft
    setIsScrollEnd(scrollLeft + scrollOffset === scrollWidth)
    setIsScrollStart(scrollLeft === 0)
  }, [])

  const handleNext = useCallback(() => {
    if (!ref.current) return
    const currentPosition = ref.current.scrollLeft
    const width = ref.current.clientWidth
    ref.current.scrollLeft = currentPosition + width
  }, [])

  const handleBack = useCallback(() => {
    if (!ref.current) return
    const currentPosition = ref.current.scrollLeft
    const width = ref.current.clientWidth
    ref.current.scrollLeft = currentPosition - width
  }, [])

  useEffect(() => {
    if (!ref.current) return
    const scrollContainer = ref.current
    scrollContainer.addEventListener('resize', handleScroll)
    scrollContainer.addEventListener('scroll', handleScroll)
    //check scroll position on mount
    handleScroll()
    return () => {
      scrollContainer.removeEventListener('resize', handleScroll)
      scrollContainer.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll])

  const gridAutoColumns = useMemo(
    () => ({
      base: '350px',
      md: `calc((100% - ${offsetColumn} * ${gridGap})/ ${gridColumns})`,
    }),
    [gridColumns, gridGap, offsetColumn],
  )

  return (
    <Box position='relative' boxSizing='content-box' width='100%' my={4} {...rest}>
      {Children.toArray(children).length > gridColumns && (
        <>
          <IconButton
            size='lg'
            icon={arrowbackIcon}
            aria-label={translate('common.carousel.back')}
            isRound
            onClick={handleBack}
            isDisabled={isScrollStart}
            _disabled={opacity0}
            display={displayMdBlock}
            position='absolute'
            top='50%'
            transform='translateY(-50%)'
            left='-1em'
            zIndex='docked'
            shadow='dark-lg'
          />
          <IconButton
            icon={arrowForwardIcon}
            size='lg'
            aria-label={translate('common.carousel.next')}
            onClick={handleNext}
            isDisabled={isScrollEnd}
            _disabled={opacity0}
            display={displayMdBlock}
            position='absolute'
            top='50%'
            isRound
            transform='translateY(-50%)'
            right='-1em'
            zIndex='docked'
            shadow='dark-lg'
          />
        </>
      )}

      <Grid
        ref={ref}
        gridAutoFlow='column'
        gridColumnGap={gridGap}
        gridAutoColumns={gridAutoColumns}
        gridTemplateRows='repeat(1, max-content)'
        overflowX='auto'
        overflowY='hidden'
        scrollBehavior='smooth'
        scrollSnapType='x mandatory'
        overscrollBehaviorX='none'
        marginX={`${gridGap}`}
        marginInlineEnd={0}
        marginInlineStart={0}
        marginTop={`-${gridGap}`}
        marginBottom={`-${gridGap}`}
        paddingTop={gridGap}
        paddingBottom={gridGap}
        paddingLeft={gridGap}
        sx={gridStyle}
      >
        {children}
      </Grid>
    </Box>
  )
}
