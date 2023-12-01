import { Checkbox, Stack } from '@chakra-ui/react'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { FC } from 'react'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { isKeepKeyHDWallet } from 'lib/utils'
import { getIsDonationAmountBelowMinimum } from 'state/apis/swappers/helpers/getIsDonationAmountBelowMinimum'
import { selectUsdRateByAssetId } from 'state/slices/marketDataSlice/selectors'
import { selectSellAsset, selectWillDonate } from 'state/slices/swappersSlice/selectors'
import { swappers } from 'state/slices/swappersSlice/swappersSlice'
import {
  selectPotentialDonationAmountUserCurrency,
  selectSellAmountIncludingProtocolFeesCryptoBaseUnit,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

type DonationCheckboxProps = {
  isLoading: boolean
}

export const DonationCheckbox: FC<DonationCheckboxProps> = memo(
  ({ isLoading }): JSX.Element | null => {
    const translate = useTranslate()
    const dispatch = useAppDispatch()
    const willDonate = useAppSelector(selectWillDonate)
    const wallet = useWallet().state.wallet
    const walletIsKeepKey = wallet && isKeepKeyHDWallet(wallet)
    const sellAsset = useAppSelector(selectSellAsset)
    const sellAssetUsdRate = useAppSelector(state =>
      selectUsdRateByAssetId(state, sellAsset.assetId),
    )
    const sellAmountIncludingProtocolFeesCryptoBaseUnit = useAppSelector(
      selectSellAmountIncludingProtocolFeesCryptoBaseUnit,
    )
    const isFromEvm = isEvmChainId(sellAsset.chainId)

    const isDonationAmountBelowMinimum = useMemo(() => {
      if (!sellAmountIncludingProtocolFeesCryptoBaseUnit || !sellAssetUsdRate) return true
      return getIsDonationAmountBelowMinimum(
        sellAmountIncludingProtocolFeesCryptoBaseUnit,
        sellAsset,
        sellAssetUsdRate,
      )
    }, [sellAmountIncludingProtocolFeesCryptoBaseUnit, sellAsset, sellAssetUsdRate])

    // disable EVM donations on KeepKey until https://github.com/shapeshift/web/issues/4518 is resolved
    const showDonationOption =
      (walletIsKeepKey ? !isFromEvm : true) && !isDonationAmountBelowMinimum

    const {
      number: { toFiat },
    } = useLocaleFormatter()

    const potentialDonationAmountUserCurrency = useAppSelector(
      selectPotentialDonationAmountUserCurrency,
    )

    const handleDonationToggle = useCallback(() => {
      dispatch(swappers.actions.toggleWillDonate())
    }, [dispatch])

    const donationOption: JSX.Element = useMemo(
      () => (
        <Stack spacing={4}>
          <Row fontSize='sm'>
            <HelperTooltip label={translate('trade.tooltip.donation')}>
              <Row.Label>
                <Checkbox
                  isChecked={willDonate}
                  onChange={handleDonationToggle}
                  isDisabled={isLoading}
                >
                  <Text fontSize='sm' translation='trade.donation' />
                </Checkbox>
              </Row.Label>
            </HelperTooltip>
            <Row.Value>{toFiat(potentialDonationAmountUserCurrency ?? '0')}</Row.Value>
          </Row>
        </Stack>
      ),
      [
        translate,
        willDonate,
        handleDonationToggle,
        isLoading,
        toFiat,
        potentialDonationAmountUserCurrency,
      ],
    )

    return showDonationOption ? donationOption : null
  },
)
