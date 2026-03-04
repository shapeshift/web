import type { IconProps } from '@chakra-ui/react'
import { Icon } from '@chakra-ui/react'

export const SeekerIcon = ({ boxSize = '1em', ...props }: IconProps) => {
  return (
    <Icon viewBox='0 0 24 24' boxSize={boxSize} {...props}>
      <image
        href='/images/skr-logo.png'
        xlinkHref='/images/skr-logo.png'
        width='24'
        height='24'
        preserveAspectRatio='xMidYMid meet'
      />
    </Icon>
  )
}
