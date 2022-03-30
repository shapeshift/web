import { InfoOutlineIcon } from '@chakra-ui/icons'
import { Flex } from '@chakra-ui/layout'
import { Button, FormControl, ModalHeader, Text as CText, Tooltip } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { chainAdapters } from '@shapeshiftoss/types'
import { Asset } from '@shapeshiftoss/types'
import { AnimatePresence } from 'framer-motion'
import { TxFeeRadioGroup } from 'plugins/cosmos/components/TxFeeRadioGroup/TxFeeRadioGroup'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { Text } from 'components/Text'
import { BigNumber } from 'lib/bignumber/bignumber'

import { UnstakingPath } from '../StakingTypes'

export enum InputType {
  Crypto = 'crypto',
  Fiat = 'fiat'
}

export enum Field {
  FeeType = 'feeType'
}

export type UnstakingValues = {
  [Field.FeeType]: chainAdapters.FeeDataKey
}

type UnstakeProps = {
  assetId: CAIP19
  fiatRate: BigNumber
  cryptoUnstakeAmount: BigNumber
  onCancel: () => void
}

const DEFAULT_VALIDATOR_NAME = 'Shapeshift Validator'

// TODO: Wire up the whole component with staked data
export const UnstakeConfirm = ({
  assetId,
  cryptoUnstakeAmount,
  fiatRate,
  onCancel
}: UnstakeProps) => {
  const methods = useForm<UnstakingValues>({
    mode: 'onChange',
    defaultValues: {
      [Field.FeeType]: chainAdapters.FeeDataKey.Average
    }
  })

  const { handleSubmit } = methods

  const memoryHistory = useHistory()
  const onSubmit = (_: any) => {
    memoryHistory.push(UnstakingPath.Broadcast)
  }

  const translate = useTranslate()

  // TODO: wire me up, parentheses are nice but let's get asset name from selectAssetNameById instead of this
  const asset = (_ => ({
    name: 'Osmosis',
    symbol: 'OSMO',
    caip19: assetId,
    chain: 'osmosis'
  }))(assetId) as Asset
  return (
    <FormProvider {...methods}>
      <AnimatePresence exitBeforeEnter initial={false}>
        <Flex
          as='form'
          pt='14px'
          pb='18px'
          px='30px'
          onSubmit={handleSubmit(onSubmit)}
          flexDirection='column'
          alignItems='center'
          justifyContent='space-between'
        >
          <ModalHeader textAlign='center'>{translate('defi.confirmDetails')}</ModalHeader>
          <Flex width='100%' mb='20px' justifyContent='space-between'>
            <Text color='gray.500' translation={'defi.unstake'} />
            <Flex flexDirection='column' alignItems='flex-end'>
              <Amount.Fiat
                fontWeight='semibold'
                value={cryptoUnstakeAmount.times(fiatRate).toPrecision()}
              />
              <Amount.Crypto
                color='gray.500'
                value={cryptoUnstakeAmount.toPrecision()}
                symbol={asset.symbol}
              />
            </Flex>
          </Flex>
          <Flex width='100%' mb='30px' justifyContent='space-between'>
            <CText display='inline-flex' alignItems='center' color='gray.500'>
              {translate('defi.unstakeFrom')}
              &nbsp;
              <Tooltip label={translate('defi.modals.staking.tooltip.validator')}>
                <InfoOutlineIcon />
              </Tooltip>
            </CText>
            <CText>{DEFAULT_VALIDATOR_NAME}</CText>
          </Flex>
          <Flex mb='6px' width='100%'>
            <CText display='inline-flex' alignItems='center' color='gray.500'>
              {translate('defi.gasFee')}
              &nbsp;
              <Tooltip
                label={translate('defi.modals.staking.tooltip.gasFees', {
                  networkName: asset.name
                })}
              >
                <InfoOutlineIcon />
              </Tooltip>
            </CText>
          </Flex>
          <FormControl>
            <TxFeeRadioGroup
              asset={asset}
              mb='90px'
              fees={{
                slow: {
                  txFee: '0.004',
                  fiatFee: '0.1'
                },
                average: {
                  txFee: '0.008',
                  fiatFee: '0.2'
                },
                fast: {
                  txFee: '0.012',
                  fiatFee: '0.3'
                }
              }}
            />
          </FormControl>
          <Text
            textAlign='center'
            fontSize='sm'
            fontWeight='semibold'
            translation={['defi.unbondInfoItWillTakeShort', { unbondingDays: '14' }]}
            mb='18px'
          />
          <Button colorScheme={'blue'} mb={2} size='lg' type='submit' width='full'>
            <Text translation={'defi.confirmAndBroadcast'} />
          </Button>
          <Button onClick={onCancel} size='lg' variant='ghost' width='full'>
            <Text translation='common.cancel' />
          </Button>
        </Flex>
      </AnimatePresence>
    </FormProvider>
  )
}
