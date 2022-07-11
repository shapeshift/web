import { Box, Flex } from '@chakra-ui/layout'
import {
  Button,
  Divider,
  FormControl,
  ModalFooter,
  Stack,
  Text as CText,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { AssetId } from '@shapeshiftoss/caip'
import { AmountToStake } from 'plugins/cosmos/components/AmountToStake/AmountToStake'
import { AssetHoldingsCard } from 'plugins/cosmos/components/AssetHoldingsCard/AssetHoldingsCard'
import { PercentOptionsRow } from 'plugins/cosmos/components/PercentOptionsRow/PercentOptionsRow'
import { StakingInput } from 'plugins/cosmos/components/StakingInput/StakingInput'
import { useMemo, useRef, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'
import { BigNumber, bnOrZero } from 'lib/bignumber/bignumber'
import {
  selectAssetById,
  selectDelegationCryptoAmountByAssetIdAndValidator,
  selectMarketDataById,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { assetIdToUnbondingDays, Field, StakingValues, UnstakingPath } from '../StakingCommon'

export enum InputType {
  Crypto = 'crypto',
  Fiat = 'fiat',
}

type UnstakeProps = {
  assetId: AssetId
  accountSpecifier: string
  validatorAddress: string
}

export const Unstake = ({ assetId, accountSpecifier, validatorAddress }: UnstakeProps) => {
  const unbondingDays = useMemo(() => assetIdToUnbondingDays(assetId), [assetId])
  const {
    control,
    formState: { isValid },
    handleSubmit,
    setValue,
  } = useFormContext<StakingValues>()

  const values = useWatch({ control })

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const cryptoStakeBalance = useAppSelector(state =>
    selectDelegationCryptoAmountByAssetIdAndValidator(state, {
      accountSpecifier,
      validatorAddress,
      assetId,
    }),
  )
  const cryptoStakeBalanceHuman = bnOrZero(cryptoStakeBalance).div(`1e+${asset?.precision}`)

  const fiatStakeAmountHuman = cryptoStakeBalanceHuman.times(bnOrZero(marketData.price)).toString()

  const [percent, setPercent] = useState<number | null>(null)
  const [activeField, setActiveField] = useState<InputType>(InputType.Crypto)

  const amountRef = useRef<string | null>(null)

  const bgColor = useColorModeValue('gray.50', 'gray.850')
  const borderColor = useColorModeValue('gray.100', 'gray.750')

  const { cosmosStaking } = useModal()

  const memoryHistory = useHistory()

  const onSubmit = (_: any) => {
    memoryHistory.push(UnstakingPath.Confirm, {
      cryptoAmount: bnOrZero(values.cryptoAmount).times(`1e+${asset?.precision}`).toString(),
      assetId,
      fiatRate: bnOrZero(marketData.price),
    })
  }

  const translate = useTranslate()

  const handleCancel = () => {
    cosmosStaking.close()
  }

  const handlePercentClick = (_percent: number) => {
    if (values.amountFieldError) {
      setValue(Field.AmountFieldError, '', { shouldValidate: true })
    }

    const cryptoAmount = bnOrZero(cryptoStakeBalanceHuman)
      .times(_percent)
      .dp(asset.precision, BigNumber.ROUND_DOWN)
    const fiatAmount = bnOrZero(cryptoAmount).times(marketData.price)
    if (activeField === InputType.Crypto) {
      setValue(Field.FiatAmount, fiatAmount.toString(), { shouldValidate: true })
      setValue(Field.CryptoAmount, cryptoAmount.toString(), { shouldValidate: true })
    } else {
      setValue(Field.FiatAmount, fiatAmount.toString(), { shouldValidate: true })
      setValue(Field.CryptoAmount, cryptoAmount.toString(), { shouldValidate: true })
    }
    setPercent(_percent)
  }

  const handleInputChange = (value: string) => {
    setPercent(null)
    if (activeField === InputType.Crypto) {
      const cryptoAmount = bnOrZero(value).dp(asset.precision, BigNumber.ROUND_DOWN)
      const fiatAmount = bnOrZero(value).times(marketData.price)
      setValue(Field.FiatAmount, fiatAmount.toString(), { shouldValidate: true })
      setValue(Field.CryptoAmount, value.length ? cryptoAmount.toString() : value, {
        shouldValidate: true,
      })

      if (cryptoAmount.gt(cryptoStakeBalanceHuman)) {
        setValue(Field.AmountFieldError, 'common.insufficientFunds', { shouldValidate: true })
        return
      }
    } else {
      const cryptoAmount = bnOrZero(value)
        .div(marketData.price)
        .dp(asset.precision, BigNumber.ROUND_DOWN)
      setValue(Field.CryptoAmount, cryptoAmount.toString(), { shouldValidate: true })

      if (bnOrZero(cryptoAmount).gt(bnOrZero(cryptoStakeBalanceHuman))) {
        setValue(Field.AmountFieldError, 'common.insufficientFunds', { shouldValidate: true })
        return
      }
    }

    if (values.amountFieldError) {
      setValue(Field.AmountFieldError, '', { shouldValidate: true })
    }
  }

  const handleInputToggle = () => {
    const field = activeField === InputType.Crypto ? InputType.Fiat : InputType.Crypto
    setActiveField(field)
  }

  return (
    <SlideTransition>
      <Box
        as='form'
        pt='22px'
        pb='15px'
        px='24px'
        maxWidth='lg'
        width='full'
        onSubmit={handleSubmit(onSubmit)}
      >
        <Flex
          direction='column'
          maxWidth='595px'
          minHeight='380px'
          alignItems='center'
          justifyContent='space-between'
        >
          <AssetHoldingsCard
            asset={asset}
            cryptoAmountAvailable={cryptoStakeBalanceHuman.toString()}
            fiatAmountAvailable={fiatStakeAmountHuman}
          />
          <FormControl>
            <AmountToStake
              width='100%'
              mt='12px'
              justifyContent='space-between'
              alignItems='flex-start'
              isStake={false}
              values={values}
              isCryptoField={activeField === InputType.Crypto}
              asset={asset}
              onInputToggle={handleInputToggle}
            />
            <VStack
              bg={bgColor}
              borderRadius='xl'
              borderWidth={1}
              borderColor={borderColor}
              divider={<Divider />}
              spacing={0}
              mt='8px'
              mb='8px'
            >
              <PercentOptionsRow
                width='100%'
                onPercentClick={handlePercentClick}
                percent={percent}
              />
              <StakingInput
                inputStyle={{
                  borderTopLeftRadius: 0,
                  borderTopRightRadius: 0,
                  borderBottomLeftRadius: 0,
                }}
                isCryptoField={activeField === InputType.Crypto}
                amountRef={amountRef.current}
                asset={asset}
                onInputToggle={handleInputToggle}
                onInputChange={handleInputChange}
                control={control}
              />
            </VStack>
          </FormControl>

          <CText color='gray.500' fontSize='sm' mb='10px'>
            {translate('staking.itWillTake')}
            <span> </span>
            <Box as='span' color='gray.100' fontWeight='bold'>
              {`${unbondingDays} ${translate('common.days')}`}
            </Box>
            <span> </span>
            {translate('staking.toUnlock', { assetSymbol: asset.symbol })}
          </CText>

          <Divider />

          <ModalFooter width='100%' py='0' px='0' flexDir='column' textAlign='center' mt={1}>
            <Stack direction='row' width='full' justifyContent='space-between'>
              <Button onClick={handleCancel} size='lg' variant='ghost'>
                <Text translation='common.cancel' />
              </Button>
              <Button
                colorScheme={values.amountFieldError ? 'red' : 'blue'}
                isDisabled={Boolean(!isValid || values.amountFieldError)}
                mb={2}
                size='lg'
                type='submit'
              >
                <Text translation={values.amountFieldError || 'common.continue'} />
              </Button>
            </Stack>
          </ModalFooter>
        </Flex>
      </Box>
    </SlideTransition>
  )
}
