import { Button } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useTranslate } from 'react-polyglot'
import { selectFeeAssetByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { DrawerContentWrapper } from './DrawerContent'

export type LedgerOpenAppProps = {
  chainId: ChainId
  onClose: () => void
}

export const LedgerOpenApp = ({ chainId, onClose }: LedgerOpenAppProps) => {
  const translate = useTranslate()
  const asset = useAppSelector(state => selectFeeAssetByChainId(state, chainId))
  const chainNamespaceDisplayName = asset?.networkName ?? ''

  return (
    <DrawerContentWrapper
      title={translate('accountManagement.ledgerOpenApp.title', { chainNamespaceDisplayName })}
      description={translate('accountManagement.ledgerOpenApp.description')}
      footer={
        <>
          <Button colorScheme='gray' mr={3} onClick={onClose}>
            {translate('common.cancel')}
          </Button>
          <Button colorScheme='blue'>{translate('common.next')}</Button>
        </>
      }
    />
  )
}
