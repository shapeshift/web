import { InfoOutlineIcon } from '@chakra-ui/icons'
import { Flex } from '@chakra-ui/layout'
import {
  Button,
  FormControl,
  ModalCloseButton,
  ModalFooter,
  ModalHeader,
  Text as CText,
  Tooltip
} from '@chakra-ui/react'
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
import { useModal } from 'hooks/useModal/useModal'
import { BigNumber } from 'lib/bignumber/bignumber'

import { ClaimPath } from './ClaimCommon'

export enum Field {
  FeeType = 'feeType'
}

export type StakingValues = {
  [Field.FeeType]: chainAdapters.FeeDataKey
}

type ClaimConfirmProps = {
  assetId: CAIP19
  cryptoStakeAmount: BigNumber
  fiatAmountAvailable: string
}

// TODO: Wire up the whole component with staked data
export const ClaimConfirm = ({
  assetId,
  cryptoStakeAmount,
  fiatAmountAvailable
}: ClaimConfirmProps) => {
  const methods = useForm<StakingValues>({
    mode: 'onChange',
    defaultValues: {
      [Field.FeeType]: chainAdapters.FeeDataKey.Average
    }
  })

  const { handleSubmit } = methods

  const memoryHistory = useHistory()
  const onSubmit = (result: any) => {
    memoryHistory.push(ClaimPath.Broadcast, { result })
  }

  const translate = useTranslate()

  const { cosmosStaking } = useModal()

  const handleCancel = cosmosStaking.close

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
        <ModalCloseButton borderRadius='full' />
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
          <ModalHeader textAlign='center'>
            <Amount.Fiat fontWeight='bold' fontSize='4xl' mb={-4} value={fiatAmountAvailable} />
          </ModalHeader>
          <Amount.Crypto
            color='gray.500'
            fontWeight='normal'
            fontSize='xl'
            value={cryptoStakeAmount.toPrecision()}
            symbol={asset.symbol}
          />
          <Flex mb='6px' mt='15px' width='100%'>
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
                  txFee: '0',
                  fiatFee: '0'
                },
                average: {
                  txFee: '0.01',
                  fiatFee: '0.02'
                },
                fast: {
                  txFee: '0.03',
                  fiatFee: '0.04'
                }
              }}
            />
          </FormControl>
          <Text
            mt={1}
            width='100%'
            color='gray.500'
            fontSize={'sm'}
            translation='defi.modals.claim.rewardDepositInfo'
          />
          <ModalFooter width='100%' flexDir='column' textAlign='center' mt={10}>
            <Flex width='full' justifyContent='space-between'>
              <Button
                onClick={handleCancel}
                size='lg'
                variant='ghost'
                backgroundColor='gray.700'
                fontWeight='normal'
              >
                <Text translation='common.cancel' mx={5} />
              </Button>
              <Button colorScheme={'blue'} mb={2} size='lg' type='submit' fontWeight='normal'>
                <Text translation={'defi.modals.claim.confirmAndClaim'} />
              </Button>
            </Flex>
          </ModalFooter>
        </Flex>
      </SlideTransition>
    </FormProvider>
  )
}
