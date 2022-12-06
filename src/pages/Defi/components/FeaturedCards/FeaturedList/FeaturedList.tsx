import { ArrowBackIcon, ArrowForwardIcon } from '@chakra-ui/icons'
import type { BoxProps } from '@chakra-ui/react'
import { Box, Flex, Grid, IconButton, useToken } from '@chakra-ui/react'
import type { PropsWithChildren } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Text } from 'components/Text'

type FeatureListProps = {
  slidesToShow?: number
  slideGap?: number
} & PropsWithChildren &
  BoxProps

export const FeaturedList: React.FC<FeatureListProps> = ({
  children,
  slidesToShow = 4,
  slideGap = 4,
  ...rest
}) => {
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

  return (
    <Box position='relative' boxSizing='content-box' width='100%' my={4} {...rest}>
      <Flex alignItems='center' justifyContent='space-between' mb={4} px={{ base: '20px', md: 6 }}>
        <Text translation='defi.eligibleOpportunities' fontWeight='bold' />
        <Flex gap={4}>
          <IconButton
            size='sm'
            icon={<ArrowBackIcon />}
            aria-label='Back'
            onClick={handleBack}
            isDisabled={isScrollStart}
            display={{ base: 'none', md: 'block' }}
          />
          <IconButton
            icon={<ArrowForwardIcon />}
            size='sm'
            aria-label='Next'
            onClick={handleNext}
            isDisabled={isScrollEnd}
            display={{ base: 'none', md: 'block' }}
          />
        </Flex>
      </Flex>
      <Grid
        ref={ref}
        gridAutoFlow='column'
        gridColumnGap={gridGap}
        gridAutoColumns={{
          base: `300px`,
          sm: `calc((100% - 1 * ${gridGap})/ 2)`,
          md: `calc((100% - 2 * ${gridGap})/ 3)`,
          lg: `calc((100% - ${
            slidesToShow > 1 ? slidesToShow - 1 : 0
          } * ${gridGap})/ ${slidesToShow})`,
        }}
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
        paddingLeft={{ base: gridGap, md: 0 }}
        sx={{
          '::-webkit-scrollbar': {
            display: 'none',
          },
        }}
      >
        {children}
      </Grid>
    </Box>
  )
}
