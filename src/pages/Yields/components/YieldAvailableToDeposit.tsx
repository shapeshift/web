import { InfoOutlineIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Card,
  CardBody,
  Flex,
  Heading,
  HStack,
  Text,
  Tooltip,
  VStack,
} from '@chakra-ui/react'
import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { SwapperModal } from '@/components/SwapperModal/SwapperModal'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { selectWalletType } from '@/state/slices/localWalletSlice/selectors'
import { selectPortfolioCryptoBalanceByFilter } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type YieldAvailableToDepositProps = {
  yieldItem: AugmentedYieldDto
  inputTokenMarketData: { price?: string } | undefined
}

export const YieldAvailableToDeposit = memo(
  ({ yieldItem, inputTokenMarketData }: YieldAvailableToDepositProps) => {
    const translate = useTranslate()
    const [isSwapperModalOpen, setIsSwapperModalOpen] = useState(false)
    const {
      state: { isConnected },
    } = useWallet()
    const isLedgerReadOnlyEnabled = useFeatureFlag('LedgerReadOnly')
    const walletType = useAppSelector(selectWalletType)
    const isLedgerReadOnly = isLedgerReadOnlyEnabled && walletType === KeyManager.Ledger

    // Either wallet is physically connected, or it's a Ledger in read-only mode
    const hasWallet = useMemo(
      () => isConnected || isLedgerReadOnly,
      [isConnected, isLedgerReadOnly],
    )

    const inputToken = yieldItem.inputTokens[0]
    const inputTokenSymbol = inputToken?.symbol ?? yieldItem.token.symbol
    const inputTokenAssetId = inputToken?.assetId ?? yieldItem.token.assetId ?? ''
    const inputTokenPrecision = inputToken?.decimals ?? yieldItem.token.decimals

    const availableBalanceBigAmount = useAppSelector(state =>
      selectPortfolioCryptoBalanceByFilter(state, { assetId: inputTokenAssetId }),
    )

    const availableBalance = useMemo(
      () => availableBalanceBigAmount.toBN(),
      [availableBalanceBigAmount],
    )

    const availableBalanceFiat = useMemo(
      () => availableBalance.times(bnOrZero(inputTokenMarketData?.price)),
      [availableBalance, inputTokenMarketData?.price],
    )

    const potentialYearlyEarningsFiat = useMemo(
      () => availableBalanceFiat.times(yieldItem.rewardRate.total),
      [availableBalanceFiat, yieldItem.rewardRate.total],
    )

    const hasAvailableBalance = availableBalance.gt(0)

    const handleOpenSwapperModal = useCallback(() => setIsSwapperModalOpen(true), [])
    const handleCloseSwapperModal = useCallback(() => setIsSwapperModalOpen(false), [])

    if (!inputTokenPrecision || !hasWallet) return null

    const tooltipLabel = translate('yieldXYZ.availableToDepositTooltip', {
      symbol: inputTokenSymbol,
    })

    if (!hasAvailableBalance) {
      return (
        <>
          <Card variant='dashboard' data-testid='yield-available-to-deposit'>
            <CardBody p={{ base: 4, md: 5 }}>
              <VStack spacing={4} align='stretch'>
                <Flex justifyContent='space-between' alignItems='center'>
                  <HStack spacing={2}>
                    <Heading
                      as='h3'
                      size='sm'
                      textTransform='uppercase'
                      color='text.subtle'
                      letterSpacing='wider'
                    >
                      {translate('yieldXYZ.availableToDeposit')}
                    </Heading>
                    <Tooltip label={tooltipLabel} placement='top'>
                      <InfoOutlineIcon color='text.subtle' boxSize={3} cursor='help' />
                    </Tooltip>
                  </HStack>
                </Flex>

                <Box>
                  <Text fontSize='2xl' fontWeight='800' lineHeight='1'>
                    <Amount.Fiat value='0' />
                  </Text>
                  <Text fontSize='sm' color='text.subtle' mt={1}>
                    <Amount.Crypto value='0' symbol={inputTokenSymbol} abbreviated />
                  </Text>
                </Box>

                <Button
                  colorScheme='blue'
                  size='lg'
                  height={12}
                  borderRadius='xl'
                  onClick={handleOpenSwapperModal}
                  width='full'
                  fontWeight='bold'
                  data-testid='yield-get-asset-button'
                >
                  {translate('yieldXYZ.getAsset', { symbol: inputTokenSymbol })}
                </Button>
              </VStack>
            </CardBody>
          </Card>
          <SwapperModal
            isOpen={isSwapperModalOpen}
            onClose={handleCloseSwapperModal}
            onSuccess={handleCloseSwapperModal}
            defaultBuyAssetId={inputTokenAssetId}
          />
        </>
      )
    }

    return (
      <Card data-testid='yield-available-to-deposit'>
        <CardBody p={{ base: 4, md: 5 }}>
          <VStack spacing={4} align='stretch'>
            <Flex justifyContent='space-between' alignItems='center'>
              <HStack spacing={2}>
                <Heading as='h3' size='sm' color='text.subtle'>
                  {translate('yieldXYZ.availableToDeposit')}
                </Heading>
                <Tooltip label={tooltipLabel} placement='top'>
                  <InfoOutlineIcon color='text.subtle' boxSize={3} cursor='help' />
                </Tooltip>
              </HStack>
            </Flex>

            <Box>
              <Text fontSize='2xl' fontWeight='800' lineHeight='1'>
                <Amount.Fiat value={availableBalanceFiat.toFixed(2)} />
              </Text>
              <Text fontSize='sm' color='text.subtle' mt={1}>
                <Amount.Crypto
                  value={availableBalance.toFixed()}
                  symbol={inputTokenSymbol}
                  abbreviated
                />
              </Text>
            </Box>

            {potentialYearlyEarningsFiat.gt(0) && (
              <Flex justify='space-between' align='center'>
                <Text fontSize='sm' color='text.subtle'>
                  {translate('yieldXYZ.potentialEarnings')}
                </Text>
                <Amount.Fiat
                  fontSize='sm'
                  fontWeight='semibold'
                  color='text.success'
                  value={potentialYearlyEarningsFiat.toFixed(2)}
                  suffix={translate('yieldXYZ.perYear')}
                />
              </Flex>
            )}
          </VStack>
        </CardBody>
      </Card>
    )
  },
)
