import {
  CircularProgress,
  CircularProgressLabel,
  Divider,
  Flex,
  IconButton,
  Stack,
  useMediaQuery,
} from '@chakra-ui/react'
import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { isToken } from '@shapeshiftoss/utils'
import type { JSX } from 'react'
import { useCallback, useMemo } from 'react'
import { LuArrowUpDown } from 'react-icons/lu'
import { useTranslate } from 'react-polyglot'

import { SellAssetInput } from '../TradeInput/components/SellAssetInput'

import { TradeAssetSelect } from '@/components/AssetSelection/AssetSelection'
import { useModal } from '@/hooks/useModal/useModal'
import { breakpoints } from '@/theme/theme'

const arrowUpDownIcon = <LuArrowUpDown />

type SharedTradeInputBodyProps = {
  buyAsset: Asset
  children: JSX.Element
  isInputtingFiatSellAmount: boolean
  isLoading: boolean | undefined
  isSwitchAssetsDisabled?: boolean
  sellAmountCryptoPrecision: string
  sellAmountUserCurrency: string | undefined
  sellAsset: Asset
  sellAccountId: AccountId | undefined
  assetFilterPredicate: (assetId: AssetId) => boolean
  chainIdFilterPredicate: (chainId: ChainId) => boolean
  onSwitchAssets: () => void
  onChangeIsInputtingFiatSellAmount: (isInputtingFiatSellAmount: boolean) => void
  onChangeSellAmountCryptoPrecision: (sellAmountCryptoPrecision: string) => void
  setSellAsset: (asset: Asset) => void
  setSellAccountId: (accountId: AccountId) => void
  selectedSellAssetChainId?: ChainId | 'All'
  onSellAssetChainIdChange?: (chainId: ChainId | 'All') => void
  subContent?: JSX.Element
}

export const SharedTradeInputBody = ({
  children,
  isInputtingFiatSellAmount,
  isLoading,
  isSwitchAssetsDisabled,
  sellAmountCryptoPrecision,
  sellAmountUserCurrency,
  sellAsset,
  sellAccountId,
  assetFilterPredicate,
  chainIdFilterPredicate,
  onSwitchAssets,
  onChangeIsInputtingFiatSellAmount,
  onChangeSellAmountCryptoPrecision,
  setSellAsset,
  setSellAccountId,
  selectedSellAssetChainId,
  onSellAssetChainIdChange,
  subContent,
}: SharedTradeInputBodyProps) => {
  const translate = useTranslate()
  const [isSmallerThanMd] = useMediaQuery(`(max-width: ${breakpoints.md})`, { ssr: false })

  const sellAssetSearch = useModal('sellTradeAssetSearch')

  const percentOptions = useMemo(() => {
    if (!sellAsset?.assetId) return []
    if (!isToken(sellAsset.assetId)) return []

    return [1]
  }, [sellAsset.assetId])

  const handleSwitchAssets = useCallback(() => {
    onSwitchAssets()
  }, [onSwitchAssets])

  const handleSellAssetClick = useCallback(() => {
    sellAssetSearch.open({
      onAssetClick: setSellAsset,
      title: 'trade.tradeFrom',
      assetFilterPredicate,
      chainIdFilterPredicate,
      selectedChainId: selectedSellAssetChainId,
      onSelectedChainIdChange: onSellAssetChainIdChange,
      showFiatTab: true,
    })
  }, [
    assetFilterPredicate,
    chainIdFilterPredicate,
    sellAssetSearch,
    setSellAsset,
    selectedSellAssetChainId,
    onSellAssetChainIdChange,
  ])

  const assetSelectButtonProps = useMemo(() => {
    return {
      maxWidth: isSmallerThanMd ? '100%' : undefined,
    }
  }, [isSmallerThanMd])

  const sellTradeAssetSelect = useMemo(
    () => (
      <TradeAssetSelect
        assetId={sellAsset.assetId}
        onAssetClick={handleSellAssetClick}
        onAssetChange={setSellAsset}
        onlyConnectedChains={true}
        assetFilterPredicate={assetFilterPredicate}
        chainIdFilterPredicate={chainIdFilterPredicate}
        showChainDropdown={!isSmallerThanMd}
        buttonProps={assetSelectButtonProps}
        mb={isSmallerThanMd ? 0 : 4}
      />
    ),
    [
      sellAsset.assetId,
      isSmallerThanMd,
      assetSelectButtonProps,
      handleSellAssetClick,
      setSellAsset,
      assetFilterPredicate,
      chainIdFilterPredicate,
    ],
  )

  return (
    <Flex flexDir='column' height='100%' minHeight={0}>
      <Stack spacing={0} flex='0 0 auto'>
        <SellAssetInput
          accountId={sellAccountId}
          asset={sellAsset}
          isInputtingFiatSellAmount={isInputtingFiatSellAmount}
          isLoading={isLoading}
          placeholder={isInputtingFiatSellAmount ? '$0' : '0'}
          label={translate('trade.payWith')}
          labelPostFix={sellTradeAssetSelect}
          percentOptions={percentOptions}
          sellAmountCryptoPrecision={sellAmountCryptoPrecision}
          sellAmountUserCurrency={sellAmountUserCurrency}
          onChangeAccountId={setSellAccountId}
          onChangeIsInputtingFiatSellAmount={onChangeIsInputtingFiatSellAmount}
          onChangeSellAmountCryptoPrecision={onChangeSellAmountCryptoPrecision}
        />
        <Flex alignItems='center' justifyContent='center' my={-2} className='swapper-divider'>
          <Divider />
          <CircularProgress
            color='blue.500'
            thickness='4px'
            size='34px'
            trackColor='transparent'
            isIndeterminate={isLoading}
            borderRadius='full'
          >
            <CircularProgressLabel
              fontSize='md'
              display='flex'
              alignItems='center'
              justifyContent='center'
            >
              <IconButton
                onClick={handleSwitchAssets}
                isRound
                size='sm'
                position='relative'
                variant='outline'
                borderColor='border.base'
                zIndex={1}
                aria-label={translate('lending.switchAssets')}
                icon={arrowUpDownIcon}
                isDisabled={isSwitchAssetsDisabled}
                color='text.subtle'
              />
            </CircularProgressLabel>
          </CircularProgress>

          <Divider />
        </Flex>
        {children}
      </Stack>
      {subContent && (
        <Flex flex='1' minHeight={0}>
          {subContent}
        </Flex>
      )}
    </Flex>
  )
}
