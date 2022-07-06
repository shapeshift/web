import { Stack, StackDivider, StackProps, useColorModeValue } from '@chakra-ui/react'

type StepsProps = {
  isComplete?: boolean
  statusComponent: JSX.Element
} & StackProps

export const Steps: React.FC<StepsProps> = ({ isComplete, statusComponent, children, ...rest }) => {
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  return (
    <Stack width='full' borderColor={borderColor} divider={<StackDivider />} {...rest}>
      {isComplete ? <>{statusComponent}</> : <>{children}</>}
    </Stack>
  )
}
