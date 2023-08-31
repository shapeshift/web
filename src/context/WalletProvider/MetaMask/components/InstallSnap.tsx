import { Button, Heading, Stack } from '@chakra-ui/react'
import { getConfig } from 'config'
import { useEffect } from 'react'
import { enableShapeShiftSnap, shapeShiftSnapInstalled } from 'utils/snaps'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'

export const MetaMaskInstallSnap = () => {
  const { dispatch } = useWallet()
  const snapId = getConfig().REACT_APP_SNAP_ID
  const handleClick = () => {
    enableShapeShiftSnap()
  }

  useEffect(() => {
    const checkSnapInstallation = async () => {
      const snapIsInstalled = await shapeShiftSnapInstalled(snapId)
      if (snapIsInstalled) {
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
      }
    }

    checkSnapInstallation()
  }, [snapId, dispatch])

  return (
    <Stack>
      <Heading as='h4'>MetaMask meet Multichain</Heading>
      <Button colorScheme='blue' onClick={handleClick}>
        Use Snap
      </Button>
    </Stack>
  )
}
