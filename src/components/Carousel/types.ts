import type { IconButtonProps } from '@chakra-ui/react'
import type { EmblaOptionsType } from 'embla-carousel-react'

export type CarouselProps = {
  children: React.ReactNode
  showArrows?: boolean
  showDots?: boolean
  options?: EmblaOptionsType
  autoPlay?: boolean
  isVisible?: boolean
}

export type ArrowProps = {
  onClick: () => void
  children: React.ReactNode
} & IconButtonProps

export type DotButtonProps = {
  selected: boolean
  onClick: () => void
}
