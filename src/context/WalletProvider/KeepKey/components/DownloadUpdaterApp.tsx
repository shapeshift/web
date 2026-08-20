import { Button, Icon, Link, ModalBody, ModalHeader, Text as CText } from '@chakra-ui/react'
import { useMemo } from 'react'
import { FaApple, FaLinux, FaWindows } from 'react-icons/fa'

import type { UpdaterDownload } from '../helpers'
import { getPlatform, getUpdaterDownloads, RELEASE_PAGE } from '../helpers'
import { useKeepKeyVersions } from '../hooks/useKeepKeyVersions'

import { Text } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'
import { useWallet } from '@/hooks/useWallet/useWallet'

const DownloadButton = ({ filename, url }: UpdaterDownload) => {
  const translation: TextPropTypes['translation'] = useMemo(
    () => ['modals.keepKey.downloadUpdater.button', { filename }],
    [filename],
  )

  return (
    <Button as={Link} width='full' isExternal href={url} colorScheme='blue' mt={2}>
      <Text translation={translation} />
    </Button>
  )
}

export const KeepKeyDownloadUpdaterApp = () => {
  const platform = useMemo(() => getPlatform(), [])
  const {
    state: { wallet },
  } = useWallet()
  const { latestUpdaterVersionQuery } = useKeepKeyVersions({ wallet })
  const latestVersion = latestUpdaterVersionQuery.data

  const downloads = useMemo(() => getUpdaterDownloads(latestVersion), [latestVersion])

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

  const releasePageTranslation: TextPropTypes['translation'] = useMemo(
    () => ['modals.keepKey.downloadUpdater.button', { filename: 'KeepKey Vault' }],
    [],
  )

  const downloadButtons = useMemo(
    () => downloads.map(download => <DownloadButton key={download.filename} {...download} />),
    [downloads],
  )

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
        {downloadButtons.length ? (
          downloadButtons
        ) : (
          <Button as={Link} width='full' isExternal href={RELEASE_PAGE} colorScheme='blue' mt={2}>
            <Text translation={releasePageTranslation} />
          </Button>
        )}
      </ModalBody>
    </>
  )
}
