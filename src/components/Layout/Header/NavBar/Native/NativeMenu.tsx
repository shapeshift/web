import { ChevronRightIcon } from '@chakra-ui/icons'
import { Button, MenuDivider, MenuItem } from '@chakra-ui/react'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'

export const NativeMenu = () => {
  const backupNativePassphrase = useModal('backupNativePassphrase')

  return (
    <>
      <MenuDivider />
      <MenuItem
        as={Button}
        variant='ghost'
        justifyContent='space-between'
        rightIcon={<ChevronRightIcon />}
        onClick={() => backupNativePassphrase.open({})}
      >
        <Text translation='modals.shapeShift.backupPassphrase.menuItem' />
      </MenuItem>
    </>
  )
}
