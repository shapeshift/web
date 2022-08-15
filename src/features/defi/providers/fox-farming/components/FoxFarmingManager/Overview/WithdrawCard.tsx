import { Button, Stack, useColorModeValue } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/asset-service'
import {
  DefiAction,
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
import { FaArrowDown, FaArrowRight } from 'react-icons/fa'
import { Amount } from 'components/Amount/Amount'
import { IconCircle } from 'components/IconCircle'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'

type WithdrawCardProps = {
  asset: Asset
  amount: string
}

export const WithdrawCard = ({ asset, ...rest }: WithdrawCardProps) => {
  const { history, location, query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const {
    state: { isConnected },
    dispatch,
  } = useWallet()
  const { amount } = rest
  const hasClaim = bnOrZero(amount).gt(0)
  const textColor = useColorModeValue('black', 'white')
  const successColor = useColorModeValue('green.500', 'green.200')

  const handleClick = () => {
    history.push({
      pathname: location.pathname,
      search: qs.stringify({
        ...query,
        modal: DefiAction.Claim,
      }),
    })
  }

  const handleWalletModalOpen = () =>
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })

  return (
    <Stack px={8} py={6}>
      <Text fontWeight='medium' translation='defi.modals.foxyOverview.withdrawals' />
      {!hasClaim ? (
        <Text color='gray.500' translation='defi.modals.foxyOverview.emptyWithdraws' />
      ) : (
        <Button
          variant='input'
          width='full'
          maxHeight='auto'
          height='auto'
          alignItems='center'
          justifyContent='flex-start'
          textAlign='left'
          py={2}
          onClick={() => (isConnected ? handleClick() : handleWalletModalOpen())}
          leftIcon={
            <IconCircle>
              <FaArrowDown />
            </IconCircle>
          }
        >
          <Stack spacing={0}>
            <Text color={textColor} translation='common.withdrawal' />
            <Text
              color={successColor}
              fontWeight='normal'
              lineHeight='shorter'
              translation='common.available'
            />
          </Stack>
          <Stack spacing={0} ml='auto' textAlign='right'>
            <Amount.Crypto color={textColor} value={amount} symbol={asset.symbol} />
            <Stack direction='row' alignItems='center' color='blue.500'>
              <Text translation='defi.modals.claim.claimNow' />
              <FaArrowRight />
            </Stack>
          </Stack>
        </Button>
      )}
    </Stack>
  )
}
