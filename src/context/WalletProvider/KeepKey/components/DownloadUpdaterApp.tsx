import { Button, Icon, Link, ModalBody, ModalHeader, Text as CText } from '@chakra-ui/react'
import { useMemo } from 'react'
import { FaApple, FaLinux, FaWindows } from 'react-icons/fa'
import { Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'

const RELEASE_PAGE = 'https://github.com/keepkey/keepkey-desktop/releases/latest'
const BASE_DOWNLOAD_URL = 'https://github.com/keepkey/keepkey-desktop/releases/download/v3.0.27'

export const KeepKeyDownloadUpdaterApp = () => {
  const platform = useMemo(() => getPlatform(), [])

  const platformFilename = useMemo(() => {
    switch (platform) {
      case 'Mac OS':
        return 'KeepKey-Desktop-3.0.27-universal.dmg'
      case 'Windows':
        return 'KeepKey-Desktop-Setup-3.0.27.exe'
      case 'Linux':
        return 'KeepKey-Desktop-3.0.27.AppImage'
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

  const handleDownload = (url: string) => {
    // Create a temporary link element
    const link = document.createElement('a')
    link.href = url
    link.download = platformFilename || 'KeepKey-Desktop'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const downloadUrl = platformFilename ? `${BASE_DOWNLOAD_URL}/${platformFilename}` : RELEASE_PAGE

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
        <Button width='full' onClick={() => handleDownload(downloadUrl)} colorScheme='blue' mt={2}>
          <Text translation={downloadUpdaterTranslation} />
        </Button>
      </ModalBody>
    </>
  )
}

// Helper function from the original helpers.ts
const getPlatform = () => {
  const platform = navigator?.platform
  const macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K']
  const windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE']

  if (macosPlatforms.includes(platform)) {
    return 'Mac OS'
  } else if (windowsPlatforms.includes(platform)) {
    return 'Windows'
  } else if (/Linux/.test(platform)) {
    return 'Linux'
  }
}
