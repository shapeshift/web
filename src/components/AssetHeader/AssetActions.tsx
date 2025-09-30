import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import type { StackDirection } from '@chakra-ui/react'
import {
  Button,
  Flex,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Stack,
} from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { ethAssetId, fromAssetId, isNft } from '@shapeshiftoss/caip'
import { isToken } from '@shapeshiftoss/utils'
import { useCallback, useMemo } from 'react'
import { FaCreditCard, FaEllipsisH } from 'react-icons/fa'
import { TbExternalLink, TbFlag, TbStar, TbStarFilled } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { SwapIcon } from '@/components/Icons/SwapIcon'
import { FiatRampAction } from '@/components/Modals/FiatRamps/FiatRampsCommon'
import { WalletActions } from '@/context/WalletProvider/actions'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useModal } from '@/hooks/useModal/useModal'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { useWalletSupportsChain } from '@/hooks/useWalletSupportsChain/useWalletSupportsChain'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { vibrate } from '@/lib/vibrate'
import { selectSupportsFiatRampByAssetId } from '@/state/apis/fiatRamps/selectors'
import { selectWalletType } from '@/state/slices/localWalletSlice/selectors'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

const IconButtonAfter = {
  content: 'attr(aria-label)',
  position: 'absolute',
  bottom: '-1.5rem',
  fontSize: '12px',
  overflow: 'hidden',
  width: '100%',
  textOverflow: 'ellipsis',
  color: 'text.base',
}

const stackMlProps = { base: 0, lg: 'auto' }
const stackMtProps = { base: 6, lg: 0 }
const stackDirectionProps: StackDirection = { base: 'column-reverse', md: 'row' }
const stackWidthProps = { base: 'full', md: 'auto' }
const buttonFlexProps = { base: 1, md: 'auto' }
const buttonWidthProps = { base: '100%', md: 'auto' }

const moreIcon = <FaEllipsisH />
const arrowUpIcon = <ArrowUpIcon />
const arrowDownIcon = <ArrowDownIcon />
const swapIcon = <SwapIcon />
const faCreditCardIcon = <FaCreditCard />
const starIcon = <TbStar />
const fullStarIcon = <TbStarFilled />
const linkIcon = <TbExternalLink />
const flagIcon = <TbFlag />

const ButtonRowDisplay = { base: 'flex', md: 'none' }

type AssetActionProps = {
  assetId: AssetId
  accountId?: AccountId
  cryptoBalance: string
  isMobile?: boolean
}

