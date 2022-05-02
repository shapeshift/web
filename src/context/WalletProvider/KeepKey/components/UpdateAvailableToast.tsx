import { Box, Link } from '@chakra-ui/layout'
import { Alert, AlertDescription, AlertTitle, CloseButton, Text } from '@chakra-ui/react'
import { KEEPKEY_UPDATE_URL } from 'constants/KeepKey'
import { RiFlashlightLine } from 'react-icons/ri'

type UpdateAvailableToastProps = {
  onClose: () => void
  translate: (translation: string) => string
}

export const UpdateAvailableToast = ({ onClose, translate }: UpdateAvailableToastProps) => {
  return (
    <Alert status='info' variant='solid' colorScheme='blue'>
      <Box alignSelf='flex-start' me={2}>
        <RiFlashlightLine size={24} />
      </Box>
      <Box>
        <AlertTitle>{translate('updateToast.keepKey.title')}</AlertTitle>
        <AlertDescription>
          <Text>
            {translate('updateToast.keepKey.newVersion')}
            <span> </span>
            <Box as='span' fontWeight='bold' color='inherit'>
              {translate('updateToast.keepKey.firmwareOrBootloader')}
            </Box>
            <span> </span>
            {translate('updateToast.keepKey.isAvailable')}
          </Text>
        </AlertDescription>
        <Link href={KEEPKEY_UPDATE_URL} display={'block'} fontWeight={'bold'} mt={2} isExternal>
          {translate('updateToast.keepKey.downloadCta')}
        </Link>
      </Box>
      <CloseButton
        alignSelf='flex-start'
        position='relative'
        right={-1}
        top={-1}
        onClick={onClose}
      />
    </Alert>
  )
}
