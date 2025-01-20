import { Alert, AlertDescription, AlertIcon, Button, Flex, Spinner } from '@chakra-ui/react'
import type { InterpolationOptions } from 'node-polyglot'
import type { ReactNode } from 'react'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'

const spinner = <Spinner color='white' />

type PairBodyProps = {
  icon: ReactNode
  headerText: string | [string, InterpolationOptions]
  bodyText: string | [string, InterpolationOptions]
  buttonText: string
  isLoading: boolean
  error: string | null
  onPairDeviceClick: () => void
  isButtonDisabled?: boolean
}

export const PairBody = ({
  icon,
  headerText,
  bodyText,
  buttonText,
  isLoading,
  error,
  onPairDeviceClick,
  isButtonDisabled,
}: PairBodyProps) => {
  const translate = useTranslate()

  return (
    <Flex direction='column' alignItems='center' justifyContent='center' height='full' gap={6}>
      {icon}
      <Text fontSize='xl' translation={headerText} />
      <Text color='gray.500' translation={bodyText} textAlign='center' />

      {error && (
        <Alert status='info'>
          <AlertIcon />
          <AlertDescription>
            <Text translation={error} />
          </AlertDescription>
        </Alert>
      )}

      <Button
        maxW='200px'
        width='100%'
        colorScheme='blue'
        isLoading={isLoading}
        loadingText={translate('common.pairing')}
        spinner={spinner}
        onClick={onPairDeviceClick}
        isDisabled={isButtonDisabled || isLoading}
      >
        {translate(buttonText)}
      </Button>
    </Flex>
  )
}
