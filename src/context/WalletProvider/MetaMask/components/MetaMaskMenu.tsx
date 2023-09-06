import { MenuDivider, MenuItem, Skeleton, Tag } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { enableShapeShiftSnap } from 'utils/snaps'
import { useIsSnapInstalled } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'

export const MetaMaskMenu = () => {
  const isSnapInstalled = useIsSnapInstalled()

  const handleClick = useCallback(() => {
    if (isSnapInstalled === false) {
      enableShapeShiftSnap()
    }
  }, [isSnapInstalled])

  const renderSnapStatus = useMemo(() => {
    if (isSnapInstalled === true) {
      return <Tag colorScheme='green'>Active</Tag>
    } else {
      return <Tag>Not Active</Tag>
    }
  }, [isSnapInstalled])

  return (
    <>
      <MenuDivider />
      <MenuItem
        justifyContent='space-between'
        onClick={handleClick}
        isDisabled={isSnapInstalled === true}
      >
        Multichain Snap
        <Skeleton isLoaded={isSnapInstalled !== null}>{renderSnapStatus}</Skeleton>
      </MenuItem>
    </>
  )
}
