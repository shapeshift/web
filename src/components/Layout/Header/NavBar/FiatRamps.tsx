import type { BoxProps } from '@chakra-ui/react'
import { Box, IconButton, Tooltip } from '@chakra-ui/react'
import { FaCreditCard } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { WalletActions } from 'context/WalletProvider/actions'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'

type FiatRampsProps = BoxProps

export const FiatRamps = (props: FiatRampsProps) => {
  const { fiatRamps } = useModal()
  const translate = useTranslate()
  const {
    state: { isConnected },
    dispatch,
  } = useWallet()
  const handleWalletModalOpen = () =>
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })

  return (
    <Box {...props}>
      <Tooltip label={translate('fiatRamps.headerLabel')}>
        <IconButton
          icon={<FaCreditCard />}
          data-test='fiat-ramps-button'
          width='full'
          aria-label={translate('fiatRamps.headerLabel')}
          onClick={() => (isConnected ? fiatRamps.open({}) : handleWalletModalOpen())}
        />
      </Tooltip>
    </Box>
  )
}
