import { ModalBody, ModalHeader } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

import { useGridPlusConnection } from '../hooks/useGridPlusConnection'
import { InitialConnection } from './InitialConnection'
import { SafeCardList } from './SafeCardList'

export const GridPlusConnect = () => {
  const translate = useTranslate()
  const {
    safeCards,
    physicalDeviceId,
    isAddingNew,
    deviceId,
    isLoading,
    error,
    handleDeviceIdChange,
    handleBackToList,
    handleConnect,
  } = useGridPlusConnection()

  const showSafeCardList = safeCards.length > 0 && !isAddingNew

  if (showSafeCardList) {
    return (
      <>
        <ModalHeader>{translate('walletProvider.gridplus.list.header')}</ModalHeader>
        <ModalBody>
          <SafeCardList />
        </ModalBody>
      </>
    )
  }

  return (
    <InitialConnection
      physicalDeviceId={physicalDeviceId}
      deviceId={deviceId}
      onDeviceIdChange={handleDeviceIdChange}
      error={error}
      isLoading={isLoading}
      isAddingNew={isAddingNew}
      onSubmit={handleConnect}
      onBackToList={handleBackToList}
    />
  )
}
