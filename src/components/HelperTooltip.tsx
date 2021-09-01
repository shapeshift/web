import { QuestionIcon } from '@chakra-ui/icons'
import { Flex, FlexProps, Tooltip } from '@chakra-ui/react'

type HelperTooltipProps = {
  label: string
  children?: React.ReactNode
  flexProps?: FlexProps
}

export const HelperToolTip = ({ children, flexProps, ...rest }: HelperTooltipProps) => {
  return (
    <Tooltip {...rest}>
      <Flex alignItems='center' {...flexProps}>
        {children}
        <QuestionIcon ml={2} color='gray.500' />
      </Flex>
    </Tooltip>
  )
}
