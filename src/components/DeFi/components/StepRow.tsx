import { CheckCircleIcon } from '@chakra-ui/icons'
import type { StackProps } from '@chakra-ui/react'
import { Circle, CircularProgressLabel, Collapse, Stack, useColorModeValue } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { RawText } from 'components/Text'

export type StepRowProps = {
  label: string
  description?: string
  stepNumber: string
  isComplete?: boolean
  isLoading?: boolean
  isActive?: boolean
  rightElement?: ReactNode
} & StackProps

export const StepRow: React.FC<StepRowProps> = ({
  label,
  description,
  stepNumber,
  isComplete,
  isLoading = false,
  rightElement,
  isActive = false,
  children,
  ...rest
}) => {
  const successColor = useColorModeValue('green.500', 'green.200')
  const bgColor = useColorModeValue('gray.100', 'gray.700')
  return (
    <Stack spacing={4} py={6} px={{ base: 6, md: 8 }} {...rest}>
      <Stack
        direction='row'
        alignItems='center'
        justifyContent='space-between'
        fontSize='md'
        fontWeight='medium'
      >
        <Stack direction='row' alignItems='center'>
          <Circle bg={isActive ? 'blue.500' : bgColor}>
            <CircularProgress
              size={6}
              isIndeterminate={isLoading}
              color='blue.200'
              trackColor='transparent'
            >
              <CircularProgressLabel
                fontSize='sm'
                fontWeight='bold'
                lineHeight={1}
                color={isActive ? 'white' : 'inherit'}
              >
                {isComplete ? <CheckCircleIcon color={successColor} /> : stepNumber}
              </CircularProgressLabel>
            </CircularProgress>
          </Circle>
          <RawText color={isComplete ? successColor : 'inherit'}>{label}</RawText>
        </Stack>
        {rightElement}
      </Stack>
      <Collapse in={isActive}>
        {description && (
          <RawText color='gray.500' fontWeight='medium' fontSize='sm' mb={6}>
            {description}
          </RawText>
        )}
        <Stack spacing={6}>{children}</Stack>
      </Collapse>
    </Stack>
  )
}
