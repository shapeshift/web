import type { MotionValue, PanInfo } from 'framer-motion'

export type CarouselProps = {
  children: React.ReactNode
  renderArrowLeft?: (args: { handlePrev: () => void; activeIndex: number }) => React.ReactNode
  renderArrowRight?: (args: { handleNext: () => void; activeIndex: number }) => React.ReactNode
  renderDots?: (args: Omit<DotProps, 'length'>) => React.ReactNode
  autoPlay: boolean
  interval: number
  loop: boolean
  showArrows?: boolean
  showDots?: boolean
}

export type ArrowProps = {
  onClick: () => void
  left?: boolean
  children: React.ReactNode
}

export type SliderProps = {
  x: MotionValue<number>
  i: number
  children: React.ReactNode
  onDragEnd: (e: Event, dragProps: PanInfo) => void
  enableDrag?: boolean
}

export type DotProps = {
  length: number
  activeIndex: number
  setActiveIndex: (index: number) => void
}
