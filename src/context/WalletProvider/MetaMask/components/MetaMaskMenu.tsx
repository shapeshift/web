import { MenuDivider, MenuItem, Skeleton, Tag } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useIsSnapInstalled } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useModal } from 'hooks/useModal/useModal'

export const MetaMaskMenu = () => {
  const isSnapInstalled = useIsSnapInstalled()
  const translate = useTranslate()
  const snapModal = useModal('snaps')

  const handleClick = useCallback(() => {
    if (isSnapInstalled === false) {
      snapModal.open({})
    }
  }, [isSnapInstalled, snapModal])

  const renderSnapStatus = useMemo(() => {
    if (isSnapInstalled === true) {
      return <Tag colorScheme='green'>{translate('walletProvider.metaMaskSnap.active')}</Tag>
    } else {
      return <Tag>{translate('walletProvider.metaMaskSnap.notActive')}</Tag>
    }
  }, [isSnapInstalled, translate])

  return (
    <>
      <MenuDivider />
      <MenuItem
        justifyContent='space-between'
        onClick={handleClick}
        isDisabled={isSnapInstalled === true}
      >
        {translate('walletProvider.metaMaskSnap.multiChainSnap')}
        <Skeleton isLoaded={isSnapInstalled !== null}>{renderSnapStatus}</Skeleton>
      </MenuItem>
    </>
  )
}
