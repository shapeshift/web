import { Button, Icon, Link, ModalBody, ModalHeader, Text as CText } from '@chakra-ui/react'
import { useMemo } from 'react'
import { FaApple, FaLinux, FaWindows } from 'react-icons/fa'

import { getPlatform, RELEASE_PAGE, UPDATER_BASE_URL } from '../helpers'
import { useKeepKeyVersions } from '../hooks/useKeepKeyVersions'

import { Text } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'
import { useWallet } from '@/hooks/useWallet/useWallet'

import { Text } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'

export const KeepKeyDownloadUpdaterApp = () => {
  const platform = useMemo(() => getPlatform(), [])
  const {
    state: { wallet },
  } = useWallet()
  const { stableDesktopVersionQuery } = useKeepKeyVersions({ wallet })
  const stableVersion = stableDesktopVersionQuery.data

  const latestVersion = stableVersion

  const platformFilename = useMemo(() => {
    switch (platform) {
      case 'Mac OS':
        return `KeepKey-Desktop-${latestVersion}-universal.dmg`
      case 'Windows':
        return `KeepKey-Desktop-Setup-${latestVersion}.exe`
      case 'Linux':
        return `KeepKey-Desktop-${latestVersion}.AppImage`
      default:
        return null
    }
  }, [platform, latestVersion])

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

  const wrongPlatformTranslation: TextPropTypes['translation'] = useMemo(
    () => ['modals.keepKey.downloadUpdater.wrongPlatform', { platform }],
    [platform],
  )

  const downloadUpdaterTranslation: TextPropTypes['translation'] = useMemo(
    () => [
      'modals.keepKey.downloadUpdater.button',
      { filename: platformFilename || 'Desktop App' },
    ],
    [platformFilename],
  )

  const updaterUrl = platformFilename
    ? `${UPDATER_BASE_URL}v${latestVersion}/${platformFilename}`
    : RELEASE_PAGE

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
              <Text color='text.subtle' translation={wrongPlatformTranslation} mb={2} />
            </Link>
          </>
        )}
        <Button as={Link} width='full' isExternal href={updaterUrl} colorScheme='blue' mt={2}>
          <Text translation={downloadUpdaterTranslation} />
        </Button>
      </ModalBody>
    </>
  )
}
