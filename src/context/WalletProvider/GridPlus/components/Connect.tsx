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
    connectingCardId,
    deviceId,
    isLoading,
    error,
    handleDeviceIdChange,
    handleBackToList,
    handleConnect,
    handleSelectSafeCard,
    handleAddNew,
  } = useGridPlusConnection()

  const showSafeCardList = safeCards.length > 0 && !isAddingNew

  if (showSafeCardList) {
    return (
      <>
        <ModalHeader>{translate('walletProvider.gridplus.list.header')}</ModalHeader>
        <ModalBody>
          <SafeCardList
            safeCards={safeCards}
            onSelectSafeCard={handleSelectSafeCard}
            onAddNewSafeCard={handleAddNew}
            connectingCardId={connectingCardId}
            error={error}
          />
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
