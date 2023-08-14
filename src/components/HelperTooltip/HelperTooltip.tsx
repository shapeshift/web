import { QuestionIcon } from '@chakra-ui/icons'
import type { FlexProps, IconProps } from '@chakra-ui/react'
import { Flex, Tooltip } from '@chakra-ui/react'

export type HelperTooltipProps = {
  label: string
  children?: React.ReactNode
  flexProps?: FlexProps
  iconProps?: IconProps
}

export const HelperTooltip = ({ children, flexProps, iconProps, ...rest }: HelperTooltipProps) => {
  return (
    <Tooltip {...rest}>
      <Flex alignItems='center' columnGap={2} {...flexProps}>
        {children}
        <QuestionIcon color='text.subtle' {...iconProps} />
      </Flex>
    </Tooltip>
  )
}
