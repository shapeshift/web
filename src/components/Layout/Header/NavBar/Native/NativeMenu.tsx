import { ChevronRightIcon } from '@chakra-ui/icons'
import { Button, MenuDivider, MenuItem } from '@chakra-ui/react'
import { useCallback } from 'react'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'

const chevronRightIcon = <ChevronRightIcon />

export const NativeMenu = () => {
  const backupNativePassphrase = useModal('backupNativePassphrase')

  const onMenuItemClick = useCallback(
    () => backupNativePassphrase.open({}),
    [backupNativePassphrase],
  )

  return (
    <>
      <MenuDivider />
      <MenuItem
        as={Button}
        variant='ghost'
        justifyContent='space-between'
        rightIcon={chevronRightIcon}
        onClick={onMenuItemClick}
      >
        <Text translation='modals.shapeShift.backupPassphrase.menuItem' />
      </MenuItem>
    </>
  )
}
