import { ArrowBackIcon, ArrowForwardIcon } from '@chakra-ui/icons'
import { Box, Flex } from '@chakra-ui/react'
import useEmblaCarousel from 'embla-carousel-react'
import { Children, useCallback, useEffect, useMemo, useState } from 'react'

import { Arrow } from './Arrow'
import { DotButton } from './DotButton'
import type { CarouselProps } from './types'

export const Carousel = ({ children, showArrows, showDots }: CarouselProps) => {
  const [viewportRef, embla] = useEmblaCarousel()
  const [prevBtnEnabled, setPrevBtnEnabled] = useState(false)
  const [nextBtnEnabled, setNextBtnEnabled] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([])

  const scrollPrev = useCallback(() => embla && embla.scrollPrev(), [embla])
  const scrollNext = useCallback(() => embla && embla.scrollNext(), [embla])
  const scrollTo = useCallback((index: number) => embla && embla.scrollTo(index), [embla])

  const childrens = Children.toArray(children)

  const onSelect = useCallback(() => {
    if (!embla) return
    setSelectedIndex(embla.selectedScrollSnap())
    setPrevBtnEnabled(embla.canScrollPrev())
    setNextBtnEnabled(embla.canScrollNext())
  }, [embla, setSelectedIndex])

  useEffect(() => {
    if (!embla) return
    onSelect()
    setScrollSnaps(embla.scrollSnapList())
    embla.on('select', onSelect)
  }, [embla, setScrollSnaps, onSelect])

  const renderSlides = useMemo(() => {
    return childrens.map((child, i) => (
      <Box className='embla__slide' key={i} flex='0 0 100%' marginLeft={4}>
        {child}
      </Box>
    ))
  }, [childrens])

  return (
    <Box ref={viewportRef} className='embla' overflow='hidden'>
      <Box className='embla__container' display='flex'>
        {renderSlides}
      </Box>
      {(showDots || showArrows) && (
        <Flex justifyContent='space-between' alignItems='center' mt={4}>
          {showArrows && (
            <Arrow aria-label='left' isDisabled={!prevBtnEnabled} onClick={scrollPrev}>
              <ArrowBackIcon />
            </Arrow>
          )}
          {showDots && (
            <Flex className='embla__dots' gap={2} justifyContent='center'>
              {scrollSnaps.map((_, index) => (
                <DotButton
                  key={index}
                  selected={index === selectedIndex}
                  onClick={() => scrollTo(index)}
                />
              ))}
            </Flex>
          )}
          {showArrows && (
            <Arrow aria-label='right' isDisabled={!nextBtnEnabled} onClick={scrollNext}>
              <ArrowForwardIcon />
            </Arrow>
          )}
        </Flex>
      )}
    </Box>
  )
}
