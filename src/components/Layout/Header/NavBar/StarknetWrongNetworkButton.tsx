import { WarningIcon } from '@chakra-ui/icons'
import type { BoxProps, ButtonProps } from '@chakra-ui/react'
import { Box, Button, Tooltip } from '@chakra-ui/react'
import type { StarknetInjectedHDWallet } from '@shapeshiftoss/hdwallet-starknet-injected'
import { memo, useCallback, useEffect, useState } from 'react'
import { useTranslate } from 'react-polyglot'

const warningIcon = <WarningIcon color='yellow.300' boxSize='4' />

type StarknetWrongNetworkButtonProps = BoxProps & {
  wallet: StarknetInjectedHDWallet
  buttonProps?: ButtonProps
}

// Balances are mainnet only, so nothing else tells the user their extension is on another network
export const StarknetWrongNetworkButton = memo(
  ({ wallet, buttonProps, ...props }: StarknetWrongNetworkButtonProps) => {
    const translate = useTranslate()
    const [isWrongNetwork, setIsWrongNetwork] = useState(false)
    const [isSwitching, setIsSwitching] = useState(false)

    useEffect(() => {
      const { provider } = wallet
      let isCancelled = false

      const checkNetwork = async () => {
        try {
          const isMainnet = await wallet.isMainnet()
          if (!isCancelled) setIsWrongNetwork(!isMainnet)
        } catch (e) {
          console.error(e)
        }
      }

      const handleNetworkChanged = () => void checkNetwork()

      void checkNetwork()
      provider.on('networkChanged', handleNetworkChanged)

      return () => {
        isCancelled = true
        provider.off('networkChanged', handleNetworkChanged)
      }
    }, [wallet])

    const handleClick = useCallback(async () => {
      setIsSwitching(true)
      try {
        await wallet.ensureMainnet()
        setIsWrongNetwork(!(await wallet.isMainnet()))
      } catch (e) {
        // User refused the switch, the warning stays
        console.error(e)
      } finally {
        setIsSwitching(false)
      }
    }, [wallet])

    if (!isWrongNetwork) return null

    return (
      <Box {...props}>
        <Tooltip
          label={translate('walletProvider.starknetInjected.wrongNetwork.tooltip', {
            name: wallet.getVendor(),
          })}
        >
          <Button
            leftIcon={warningIcon}
            isLoading={isSwitching}
            onClick={handleClick}
            {...buttonProps}
          >
            {translate('walletProvider.starknetInjected.wrongNetwork.button')}
          </Button>
        </Tooltip>
      </Box>
    )
  },
)
