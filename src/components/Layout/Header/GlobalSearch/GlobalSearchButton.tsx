import { SearchIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Kbd,
  List,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  useDisclosure,
  useEventListener,
} from '@chakra-ui/react'
import { useCallback, useRef, useState } from 'react'
import { GlobalFilter } from 'components/StakingVaults/GlobalFilter'

import { AssetResults } from './AssetResults'

export const GlobalSeachButton = () => {
  const { isOpen, onClose, onOpen, onToggle } = useDisclosure()
  const [searchQuery, setSearchQuery] = useState('')
  const eventRef = useRef<'mouse' | 'keyboard'>(null)

  useEventListener('keydown', event => {
    const isMac = /(Mac|iPhone|iPod|iPad)/i.test(navigator?.platform)
    const hotkey = isMac ? 'metaKey' : 'ctrlKey'
    if (event?.key?.toLowerCase() === 'k' && event[hotkey]) {
      event.preventDefault()
      isOpen ? onClose() : onOpen()
    }
  })

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      eventRef.current = 'keyboard'
      switch (e.key) {
        case 'Control':
        case 'Alt':
        case 'Shift': {
          e.preventDefault()
          onToggle()
          break
        }
        default:
          break
      }
    },
    [onToggle],
  )
  return (
    <>
      <Box maxWidth='xl' width='full'>
        <Button
          variant='input'
          width='full'
          display='flex'
          leftIcon={<SearchIcon />}
          onClick={onOpen}
          size='lg'
          fontSize='md'
          alignItems='center'
          sx={{ svg: { width: '18px', height: '18px' } }}
        >
          Search
          <Box ml='auto'>
            <Kbd>⌘</Kbd>+<Kbd>K</Kbd>
          </Box>
        </Button>
      </Box>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalBody>
            <GlobalFilter
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onKeyDown={onKeyDown}
            />
            <List>
              <AssetResults />
            </List>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
}
