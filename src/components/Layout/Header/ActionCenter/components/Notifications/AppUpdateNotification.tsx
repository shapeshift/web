import type { ResponsiveValue } from '@chakra-ui/react'
import { Alert, AlertDescription, Button, CloseButton, Flex } from '@chakra-ui/react'
import type { RenderProps } from '@chakra-ui/react/dist/types/toast/toast.types'
import type { Property } from 'csstype'
import { FaSync } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { IconCircle } from '@/components/IconCircle'

const flexGap = { base: 2, md: 3 }
const flexDir: ResponsiveValue<Property.FlexDirection> = { base: 'column', md: 'row' }
const flexAlignItems = { base: 'flex-start', md: 'center' }

const handleCtaClick = () => window.location.reload()

type AppUpdateNotificationProps = {
  handleClick?: () => void
} & RenderProps

export const AppUpdateNotification: React.FC<AppUpdateNotificationProps> = ({
  handleClick,
  onClose,
}) => {
  const translate = useTranslate()
  return (
    <Alert
      status='info'
      variant='update-box'
      borderRadius='lg'
      gap={3}
      onClick={handleClick}
      cursor={handleClick ? 'pointer' : 'default'}
    >
      <IconCircle boxSize={8} color='text.subtle'>
        <FaSync />
      </IconCircle>
      <Flex gap={flexGap} flexDir={flexDir} alignItems={flexAlignItems}>
        <AlertDescription letterSpacing='0.02em'>{translate('updateToast.body')}</AlertDescription>

        <Button colorScheme='blue' size='sm' onClick={handleCtaClick}>
          {translate('updateToast.cta')}
        </Button>
      </Flex>
      <CloseButton onClick={onClose} size='sm' />
    </Alert>
  )
}
