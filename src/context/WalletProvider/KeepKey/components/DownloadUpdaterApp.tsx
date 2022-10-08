import { Button, Icon, Link, ModalBody, ModalHeader, Text as CText } from '@chakra-ui/react'
import { useMemo } from 'react'
import { FaApple, FaLinux, FaWindows } from 'react-icons/fa'
import { Text } from 'components/Text'

import { getPlatform, RELEASE_PAGE, UPDATER_BASE_URL } from '../helpers'

export const KeepKeyDownloadUpdaterApp = () => {
  const platform = useMemo(() => getPlatform(), [])

  const platformFilename = useMemo(() => {
    switch (platform) {
      case 'Mac OS':
        return 'KeepKey-Updater-2.1.4.dmg'
      case 'Windows':
        return 'KeepKey-Updater-Setup-2.1.4.exe'
      case 'Linux':
        return 'KeepKey-Updater-2.1.4.AppImage'
      default:
        return null
    }
  }, [platform])

  const platformIcon = useMemo(() => {
    switch (platform) {
      case 'Mac OS':
        return FaApple
      case 'Windows':
        return FaWindows
      case 'Linux':
        return FaLinux
      default:
        return null
    }
  }, [platform])

  const updaterUrl = platformFilename ? `${UPDATER_BASE_URL}${platformFilename}` : RELEASE_PAGE

  return (
    <>
      <ModalHeader textAlign='center'>
        <Text translation={'modals.keepKey.downloadUpdater.header'} />
      </ModalHeader>
      <ModalBody textAlign='center'>
        {platformIcon && <Icon as={platformIcon} boxSize={20} mb={4} color='white' />}
        {platform && (
          <>
            <CText fontWeight='bold'>{platform}</CText>
            <Link isExternal href={RELEASE_PAGE}>
              <Text
                color='gray.500'
                translation={['modals.keepKey.downloadUpdater.wrongPlatform', { platform }]}
                mb={2}
              />
            </Link>
          </>
        )}
        <Button as={Link} width='full' isExternal href={updaterUrl} colorScheme='blue' mt={2}>
          <Text
            translation={[
              'modals.keepKey.downloadUpdater.button',
              { filename: platformFilename || 'Updater App' },
            ]}
          />
        </Button>
      </ModalBody>
    </>
  )
}
