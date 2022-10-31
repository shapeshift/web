import { Button, ButtonGroup, Stack } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { MarketData } from '@shapeshiftoss/types'
import { WithdrawType } from '@shapeshiftoss/types'
import { Field } from 'features/defi/components/Withdraw/Withdraw'
import { useCallback, useMemo } from 'react'
import { useController, useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { FormField } from 'components/DeFi/components/FormField'
import { Row } from 'components/Row/Row'
import { RawText } from 'components/Text'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'

type WithdrawTypeProps = {
  asset: Asset
  cryptoAmountAvailable: string
  feePercentage: string
  marketData: MarketData
}

export const WithdrawTypeField: React.FC<WithdrawTypeProps> = ({
  asset,
  cryptoAmountAvailable,
  feePercentage,
  marketData,
}) => {
  const { control, watch, setValue } = useFormContext()
  const translate = useTranslate()
  const { field: withdrawType } = useController({
    name: 'withdrawType',
    control,
    defaultValue: WithdrawType.DELAYED,
  })

  const cryptoAmount = watch('cryptoAmount')

  const handlePercentOptionClick = useCallback(
    (percent: number) => {
      const percentageCryptoAmount = bnOrZero(cryptoAmountAvailable).times(percent)
      const percentageFiatAmount = bnOrZero(percentageCryptoAmount).times(marketData.price)
      const percentageCryptoAmountHuman = percentageCryptoAmount.decimalPlaces(asset.precision)
      setValue(Field.FiatAmount, percentageFiatAmount.toString(), {
        shouldValidate: true,
      })
      // TODO(gomes): DeFi UI abstraction should use base precision amount everywhere, and the explicit crypto/human vernacular
      // Passing human amounts around is a bug waiting to happen, like the one this commit fixes
      setValue(Field.CryptoAmount, percentageCryptoAmountHuman.toString(), {
        shouldValidate: true,
      })
    },
    [asset.precision, cryptoAmountAvailable, marketData.price, setValue],
  )

  const handleClick = (value: WithdrawType) => {
    if (value === WithdrawType.INSTANT) {
      withdrawType.onChange(WithdrawType.INSTANT)
      handlePercentOptionClick(1)
    } else {
      withdrawType.onChange(WithdrawType.DELAYED)
    }
  }

  const withdrawalFee = useMemo(() => {
    return withdrawType.value === WithdrawType.INSTANT
      ? bnOrZero(bn(cryptoAmount).times(feePercentage)).toString()
      : '0'
  }, [cryptoAmount, feePercentage, withdrawType.value])

  return (
    <>
      <FormField label={translate('modals.withdraw.withdrawType')}>
        <ButtonGroup colorScheme='blue' width='full' variant='input'>
          <Button
            width='full'
            flexDir='column'
            height='auto'
            py={4}
            onClick={() => handleClick(WithdrawType.INSTANT)}
            isActive={withdrawType.value === WithdrawType.INSTANT}
          >
            <Stack alignItems='center' spacing={1}>
              <RawText>{translate('modals.withdraw.instant')}</RawText>
              <RawText color='gray.500' fontSize='sm'>
                {translate('modals.withdraw.fee', {
                  fee: bnOrZero(feePercentage).times(100) ?? '0',
                  symbol: asset.symbol,
                })}
              </RawText>
            </Stack>
          </Button>
          <Button
            width='full'
            flexDir='column'
            height='auto'
            onClick={() => handleClick(WithdrawType.DELAYED)}
            isActive={withdrawType.value === WithdrawType.DELAYED}
          >
            <Stack alignItems='center' spacing={1}>
              <RawText>{translate('modals.withdraw.delayed')}</RawText>
              <RawText color='gray.500' fontSize='sm'>
                {translate('modals.withdraw.noFee', {
                  symbol: asset.symbol,
                })}
              </RawText>
            </Stack>
          </Button>
        </ButtonGroup>
      </FormField>
      <Row>
        <Row.Label>{translate('modals.withdraw.withdrawalFee')}</Row.Label>
        <Row.Value>
          <Amount.Crypto value={withdrawalFee} symbol={asset.symbol} />
        </Row.Value>
      </Row>
    </>
  )
}
