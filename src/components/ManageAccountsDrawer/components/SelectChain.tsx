import { Button, SimpleGrid, VStack } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { LazyLoadAvatar } from 'components/LazyLoadAvatar'
import { RawText } from 'components/Text'
import { chainIdToFeeAssetId } from 'lib/utils'
import { selectAssetById, selectWalletSupportedChainIds } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { DrawerContentWrapper } from './DrawerContent'

export type SelectChainProps = {
  onSelectChainId: (chainId: ChainId) => void
  onClose: () => void
}

const disabledProp = { opacity: 0.5, cursor: 'not-allowed', userSelect: 'none' }

const ChainButton = ({
  chainId,
  onClick,
}: {
  chainId: ChainId
  onClick: (chainId: ChainId) => void
}) => {
  const feeAssetId = chainIdToFeeAssetId(chainId)
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId ?? ''))
  const handleClick = useCallback(() => onClick(chainId), [chainId, onClick])

  if (!feeAsset) return null

  return (
    <Button height='100px' width='full' onClick={handleClick}>
      <VStack direction='column'>
        <LazyLoadAvatar src={feeAsset.networkIcon ?? feeAsset.icon} size='sm' />
        <RawText>{feeAsset.symbol}</RawText>
      </VStack>
    </Button>
  )
}

export const SelectChain = ({ onSelectChainId, onClose }: SelectChainProps) => {
  const translate = useTranslate()
  const [selectedChainId, setSelectedChainId] = useState<ChainId | null>(null)

  const walletSupportedChainIds = useAppSelector(selectWalletSupportedChainIds)

  const handleClickDone = useCallback(() => {
    // This should never happen, but just in case.
    if (!selectedChainId) return

    onSelectChainId(selectedChainId)
  }, [onSelectChainId, selectedChainId])

  const chainButtons = useMemo(() => {
    return walletSupportedChainIds.map(chainId => {
      return <ChainButton key={chainId} chainId={chainId} onClick={setSelectedChainId} />
    })
  }, [walletSupportedChainIds])

  const footer = useMemo(() => {
    return (
      <>
        <Button colorScheme='gray' mr={3} onClick={onClose}>
          {translate('common.cancel')}
        </Button>
        <Button
          colorScheme='blue'
          onClick={handleClickDone}
          isDisabled={selectedChainId === null}
          _disabled={disabledProp}
        >
          {translate('common.next')}
        </Button>
      </>
    )
  }, [handleClickDone, onClose, selectedChainId, translate])

  const body = useMemo(() => {
    return (
      <SimpleGrid columns={3} spacing={6}>
        {chainButtons}
      </SimpleGrid>
    )
  }, [chainButtons])

  return (
    <DrawerContentWrapper
      title={translate('accountManagement.selectChain.title')}
      description={translate('accountManagement.selectChain.description')}
      footer={footer}
      body={body}
    />
  )
}
