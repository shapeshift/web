import { Checkbox, Stack } from '@chakra-ui/react'
import type { FC } from 'react'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { selectWillDonate } from 'state/slices/swappersSlice/selectors'
import { swappers } from 'state/slices/swappersSlice/swappersSlice'
import {
  selectActiveQuoteDonationBps,
  selectPotentialDonationAmountUserCurrency,
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
    const affiliateBps = useAppSelector(selectActiveQuoteDonationBps)

    const {
      number: { toFiat },
    } = useLocaleFormatter()

    const potentialDonationAmountFiat = useAppSelector(selectPotentialDonationAmountUserCurrency)

    const handleDonationToggle = useCallback(() => {
      dispatch(swappers.actions.toggleWillDonate())
    }, [dispatch])

    const donationOption: JSX.Element = useMemo(
      () => (
        <Stack spacing={4}>
          <Row>
            <HelperTooltip label={translate('trade.tooltip.donation')}>
              <Row.Label>
                <Checkbox
                  isChecked={willDonate}
                  onChange={handleDonationToggle}
                  isDisabled={isLoading}
                >
                  <Text translation='trade.donation' />
                </Checkbox>
              </Row.Label>
            </HelperTooltip>
            <Row.Value>{toFiat(potentialDonationAmountFiat ?? '0')}</Row.Value>
          </Row>
        </Stack>
      ),
      [translate, willDonate, handleDonationToggle, isLoading, toFiat, potentialDonationAmountFiat],
    )

    return affiliateBps !== undefined ? donationOption : null
  },
)