export const AssetActions: React.FC<AssetActionProps> = ({
  assetId,
  accountId,
  cryptoBalance,
  isMobile,
}) => {
  const navigate = useNavigate()
  const appDispatch = useAppDispatch()

  const send = useModal('send')
  const receive = useModal('receive')
  const fiatRamps = useModal('fiatRamps')
  const assetActionsDrawer = useModal('assetActionsDrawer')
  const translate = useTranslate()
  const mixpanel = getMixPanel()
  const {
    state: { isConnected, wallet },
    dispatch,
  } = useWallet()
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)

  const isLedgerReadOnlyEnabled = useFeatureFlag('LedgerReadOnly')
  const walletType = useAppSelector(selectWalletType)
  const isLedgerReadOnly = isLedgerReadOnlyEnabled && walletType === KeyManager.Ledger

  // Either wallet is physically connected, or it's a Ledger in read-only mode
  const canDisplayAssetActions = useMemo(
    () => isConnected || isLedgerReadOnly,
    [isConnected, isLedgerReadOnly],
  )

  const filter = useMemo(() => ({ assetId }), [assetId])
  const assetSupportsBuy = useAppSelector(s => selectSupportsFiatRampByAssetId(s, filter))

  const spamMarkedAssetIds = useAppSelector(preferences.selectors.selectSpamMarkedAssetIds)
  const watchlistAssetIds = useAppSelector(preferences.selectors.selectWatchedAssetIds)

  const isSpamMarked = useMemo(
    () => spamMarkedAssetIds.includes(assetId),
    [assetId, spamMarkedAssetIds],
  )

  const isWatchlistMarked = useMemo(
    () => watchlistAssetIds.includes(assetId),
    [assetId, watchlistAssetIds],
  )

  const isValidChainId = useWalletSupportsChain(asset.chainId, wallet)

  const handleWalletModalOpen = useCallback(
    () => dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true }),
    [dispatch],
  )
  const handleSendClick = useCallback(() => {
    vibrate('heavy')
    if (!canDisplayAssetActions) return handleWalletModalOpen()
    mixpanel?.track(MixPanelEvent.SendClick)
    send.open({ assetId, accountId })
  }, [accountId, assetId, handleWalletModalOpen, canDisplayAssetActions, mixpanel, send])
  const handleReceiveClick = useCallback(() => {
    vibrate('heavy')
    if (canDisplayAssetActions) {
      return receive.open({ asset, accountId })
    }

    handleWalletModalOpen()
  }, [accountId, asset, handleWalletModalOpen, canDisplayAssetActions, receive])
  const hasValidBalance = bnOrZero(cryptoBalance).gt(0)

  const handleBuySellClick = useCallback(() => {
    vibrate('heavy')
    fiatRamps.open({
      assetId: assetSupportsBuy ? assetId : ethAssetId,
      fiatRampAction: FiatRampAction.Buy,
      accountId,
    })
  }, [accountId, assetId, assetSupportsBuy, fiatRamps])

  const handleTradeClick = useCallback(() => {
    vibrate('heavy')
    navigate(`/trade/${assetId}`)
  }, [assetId, navigate])

  const handleMoreClick = useCallback(() => {
    vibrate('heavy')
    assetActionsDrawer.open({ assetId })
  }, [assetActionsDrawer, assetId])

  const handleWatchAsset = useCallback(() => {
    appDispatch(preferences.actions.toggleWatchedAssetId(assetId))
  }, [assetId, appDispatch])

  const handleToggleSpam = useCallback(() => {
    appDispatch(preferences.actions.toggleSpamMarkedAssetId(assetId))
  }, [assetId, appDispatch])

  const explorerHref = useMemo(() => {
    if (!asset) return
    const { assetReference } = fromAssetId(asset.assetId)

    if (isNft(asset.assetId)) {
      const [token] = assetReference.split('/')
      return `${asset.explorer}/token/${token}?a=${asset.id}`
    }

    if (isToken(asset.assetId)) return `${asset?.explorerAddressLink}${assetReference}`

    return asset.explorer
  }, [asset])

  if (isMobile) {
    return (
      <>
        <Flex width='full' display={ButtonRowDisplay}>
          {isValidChainId && (
            <Flex flex={1} alignItems='center' justifyContent='center' mb={6}>
              <IconButton
                icon={arrowUpIcon}
                size='lg'
                isRound
                aria-label={translate('common.send')}
                _after={IconButtonAfter}
                onClick={handleSendClick}
                isDisabled={!hasValidBalance || !isValidChainId || isNft(assetId)}
                colorScheme='blue'
              />
            </Flex>
          )}

          <Flex flex={1} alignItems='center' justifyContent='center' mb={6}>
            <IconButton
              icon={arrowDownIcon}
              size='lg'
              isRound
              aria-label={translate('common.receive')}
              _after={IconButtonAfter}
              onClick={handleReceiveClick}
              isDisabled={!isValidChainId}
              colorScheme='blue'
            />
          </Flex>
          <Flex flex={1} alignItems='center' justifyContent='center' mb={6}>
            <IconButton
              icon={swapIcon}
              size='lg'
              isRound
              aria-label={translate('common.trade')}
              _after={IconButtonAfter}
              onClick={handleTradeClick}
              colorScheme='blue'
            />
          </Flex>
          {assetSupportsBuy && (
            <Flex flex={1} alignItems='center' justifyContent='center' mb={6}>
              <IconButton
                icon={faCreditCardIcon}
                size='lg'
                isRound
                aria-label={translate('navBar.buyCryptoShort')}
                _after={IconButtonAfter}
                onClick={handleBuySellClick}
                isDisabled={!canDisplayAssetActions}
                colorScheme='blue'
              />
            </Flex>
          )}
          <Flex flex={1} alignItems='center' justifyContent='center' mb={6}>
            <IconButton
              icon={moreIcon}
              size='lg'
              isRound
              aria-label={translate('assets.more')}
              _after={IconButtonAfter}
              onClick={handleMoreClick}
              colorScheme='blue'
            />
          </Flex>
        </Flex>
      </>
    )
  }

  return (
    <Stack
      ml={stackMlProps}
      mt={stackMtProps}
      direction={stackDirectionProps}
      justifyContent='flex-end'
      width={stackWidthProps}
      flex={1}
    >
      <Flex direction='row' gap={2} flexWrap='wrap'>
        {isValidChainId && (
          <Button
            data-test='asset-action-trade'
            flex={buttonFlexProps}
            leftIcon={swapIcon}
            size='sm-multiline'
            width={buttonWidthProps}
            onClick={handleTradeClick}
          >
            {translate('assets.assetCards.assetActions.trade')}
          </Button>
        )}

        {assetSupportsBuy && (
          <Button
            data-test='asset-action-buy-sell'
            width={buttonWidthProps}
            flex={buttonFlexProps}
            onClick={handleBuySellClick}
            leftIcon={faCreditCardIcon}
            size='sm-multiline'
          >
            {translate('common.buySell')}
          </Button>
        )}
      </Flex>
      <Flex direction='row' gap={2} flexWrap='wrap'>
        <Button
          onClick={handleSendClick}
          leftIcon={arrowUpIcon}
          width={buttonWidthProps}
          isDisabled={!hasValidBalance || !isValidChainId || isNft(assetId)}
          data-test='asset-action-send'
          flex={buttonFlexProps}
        >
          {translate('common.send')}
        </Button>
        <Button
          disabled={!isValidChainId}
          onClick={handleReceiveClick}
          leftIcon={arrowDownIcon}
          width={buttonWidthProps}
          data-test='asset-action-receive'
          flex={buttonFlexProps}
        >
          {translate('common.receive')}
        </Button>
        <Menu>
          <MenuButton
            as={Button}
            leftIcon={moreIcon}
            size='sm-multiline'
            flex={buttonFlexProps}
            width={buttonWidthProps}
            aria-label={translate('assets.more')}
          >
            {translate('assets.more')}
          </MenuButton>
          <MenuList>
            <MenuItem
              as='a'
              icon={isWatchlistMarked ? fullStarIcon : starIcon}
              onClick={handleWatchAsset}
              cursor='pointer'
            >
              {isWatchlistMarked ? translate('watchlist.remove') : translate('watchlist.add')}
            </MenuItem>
            {explorerHref && (
              <MenuItem
                icon={linkIcon}
                as='a'
                href={explorerHref}
                target='_blank'
                rel='noopener noreferrer'
              >
                {translate('common.viewOnExplorer')}
              </MenuItem>
            )}
            <MenuItem
              as='a'
              icon={flagIcon}
              onClick={handleToggleSpam}
              color={isSpamMarked ? 'inherit' : 'red.400'}
              cursor='pointer'
            >
              {isSpamMarked ? translate('assets.showAsset') : translate('assets.hideAsset')}
            </MenuItem>
          </MenuList>
        </Menu>
      </Flex>
    </Stack>
  )
}
