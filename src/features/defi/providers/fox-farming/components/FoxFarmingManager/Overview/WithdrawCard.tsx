import type { ResponsiveValue, StackDirection } from '@chakra-ui/react'
import { Button, Stack, useColorModeValue } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import type { Property } from 'csstype'
import qs from 'qs'
import { FaArrowDown, FaArrowRight } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'

import { Amount } from '@/components/Amount/Amount'
import { IconCircle } from '@/components/IconCircle'
import { Text } from '@/components/Text'
import { WalletActions } from '@/context/WalletProvider/actions'
import type {
  DefiParams,
  DefiQueryParams,
} from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction } from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'

type WithdrawCardProps = {
  asset: Asset
  amount: string
  expired: boolean | undefined
}

const alignItemsMdCenter = { base: 'flex-start', md: 'center' }
const buttonFlexDir: ResponsiveValue<Property.FlexDirection> = { base: 'column', md: 'row' }
const stackDirection: StackDirection = { base: 'row', md: 'column' }
const stackGap = { base: 2, md: 0 }
const stackMarginLeft = { base: 0, md: 'auto' }
const stackTextAlign: ResponsiveValue<Property.TextAlign> = { base: 'left', md: 'right' }

export const WithdrawCard = ({ asset, amount, expired }: WithdrawCardProps) => {
  const { location, query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const navigate = useNavigate()
  const {
    state: { isConnected },
    dispatch,
  } = useWallet()
  const hasClaim = bnOrZero(amount).gt(0)
  const textColor = useColorModeValue('black', 'white')
  const successColor = useColorModeValue('green.500', 'green.200')

  const handleClick = () => {
    navigate({
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
          alignItems={alignItemsMdCenter}
          justifyContent='flex-start'
          textAlign='left'
          gap={4}
          flexDir={buttonFlexDir}
          py={2}
          onClick={
            !expired
              ? () => (isConnected ? handleClick() : handleWalletModalOpen())
              : () =>
                  navigate({
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
              direction={stackDirection}
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
            direction={stackDirection}
            spacing={0}
            gap={stackGap}
            ml={stackMarginLeft}
            flexWrap='wrap'
            textAlign={stackTextAlign}
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
