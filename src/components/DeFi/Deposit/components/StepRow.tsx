import { CheckCircleIcon } from '@chakra-ui/icons'
import {
  Button,
  ButtonProps,
  Circle,
  CircularProgressLabel,
  Collapse,
  Stack,
  StackProps,
  useColorModeValue,
} from '@chakra-ui/react'
import { ReactNode } from 'react'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { RawText } from 'components/Text'

type StepRowProps = {
  label: string
  stepNumber: string
  isComplete?: boolean
  isLoading?: boolean
  isActive?: boolean
  rightElement?: ReactNode
  buttonLabel: string
  buttonOnClick?: () => void
  buttonProps?: ButtonProps
} & StackProps

export const StepRow: React.FC<StepRowProps> = ({
  label,
  stepNumber,
  isComplete,
  isLoading = false,
  rightElement,
  isActive = false,
  children,
  buttonLabel,
  buttonOnClick,
  buttonProps,
  ...rest
}) => {
  const successColor = useColorModeValue('green.500', 'green.200')
  return (
    <Stack spacing={4} {...rest}>
      <Stack
        direction='row'
        alignItems='center'
        justifyContent='space-between'
        fontSize='md'
        fontWeight='medium'
      >
        <Stack direction='row' alignItems='center'>
          <Circle bg='gray.700'>
            <CircularProgress size={6} isIndeterminate={isLoading}>
              <CircularProgressLabel fontSize='sm' fontWeight='bold' lineHeight={1}>
                {isComplete ? <CheckCircleIcon color={successColor} /> : stepNumber}
              </CircularProgressLabel>
            </CircularProgress>
          </Circle>
          <RawText color={isComplete ? successColor : 'inherit'}>{label}</RawText>
        </Stack>
        {rightElement}
      </Stack>
      <Collapse in={isActive}>
        <Stack>{children}</Stack>
        <Button
          mt={4}
          size='lg'
          width='full'
          colorScheme='blue'
          onClick={buttonOnClick}
          {...buttonProps}
        >
          {buttonLabel}
        </Button>
      </Collapse>
    </Stack>
  )
}
