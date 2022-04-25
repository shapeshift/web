import { Flex } from '@chakra-ui/layout'
import {
  Box,
  Button,
  Divider,
  FormControl,
  FormHelperText,
  Link,
  Stack,
  Text as CText,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { AmountToStake } from 'plugins/cosmos/components/AmountToStake/AmountToStake'
import { AssetHoldingsCard } from 'plugins/cosmos/components/AssetHoldingsCard/AssetHoldingsCard'
import { EstimatedReturnsRow } from 'plugins/cosmos/components/EstimatedReturnsRow/EstimatedReturnsRow'
import { PercentOptionsRow } from 'plugins/cosmos/components/PercentOptionsRow/PercentOptionsRow'
import { StakingInput } from 'plugins/cosmos/components/StakingInput/StakingInput'
import { useRef, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'
import { BigNumber, bnOrZero } from 'lib/bignumber/bignumber'
import {
  selectAssetByCAIP19,
  selectMarketDataById,
  selectPortfolioCryptoBalanceByAssetId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { Field, InputType, StakingPath, StakingValues } from '../StakingCommon'

type StakeProps = {
  apr: string
  assetId: CAIP19
  validatorAddress: string
}

// TODO: Make this a derived selector after this is wired up
function calculateYearlyYield(apy: string, amount: string = '') {
  return bnOrZero(amount).times(apy).div(100).toString()
}

export const Stake = ({ assetId, apr, validatorAddress }: StakeProps) => {
  const {
    control,
    formState: { isValid },
    handleSubmit,
    setValue,
  } = useFormContext<StakingValues>()

  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))

  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const balance = useAppSelector(state => selectPortfolioCryptoBalanceByAssetId(state, assetId))
  const cryptoBalanceHuman = bnOrZero(balance).div(`1e+${asset?.precision}`)

  const fiatAmountAvailable = cryptoBalanceHuman.times(bnOrZero(marketData.price)).toString()

  const values = useWatch({ control })
  const [percent, setPercent] = useState<number | null>(null)
  const [activeField, setActiveField] = useState<InputType>(InputType.Crypto)

  const amountRef = useRef<string | null>(null)

  const bgColor = useColorModeValue('gray.50', 'gray.850')
  const borderColor = useColorModeValue('gray.100', 'gray.750')

  const memoryHistory = useHistory()

  const { cosmosStaking } = useModal()

  const onSubmit = (_: any) => {
    memoryHistory.push(StakingPath.Confirm, {
      cryptoAmount: bnOrZero(values.cryptoAmount),
      fiatRate: bnOrZero(marketData.price),
      apr,
    })
  }

  const cryptoYield = calculateYearlyYield(apr, values.cryptoAmount)
  const fiatYield = bnOrZero(cryptoYield).times(marketData.price).toPrecision()

  const translate = useTranslate()

  const handlePercentClick = (_percent: number) => {
    if (values.amountFieldError) {
      setValue(Field.AmountFieldError, '', { shouldValidate: true })
    }

    const cryptoAmount = bnOrZero(cryptoBalanceHuman)
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
      setValue(Field.CryptoAmount, cryptoAmount.toString(), { shouldValidate: true })

      if (cryptoAmount.gt(cryptoBalanceHuman)) {
        setValue(Field.AmountFieldError, 'common.insufficientFunds', { shouldValidate: true })
        return
      }
    } else {
      const cryptoAmount = bnOrZero(value)
        .div(marketData.price)
        .dp(asset.precision, BigNumber.ROUND_DOWN)
      setValue(Field.CryptoAmount, cryptoAmount.toString(), { shouldValidate: true })

      if (bnOrZero(cryptoAmount).gt(bnOrZero(cryptoBalanceHuman))) {
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
      <Flex
        as='form'
        pt='22px'
        pb='15px'
        px='24px'
        maxWidth='lg'
        width='full'
        onSubmit={handleSubmit(onSubmit)}
        direction='column'
        minHeight='380px'
        alignItems='center'
        justifyContent='space-between'
      >
        <AssetHoldingsCard
          mb={6}
          asset={asset}
          cryptoAmountAvailable={cryptoBalanceHuman.toString()}
          fiatAmountAvailable={fiatAmountAvailable}
        />
        <FormControl mb={6}>
          <AmountToStake
            values={{ fiatAmount: values.fiatAmount, cryptoAmount: values.cryptoAmount }}
            isCryptoField={activeField === InputType.Crypto}
            asset={asset}
            onInputToggle={handleInputToggle}
            p='1px'
          />
          <VStack
            bg={bgColor}
            borderRadius='xl'
            borderWidth={1}
            borderColor={borderColor}
            divider={<Divider />}
            spacing={0}
          >
            <PercentOptionsRow onPercentClick={handlePercentClick} percent={percent} />
            <StakingInput
              height='40px'
              width='100%'
              px='8px'
              py='8px'
              isCryptoField={activeField === InputType.Crypto}
              amountRef={amountRef.current}
              asset={asset}
              onInputToggle={handleInputToggle}
              onInputChange={handleInputChange}
              control={control}
            />
            <Box width='100%' pb='12px'>
              <EstimatedReturnsRow
                px={4}
                py={4}
                mb='8px'
                assetSymbol={asset.symbol}
                cryptoYield={cryptoYield}
                fiatYield={fiatYield}
              />
              <FormHelperText textAlign='center'>
                <Text fontSize='14px' translation='defi.modals.staking.estimateDisclaimer' />
              </FormHelperText>
            </Box>
          </VStack>
        </FormControl>
        <Stack direction='row' width='full' justifyContent='space-between'>
          <CText fontSize='14px' color='gray.500' mb='20px' lineHeight='1.3'>
            {`${translate('defi.modals.staking.byContinuing')} `}
            <Link
              color={'blue.200'}
              fontWeight='bold'
              target='_blank'
              href='https://cosmos.network/learn/faq/what-are-the-risks-associated-with-staking'
            >
              {`${translate('defi.modals.staking.risks')}`}
            </Link>
            {` ${translate('defi.modals.staking.ofParticipating')} `}
            <Link
              color={'blue.200'}
              fontWeight='bold'
              href='/#/legal/privacy-policy'
              onClick={cosmosStaking.close}
            >
              {`${translate('defi.modals.staking.terms')}.`}
            </Link>
          </CText>
          <Button
            colorScheme={values.amountFieldError ? 'red' : 'blue'}
            isDisabled={Boolean(!isValid || values.amountFieldError)}
            mb={2}
            minWidth='auto'
            size='lg'
            type='submit'
          >
            <Text
              translation={values.amountFieldError ? values.amountFieldError : 'common.continue'}
            />
          </Button>
        </Stack>
      </Flex>
    </SlideTransition>
  )
}
