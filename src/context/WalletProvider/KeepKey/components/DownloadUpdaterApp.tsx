import { Button, Icon, Link, ModalBody, ModalHeader, Text as CText } from '@chakra-ui/react'
import { useMemo } from 'react'
import { FaApple, FaLinux, FaWindows } from 'react-icons/fa'

import { getPlatform, getUpdaterDownloads, RELEASE_PAGE } from '../helpers'
import { useKeepKeyVersions } from '../hooks/useKeepKeyVersions'

import { Text } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'
import { useWallet } from '@/hooks/useWallet/useWallet'

export const KeepKeyDownloadUpdaterApp = () => {
  const platform = useMemo(() => getPlatform(), [])
  const {
    state: { wallet, isConnected },
  } = useWallet()
  const { latestUpdaterVersionQuery } = useKeepKeyVersions({ wallet })
  const latestVersion = latestUpdaterVersionQuery.data

  const downloads = useMemo(() => getUpdaterDownloads(latestVersion), [latestVersion])

  // A connected device got here from the update toast, everything else failed to pair
  const bodyTranslation = isConnected
    ? 'modals.keepKey.downloadUpdater.bodyUpdateAvailable'
    : 'modals.keepKey.downloadUpdater.body'

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

  const downloadButtons = useMemo(
    () =>
      downloads.map(({ labelKey, url }) => (
        <Button
          key={labelKey}
          as={Link}
          width='full'
          isExternal
          href={url}
          colorScheme='blue'
          mt={2}
        >
          <Text translation={labelKey} />
        </Button>
      )),
    [downloads],
  )

  return (
    <>
      <ModalHeader textAlign='center'>
        <Text translation={'modals.keepKey.downloadUpdater.header'} />
      </ModalHeader>
      <ModalBody textAlign='center'>
        <Text color='text.subtle' translation={bodyTranslation} mb={6} fontSize='sm' />
        {platformIcon && <Icon as={platformIcon} boxSize={20} mb={4} color='white' />}
        {platform && (
          <>
            <CText fontWeight='bold'>{platform}</CText>
            <Link isExternal href={RELEASE_PAGE}>
              <Text color='text.subtle' translation={wrongPlatformTranslation} mb={2} />
            </Link>
          </>
        )}
        {downloadButtons.length ? (
          downloadButtons
        ) : (
          <Button as={Link} width='full' isExternal href={RELEASE_PAGE} colorScheme='blue' mt={2}>
            <Text translation={'modals.keepKey.downloadUpdater.download.releasePage'} />
          </Button>
        )}
      </ModalBody>
    </>
  )
}
