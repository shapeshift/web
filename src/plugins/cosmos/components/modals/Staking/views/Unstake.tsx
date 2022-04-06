import { Box, Flex } from '@chakra-ui/layout'
import {
  Button,
  Divider,
  FormControl,
  ModalFooter,
  Stack,
  Text as CText,
  useColorModeValue,
  VStack
} from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { AmountToStake } from 'plugins/cosmos/components/AmountToStake/AmountToStake'
import { PercentOptionsRow } from 'plugins/cosmos/components/PercentOptionsRow/PercentOptionsRow'
import { StakingInput } from 'plugins/cosmos/components/StakingInput/StakingInput'
import { useRef, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'
import { bnOrZero } from 'lib/bignumber/bignumber'
import {
  selectAssetByCAIP19,
  selectMarketDataById,
  selectTotalBondingsBalanceByAssetId
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { Field, StakingValues, UnstakingPath } from '../StakingCommon'

// TODO(gomes): Make this dynamic, this should come from chain-adapters when ready there
const UNBONDING_DURATION = '21'

export enum InputType {
  Crypto = 'crypto',
  Fiat = 'fiat'
}

type UnstakeProps = {
  apr: string
  assetId: CAIP19
  accountSpecifier: string
  validatorAddress: string
}

export const Unstake = ({ assetId, apr, accountSpecifier, validatorAddress }: UnstakeProps) => {
  const {
    control,
    formState: { isValid },
    handleSubmit,
    setValue
  } = useFormContext<StakingValues>()

  const values = useWatch({ control })

  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const totalBondings = useAppSelector(state =>
    selectTotalBondingsBalanceByAssetId(state, accountSpecifier, validatorAddress, assetId)
  )
  const cryptoBalanceHuman = bnOrZero(totalBondings).div(`1e+${asset?.precision}`)

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
      fiatRate: bnOrZero(marketData.price)
    })
  }

  const translate = useTranslate()

  const handleCancel = () => {
    cosmosStaking.close()
  }

  const handlePercentClick = (_percent: number) => {
    const cryptoAmount = bnOrZero(cryptoBalanceHuman).times(_percent)
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
    if (bnOrZero(value).gt(cryptoBalanceHuman)) {
      setValue(Field.AmountFieldError, 'common.insufficientFunds', { shouldValidate: true })
    } else if (values.amountFieldError) {
      setValue(Field.AmountFieldError, '', { shouldValidate: true })
    }
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
          <Flex width='100%' mb='6px' justifyContent='space-between' alignItems='center'>
            <Text
              lineHeight={1}
              color='gray.500'
              translation={['staking.assetStakingBalance', { assetSymbol: asset.symbol }]}
            />
            <Amount.Crypto
              fontWeight='bold'
              value={bnOrZero(totalBondings).div(`1e+${asset?.precision}`).toString()}
              symbol={asset.symbol}
            />
          </Flex>
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

          <CText color='gray.500' fontSize='sm' mb='10px'>
            {translate('staking.itWillTake')}
            <span> </span>
            <Box as='span' color='gray.100' fontWeight='bold'>
              {`${UNBONDING_DURATION} ${translate('common.days')}`}
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
                isDisabled={!isValid}
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
