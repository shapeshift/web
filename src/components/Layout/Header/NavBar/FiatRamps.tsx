import type { BoxProps } from '@chakra-ui/react'
import { Button } from '@chakra-ui/react'
import { useMediaQuery } from '@chakra-ui/react'
import { Box, Tooltip } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { WalletActions } from 'context/WalletProvider/actions'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { breakpoints } from 'theme/theme'

type FiatRampsProps = BoxProps

export const FiatRamps = (props: FiatRampsProps) => {
  const { fiatRamps } = useModal()
  const translate = useTranslate()
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const {
    state: { isConnected },
    dispatch,
  } = useWallet()
  const handleWalletModalOpen = () =>
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })

  return (
    <Box alignSelf='flex-end' {...props} mr={4}>
      <Tooltip label={translate('fiatRamps.headerLabel')} isDisabled={!isLargerThanMd}>
        <Button onClick={() => (isConnected ? fiatRamps.open({}) : handleWalletModalOpen())}>
          Buy Bitcoin
        </Button>
      </Tooltip>
    </Box>
  )
}
