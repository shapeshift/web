import { Button, Icon, Link, ModalBody, ModalHeader, Text as CText } from '@chakra-ui/react'
import { useMemo } from 'react'
import { FaApple, FaLinux, FaWindows } from 'react-icons/fa'

import { getPlatform, getUpdaterFilename, getUpdaterUrl, RELEASE_PAGE } from '../helpers'
import { useKeepKeyVersions } from '../hooks/useKeepKeyVersions'

import { Text } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'
import { useWallet } from '@/hooks/useWallet/useWallet'

export const KeepKeyDownloadUpdaterApp = () => {
  const platform = useMemo(() => getPlatform(), [])
  const {
    state: { wallet },
  } = useWallet()
  const { latestUpdaterVersionQuery } = useKeepKeyVersions({ wallet })
  const latestVersion = latestUpdaterVersionQuery.data

  const platformFilename = useMemo(() => getUpdaterFilename(latestVersion), [latestVersion])

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
      { filename: platformFilename ?? 'KeepKey Vault' },
    ],
    [platformFilename],
  )

  const updaterUrl = useMemo(() => getUpdaterUrl(latestVersion), [latestVersion])

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
