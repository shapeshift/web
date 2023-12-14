import type { ResponsiveValue, StackDirection } from '@chakra-ui/react'
import { Button, Skeleton, Stack, useColorModeValue } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import type { Property } from 'csstype'
import dayjs from 'dayjs'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
import { useCallback, useMemo } from 'react'
import { FaArrowDown, FaArrowRight } from 'react-icons/fa'
import { Amount } from 'components/Amount/Amount'
import { IconCircle } from 'components/IconCircle'
import { Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { UserUndelegation } from 'state/slices/opportunitiesSlice/resolvers/foxy/types'

type WithdrawCardProps = {
  asset: Asset
  undelegation: UserUndelegation | undefined
  canClaimWithdraw: boolean | null
}

const buttonAignItems = { base: 'flex-start', md: 'center' }
const flexDirectionMdRow: ResponsiveValue<Property.FlexDirection> = { base: 'column', md: 'row' }
const stackFlexDirectionMdColumn: StackDirection = {
  base: 'row',
  md: 'column',
}
const stackGap = { base: 2, md: 0 }
const stackMarginLeft = { base: 0, md: 'auto' }
const stackTextAlign: ResponsiveValue<Property.TextAlign> = { base: 'left', md: 'right' }

export const WithdrawCard = ({ asset, undelegation, canClaimWithdraw }: WithdrawCardProps) => {
  const { history, location, query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const {
    state: { isConnected },
    dispatch,
  } = useWallet()
  const hasClaim = bnOrZero(undelegation?.undelegationAmountCryptoBaseUnit).gt(0)
  const textColor = useColorModeValue('black', 'white')
  const canClaimWithdrawLoading = canClaimWithdraw === null
  const isUndelegationAvailable =
    canClaimWithdraw && undelegation && dayjs().isAfter(dayjs.unix(undelegation.completionTime))
  const successColor = useColorModeValue('green.500', 'green.200')
  const pendingColor = useColorModeValue('yellow.500', 'yellow.200')

  const handleWalletModalOpen = useCallback(
    () => dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true }),
    [dispatch],
  )

  const handleClick = useCallback(() => {
    if (!isConnected) return handleWalletModalOpen()

    history.push({
      pathname: location.pathname,
      search: qs.stringify({
        ...query,
        modal: DefiAction.Claim,
      }),
    })
  }, [handleWalletModalOpen, history, isConnected, location.pathname, query])

  const availableDateTranslation: TextPropTypes['translation'] = useMemo(
    () => [
      'defi.modals.foxyOverview.availableDate',
      { date: undelegation ? dayjs(dayjs.unix(undelegation.completionTime)).fromNow() : '' },
    ],
    [undelegation],
  )

  if (!(undelegation && hasClaim)) return null

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
          alignItems={buttonAignItems}
          justifyContent='flex-start'
          textAlign='left'
          isDisabled={!isUndelegationAvailable}
          gap={4}
          flexDir={flexDirectionMdRow}
          py={2}
          onClick={handleClick}
        >
          <Stack direction='row' alignItems='center' width='full'>
            <IconCircle boxSize={8}>
              <FaArrowDown />
            </IconCircle>
            <Stack
              justifyContent='space-between'
              spacing={0}
              width='full'
              direction={stackFlexDirectionMdColumn}
            >
              <Text color={textColor} translation='common.withdrawal' />
              <Text
                color={isUndelegationAvailable ? successColor : pendingColor}
                fontWeight='normal'
                lineHeight='shorter'
                translation={isUndelegationAvailable ? 'common.available' : 'common.pending'}
              />
            </Stack>
          </Stack>
          <Stack
            direction={stackFlexDirectionMdColumn}
            spacing={0}
            gap={stackGap}
            ml={stackMarginLeft}
            flexWrap='wrap'
            textAlign={stackTextAlign}
          >
            <Amount.Crypto
              color={textColor}
              value={bnOrZero(undelegation.undelegationAmountCryptoBaseUnit)
                .div(bn(10).pow(asset?.precision))
                .toFixed()}
              symbol={asset.symbol}
              maximumFractionDigits={4}
            />
            <Skeleton isLoaded={!canClaimWithdrawLoading}>
              {isUndelegationAvailable ? (
                <Stack direction='row' alignItems='center' color='blue.500'>
                  <Text translation='defi.modals.claim.claimNow' />
                  <FaArrowRight />
                </Stack>
              ) : (
                <Text
                  fontWeight='normal'
                  lineHeight='shorter'
                  translation={availableDateTranslation}
                />
              )}
            </Skeleton>
          </Stack>
        </Button>
      )}
    </Stack>
  )
}
