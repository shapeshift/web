import { ArrowBackIcon, ArrowForwardIcon } from '@chakra-ui/icons'
import { Box, Flex, Grid, GridProps, IconButton, useToken } from '@chakra-ui/react'
import type { PropsWithChildren } from 'react'
import { useCallback, useRef } from 'react'
import { RawText } from 'components/Text'

type FeatureListProps = {
  slidesToShow?: number
  slideGap?: number
} & PropsWithChildren

export const FeaturedList: React.FC<FeatureListProps> = ({
  children,
  slidesToShow = 4,
  slideGap = 4,
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const gridGap = useToken('sizes', slideGap)

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

  return (
    <Box position='relative' boxSizing='content-box' width='100%' overflow='hidden' mt={4}>
      <Flex alignItems='center' justifyContent='space-between' mb={4} px={{ base: '20px', md: 6 }}>
        <RawText fontWeight='bold'>Eligible Opportunities</RawText>
        <Flex gap={4}>
          <IconButton
            size='sm'
            icon={<ArrowBackIcon />}
            aria-label='Back'
            onClick={handleBack}
            display={{ base: 'none', md: 'block' }}
          />
          <IconButton
            icon={<ArrowForwardIcon />}
            size='sm'
            aria-label='Next'
            onClick={handleNext}
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
