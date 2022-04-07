import { InfoOutlineIcon } from '@chakra-ui/icons'
import { Flex } from '@chakra-ui/layout'
import { Button, Link, ModalFooter, Stack, Text as CText, Tooltip } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { chainAdapters } from '@shapeshiftoss/types'
import { Asset } from '@shapeshiftoss/types'
import { AprTag } from 'plugins/cosmos/components/AprTag/AprTag'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { BigNumber } from 'lib/bignumber/bignumber'
import { bnOrZero } from 'lib/bignumber/bignumber'

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

type StakeProps = {
  assetId: CAIP19
  apr: string
  fiatRate: BigNumber
  cryptoStakeAmount: BigNumber
  onCancel: () => void
}

// TODO: Make this a derived selector after this is wired up
function calculateYearlyYield(apy: string, amount: string = '') {
  return bnOrZero(amount).times(apy).toString()
}

const DEFAULT_VALIDATOR_NAME = 'Shapeshift Validator'

// TODO: Wire up the whole component with staked data
export const StakeBroadcast = ({
  apr,
  assetId,
  cryptoStakeAmount,
  fiatRate,
  onCancel
}: StakeProps) => {
  const methods = useForm<StakingValues>({
    defaultValues: {
      [Field.FeeType]: chainAdapters.FeeDataKey.Average
    }
  })

  const { handleSubmit } = methods

  const onSubmit = (_: any) => {
    // TODO: handle submit when wired up
  }

  const cryptoYield = calculateYearlyYield(apr, cryptoStakeAmount.toPrecision())
  const fiatYield = bnOrZero(cryptoYield).times(fiatRate).toPrecision()

  const translate = useTranslate()

  // TODO: wire me up, parentheses are nice but let's get asset name from selectAssetNameById instead of this
  const asset = (_ => ({
    name: 'Osmosis',
    symbol: 'OSMO',
    caip19: assetId,
    chain: 'osmosis'
  }))(assetId) as Asset
  const txDetails = {
    explorerTxLink: 'https://etherscan.io/tx/',
    tx: {
      txid: '42foobar42'
    }
  }
  return (
    <FormProvider {...methods}>
      <SlideTransition>
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
          <Flex width='100%' mb='20px' justifyContent='space-between'>
            <Text color='gray.500' translation={'defi.stake'} />
            <Flex flexDirection='column' alignItems='flex-end'>
              <Amount.Fiat
                fontWeight='semibold'
                value={cryptoStakeAmount.times(fiatRate).toPrecision()}
              />
              <Amount.Crypto
                color='gray.500'
                value={cryptoStakeAmount.toPrecision()}
                symbol={asset.symbol}
              />
            </Flex>
          </Flex>
          <Flex width='100%' mb='30px' justifyContent='space-between'>
            <CText display='inline-flex' alignItems='center' color='gray.500'>
              {translate('defi.validator')}
              &nbsp;
              <Tooltip label={translate('defi.modals.staking.tooltip.validator')}>
                <InfoOutlineIcon />
              </Tooltip>
            </CText>
            <Link color={'blue.200'} target='_blank' href='#'>
              {DEFAULT_VALIDATOR_NAME}
            </Link>
          </Flex>
          <Flex width='100%' mb='35px' justifyContent='space-between'>
            <Text translation={'transactionRow.txid'} color='gray.500' />
            <Link
              isExternal
              color='blue.200'
              href={`${txDetails.explorerTxLink}${txDetails.tx.txid}`}
              target='_blank'
            >
              <MiddleEllipsis address={txDetails.tx.txid} />
            </Link>
          </Flex>
          <Flex width='100%' mb='35px' justifyContent='space-between'>
            <Text translation={'defi.averageApr'} color='gray.500' />
            <AprTag percentage='0.125' />
          </Flex>
          <Flex width='100%' mb='13px' justifyContent='space-between'>
            <Text translation={'defi.estimatedYearlyRewards'} color='gray.500' />
            <Flex flexDirection='column' alignItems='flex-end'>
              <Amount.Crypto value={cryptoYield} symbol={asset.symbol} />
              <Amount.Fiat color='gray.500' value={fiatYield} />
            </Flex>
          </Flex>
          <Flex mb='6px' width='100%' justifyContent='space-between' mt='10px'>
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
            <Flex flexDirection='column' alignItems='flex-end'>
              <Amount.Crypto value='0.0005' symbol={asset.symbol} />
              <Amount.Fiat color='gray.500' value={'0.01'} />
            </Flex>
          </Flex>
          <ModalFooter width='100%' py='0' px='0' flexDir='column' textAlign='center' mt={1}>
            <Text
              textAlign='left'
              fontSize='sm'
              color='gray.500'
              translation={['defi.unbondInfoItWillTake', { unbondingDays: '14' }]}
              mb='18px'
            />
            <Stack direction='row' width='full' justifyContent='space-between'>
              <Button onClick={onCancel} size='lg' variant='ghost'>
                <Text translation='common.cancel' />
              </Button>
              <Button colorScheme={'blue'} mb={2} size='lg' type='submit'>
                <Text translation={'defi.confirmAndBroadcast'} />
              </Button>
            </Stack>
          </ModalFooter>
        </Flex>
      </SlideTransition>
    </FormProvider>
  )
}
