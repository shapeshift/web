import { CloseIcon, StarIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Card,
  Circle,
  Icon,
  Link,
  Spinner,
  Switch,
  Tooltip,
  VStack,
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
import { JuicyGreenCheck } from './JuicyGreenCheck'

const getStatusIcon = (txStatus: TxStatus) => {
  // TODO: proper light/dark mode colors here
  switch (txStatus) {
    case TxStatus.Confirmed:
      return <JuicyGreenCheck />
    case TxStatus.Failed:
      return (
        <Circle bg='red.500' size={8}>
          <CloseIcon p={1} />
        </Circle>
      )
    // when the trade is submitting, treat unknown status as pending so the spinner spins
    case TxStatus.Pending:
    case TxStatus.Unknown:
    default:
      return (
        <Circle bg='gray.750' size={8}>
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
  txStatus,
  isExactAllowance,
  toggleIsExactAllowance,
  translate,
  onSign,
}: {
  approvalNetworkFeeCryptoFormatted: string
  txHash?: string
  txStatus?: TxStatus
  isExactAllowance: boolean
  toggleIsExactAllowance: () => void
  translate: ReturnType<typeof useTranslate>
  onSign: () => void
}): StepperStep => {
  const stepIndicator = txStatus !== undefined ? getStatusIcon(txStatus) : <></>
  return {
    title: 'Token allowance approval',
    description: txHash ?? `Approval gas fee ${approvalNetworkFeeCryptoFormatted}`,
    stepIndicator,
    key: 'approval',
    content: (
      <Card p='2'>
        {txHash ? (
          <RawText>TX: {txHash}</RawText>
        ) : (
          <VStack>
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
          </VStack>
        )}
      </Card>
    ),
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
    key: 'asset-summary',
  }
}

export const getHopSummaryStep = ({
  swapperName,
  stepBuyAssetChainId,
  stepSellAssetChainId,
  stepBuyAmountCryptoFormatted,
  stepSellAmountCryptoFormatted,
  txHash,
  txLink,
  txStatus,
  onSign,
}: {
  swapperName: SwapperName
  stepBuyAssetChainId: ChainId
  stepSellAssetChainId: ChainId
  stepBuyAmountCryptoFormatted: string
  stepSellAmountCryptoFormatted: string
  txHash?: string
  txLink?: string
  txStatus?: TxStatus
  onSign: () => void
}): StepperStep => {
  const chainAdapterManager = getChainAdapterManager()
  const sellChainName = chainAdapterManager.get(stepSellAssetChainId)?.getDisplayName()
  const buyChainName = chainAdapterManager.get(stepBuyAssetChainId)?.getDisplayName()
  const tradeType = stepBuyAssetChainId === stepSellAssetChainId ? TradeType.Swap : TradeType.Bridge
  const sellChainSymbol = getChainShortName(stepSellAssetChainId as KnownChainIds)
  const buyChainSymbol = getChainShortName(stepBuyAssetChainId as KnownChainIds)
  const stepIndicator =
    txStatus !== undefined ? getStatusIcon(txStatus) : <SwapperIcon swapperName={swapperName} />

  const content = txStatus === undefined ? <Button onClick={onSign}>Sign message</Button> : <></>

  const description = (
    <VStack>
      <RawText>
        {`${stepSellAmountCryptoFormatted}.${sellChainSymbol} -> ${stepBuyAmountCryptoFormatted}.${buyChainSymbol}`}
      </RawText>
      {txHash !== undefined && <RawText>TX: {txHash}</RawText>}
      {txLink && (
        <Row px={4}>
          <Row.Label>
            <RawText>Tx ID</RawText>
          </Row.Label>
          <Box textAlign='right'>
            <Link isExternal color='blue.500' href={txLink}>
              <Text translation='trade.viewTransaction' />
            </Link>
          </Box>
        </Row>
      )}
    </VStack>
  )

  return {
    title:
      tradeType === TradeType.Swap
        ? `${tradeType} on ${sellChainName} via ${swapperName}`
        : `${tradeType} from ${sellChainName} to ${buyChainName} via ${swapperName}`,
    description,
    stepIndicator,
    key: 'trade',
    content,
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
    key: 'donation',
  }
}
