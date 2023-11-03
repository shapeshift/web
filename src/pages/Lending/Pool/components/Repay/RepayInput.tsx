import { ArrowDownIcon, WarningIcon } from '@chakra-ui/icons'
import {
  Button,
  Collapse,
  Divider,
  Flex,
  Heading,
  IconButton,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Stack,
  Tooltip,
} from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { btcAssetId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { TradeAssetSelect } from 'components/MultiHopTrade/components/AssetSelection'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'
import type { Asset } from 'lib/asset-service'
import { thorchainSwapper } from 'lib/swapper/swappers/ThorchainSwapper/ThorchainSwapper'
import { isSome } from 'lib/utils'
import { selectAssets } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { LoanSummary } from '../LoanSummary'
import { RepayRoutePaths } from './types'
const formControlProps = {
  borderRadius: 0,
  background: 'transparent',
  borderWidth: 0,
  paddingBottom: 0,
}

type RepayInputProps = {
  collateralAssetId: AssetId
  repayAmount: string | null
  onRepayAmountChange: (value: string) => void
  collateralAccountId: AccountId
  borrowAccountId: AccountId
  onCollateralAccountIdChange: (accountId: AccountId) => void
  onBorrowAccountIdChange: (accountId: AccountId) => void
  repaymentAsset: Asset | null
  setRepaymentAsset: (asset: Asset) => void
}
export const RepayInput = ({
  collateralAssetId,
  repayAmount,
  onRepayAmountChange,
  collateralAccountId,
  borrowAccountId,
  onCollateralAccountIdChange: handleCollateralAccountIdChange,
  onBorrowAccountIdChange: handleBorrowAccountIdChange,
  repaymentAsset,
  setRepaymentAsset,
}: RepayInputProps) => {
  const [seenNotice, setSeenNotice] = useState(false)
  const translate = useTranslate()
  const history = useHistory()

  const onSubmit = useCallback(() => {
    history.push(RepayRoutePaths.Confirm)
  }, [history])

  const swapIcon = useMemo(() => <ArrowDownIcon />, [])

  const percentOptions = useMemo(() => [0], [])

  const handleAccountIdChange = useCallback((accountId: AccountId) => {
    console.info(accountId)
  }, [])

  const assetsById = useAppSelector(selectAssets)

  const [repaymentSupportedAssets, setRepaymentSupportedAssets] = useState<Asset[]>([])
  useEffect(() => {
    ;(async () => {
      if (!repaymentAsset) setRepaymentAsset(assetsById[collateralAssetId] as Asset)

      const assets = Object.values(assetsById) as Asset[]
      const thorSellAssets = (await thorchainSwapper.filterAssetIdsBySellable(assets))
        .map(assetId => assetsById[assetId])
        .filter(isSome)
      setRepaymentSupportedAssets(thorSellAssets)
    })()
  }, [assetsById, collateralAssetId, repaymentAsset, setRepaymentAsset])

  const buyAssetSearch = useModal('buyAssetSearch')
  const handleRepaymentAssetClick = useCallback(() => {
    if (!repaymentSupportedAssets.length) return

    buyAssetSearch.open({
      onClick: setRepaymentAsset,
      title: 'lending.borrow',
      assets: repaymentSupportedAssets, // TODO(gomes)
    })
  }, [buyAssetSearch, repaymentSupportedAssets, setRepaymentAsset])

  const handleAssetChange = useCallback((asset: Asset) => {
    return console.info(asset)
  }, [])

  const repaymentAssetSelectComponent = useMemo(() => {
    return (
      <TradeAssetSelect
        accountId={''}
        assetId={repaymentAsset?.assetId ?? ''}
        onAssetClick={handleRepaymentAssetClick}
        onAccountIdChange={handleAccountIdChange}
        accountSelectionDisabled={false}
        label={'uhh'}
        onAssetChange={handleAssetChange}
        // Users have the possibility to repay in any supported asset, not only their collateral/borrowed asset
        // https://docs.thorchain.org/thorchain-finance/lending#loan-repayment-closeflow
        isReadOnly={false}
      />
    )
  }, [handleAccountIdChange, handleAssetChange, handleRepaymentAssetClick, repaymentAsset?.assetId])

  const collateralAssetSelectComponent = useMemo(() => {
    return (
      <TradeAssetSelect
        accountId={''}
        assetId={btcAssetId}
        onAssetClick={handleRepaymentAssetClick}
        onAccountIdChange={handleAccountIdChange}
        accountSelectionDisabled={false}
        label={'uhh'}
        onAssetChange={handleAssetChange}
        isReadOnly
      />
    )
  }, [handleAccountIdChange, handleAssetChange, handleRepaymentAssetClick])

  const handleSeenNotice = useCallback(() => setSeenNotice(true), [])

  if (!seenNotice) {
    return (
      <Stack spacing={6} px={4} py={6} textAlign='center' alignItems='center'>
        <WarningIcon color='text.warning' boxSize={12} />
        <Stack spacing={0} px={2}>
          <Heading as='h4'>{translate('lending.repayNoticeTitle')}</Heading>
          <Text color='text.subtle' translation='lending.repayNotice' />
        </Stack>
        <Button width='full' size='lg' colorScheme='blue' onClick={handleSeenNotice}>
          {translate('lending.repayNoticeCta')}
        </Button>
      </Stack>
    )
  }
  return (
    <Stack spacing={0}>
      <TradeAssetInput
        assetId={btcAssetId}
        assetSymbol={'btc'}
        assetIcon={''}
        cryptoAmount={'0'}
        fiatAmount={'0'}
        isSendMaxDisabled={false}
        percentOptions={percentOptions}
        showInputSkeleton={false}
        showFiatSkeleton={false}
        label={'Repay Amount'}
        onAccountIdChange={handleAccountIdChange}
        formControlProps={formControlProps}
        layout='inline'
        labelPostFix={repaymentAssetSelectComponent}
      >
        <Stack spacing={4} px={6} pb={4}>
          <Slider defaultValue={100} isReadOnly>
            <SliderTrack>
              <SliderFilledTrack bg='blue.500' />
            </SliderTrack>
            <Tooltip label={translate('lending.repayNotice')}>
              <SliderThumb boxSize={4} />
            </Tooltip>
          </Slider>
          <Flex width='full' justifyContent='space-between' fontSize='xs' color='text.subtle'>
            <Amount.Fiat value={0} />
            <Amount.Fiat value='14820' />
          </Flex>
        </Stack>
      </TradeAssetInput>
      <Flex alignItems='center' justifyContent='center' my={-2}>
        <Divider />
        <IconButton
          isRound
          size='sm'
          position='relative'
          variant='outline'
          borderColor='border.base'
          zIndex={1}
          aria-label='Switch Assets'
          icon={swapIcon}
        />
        <Divider />
      </Flex>
      <TradeAssetInput
        assetId={btcAssetId}
        assetSymbol={'btc'}
        assetIcon={''}
        cryptoAmount={'0'}
        fiatAmount={'0'}
        isSendMaxDisabled={false}
        percentOptions={percentOptions}
        showInputSkeleton={false}
        showFiatSkeleton={false}
        label={'Unlocked Collateral'}
        onAccountIdChange={handleAccountIdChange}
        formControlProps={formControlProps}
        layout='inline'
        labelPostFix={collateralAssetSelectComponent}
      />
      <Collapse in={true}>
        <LoanSummary
          collateralAssetId={collateralAssetId}
          depositAmountCryptoPrecision={repayAmount ?? '0'}
          borrowAssetId={repaymentAsset?.assetId ?? ''}
        />
      </Collapse>
      <Stack
        borderTopWidth={1}
        borderColor='border.subtle'
        flexDir='column'
        gap={4}
        px={6}
        py={4}
        bg='background.surface.raised.accent'
        borderBottomRadius='xl'
      >
        <Row fontSize='sm' fontWeight='medium'>
          <Row.Label>{translate('common.slippage')}</Row.Label>
          <Row.Value>
            <Amount.Crypto value='20' symbol='BTC' />
          </Row.Value>
        </Row>
        <Row fontSize='sm' fontWeight='medium'>
          <Row.Label>{translate('common.gasFee')}</Row.Label>
          <Row.Value>
            <Amount.Fiat value='10' />
          </Row.Value>
        </Row>
        <Row fontSize='sm' fontWeight='medium'>
          <Row.Label>{translate('common.fees')}</Row.Label>
          <Row.Value>
            <Amount.Fiat value='0' />
          </Row.Value>
        </Row>
        <Button size='lg' colorScheme='blue' mx={-2} onClick={onSubmit}>
          {translate('lending.repay')}
        </Button>
      </Stack>
    </Stack>
  )
}
