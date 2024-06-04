import { QuestionIcon } from '@chakra-ui/icons'
import type { FlexProps, IconProps } from '@chakra-ui/react'
import { Flex } from '@chakra-ui/react'
import { TooltipWithTouch } from 'components/TooltipWithTouch'

export type HelperTooltipProps = {
  label: string
  children?: React.ReactNode
  flexProps?: FlexProps
  iconProps?: IconProps
}

export const HelperTooltip = ({ children, flexProps, iconProps, label }: HelperTooltipProps) => {
  return (
    <TooltipWithTouch label={label}>
      <Flex alignItems='center' columnGap={2} {...flexProps}>
        {children}
        <QuestionIcon color='text.subtle' {...iconProps} />
      </Flex>
    </TooltipWithTouch>
  )
}
