import { Button, Stack, useColorModeValue } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import dayjs from 'dayjs'
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
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { UserUndelegation } from 'state/slices/opportunitiesSlice/resolvers/foxy/types'

type WithdrawCardProps = {
  asset: Asset
  undelegation: UserUndelegation | undefined
}

export const WithdrawCard = ({ asset, undelegation }: WithdrawCardProps) => {
  const { history, location, query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const {
    state: { isConnected },
    dispatch,
  } = useWallet()
  const hasClaim = bnOrZero(undelegation?.undelegationAmountCryptoBaseUnit).gt(0)
  const textColor = useColorModeValue('black', 'white')
  const isAvailable = undelegation && dayjs().isAfter(dayjs.unix(undelegation.completionTime))
  const successColor = useColorModeValue('green.500', 'green.200')
  const pendingColor = useColorModeValue('yellow.500', 'yellow.200')

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

  if (!(undelegation && hasClaim)) return null

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
          alignItems={{ base: 'flex-start', md: 'center' }}
          justifyContent='flex-start'
          textAlign='left'
          isDisabled={!isAvailable}
          gap={4}
          flexDir={{ base: 'column', md: 'row' }}
          py={2}
          onClick={() => (isConnected ? handleClick() : handleWalletModalOpen())}
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
                color={isAvailable ? successColor : pendingColor}
                fontWeight='normal'
                lineHeight='shorter'
                translation={isAvailable ? 'common.available' : 'common.pending'}
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
            <Amount.Crypto
              color={textColor}
              value={bnOrZero(undelegation.undelegationAmountCryptoBaseUnit)
                .div(`1e+${asset.precision}`)
                .toFixed()}
              symbol={asset.symbol}
              maximumFractionDigits={4}
            />
            {isAvailable ? (
              <Stack direction='row' alignItems='center' color='blue.500'>
                <Text translation='defi.modals.claim.claimNow' />
                <FaArrowRight />
              </Stack>
            ) : (
              <Text
                fontWeight='normal'
                lineHeight='shorter'
                translation={[
                  'defi.modals.foxyOverview.availableDate',
                  { date: dayjs(dayjs.unix(undelegation.completionTime)).fromNow() },
                ]}
              />
            )}
          </Stack>
        </Button>
      )}
    </Stack>
  )
}
