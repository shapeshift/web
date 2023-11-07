import { CheckIcon, CloseIcon, StarIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Card,
  Circle,
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
import { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { FaInfoCircle } from 'react-icons/fa'
import type { useTranslate } from 'react-polyglot'
import { AssetIcon } from 'components/AssetIcon'
import type { StepperStep } from 'components/MultiHopTrade/types'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { Asset } from 'lib/asset-service'
import type { SwapperName } from 'lib/swapper/types'
import { assertUnreachable } from 'lib/utils'

import { SwapperIcon } from '../../TradeInput/components/SwapperIcon/SwapperIcon'
import { TradeType } from '../types'

const stepIcon = <StepIcon />
const spinner = <Spinner />

const getStatusIcon = (txStatus: TxStatus) => {
  // TODO: proper light/dark mode colors here
  switch (txStatus) {
    case TxStatus.Confirmed:
      return (
        <Circle bg='green.500' size='100%'>
          <CheckIcon />
        </Circle>
      )
    case TxStatus.Failed:
      return (
        <Circle bg='red.500' size='100%'>
          <CloseIcon p={1} />
        </Circle>
      )
    // when the trade is submitting, treat unknown status as pending so the spinner spins
    case TxStatus.Pending:
    case TxStatus.Unknown:
    default:
      return (
        <Circle bg='gray.750' size='100%'>
          <Spinner />
        </Circle>
      )
  }
}

const getChainShortName = (chainId: KnownChainIds) => {
  switch (chainId) {
    case KnownChainIds.AvalancheMainnet:
      return 'AVA'
    case KnownChainIds.OptimismMainnet:
      return 'OP'
    case KnownChainIds.EthereumMainnet:
      return 'ETH'
    case KnownChainIds.PolygonMainnet:
      return 'POLY'
    case KnownChainIds.GnosisMainnet:
      return 'GNO'
    case KnownChainIds.BnbSmartChainMainnet:
      return 'BNB'
    case KnownChainIds.ArbitrumMainnet:
      return 'ARB'
    case KnownChainIds.ArbitrumNovaMainnet:
      return 'ARB-Nova'
    case KnownChainIds.BitcoinMainnet:
      return 'BTC'
    case KnownChainIds.BitcoinCashMainnet:
      return 'BCH'
    case KnownChainIds.CosmosMainnet:
      return 'COSM'
    case KnownChainIds.ThorchainMainnet:
      return 'THOR'
    case KnownChainIds.DogecoinMainnet:
      return 'DOGE'
    case KnownChainIds.LitecoinMainnet:
      return 'LTC'
    default: {
      assertUnreachable(chainId)
    }
  }
}

export const getApprovalStep = ({
  approvalNetworkFeeCryptoFormatted,
  txHash,
  isExactAllowance,
  toggleIsExactAllowance,
  translate,
  onSign,
  onReject,
}: {
  approvalNetworkFeeCryptoFormatted: string
  txHash?: string
  isExactAllowance: boolean
  toggleIsExactAllowance: () => void
  translate: ReturnType<typeof useTranslate>
  onSign: () => void
  onReject: () => void
}): StepperStep => {
  return {
    title: 'Token allowance approval',
    description: txHash ?? `Approval gas fee ${approvalNetworkFeeCryptoFormatted}`,
    stepIndicator: <StepStatus complete={stepIcon} active={txHash ? spinner : undefined} />,
    content: (
      <Card p='2'>
        {txHash ? (
          <RawText>TX: {txHash}</RawText>
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
  txHash,
  txStatus,
  onSign,
  onReject,
}: {
  txHash?: string
  txStatus: TxStatus
  onSign: () => void
  onReject: () => void
}): StepperStep => {
  const statusIcon = getStatusIcon(txStatus)
  return {
    title: 'Sign transaction',
    stepIndicator: statusIcon,
    content: (
      <Card p='2'>
        {txHash ? (
          <RawText>TX: {txHash}</RawText>
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
  amountFiatFormatted,
  asset,
}: {
  amountCryptoFormatted: string
  amountFiatFormatted: string
  asset: Asset
}): StepperStep => {
  const chainAdapterManager = getChainAdapterManager()
  const chainName = chainAdapterManager.get(asset.chainId)?.getDisplayName()
  return {
    title: amountCryptoFormatted,
    description: `${amountFiatFormatted} on ${chainName}`,
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
  const sellChainSymbol = getChainShortName(sellAssetChainId as KnownChainIds)
  const buyChainSymbol = getChainShortName(buyAssetChainId as KnownChainIds)
  return {
    title:
      tradeType === TradeType.Swap
        ? `${tradeType} on ${sellChainName} via ${swapperName}`
        : `${tradeType} from ${sellChainName} to ${buyChainName} via ${swapperName}`,
    description: `${sellAmountCryptoFormatted}.${sellChainSymbol} -> ${buyAmountCryptoFormatted}.${buyChainSymbol}`,
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
