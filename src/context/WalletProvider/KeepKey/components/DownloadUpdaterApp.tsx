import { Button, Icon, ModalBody, ModalHeader, Text as CText, Spinner, useToast } from '@chakra-ui/react'
import axios from 'axios'
import { useEffect, useMemo, useState, useCallback } from 'react'
import { FaApple, FaLinux, FaWindows } from 'react-icons/fa'
import { Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'
import { getConfig } from 'config'

const RELEASE_PAGE = getConfig().REACT_APP_KEEPKEY_RELEASES_PAGE
const GITHUB_API_URL = getConfig().REACT_APP_KEEPKEY_GITHUB_RELEASES_API_URL

// Interface for GitHub release assets
interface GithubReleaseAsset {
  name: string;
  browser_download_url: string;
}

// Interface for GitHub release response
interface GithubReleaseResponse {
  tag_name: string;
  assets: GithubReleaseAsset[];
  body: string;
}

export const KeepKeyDownloadUpdaterApp = () => {
  const toast = useToast()
  const platform = useMemo(() => getPlatform(), [])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState<string>('')
  
  // Use separate state variables for each platform URL
  const [urlMacOS, setUrlMacOS] = useState('')
  const [urlWindows, setUrlWindows] = useState('')
  const [urlLinux, setUrlLinux] = useState('')

  // Find latest release links directly from the GitHub API
  const findLatestReleaseLinks = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Use the exact API URL
      const resp = await axios<GithubReleaseResponse>({ 
        method: 'GET', 
        url: GITHUB_API_URL,
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'KeepKey-Desktop-App'
        }
      })
      
      console.log('findLatestReleaseLinks', resp.data)
      
      if (!resp.data || !resp.data.tag_name || !resp.data.assets) {
        throw new Error('Invalid response from GitHub API')
      }
      
      // Extract version from tag_name
      const versionWithV = resp.data.tag_name
      const versionNumber = versionWithV.replace('v', '')
      setVersion(versionNumber)
      
      // Find the correct assets by examining the assets array
      const assets = resp.data.assets
      
      // Find macOS universal DMG
      const macAsset = assets.find(asset => 
        asset.name.includes('universal.dmg') || 
        asset.name.includes('universal-mac')
      )
      
      // Find Windows EXE
      const windowsAsset = assets.find(asset => 
        asset.name.includes('Setup') && asset.name.endsWith('.exe')
      )
      
      // Find Linux AppImage
      const linuxAsset = assets.find(asset => 
        asset.name.endsWith('.AppImage')
      )
      
      // Set the URLs from the assets or construct them if not found
      setUrlMacOS(macAsset?.browser_download_url || 
        `https://github.com/keepkey/keepkey-desktop/releases/download/v${versionNumber}/KeepKey-Desktop-${versionNumber}-universal.dmg`)
      
      setUrlWindows(windowsAsset?.browser_download_url || 
        `https://github.com/keepkey/keepkey-desktop/releases/download/v${versionNumber}/KeepKey-Desktop-Setup-${versionNumber}.exe`)
      
      setUrlLinux(linuxAsset?.browser_download_url || 
        `https://github.com/keepkey/keepkey-desktop/releases/download/v${versionNumber}/KeepKey-Desktop-${versionNumber}.AppImage`)
      
      console.log('Download URLs:', {
        macOS: macAsset?.browser_download_url,
        windows: windowsAsset?.browser_download_url,
        linux: linuxAsset?.browser_download_url
      })
      
      setError(null)
    } catch (e) {
      console.error('Error fetching latest version:', e)
      setError('Failed to fetch the latest version. Please try again or visit the releases page.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Call the function on component mount
  useEffect(() => {
    findLatestReleaseLinks()
  }, [findLatestReleaseLinks])

  const platformFilename = useMemo(() => {
    if (isLoading) return null
    switch (platform) {
      case 'Mac OS':
        return `KeepKey Desktop ${version} (macOS)`
      case 'Windows':
        return `KeepKey Desktop ${version} (Windows)`
      case 'Linux':
        return `KeepKey Desktop ${version} (Linux)`
      default:
        return 'Desktop App'
    }
  }, [platform, isLoading, version])

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

  const handleDownload = useCallback(() => {
    let downloadUrl = RELEASE_PAGE
    
    // Get the appropriate URL based on platform
    switch (platform) {
      case 'Mac OS':
        downloadUrl = urlMacOS || RELEASE_PAGE
        break
      case 'Windows':
        downloadUrl = urlWindows || RELEASE_PAGE
        break
      case 'Linux':
        downloadUrl = urlLinux || RELEASE_PAGE
        break
    }
    
    if (!downloadUrl || downloadUrl === RELEASE_PAGE) {
      // If we don't have a specific URL, open the releases page
      window.open(RELEASE_PAGE, '_blank')
      return
    }
    
    // Create a temporary link element for better download handling
    const link = document.createElement('a')
    link.href = downloadUrl
    link.rel = 'noopener noreferrer'
    
    // Append to body, click, and remove
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Show a toast notification
    toast({
      title: 'Download Started',
      description: 'Your download should begin shortly',
      status: 'success',
      duration: 5000,
      isClosable: true,
    })
  }, [platform, urlMacOS, urlWindows, urlLinux, toast])

  const handleRetry = useCallback(() => {
    findLatestReleaseLinks()
  }, [findLatestReleaseLinks])

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
            <Button variant='link' onClick={() => window.open(RELEASE_PAGE, '_blank')} mb={2}>
              <Text color='text.subtle' translation={wrongPlatformTranslation} />
            </Button>
          </>
        )}
        
        {!isLoading && !error && version && (
          <CText color="green.500" mb={4} fontSize="sm">
            Latest version: {version}
          </CText>
        )}
        
        {error && (
          <>
            <CText color="red.500" mb={2}>{error}</CText>
            <Button 
              variant='outline' 
              colorScheme='blue' 
              size='sm' 
              onClick={handleRetry} 
              mb={4}
              isDisabled={isLoading}
            >
              Retry
            </Button>
            <Button 
              variant='outline' 
              colorScheme='blue' 
              size='sm' 
              onClick={() => window.open(RELEASE_PAGE, '_blank')} 
              ml={2} 
              mb={4}
            >
              Go to Releases Page
            </Button>
          </>
        )}
        
        <Button 
          width='full' 
          onClick={handleDownload} 
          colorScheme='blue' 
          mt={2}
          isDisabled={isLoading}
        >
          {isLoading ? (
            <Spinner size="sm" mr={2} />
          ) : null}
          <Text translation={downloadUpdaterTranslation} />
        </Button>
      </ModalBody>
    </>
  )
}

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
  
  const userAgent = navigator.userAgent.toLowerCase()
  if (userAgent.includes('mac')) {
    return 'Mac OS'
  } else if (userAgent.includes('win')) {
    return 'Windows'
  } else if (userAgent.includes('linux')) {
    return 'Linux'
  }
  
  return null
}
