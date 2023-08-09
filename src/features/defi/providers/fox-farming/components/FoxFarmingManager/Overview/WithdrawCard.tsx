import { Button, Stack, useColorModeValue } from '@chakra-ui/react'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
import { FaArrowDown, FaArrowRight } from 'react-icons/fa'
import { Amount } from 'components/Amount/Amount'
import { IconCircle } from 'components/IconCircle'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { Asset } from 'lib/asset-service'
import { bnOrZero } from 'lib/bignumber/bignumber'

type WithdrawCardProps = {
  asset: Asset
  amount: string
  expired: boolean | undefined
}

export const WithdrawCard = ({ asset, amount, expired }: WithdrawCardProps) => {
  const { history, location, query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const {
    state: { isConnected },
    dispatch,
  } = useWallet()
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
        <Text color='text.subtle' translation='defi.modals.foxyOverview.emptyWithdraws' />
      ) : (
        <Button
          variant='input'
          width='full'
          maxHeight='auto'
          height='auto'
          alignItems={{ base: 'flex-start', md: 'center' }}
          justifyContent='flex-start'
          textAlign='left'
          gap={4}
          flexDir={{ base: 'column', md: 'row' }}
          py={2}
          onClick={
            !expired
              ? () => (isConnected ? handleClick() : handleWalletModalOpen())
              : () =>
                  history.push({
                    pathname: location.pathname,
                    search: qs.stringify({
                      ...query,
                      modal: DefiAction.Withdraw,
                    }),
                  })
          }
        >
          <Stack direction='row' alignItems='center' width='full'>
            <IconCircle boxSize={8}>
              <FaArrowDown />
            </IconCircle>
            <Stack
              justifyContent='space-between'
              spacing={0}
              width='full'
              direction={{ base: 'row', md: 'column' }}
            >
              <Text color={textColor} translation='common.withdrawal' />
              <Text
                color={successColor}
                fontWeight='normal'
                lineHeight='shorter'
                translation='common.available'
              />
            </Stack>
          </Stack>
          <Stack
            direction={{ base: 'row', md: 'column' }}
            spacing={0}
            gap={{ base: 2, md: 0 }}
            ml={{ base: 0, md: 'auto' }}
            flexWrap='wrap'
            textAlign={{ base: 'left', md: 'right' }}
          >
            <Amount.Crypto color={textColor} value={amount} symbol={asset.symbol} />
            {!expired && (
              <Stack direction='row' alignItems='center' color='blue.500'>
                <Text translation='defi.modals.claim.claimNow' />
                <FaArrowRight />
              </Stack>
            )}
          </Stack>
        </Button>
      )}
    </Stack>
  )
}
