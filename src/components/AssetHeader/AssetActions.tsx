import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Button, Flex, Stack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { ethAssetId, isNft } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaCreditCard } from 'react-icons/fa'
import { IoSwapVertical } from 'react-icons/io5'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { FiatRampAction } from 'components/Modals/FiatRamps/FiatRampsCommon'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { WalletActions } from 'context/WalletProvider/actions'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectSupportsFiatRampByAssetId } from 'state/apis/fiatRamps/selectors'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type AssetActionProps = {
  assetId: AssetId
  accountId?: AccountId
  cryptoBalance: string
}

export const AssetActions: React.FC<AssetActionProps> = ({ assetId, accountId, cryptoBalance }) => {
  const isOsmosisSendEnabled = useFeatureFlag('OsmosisSend')
  const history = useHistory()

  const [isValidChainId, setIsValidChainId] = useState(true)
  const chainAdapterManager = getChainAdapterManager()
  const send = useModal('send')
  const receive = useModal('receive')
  const fiatRamps = useModal('fiatRamps')
  const translate = useTranslate()
  const {
    state: { isConnected },
    dispatch,
  } = useWallet()
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)
  const filter = useMemo(() => ({ assetId }), [assetId])
  const assetSupportsBuy = useAppSelector(s => selectSupportsFiatRampByAssetId(s, filter))

  useEffect(() => {
    const isValid =
      // feature flag to disable Osmosis Sends
      asset.chainId === KnownChainIds.OsmosisMainnet && !isOsmosisSendEnabled
        ? false
        : chainAdapterManager.has(asset.chainId)
    setIsValidChainId(isValid)
  }, [chainAdapterManager, asset, isOsmosisSendEnabled])

  const handleWalletModalOpen = () =>
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  const handleSendClick = () =>
    isConnected ? send.open({ assetId, accountId }) : handleWalletModalOpen()
  const handleReceiveClick = () =>
    isConnected ? receive.open({ asset, accountId }) : handleWalletModalOpen()
  const hasValidBalance = bnOrZero(cryptoBalance).gt(0)

  const handleBuySellClick = useCallback(() => {
    fiatRamps.open({
      assetId: assetSupportsBuy ? assetId : ethAssetId,
      fiatRampAction: FiatRampAction.Buy,
      accountId,
    })
  }, [accountId, assetId, assetSupportsBuy, fiatRamps])

  return (
    <Stack
      ml={{ base: 0, lg: 'auto' }}
      mt={{ base: 6, lg: 0 }}
      direction={{ base: 'column-reverse', md: 'row' }}
      justifyContent='flex-end'
      width={{ base: 'full', md: 'auto' }}
      flex={1}
    >
      <Flex direction='row' gap={2} flexWrap='wrap'>
        {isValidChainId && (
          <Button
            data-test='asset-action-trade'
            flex={{ base: 1, md: 'auto' }}
            leftIcon={<IoSwapVertical />}
            size='sm-multiline'
            width={{ base: '100%', md: 'auto' }}
            onClick={() => history.push(`/trade/${assetId}`)}
          >
            {translate('assets.assetCards.assetActions.trade')}
          </Button>
        )}

        {assetSupportsBuy && (
          <Button
            data-test='asset-action-buy-sell'
            width={{ base: 'full', md: 'auto' }}
            flex={{ base: 1, md: 'auto' }}
            onClick={handleBuySellClick}
            leftIcon={<FaCreditCard />}
            size='sm-multiline'
          >
            {translate('common.buySell')}
          </Button>
        )}
      </Flex>
      <Flex direction='row' gap={2} flexWrap='wrap'>
        <Button
          onClick={handleSendClick}
          leftIcon={<ArrowUpIcon />}
          width={{ base: '100%', md: 'auto' }}
          isDisabled={!hasValidBalance || !isValidChainId || isNft(assetId)}
          data-test='asset-action-send'
          flex={{ base: 1, md: 'auto' }}
        >
          {translate('common.send')}
        </Button>
        <Button
          disabled={!isValidChainId}
          onClick={handleReceiveClick}
          leftIcon={<ArrowDownIcon />}
          width={{ base: '100%', md: 'auto' }}
          data-test='asset-action-receive'
          flex={{ base: 1, md: 'auto' }}
        >
          {translate('common.receive')}
        </Button>
      </Flex>
    </Stack>
  )
}
