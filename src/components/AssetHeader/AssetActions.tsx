import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import type { StackDirection } from '@chakra-ui/react'
import { Button, Flex, IconButton, Stack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { ethAssetId, isNft } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaCreditCard, FaEllipsisH } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { SwapIcon } from '@/components/Icons/SwapIcon'
import { FiatRampAction } from '@/components/Modals/FiatRamps/FiatRampsCommon'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { WalletActions } from '@/context/WalletProvider/actions'
import { useModal } from '@/hooks/useModal/useModal'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { vibrate } from '@/lib/vibrate'
import { selectSupportsFiatRampByAssetId } from '@/state/apis/fiatRamps/selectors'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

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

  const [isValidChainId, setIsValidChainId] = useState(true)
  const chainAdapterManager = getChainAdapterManager()
  const send = useModal('send')
  const receive = useModal('receive')
  const fiatRamps = useModal('fiatRamps')
  const assetActionsDrawer = useModal('assetActionsDrawer')
  const translate = useTranslate()
  const mixpanel = getMixPanel()
  const {
    state: { isConnected },
    dispatch,
  } = useWallet()
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)
  const filter = useMemo(() => ({ assetId }), [assetId])
  const assetSupportsBuy = useAppSelector(s => selectSupportsFiatRampByAssetId(s, filter))

  useEffect(() => {
    const isValid = chainAdapterManager.has(asset.chainId)
    setIsValidChainId(isValid)
  }, [chainAdapterManager, asset])

  const handleWalletModalOpen = useCallback(
    () => dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true }),
    [dispatch],
  )
  const handleSendClick = useCallback(() => {
    vibrate('heavy')
    if (!isConnected) return handleWalletModalOpen()
    mixpanel?.track(MixPanelEvent.SendClick)
    send.open({ assetId, accountId })
  }, [accountId, assetId, handleWalletModalOpen, isConnected, mixpanel, send])
  const handleReceiveClick = useCallback(() => {
    vibrate('heavy')
    if (isConnected) {
      return receive.open({ asset, accountId })
    }

    handleWalletModalOpen()
  }, [accountId, asset, handleWalletModalOpen, isConnected, receive])
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
              aria-label={translate('navBar.tradeShort')}
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
                isDisabled={!isConnected}
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
      </Flex>
    </Stack>
  )
}
