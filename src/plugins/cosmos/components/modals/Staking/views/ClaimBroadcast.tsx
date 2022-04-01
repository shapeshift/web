import { InfoOutlineIcon } from '@chakra-ui/icons'
import { Flex } from '@chakra-ui/layout'
import { Button, Link, ModalCloseButton, Text as CText, Tooltip } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { Asset } from '@shapeshiftoss/types'
import { chainAdapters } from '@shapeshiftoss/types'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'
import { BigNumber } from 'lib/bignumber/bignumber'

type ClaimBroadcastProps = {
  assetId: CAIP19
  cryptoStakeAmount: BigNumber
  fiatAmountAvailable: string
  isLoading: boolean
}

export enum Field {
  FeeType = 'feeType'
}

export type ClaimBroadcastParams = {
  [Field.FeeType]: chainAdapters.FeeDataKey
}

// TODO: Wire up the whole component with staked data
export const ClaimBroadcast = ({
  assetId,
  cryptoStakeAmount,
  fiatAmountAvailable,
  isLoading
}: ClaimBroadcastProps) => {
  const { cosmosStaking } = useModal()

  const translate = useTranslate()

  const handleClose = cosmosStaking.close

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
    <SlideTransition>
      <ModalCloseButton borderRadius='full' />
      <Flex
        as='form'
        pt='14px'
        pb='18px'
        px='30px'
        flexDirection='column'
        alignItems='center'
        justifyContent='space-between'
      >
        <Flex width='100%' mb='20px' justifyContent='space-between'>
          <Text color='gray.500' translation={'defi.modals.claim.rewardAmount'} />
          <Flex flexDirection='column' alignItems='flex-end'>
            <Amount.Fiat fontWeight='semibold' value={fiatAmountAvailable} />
            <Amount.Crypto
              color='gray.500'
              value={cryptoStakeAmount.toPrecision()}
              symbol={asset.symbol}
            />
          </Flex>
        </Flex>

        <Flex width='100%' mb='35px' justifyContent='space-between'>
          <Text translation={'transactionRow.txid'} color='gray.500' />
          <Link
            isExternal
            color='blue.300'
            href={`${txDetails.explorerTxLink}${txDetails.tx.txid}`}
          >
            <MiddleEllipsis address={txDetails.tx.txid} />
          </Link>
        </Flex>

        <Flex mb='6px' mt='6px' width='100%' justifyContent='space-between'>
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
            <Amount.Fiat value={'0.01'} />
            <Amount.Crypto value='0.0005' symbol={asset.symbol} color='gray.500' />
          </Flex>
        </Flex>

        <Flex width='100%' flexDirection='column' alignItems='flex-end'>
          <Button
            isLoading={isLoading}
            onClick={handleClose}
            loadingText={translate('defi.modals.claim.claimingRewards')}
            colorScheme={'blue'}
            minWidth='150px'
            mb='10px'
            mt='25px'
            size='lg'
            type='submit'
          >
            <Text translation={'modals.status.close'} />
          </Button>
        </Flex>
      </Flex>
    </SlideTransition>
  )
}
