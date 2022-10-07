import { Button, Icon, Link, ModalBody, ModalHeader, Text as CText } from '@chakra-ui/react'
import { useMemo } from 'react'
import { FaApple, FaLinux, FaWindows } from 'react-icons/fa'
import { Text } from 'components/Text'

import { getPlatform, RELEASE_PAGE, UPDATER_BASE_URL } from '../helpers'

export const KeepKeyDownloadUpdaterApp = () => {
  const platform = useMemo(() => getPlatform(), [])

  const platformFilename = useMemo(() => {
    if (platform === 'Mac OS') {
      return 'KeepKey-Updater-2.1.4.dmg'
    } else if (platform === 'Windows') {
      return 'KeepKey-Updater-Setup-2.1.4.exe'
    } else if (platform === 'Linux') {
      return 'KeepKey-Updater-2.1.4.AppImage'
    }
  }, [platform])

  const platformIcon = useMemo(() => {
    if (platform === 'Mac OS') {
      return FaApple
    } else if (platform === 'Windows') {
      return FaWindows
    } else if (platform === 'Linux') {
      return FaLinux
    }
  }, [platform])

  const updaterUrl = `${UPDATER_BASE_URL}${platformFilename}`

  return (
    <>
      <ModalHeader textAlign='center'>
        <Text translation={'modals.keepKey.downloadUpdater.header'} />
      </ModalHeader>
      <ModalBody textAlign='center'>
        <Icon as={platformIcon} boxSize={20} mb={4} color='white' />
        <CText fontWeight='bold'>{platform}</CText>
        <Link isExternal href={RELEASE_PAGE}>
          <Text
            color='gray.500'
            translation={['modals.keepKey.downloadUpdater.wrongPlatform', { platform }]}
            mb={2}
          />
        </Link>
        <Button as={Link} width='full' isExternal href={updaterUrl} colorScheme='blue' mt={2}>
          <Text
            translation={['modals.keepKey.downloadUpdater.button', { filename: platformFilename }]}
          />
        </Button>
      </ModalBody>
    </>
  )
}
