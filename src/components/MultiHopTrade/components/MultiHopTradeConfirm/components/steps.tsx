import { StarIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Card,
  HStack,
  Icon,
  Spinner,
  StepIcon,
  StepNumber,
  StepStatus,
  Switch,
  Tooltip,
} from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { FaInfoCircle } from 'react-icons/fa'
import type { useTranslate } from 'react-polyglot'
import { AssetIcon } from 'components/AssetIcon'
import type { StepperStep } from 'components/MultiHopTrade/types'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { Asset } from 'lib/asset-service'
import type { SwapperName } from 'lib/swapper/types'

import { SwapperIcon } from '../../TradeInput/components/SwapperIcon/SwapperIcon'
import { TradeType } from '../types'

const stepIcon = <StepIcon />
const spinner = <Spinner />

export const getApprovalStep = ({
  approvalNetworkFeeCryptoFormatted,
  txId,
  isExactAllowance,
  toggleIsExactAllowance,
  translate,
  onSign,
  onReject,
}: {
  approvalNetworkFeeCryptoFormatted: string
  txId?: string
  isExactAllowance: boolean
  toggleIsExactAllowance: () => void
  translate: ReturnType<typeof useTranslate>
  onSign: () => void
  onReject: () => void
}): StepperStep => {
  return {
    title: 'Token allowance approval',
    description: txId ?? `Approval gas fee ${approvalNetworkFeeCryptoFormatted}`,
    stepIndicator: <StepStatus complete={stepIcon} active={txId ? spinner : undefined} />,
    content: (
      <Card p='2'>
        {txId ? (
          <RawText>TX: {txId}</RawText>
        ) : (
          <HStack>
            <Row>
              <Row.Label display='flex' alignItems='center'>
                <Text color='text.subtle' translation='trade.allowance' />
                <Tooltip label={translate('trade.allowanceTooltip')}>
                  <Box ml={1}>
                    <Icon as={FaInfoCircle} color='text.subtle' fontSize='0.7em' />
                  </Box>
                </Tooltip>
              </Row.Label>
              <Row.Value textAlign='right' display='flex' alignItems='center'>
                <Text
                  color={isExactAllowance ? 'text.subtle' : 'white'}
                  translation='trade.unlimited'
                  fontWeight='bold'
                />
                <Switch
                  size='sm'
                  mx={2}
                  isChecked={isExactAllowance}
                  onChange={toggleIsExactAllowance}
                />
                <Text
                  color={isExactAllowance ? 'white' : 'text.subtle'}
                  translation='trade.exact'
                  fontWeight='bold'
                />
              </Row.Value>
            </Row>
            <Button onClick={onSign}>Approve</Button>
            <Button onClick={onReject}>Reject</Button>
          </HStack>
        )}
      </Card>
    ),
  }
}

export const getTradeStep = ({
  txId,
  onSign,
  onReject,
}: {
  txId?: string
  onSign: () => void
  onReject: () => void
}): StepperStep => {
  return {
    title: 'Sign transaction',
    stepIndicator: <StepStatus complete={stepIcon} active={txId ? spinner : undefined} />,
    content: (
      <Card p='2'>
        {txId ? (
          <RawText>TX: {txId}</RawText>
        ) : (
          <HStack>
            <Button onClick={onSign}>Sign message</Button>
            <Button onClick={onReject}>Reject</Button>
          </HStack>
        )}
      </Card>
    ),
  }
}

export const getTitleStep = ({
  hopIndex,
  isHopComplete,
  swapperName,
  tradeType,
}: {
  hopIndex: number
  isHopComplete: boolean
  swapperName: SwapperName
  tradeType: TradeType
}): StepperStep => {
  return {
    title: `${tradeType} via ${swapperName}`,
    stepIndicator: isHopComplete ? <StepIcon /> : <StepNumber>{hopIndex + 1}</StepNumber>,
  }
}

export const getAssetSummaryStep = ({
  amountCryptoFormatted,
  asset,
}: {
  amountCryptoFormatted: string
  asset: Asset
}): StepperStep => {
  const chainAdapterManager = getChainAdapterManager()
  const chainName = chainAdapterManager.get(asset.chainId)?.getDisplayName()
  return {
    title: amountCryptoFormatted,
    description: `${amountCryptoFormatted} on ${chainName}`,
    stepIndicator: <AssetIcon src={asset.icon} boxSize='32px' />,
  }
}

export const getHopSummaryStep = ({
  swapperName,
  buyAssetChainId,
  sellAssetChainId,
  buyAmountCryptoFormatted,
  sellAmountCryptoFormatted,
}: {
  swapperName: SwapperName
  buyAssetChainId: ChainId
  sellAssetChainId: ChainId
  buyAmountCryptoFormatted: string
  sellAmountCryptoFormatted: string
}): StepperStep => {
  const chainAdapterManager = getChainAdapterManager()
  const sellChainName = chainAdapterManager.get(sellAssetChainId)?.getDisplayName()
  const buyChainName = chainAdapterManager.get(buyAssetChainId)?.getDisplayName()
  const tradeType = buyAssetChainId === sellAssetChainId ? TradeType.Swap : TradeType.Bridge
  return {
    title:
      tradeType === TradeType.Swap
        ? `${tradeType} on ${sellChainName} via ${swapperName}`
        : `${tradeType} from ${sellChainName} to ${buyChainName} via ${swapperName}`,
    description: `${sellAmountCryptoFormatted}.ETH -> ${buyAmountCryptoFormatted}.AVA`, // TODO: chain "symbol"
    stepIndicator: <SwapperIcon swapperName={swapperName} />,
  }
}

export const getDonationSummaryStep = ({
  donationAmountFiatFormatted,
}: {
  donationAmountFiatFormatted: string
}): StepperStep => {
  return {
    title: donationAmountFiatFormatted,
    description: 'ShapeShift Donation',
    stepIndicator: <StarIcon />,
  }
}
