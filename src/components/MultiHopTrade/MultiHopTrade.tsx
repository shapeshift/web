import { ArrowDownIcon, ArrowForwardIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Button, Flex, IconButton, Stack, useColorModeValue, useMediaQuery } from '@chakra-ui/react'
import { KeplrHDWallet } from '@shapeshiftoss/hdwallet-keplr/dist/keplr'
import { useCallback, useMemo, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import type { CardProps } from 'components/Card/Card'
import { Card } from 'components/Card/Card'
import { MessageOverlay } from 'components/MessageOverlay/MessageOverlay'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { TradeAssetSelect } from 'components/Trade/Components/AssetSelection'
import { RateGasRow } from 'components/Trade/Components/RateGasRow'
import { TradeAssetInput } from 'components/Trade/Components/TradeAssetInput'
import { TradeQuotes } from 'components/Trade/Components/TradeQuotes/TradeQuotes'
import { ReceiveSummary } from 'components/Trade/TradeConfirm/ReceiveSummary'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { ETH, FOX_MAINNET } from 'lib/swapper/swappers/utils/test-data/assets'
import { selectAssetsSortedByMarketCapFiatBalanceAndName } from 'state/slices/common-selectors'
import { useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

import { SellAssetInput } from './components/SellAssetInput'
import { useAccountIds } from './hooks/useAccountIds'

export const MultiHopTrade = (props: CardProps) => {
  const {
    state: { wallet },
  } = useWallet()
  const isKeplr = useMemo(() => wallet instanceof KeplrHDWallet, [wallet])
  const methods = useForm({ mode: 'onChange' })
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const { assetSearch } = useModal()
  const sortedAssets = useAppSelector(selectAssetsSortedByMarketCapFiatBalanceAndName)

  // TEMP: needs redux
  const [sellAsset, setSellAsset] = useState(ETH)
  const [buyAsset, setBuyAsset] = useState(FOX_MAINNET)
  const supportedSellAssetsByMarketCap = sortedAssets
  const supportedBuyAssetsByMarketCap = sortedAssets
  const isSwapperInitialized = true
  const swapperSupportsCrossAccountTrade = true

  const { sellAssetAccountId, buyAssetAccountId, setSellAssetAccountId, setBuyAssetAccountId } =
    useAccountIds({
      buyAsset,
      sellAsset,
      swapperSupportsCrossAccountTrade,
    })

  const translate = useTranslate()
  const overlayTitle = useMemo(
    () => translate('trade.swappingComingSoonForWallet', { walletName: 'Keplr' }),
    [translate],
  )

  const handleSellAssetClick = useCallback(() => {
    // prevent opening the asset selection while they are being populated
    if (!isSwapperInitialized) return

    assetSearch.open({
      onClick: setSellAsset,
      title: 'trade.tradeFrom',
      assets: supportedSellAssetsByMarketCap,
    })
  }, [assetSearch, isSwapperInitialized, supportedSellAssetsByMarketCap])

  const handleBuyAssetClick = useCallback(() => {
    // prevent opening the asset selection while they are being populated
    if (!isSwapperInitialized) return

    assetSearch.open({
      onClick: setBuyAsset,
      title: 'trade.tradeTo',
      assets: supportedBuyAssetsByMarketCap,
    })
  }, [assetSearch, isSwapperInitialized, supportedBuyAssetsByMarketCap])

  return (
    <MessageOverlay show={isKeplr} title={overlayTitle}>
      <Card flex={1} {...props}>
        <FormProvider {...methods}>
          <SlideTransition>
            <Stack spacing={6} as='form' onSubmit={() => {}}>
              <Stack spacing={2}>
                <Flex alignItems='center' flexDir={{ base: 'column', md: 'row' }} width='full'>
                  <TradeAssetSelect
                    accountId={sellAssetAccountId}
                    onAccountIdChange={setSellAssetAccountId}
                    assetId={sellAsset.assetId}
                    onAssetClick={handleSellAssetClick}
                    label={translate('trade.from')}
                  />
                  <IconButton
                    onClick={() => {}}
                    isRound
                    mx={{ base: 0, md: -3 }}
                    my={{ base: -3, md: 0 }}
                    size='sm'
                    position='relative'
                    borderColor={useColorModeValue('gray.100', 'gray.750')}
                    borderWidth={1}
                    boxShadow={`0 0 0 3px var(${useColorModeValue(
                      '--chakra-colors-white',
                      '--chakra-colors-gray-785',
                    )})`}
                    bg={useColorModeValue('white', 'gray.850')}
                    zIndex={1}
                    aria-label='Switch Assets'
                    icon={isLargerThanMd ? <ArrowForwardIcon /> : <ArrowDownIcon />}
                  />
                  <TradeAssetSelect
                    accountId={buyAssetAccountId}
                    assetId={buyAsset.assetId}
                    onAssetClick={handleBuyAssetClick}
                    onAccountIdChange={setBuyAssetAccountId}
                    accountSelectionDisabled={false}
                    label={translate('trade.to')}
                  />
                </Flex>
                <SellAssetInput
                  accountId={sellAssetAccountId}
                  asset={sellAsset}
                  label={translate('trade.youPay')}
                  onClickSendMax={() => {}}
                />
                <TradeAssetInput
                  isReadOnly={true}
                  accountId={buyAssetAccountId}
                  assetId={buyAsset.assetId}
                  assetSymbol={buyAsset.symbol}
                  assetIcon={buyAsset.icon}
                  cryptoAmount={'0.0012300000'}
                  fiatAmount={'1.234'}
                  onChange={() => {}}
                  percentOptions={[1]}
                  showInputSkeleton={false}
                  showFiatSkeleton={false}
                  label={translate('trade.youGet')}
                  rightRegion={
                    false ? (
                      <IconButton
                        size='sm'
                        icon={false ? <ArrowUpIcon /> : <ArrowDownIcon />}
                        aria-label='Expand Quotes'
                        onClick={() => {}}
                      />
                    ) : (
                      <></>
                    )
                  }
                >
                  {false && <TradeQuotes isOpen={false} isLoading={false} />}
                </TradeAssetInput>
              </Stack>
              <Stack
                boxShadow='sm'
                p={4}
                borderColor={useColorModeValue('gray.100', 'gray.750')}
                borderRadius='xl'
                borderWidth={1}
              >
                <RateGasRow
                  sellSymbol={''}
                  buySymbol={''}
                  gasFee={'0'}
                  rate={undefined}
                  isLoading={false}
                  isError={false}
                />
                {false ? (
                  <ReceiveSummary
                    isLoading={false}
                    symbol={''}
                    amountCryptoPrecision={''}
                    amountBeforeFeesCryptoPrecision={''}
                    protocolFees={{}}
                    shapeShiftFee='0'
                    slippage={'0'}
                    swapperName={''}
                  />
                ) : null}
              </Stack>
              <Button
                type='submit'
                colorScheme={false ? 'red' : 'blue'}
                size='lg-multiline'
                data-test='trade-form-preview-button'
                isDisabled={false}
                isLoading={false}
              >
                <Text translation='trade.previewTrade' />
              </Button>
            </Stack>
          </SlideTransition>
        </FormProvider>
      </Card>
    </MessageOverlay>
  )
}
