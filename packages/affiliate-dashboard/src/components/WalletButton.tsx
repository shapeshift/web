import { Button } from '@chakra-ui/react'
import { useAppKit, useAppKitAccount } from '@reown/appkit/react'

import { shortenAddress } from '../lib/format'

export const WalletButton = (): React.JSX.Element => {
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()

  if (isConnected && address) {
    return (
      <Button
        onClick={() => open()}
        size='sm'
        fontFamily='mono'
        fontWeight={500}
        bg='pill.asset'
        color='pill.assetFg'
        _hover={{ bg: 'pill.asset', opacity: 0.85 }}
        _active={{ bg: 'pill.asset' }}
      >
        {shortenAddress(address)}
      </Button>
    )
  }

  return (
    <Button onClick={() => open()} size='sm'>
      Connect Wallet
    </Button>
  )
}
