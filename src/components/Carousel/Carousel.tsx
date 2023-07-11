import { ArrowBackIcon, ArrowForwardIcon } from '@chakra-ui/icons'
import { Box, Flex } from '@chakra-ui/react'
import AutoHeight from 'embla-carousel-auto-height'
import Autoplay from 'embla-carousel-autoplay'
import useEmblaCarousel from 'embla-carousel-react'
import type { MouseEvent } from 'react'
import { Children, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Arrow } from './Arrow'
import { DotButton } from './DotButton'
import type { CarouselProps } from './types'

export const Carousel = ({
  children,
  showArrows,
  showDots,
  options = { loop: true, skipSnaps: false },
  slideSize = '100%',
  autoPlay,
  renderHeader,
}: CarouselProps) => {
  const autoplayRef = useRef(
    Autoplay({ delay: 10000, stopOnInteraction: false, stopOnMouseEnter: true, playOnInit: false }),
  )
  const [viewportRef, embla] = useEmblaCarousel(options, [autoplayRef.current, AutoHeight()])
  const [prevBtnEnabled, setPrevBtnEnabled] = useState(false)
  const [nextBtnEnabled, setNextBtnEnabled] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([])
  const [isVisible, setIsVisible] = useState(false)

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

  const childrens = useMemo(() => Children.toArray(children), [children])

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

  useEffect(() => {
    if (!embla) return
    // Re-initialize the carousel when slides change
    embla.reInit()
  }, [embla, childrens])

  const handleSlideClick = useCallback(
    (event: MouseEvent) => {
      if (embla && embla.clickAllowed()) return
      event.preventDefault()
    },
    [embla],
  )

  useEffect(() => {
    // We need to set the ref only when the component is mounted
    // This prevents incorrect calculations of the width of the slides
    setIsVisible(true)
  }, [])

  const renderSlides = useMemo(() => {
    return childrens.map((child, i) => (
      <Box
        className='embla__slide'
        position='relative'
        minWidth={0}
        key={i}
        flex={`0 0 ${slideSize}`}
        paddingLeft='1rem'
        onClick={handleSlideClick}
      >
        {child}
      </Box>
    ))
  }, [childrens, handleSlideClick, slideSize])

  const Controls = useMemo(() => {
    return (
      <Flex>
        <Arrow aria-label='left' isDisabled={!prevBtnEnabled} onClick={scrollPrev}>
          <ArrowBackIcon />
        </Arrow>
        <Arrow aria-label='right' isDisabled={!nextBtnEnabled} onClick={scrollNext}>
          <ArrowForwardIcon />
        </Arrow>
      </Flex>
    )
  }, [nextBtnEnabled, prevBtnEnabled, scrollNext, scrollPrev])

  return (
    <Flex flexDir='column' gap={4}>
      {renderHeader && <Flex>{renderHeader({ controls: Controls })}</Flex>}
      <Box className='embla'>
        <Box className='embla__viewport' ref={isVisible ? viewportRef : null} overflow='hidden'>
          <Box
            className='embla__container'
            display='flex'
            alignItems='flex-start'
            transition='height 0.2s'
            height='auto'
            marginLeft='calc(1rem * -1)'
          >
            {renderSlides}
          </Box>
        </Box>
        {(showDots || showArrows) && scrollSnaps.length > 1 && (
          <Flex justifyContent='space-between' alignItems='center' mt={4} width='full'>
            {showArrows && (
              <Arrow aria-label='left' isDisabled={!prevBtnEnabled} onClick={scrollPrev}>
                <ArrowBackIcon />
              </Arrow>
            )}
            {showDots && (
              <Flex className='embla__dots' gap={2} justifyContent='center' mx='auto'>
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
    </Flex>
  )
}
