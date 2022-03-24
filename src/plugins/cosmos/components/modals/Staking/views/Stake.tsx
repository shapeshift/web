import { Flex } from '@chakra-ui/layout'
import {
  Box,
  Button,
  Divider,
  FormControl,
  FormHelperText,
  Grid,
  GridItem,
  Link,
  Text as CText,
  useColorModeValue,
  VStack
} from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { Asset, MarketData } from '@shapeshiftoss/types'
import get from 'lodash/get'
import { AmountToStake } from 'plugins/cosmos/components/AmountToStake/AmountToStake'
import { AssetHoldingsCard } from 'plugins/cosmos/components/AssetHoldingsCard/AssetHoldingsCard'
import { EstimatedReturnsRow } from 'plugins/cosmos/components/EstimatedReturnsRow/EstimatedReturnsRow'
import { PercentOptionsRow } from 'plugins/cosmos/components/PercentOptionsRow/PercentOptionsRow'
import { StakingInput } from 'plugins/cosmos/components/StakingInput/StakingInput'
import { useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'

import { Field, InputType, StakeRoutes, StakingValues } from '../StakingCommon'

type StakeProps = {
  apr: string
  assetId: CAIP19
  cryptoAmountAvailable: string
  fiatAmountAvailable: string
  marketData: MarketData
}

// TODO: Make this a derived selector after this is wired up
function calculateYearlyYield(apy: string, amount: string = '') {
  return bnOrZero(amount).times(apy).div(100).toString()
}

// TODO: Wire up the whole component with staked data
export const Stake = ({
  assetId,
  apr,
  cryptoAmountAvailable,
  fiatAmountAvailable,
  marketData
}: StakeProps) => {
  const {
    clearErrors,
    control,
    formState: { errors, isValid },
    handleSubmit,
    setError,
    setValue
  } = useForm<StakingValues>({
    mode: 'onChange',
    defaultValues: {
      [Field.FiatAmount]: '',
      [Field.CryptoAmount]: ''
    }
  })

  const values = useWatch({ control })
  const cryptoError = get(errors, 'cryptoAmount.message', null)
  const fiatError = get(errors, 'fiatAmount.message', null)
  const fieldError = cryptoError ?? fiatError
  const [percent, setPercent] = useState<number | null>(null)
  const [activeField, setActiveField] = useState<InputType>(InputType.Crypto)

  const amountRef = useRef<string | null>(null)

  const bgColor = useColorModeValue('gray.50', 'gray.850')
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const holderBg = useColorModeValue('gray.100', 'gray.700')

  const memoryHistory = useHistory()

  const onSubmit = (_: any) => {
    memoryHistory.push(StakeRoutes.StakeConfirm, {
      cryptoAmount: bnOrZero(values.cryptoAmount),
      fiatRate: bnOrZero(marketData.price),
      apr
    })
  }

  const cryptoYield = calculateYearlyYield(apr, values.cryptoAmount)
  const fiatYield = bnOrZero(cryptoYield).times(marketData.price).toPrecision()

  const translate = useTranslate()

  const handlePercentClick = (_percent: number) => {
    const cryptoAmount = bnOrZero(cryptoAmountAvailable).times(_percent)
    const fiat = bnOrZero(cryptoAmount).times(marketData.price)
    if (activeField === InputType.Crypto) {
      setValue(Field.FiatAmount, fiat.toString(), { shouldValidate: true })
      setValue(Field.CryptoAmount, cryptoAmount.toString(), { shouldValidate: true })
    } else {
      setValue(Field.FiatAmount, fiat.toString(), { shouldValidate: true })
      setValue(Field.CryptoAmount, cryptoAmount.toString(), { shouldValidate: true })
    }
    setPercent(_percent)
  }

  const handleInputChange = (value: string) => {
    setPercent(null)
    if (activeField === InputType.Crypto) {
      const fiat = bnOrZero(value).times(marketData.price)
      setValue(Field.FiatAmount, fiat.toString(), { shouldValidate: true })
    } else {
      const crypto = bnOrZero(value).div(marketData.price)
      setValue(Field.CryptoAmount, crypto.toString(), { shouldValidate: true })
    }
  }

  const handleInputToggle = () => {
    const field = activeField === InputType.Crypto ? InputType.Fiat : InputType.Crypto
    if (fieldError) {
      // Toggles an existing error to the other field if present
      clearErrors(fiatError ? Field.FiatAmount : Field.CryptoAmount)
      setError(fiatError ? Field.CryptoAmount : Field.FiatAmount, {
        message: 'common.insufficientFunds'
      })
    }
    setActiveField(field)
  }
  // TODO: wire me up, parentheses are nice but let's get asset name from selectAssetNameById instead of this
  const asset = (_ => ({
    name: 'Osmosis',
    symbol: 'OSMO',
    caip19: assetId
  }))(assetId) as Asset
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
          bg={holderBg}
          py='8px'
          mb={6}
          assetSymbol={asset.symbol}
          assetName={asset.name}
          cryptoAmountAvailable={cryptoAmountAvailable}
          fiatAmountAvailable={fiatAmountAvailable}
        />
        <FormControl mb={6}>
          <AmountToStake
            values={{ fiatAmount: fiatAmountAvailable, cryptoAmount: cryptoAmountAvailable }}
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
            <PercentOptionsRow onPercentClick={handlePercentClick} percent={percent} />
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
        <Grid templateColumns='repeat(6, 1fr)' gap={2}>
          <GridItem colSpan={4}>
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
                target='_blank'
                href='/legal/privacy-policy'
              >
                {`${translate('defi.modals.staking.terms')}.`}
              </Link>
            </CText>
          </GridItem>
          <GridItem colSpan={2}>
            <Button
              colorScheme={fieldError ? 'red' : 'blue'}
              isDisabled={!isValid}
              mb={2}
              size='lg'
              type='submit'
              width='full'
            >
              <Text translation={fieldError ?? 'common.continue'} />
            </Button>
          </GridItem>
        </Grid>
      </Flex>
    </SlideTransition>
  )
}
