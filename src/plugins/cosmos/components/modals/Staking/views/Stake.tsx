import { Box, Flex } from '@chakra-ui/layout'
import {
  Button,
  Divider,
  FormControl,
  FormHelperText,
  Link,
  Text as CText,
  useColorModeValue,
  VStack
} from '@chakra-ui/react'
import { Asset, MarketData } from '@shapeshiftoss/types'
import { AnimatePresence } from 'framer-motion'
import get from 'lodash/get'
import { AmountToStake } from 'plugins/cosmos/components/AmountToStake/AmountToStake'
import { AssetHoldingsCard } from 'plugins/cosmos/components/AssetHoldingsCard/AssetHoldingsCard'
import { CosmosActionButtons } from 'plugins/cosmos/components/CosmosActionButtons/CosmosActionButtons'
import { EstimatedReturnsRow } from 'plugins/cosmos/components/EstimatedReturnsRow/EstimatedReturnsRow'
import { PercentOptionsRow } from 'plugins/cosmos/components/PercentOptionsRow/PercentOptionsRow'
import { StakingInput } from 'plugins/cosmos/components/StakingInput/StakingInput'
import { useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { bnOrZero } from 'lib/bignumber/bignumber'

import { StakingAction } from '../Staking'

export enum InputType {
  Crypto = 'crypto',
  Fiat = 'fiat'
}

export enum Field {
  FiatAmount = 'fiatAmount',
  CryptoAmount = 'cryptoAmount'
}

export type StakingValues = {
  [Field.FiatAmount]: string
  [Field.CryptoAmount]: string
}

type StakedProps = {
  apr: string
  assetId: string
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
}: StakedProps) => {
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
  const fieldError = cryptoError || fiatError
  const [percent, setPercent] = useState<number | null>(null)
  const [activeField, setActiveField] = useState<InputType>(InputType.Crypto)

  const amountRef = useRef<string | null>(null)

  const bgColor = useColorModeValue('gray.50', 'gray.850')
  const borderColor = useColorModeValue('gray.100', 'gray.750')

  const { cosmosStaking } = useModal()

  const onSubmit = (_: any) => {
    // TODO: onContinue()
  }

  const cryptoYield = calculateYearlyYield(apr, values.cryptoAmount)
  const fiatYield = bnOrZero(cryptoYield).times(marketData.price).toFixed(2)

  const translate = useTranslate()

  const handleCancel = () => {
    cosmosStaking.close()
  }

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
    <AnimatePresence exitBeforeEnter initial={false}>
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
          <CosmosActionButtons
            asset={asset}
            activeAction={StakingAction.Stake}
            px='6px'
            py='6px'
          />
          <AssetHoldingsCard
            py='8px'
            my={6}
            assetSymbol={asset.symbol}
            assetName={asset.name}
            cryptoAmountAvailable={cryptoAmountAvailable}
            fiatAmountAvailable={fiatAmountAvailable}
          />
          <FormControl>
            <AmountToStake
              width='100%'
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
              <EstimatedReturnsRow
                px={4}
                py={4}
                assetSymbol={asset.symbol}
                cryptoYield={cryptoYield}
                fiatYield={fiatYield}
              />
            </VStack>
            <Flex direction='column' alignItems='center'>
              <FormHelperText pb={2} mb='30px' mt='10px'>
                <Text fontSize='12px' translation='defi.modals.staking.estimateDisclaimer' />
              </FormHelperText>
            </Flex>
          </FormControl>
          <CText fontSize='12px' color='gray.500' mb='20px' width='full' textAlign='center'>
            {`${translate('defi.modals.staking.byContinuing')} `}
            <Link
              color='blue.500'
              target='_blank'
              href='https://cosmos.network/learn/faq/what-are-the-risks-associated-with-staking'
            >
              {`${translate('defi.modals.staking.risks')}`}
            </Link>
            {` ${translate('defi.modals.staking.ofParticipating')} `}
            <Link color='blue.500' target='_blank' href='/legal/privacy-policy'>
              {`${translate('defi.modals.staking.terms')}.`}
            </Link>
          </CText>
          <Button
            colorScheme={fieldError ? 'red' : 'blue'}
            isDisabled={!isValid}
            mb={2}
            size='lg'
            type='submit'
            width='full'
          >
            <Text translation={fieldError || 'common.continue'} />
          </Button>
          <Button onClick={handleCancel} size='lg' variant='ghost' width='full'>
            <Text translation='common.cancel' />
          </Button>
        </Flex>
      </Box>
    </AnimatePresence>
  )
}
