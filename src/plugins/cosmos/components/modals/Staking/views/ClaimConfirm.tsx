import { InfoOutlineIcon } from '@chakra-ui/icons'
import { Flex } from '@chakra-ui/layout'
import { Button, FormControl, ModalHeader, Text as CText, Tooltip } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { chainAdapters } from '@shapeshiftoss/types'
import { Asset } from '@shapeshiftoss/types'
import { TxFeeRadioGroup } from 'plugins/cosmos/components/TxFeeRadioGroup/TxFeeRadioGroup'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { BigNumber } from 'lib/bignumber/bignumber'

import { StakingPath } from './StakeConfirmRouter'

export enum InputType {
  Crypto = 'crypto',
  Fiat = 'fiat'
}

export enum Field {
  FeeType = 'feeType'
}

export type StakingValues = {
  [Field.FeeType]: chainAdapters.FeeDataKey
}

type ClaimConfirmProps = {
  assetId: CAIP19
  cryptoStakeAmount: BigNumber
  onCancel: () => void
}

// TODO: Wire up the whole component with staked data
export const ClaimConfirm = ({ assetId, cryptoStakeAmount, onCancel }: ClaimConfirmProps) => {
  const methods = useForm<StakingValues>({
    mode: 'onChange',
    defaultValues: {
      [Field.FeeType]: chainAdapters.FeeDataKey.Average
    }
  })

  const { handleSubmit } = methods

  const memoryHistory = useHistory()
  const onSubmit = (_: any) => {
    memoryHistory.push(StakingPath.Broadcast)
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
      <SlideTransition>
        <Flex
          as='form'
          pt='14px'
          pb='18px'
          px='30px'
          onSubmit={handleSubmit(onSubmit)}
          direction='column'
          alignItems='center'
          justifyContent='space-between'
        >
          <ModalHeader textAlign='center'>{translate('defi.confirmDetails')}</ModalHeader>
          <Flex width='100%' mb='20px' justifyContent='space-between'>
            <Text color='gray.500' translation={'defi.stake'} />
            <Flex direction='column' alignItems='flex-end'>
              <Amount.Crypto
                color='gray.500'
                value={cryptoStakeAmount.toPrecision()}
                symbol={asset.symbol}
              />
            </Flex>
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
              mb='10px'
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
          <Button colorScheme={'blue'} mb={2} size='lg' type='submit' width='full'>
            <Text translation={'defi.confirmAndBroadcast'} />
          </Button>
          <Button onClick={onCancel} size='lg' variant='ghost' width='full'>
            <Text translation='common.cancel' />
          </Button>
        </Flex>
      </SlideTransition>
    </FormProvider>
  )
}
