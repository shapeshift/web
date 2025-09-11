import { SearchIcon } from '@chakra-ui/icons'
import { Box, Button, IconButton, Kbd, useDisclosure, useEventListener } from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { GlobalSearchModal } from './GlobalSearchModal'

import { isMobile as isMobileApp } from '@/lib/globals'

const mrProp = { base: 0, md: 'auto' }
const widthProp = { base: 'auto', md: 'full' }
const displayProp1 = { base: 'flex', md: 'none' }
const displayProp2 = { base: 'none', md: 'flex' }
const sxProp1 = { svg: { width: '18px', height: '18px' } }

const searchIcon = <SearchIcon />

export const GlobalSeachButton = memo(() => {
  const { isOpen, onClose, onOpen, onToggle } = useDisclosure()
  const translate = useTranslate()
  const isMac = useMemo(() => /Mac/.test(navigator.userAgent), [])

  useEventListener(document, 'keydown', event => {
    const hotkey = isMac ? 'metaKey' : 'ctrlKey'
    if (event?.key?.toLowerCase() === 'k' && event[hotkey]) {
      event.preventDefault()
      isOpen ? onClose() : onOpen()
    }
  })

  return (
    <>
      <Box maxWidth='xl' width={widthProp} mr={mrProp}>
        <IconButton
          display={displayProp1}
          icon={searchIcon}
          aria-label={translate('common.search')}
          onClick={onOpen}
        />
        <Button
          width='full'
          leftIcon={searchIcon}
          onClick={onOpen}
          size='lg'
          fontSize='md'
          alignItems='center'
          color='text.subtle'
          display={displayProp2}
          sx={sxProp1}
        >
          {translate('common.search')}
          {!isMobileApp && ( // Mobile app users are unlikely to have access to a keyboard for the shortcut.
            <Box ml='auto'>
              <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>+<Kbd>K</Kbd>
            </Box>
          )}
        </Button>
      </Box>
      {isOpen && (
        <GlobalSearchModal isOpen={isOpen} onClose={onClose} onOpen={onOpen} onToggle={onToggle} />
      )}
    </>
  )
})
