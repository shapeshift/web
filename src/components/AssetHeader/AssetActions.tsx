import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { ButtonGroup, IconButton, Skeleton, Tooltip } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { useTranslate } from 'react-polyglot'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'
import { selectAssetByCAIP19 } from 'state/slices/assetsSlice/assetsSlice'
import { AccountSpecifier } from 'state/slices/portfolioSlice/portfolioSlice'
import { useAppSelector } from 'state/store'

type AssetActionProps = {
  isLoaded: boolean
  assetId: CAIP19
  accountId?: AccountSpecifier
  cryptoBalance: string
}

export const AssetActions = ({ isLoaded, assetId, accountId, cryptoBalance }: AssetActionProps) => {
  const { send, receive } = useModal()
  const translate = useTranslate()
  const {
    state: { isConnected },
    dispatch
  } = useWallet()
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))

  const handleWalletModalOpen = () =>
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  const handleSendClick = () =>
    isConnected ? send.open({ asset: asset, accountId }) : handleWalletModalOpen()
  const handleReceiveClick = () =>
    isConnected ? receive.open({ asset: asset, accountId }) : handleWalletModalOpen()
  const hasValidBalance = bnOrZero(cryptoBalance).gt(0)

  return (
    <ButtonGroup
      ml={{ base: 0, lg: 'auto' }}
      mt={{ base: 6, lg: 0 }}
      width={{ base: 'full', lg: 'auto' }}
    >
      <Skeleton isLoaded={isLoaded} width={{ base: 'full', lg: 'auto' }}>
        <Tooltip
          label={
            !hasValidBalance ? translate('common.insufficientFunds') : translate('common.send')
          }
          fontSize='md'
          px={4}
          hasArrow
        >
          <div>
            <IconButton
              onClick={handleSendClick}
              isRound
              width='full'
              icon={<ArrowUpIcon />}
              aria-label={translate('common.send')}
              isDisabled={!hasValidBalance}
              data-test='asset-action-send'
            />
          </div>
        </Tooltip>
      </Skeleton>
      <Skeleton isLoaded={isLoaded} width={{ base: 'full', lg: 'auto' }}>
        <Tooltip label={translate('common.receive')} fontSize='md' px={4} hasArrow>
          <IconButton
            onClick={handleReceiveClick}
            isRound
            width='full'
            icon={<ArrowDownIcon />}
            aria-label={translate('common.receive')}
            data-test='asset-action-receive'
          />
        </Tooltip>
      </Skeleton>
    </ButtonGroup>
  )
}
