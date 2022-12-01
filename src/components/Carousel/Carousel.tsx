import { ArrowBackIcon, ArrowForwardIcon } from '@chakra-ui/icons'
import { Box, Flex } from '@chakra-ui/react'
import type { AnimationOptions, PanInfo } from 'framer-motion'
import { animate, useMotionValue } from 'framer-motion'
import type { ReactNode } from 'react'
import React, {
  Children,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { Arrow } from './Arrow'
import { Dots } from './Dots'
import { Slider } from './Slider'
import type { CarouselProps } from './types'

const containerStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  overflowX: 'hidden',
  display: 'flex',
}

const transition: AnimationOptions<any> = {
  type: 'spring',
  bounce: 0,
}

const Container = forwardRef<HTMLDivElement, { children: ReactNode }>((props, ref) => (
  <div ref={ref} style={containerStyle}>
    {props.children}
  </div>
))

export const Carousel = ({
  children,
  renderArrowLeft,
  renderArrowRight,
  renderDots,
  autoPlay = false,
  interval = 5000,
  loop = false,
  showArrows,
  showDots,
}: CarouselProps) => {
  const x = useMotionValue(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)

  const calculateNewX = useCallback(
    () => -index * (containerRef.current?.clientWidth || 0),
    [index],
  )
  const childrens = Children.toArray(children)

  const handleNext = useCallback(() => {
    const idx = loop ? 0 : index
    setIndex(index + 1 === childrens.length ? idx : index + 1)
  }, [childrens.length, index, loop])

  const handlePrev = useCallback(() => {
    const idx = loop ? childrens.length - 1 : 0
    setIndex(index - 1 < 0 ? idx : index - 1)
  }, [childrens.length, index, loop])

  const handleEndDrag = useCallback(
    (_e: Event, dragProps: PanInfo) => {
      const clientWidth = containerRef.current?.clientWidth || 0

      const { offset } = dragProps

      if (offset.x > clientWidth / 4) {
        handlePrev()
      } else if (offset.x < -clientWidth / 4) {
        handleNext()
      } else {
        animate(x, calculateNewX(), transition)
      }
    },
    [calculateNewX, handleNext, handlePrev, x],
  )

  useEffect(() => {
    const controls = animate(x, calculateNewX(), transition)
    return controls.stop
  }, [calculateNewX, index, x])

  useEffect(() => {
    if (!autoPlay) {
      return
    }
    const timer = setInterval(() => handleNext(), interval)
    return () => clearInterval(timer)
  }, [autoPlay, handleNext, interval])

  const renderSlides = useMemo(() => {
    return childrens.map((child, i) => (
      <Slider
        onDragEnd={handleEndDrag}
        x={x}
        i={i}
        key={i}
        enableDrag={childrens.length > 1 ? true : false}
      >
        {child}
      </Slider>
    ))
  }, [childrens, handleEndDrag, x])

  return (
    <Box>
      <Container ref={containerRef}>{renderSlides}</Container>
      {(showArrows || showDots) && (
        <Flex alignItems='center' justifyContent='space-between' mt={2}>
          {showArrows &&
            (renderArrowLeft ? (
              renderArrowLeft({ handlePrev, activeIndex: index })
            ) : (
              <Arrow left onClick={handlePrev}>
                <ArrowBackIcon />
              </Arrow>
            ))}
          {/* dots */}
          {showDots &&
            childrens.length > 1 &&
            (renderDots ? (
              renderDots({ setActiveIndex: setIndex, activeIndex: index })
            ) : (
              <Dots length={childrens.length} setActiveIndex={setIndex} activeIndex={index} />
            ))}
          {showArrows &&
            (renderArrowRight ? (
              renderArrowRight({ handleNext, activeIndex: index })
            ) : (
              <Arrow onClick={handleNext}>
                <ArrowForwardIcon />
              </Arrow>
            ))}
        </Flex>
      )}
    </Box>
  )
}
