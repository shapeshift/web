import type { IconButtonProps } from '@chakra-ui/react'
import type { EmblaOptionsType } from 'embla-carousel-react'
import type { DraggableProps, MotionValue, PanInfo } from 'framer-motion'

export type CarouselProps = {
  children: React.ReactNode
  showArrows?: boolean
  showDots?: boolean
  options?: EmblaOptionsType
  autoPlay?: boolean
}

export type ArrowProps = {
  onClick: () => void
  children: React.ReactNode
} & IconButtonProps

export type SliderProps = {
  x: MotionValue<number>
  i: number
  children: React.ReactNode
  onDragEnd: (e: Event, dragProps: PanInfo) => void
  enableDrag?: boolean
  dragConstraints?: DraggableProps['dragConstraints']
}

export type DotProps = {
  length: number
  activeIndex: number
  setActiveIndex: (index: number) => void
}
export type DotButtonProps = {
  selected: boolean
  onClick: () => void
}
