import { ArrowBackIcon, ArrowForwardIcon } from '@chakra-ui/icons'
import { Box, Flex } from '@chakra-ui/react'
import Autoplay from 'embla-carousel-autoplay'
import useEmblaCarousel from 'embla-carousel-react'
import { Children, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Arrow } from './Arrow'
import { DotButton } from './DotButton'
import type { CarouselProps } from './types'

export const Carousel = ({
  children,
  showArrows,
  showDots,
  options = { loop: true, skipSnaps: false },
  autoPlay,
}: CarouselProps) => {
  const autoplayRef = useRef(
    Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true, playOnInit: false }),
  )
  const [viewportRef, embla] = useEmblaCarousel(options, [autoplayRef.current])
  const [prevBtnEnabled, setPrevBtnEnabled] = useState(false)
  const [nextBtnEnabled, setNextBtnEnabled] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([])

  const scrollNext = useCallback(() => {
    if (!embla) return
    embla.scrollNext()
    autoplayRef.current.reset()
  }, [embla])

  const scrollPrev = useCallback(() => {
    if (!embla) return
    embla.scrollPrev()
    autoplayRef.current.reset()
  }, [embla])

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

  useEffect(() => {
    if (!embla) return
    if (autoPlay) {
      autoplayRef.current && autoplayRef.current.play()
    }
  }, [autoPlay, embla])

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
