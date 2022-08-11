import { QuestionIcon } from '@chakra-ui/icons'
import { Flex, FlexProps, Tooltip } from '@chakra-ui/react'

export type HelperTooltipProps = {
  label: string
  children?: React.ReactNode
  flexProps?: FlexProps
}

export const HelperTooltip = ({ children, flexProps, ...rest }: HelperTooltipProps) => {
  return (
    <Tooltip {...rest}>
      <Flex alignItems='center' columnGap={2} {...flexProps}>
        {children}
        <QuestionIcon color='gray.500' />
      </Flex>
    </Tooltip>
  )
}
