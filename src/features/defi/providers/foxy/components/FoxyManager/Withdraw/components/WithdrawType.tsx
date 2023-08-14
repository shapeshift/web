import { Button, ButtonGroup, Stack } from '@chakra-ui/react'
import { WithdrawType } from '@shapeshiftoss/types'
import { useMemo } from 'react'
import { useController, useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { FormField } from 'components/DeFi/components/FormField'
import { Row } from 'components/Row/Row'
import { RawText } from 'components/Text'
import type { Asset } from 'lib/asset-service'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'

type WithdrawTypeProps = {
  asset: Asset
  handlePercentClick: (arg: number) => void
  feePercentage: string
}

export const WithdrawTypeField: React.FC<WithdrawTypeProps> = ({
  handlePercentClick,
  asset,
  feePercentage,
}) => {
  const { control, watch } = useFormContext()
  const translate = useTranslate()
  const { field: withdrawType } = useController({
    name: 'withdrawType',
    control,
    defaultValue: WithdrawType.DELAYED,
  })

  const cryptoAmount = watch('cryptoAmount')

  const handleClick = (value: WithdrawType) => {
    if (value === WithdrawType.INSTANT) {
      withdrawType.onChange(WithdrawType.INSTANT)
      handlePercentClick(1)
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
              <RawText color='text.subtle' fontSize='sm'>
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
              <RawText color='text.subtle' fontSize='sm'>
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
