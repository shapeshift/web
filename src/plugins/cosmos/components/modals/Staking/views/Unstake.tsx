import { Box, Flex } from '@chakra-ui/layout'
import {
  Button,
  Divider,
  FormControl,
  Text as CText,
  useColorModeValue,
  VStack
} from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { Asset, MarketData } from '@shapeshiftoss/types'
import get from 'lodash/get'
import { AmountToStake } from 'plugins/cosmos/components/AmountToStake/AmountToStake'
import { CosmosActionButtons } from 'plugins/cosmos/components/CosmosActionButtons/CosmosActionButtons'
import { PercentOptionsRow } from 'plugins/cosmos/components/PercentOptionsRow/PercentOptionsRow'
import { StakingInput } from 'plugins/cosmos/components/StakingInput/StakingInput'
import { useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { bnOrZero } from 'lib/bignumber/bignumber'

import { StakingAction } from '../Staking'

const UNBONDING_DURATION = '14'

export enum InputType {
  Crypto = 'crypto',
  Fiat = 'fiat'
}

export enum Field {
  FiatAmount = 'fiatAmount',
  CryptoAmount = 'cryptoAmount'
}

export type UnstakingValues = {
  [Field.FiatAmount]: string
  [Field.CryptoAmount]: string
}

type UnstakeProps = {
  apr: string
  assetId: CAIP19
  cryptoAmountStaked: string
  marketData: MarketData
}

// TODO: Wire up the whole component with staked data
export const Unstake = ({ assetId, apr, cryptoAmountStaked, marketData }: UnstakeProps) => {
  const {
    clearErrors,
    control,
    formState: { errors, isValid },
    handleSubmit,
    setError,
    setValue
  } = useForm<UnstakingValues>({
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

  const translate = useTranslate()

  const handleCancel = () => {
    cosmosStaking.close()
  }

  const handlePercentClick = (_percent: number) => {
    const cryptoAmount = bnOrZero(cryptoAmountStaked).times(_percent)
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
    name: 'Osmo',
    symbol: 'OSMO'
  }))(assetId) as Asset
  return (
    <SlideTransition exitBeforeEnter initial={false}>
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
            activeAction={StakingAction.Unstake}
            width='100%'
            px='6px'
            py='6px'
            bgColor='gray.850'
            borderRadius='12px'
          />
          <CText color='gray.500' my='25px'>
            {translate('staking.itWillTake')}
            <span> </span>
            <Box as='span' fontWeight='semibold' color='white'>
              {`${UNBONDING_DURATION} ${translate('common.days')}`}
            </Box>
            <span> </span>
            {translate('staking.toUnlock')}
          </CText>
          <Flex width='100%' mb='6px' justifyContent='space-between' alignItems='center'>
            <Text
              lineHeight={1}
              color='gray.500'
              translation={['staking.assetStakingBalance', { assetName: asset.name }]}
            />
            <Amount.Crypto value={cryptoAmountStaked || ''} symbol={asset.symbol} />
          </Flex>
          <Divider />
          <FormControl>
            <AmountToStake
              width='100%'
              mt='25px'
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
              <PercentOptionsRow
                width='100%'
                onPercentClick={handlePercentClick}
                percent={percent}
              />
            </VStack>
          </FormControl>
          <Box mt='25px' width='100%'>
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
          </Box>
        </Flex>
      </Box>
    </SlideTransition>
  )
}
