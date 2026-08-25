import { Alert, AlertDescription, AlertIcon, Button, Flex, Spinner } from '@chakra-ui/react'
import type { InterpolationOptions } from 'node-polyglot'
import type { ReactNode } from 'react'
import { useTranslate } from 'react-polyglot'

import { Text } from '@/components/Text'

const spinner = <Spinner color='white' />

type PairBodyProps = {
  icon: ReactNode
  headerTranslation: string | [string, InterpolationOptions]
  bodyTranslation: string | [string, InterpolationOptions]
  buttonTranslation: string
  isLoading: boolean
  error: string | null
  onPairDeviceClick: () => void
  isButtonDisabled?: boolean
  secondaryContent?: ReactNode
}

export const PairBody = ({
  icon,
  headerTranslation,
  bodyTranslation,
  buttonTranslation,
  isLoading,
  error,
  onPairDeviceClick,
  isButtonDisabled,
  secondaryContent,
}: PairBodyProps) => {
  const translate = useTranslate()

  return (
    <Flex direction='column' alignItems='center' justifyContent='center' height='full' gap={6}>
      {icon}
      <Text fontSize='xl' translation={headerTranslation} />
      <Text color='gray.500' translation={bodyTranslation} textAlign='center' />

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
        {translate(buttonTranslation)}
      </Button>
      {secondaryContent}
    </Flex>
  )
}
