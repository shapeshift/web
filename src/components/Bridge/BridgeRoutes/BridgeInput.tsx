import { ArrowDownIcon, ChevronRightIcon } from '@chakra-ui/icons'
import type { ButtonProps } from '@chakra-ui/react'
import { Button, Divider, IconButton, List, Stack } from '@chakra-ui/react'
import { bnOrZero } from '@keepkey/investor-foxy'
import { useController, useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { AssetInput } from 'components/DeFi/components/AssetInput'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { selectMarketDataById } from 'state/slices/marketDataSlice/selectors'
import { useAppSelector } from 'state/store'

import { ChainRow } from '../components/ChainRow'
import type { BridgeChain, BridgeState } from '../types'
import { BridgeRoutePaths } from '../types'

type ChainButtonProps = {
  label: string
  symbol?: string
  chain?: BridgeChain
} & ButtonProps

const ChainButton: React.FC<ChainButtonProps> = ({
  label,
  chain,
  symbol,
  isLoading,
  disabled,
  ...rest
}) => {
  return (
    <Button
      display='flex'
      bg='transparent'
      width='full'
      _hover={{ bg: 'gray.900' }}
      _disabled={{ opacity: 0.5, cursor: 'not-allowed', userSelect: 'none' }}
      _focus={{
        boxShadow: 'outline',
        zIndex: 1,
        position: 'relative',
      }}
      justifyContent='center'
      columnGap={4}
      px={4}
      py={2}
      minHeight={14}
      height='auto'
      maxHeight='auto'
      alignItems='flex-start'
      flexDirection='column'
      fontSize='sm'
      {...rest}
    >
      <Stack direction='row' width='full' alignItems='center'>
        {chain && symbol ? (
          <ChainRow labelProps={{ fontSize: 'sm' }} iconProps={{ size: 6 }} {...chain} />
        ) : (
          <Text flex={1} color='gray.500' textAlign='left' translation='bridge.selectChain' />
        )}
        <ChevronRightIcon boxSize={4} />
      </Stack>
    </Button>
  )
}

export const BridgeInput = () => {
  const translate = useTranslate()
  const history = useHistory()
  const {
    control,
    setValue,
    handleSubmit,
    formState: { isValid, errors },
  } = useFormContext<BridgeState>()

  const fieldError = errors.cryptoAmount?.message ?? null

  const { field: asset } = useController({
    name: 'asset',
    control,
    rules: { required: true },
  })

  const { field: fromChain } = useController({
    name: 'fromChain',
    control,
  })
  const { field: toChain } = useController({
    name: 'toChain',
    control,
  })

  const cryptoInputValidation = (value: string | undefined) => {
    const crypto = bnOrZero(fromChain.value?.balance)
    const _value = bnOrZero(value)
    const hasValidBalance = crypto.gt(0) && _value.gt(0) && _value.lte(crypto)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  const { field: cryptoAmount } = useController({
    name: 'cryptoAmount',
    control,
    rules: {
      required: true,
      validate: cryptoInputValidation,
    },
    defaultValue: '',
  })

  const { field: fiatAmount } = useController({
    name: 'fiatAmount',
    control,
    rules: {
      required: true,
    },
    defaultValue: '',
  })

  const { price } = useAppSelector(state => selectMarketDataById(state, asset.value?.assetId ?? ''))

  const handleInputChange = (value: string, isFiat?: boolean) => {
    if (isFiat) {
      setValue('fiatAmount', value, { shouldValidate: true })
      setValue('cryptoAmount', bnOrZero(value).div(price).toString(), {
        shouldValidate: true,
      })
    } else {
      setValue('fiatAmount', bnOrZero(value).times(price).toString(), {
        shouldValidate: true,
      })
      setValue('cryptoAmount', value, {
        shouldValidate: true,
      })
    }
  }

  const handlePercentClick = (percent: number) => {
    const cryptoAmount = bnOrZero(fromChain.value?.balance).times(percent)
    const fiatAmount = bnOrZero(cryptoAmount).times(price)
    setValue('fiatAmount', fiatAmount.toString(), { shouldValidate: true })
    setValue('cryptoAmount', cryptoAmount.toString(), { shouldValidate: true })
  }

  const onSubmit = () => history.push(BridgeRoutePaths.Confirm)

  return (
    <SlideTransition>
      <Stack spacing={6} as='form' onSubmit={handleSubmit(onSubmit)}>
        <AssetInput
          assetSymbol={asset.value?.symbol ?? 'Select Asset'}
          cryptoAmount={cryptoAmount.value}
          isReadOnly={!asset.value}
          fiatAmount={fiatAmount.value}
          assetIcon={asset.value?.icon ?? ''}
          onAssetClick={() => history.push(BridgeRoutePaths.SelectAsset)}
          percentOptions={[0.25, 0.5, 0.75, 1]}
          onMaxClick={handlePercentClick}
          onChange={(value, isFiat) => handleInputChange(value, isFiat)}
        />
        <List bg='gray.850' variant='rounded' borderColor='gray.750' borderWidth={1}>
          <ChainButton
            label='From'
            chain={fromChain.value}
            symbol={asset.value?.symbol}
            isDisabled={!asset.value}
            onClick={() => history.push(BridgeRoutePaths.ChainFromSelect)}
            pt={4}
            pb={5}
          />
          <Stack direction='row' alignItems='center' ml={4} my={-3} position='relative' zIndex={3}>
            <IconButton size='xs' aria-label='Switch Chains' icon={<ArrowDownIcon />} />
            <Divider />
          </Stack>
          <ChainButton
            label='To'
            chain={toChain.value}
            symbol={asset.value?.symbol}
            isDisabled={!asset.value}
            onClick={() => history.push(BridgeRoutePaths.ChainToSelect)}
            pb={4}
            pt={5}
          />
        </List>
        <Button
          size='lg'
          isDisabled={!isValid || !fromChain.value || !toChain.value || !cryptoAmount.value}
          type='submit'
          colorScheme={errors.cryptoAmount ? 'red' : 'blue'}
        >
          {translate(fieldError || 'bridge.preview')}
        </Button>
      </Stack>
    </SlideTransition>
  )
}
