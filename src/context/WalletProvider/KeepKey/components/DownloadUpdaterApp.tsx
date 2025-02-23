import { Button, Icon, Link, ModalBody, ModalHeader, Text as CText } from '@chakra-ui/react'
import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaApple, FaLinux, FaWindows } from 'react-icons/fa'
import { Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'

import { getPlatform } from '../helpers'

export const KeepKeyDownloadUpdaterApp = () => {
  const platform = useMemo(() => getPlatform(), [])
  const [downloadUrls, setDownloadUrls] = useState<{
    macOS: string
    Windows: string
    Linux: string
  }>({
    macOS: '',
    Windows: '',
    Linux: '',
  })

  useEffect(() => {
    const fetchLatestRelease = async () => {
      try {
        const resp = await axios({
          method: 'GET',
          url: 'https://api.github.com/repos/keepkey/keepkey-desktop/releases/latest',
        })
        console.log('GitHub Release Data:', resp.data)
        const version = resp.data.tag_name.replace('v', '')
        console.log('Version:', version)
        setDownloadUrls({
          macOS: `https://github.com/keepkey/keepkey-desktop/releases/download/v${version}/KeepKey-Desktop-${version}-universal.dmg`,
          Windows: `https://github.com/keepkey/keepkey-desktop/releases/download/v${version}/KeepKey-Desktop-Setup-${version}.exe`,
          Linux: `https://github.com/keepkey/keepkey-desktop/releases/download/v${version}/KeepKey-Desktop-${version}.AppImage`,
        })
      } catch (error) {
        console.error('Error fetching latest release:', error)
      }
    }
    fetchLatestRelease()
  }, [])

  const platformFilename = useMemo(() => {
    const version = downloadUrls.macOS.split('/v')[1]?.split('/')[0]
    if (!version) return 'Desktop App'
    switch (platform) {
      case 'Mac OS':
        return `KeepKey-Desktop-${version}-universal.dmg`
      case 'Windows':
        return `KeepKey-Desktop-Setup-${version}.exe`
      case 'Linux':
        return `KeepKey-Desktop-${version}.AppImage`
      default:
        return 'Desktop App'
    }
  }, [platform, downloadUrls.macOS])

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
    () => ['modals.keepKey.downloadUpdater.button', { filename: platformFilename }],
    [platformFilename],
  )

  const handleDownloadClick = useCallback(() => {
    const getDownloadUrl = () => {
      switch (platform) {
        case 'Mac OS':
          return downloadUrls.macOS
        case 'Windows':
          return downloadUrls.Windows
        case 'Linux':
          return downloadUrls.Linux
        default:
          return 'https://github.com/keepkey/keepkey-desktop/releases/latest'
      }
    }

    const url = getDownloadUrl()
    console.log('Download URL:', url)
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [platform, downloadUrls])

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
            <Link isExternal href='https://github.com/keepkey/keepkey-desktop/releases/latest'>
              <Text color='text.subtle' translation={wrongPlatformTranslation} mb={2} />
            </Link>
          </>
        )}
        <Button width='full' colorScheme='blue' onClick={handleDownloadClick}>
          <Text translation={downloadUpdaterTranslation} />
        </Button>
      </ModalBody>
    </>
  )
}
