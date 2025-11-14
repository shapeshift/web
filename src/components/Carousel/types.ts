import type { IconButtonProps } from '@chakra-ui/react'
import type { EmblaOptionsType } from 'embla-carousel'
import type React from 'react'
import type { JSX } from 'react'

export type CarouselHeaderProps = {
  controls?: JSX.Element
}

export type CarouselProps = {
  children: React.ReactNode
  showArrows?: boolean
  showDots?: boolean
  options?: EmblaOptionsType
  autoPlay?: boolean
  isVisible?: boolean
  slideSize?: string
  renderHeader?: (args: CarouselHeaderProps) => JSX.Element
}

export type ArrowProps = {
  onClick: () => void
  children: React.ReactNode
} & IconButtonProps

export type DotButtonProps = {
  selected: boolean
  onClick: () => void
}
