import { HistoryData } from '@shapeshiftoss/types'
import React, { PropsWithChildren } from 'react'

export interface MarketContextProps {
  filteredDataState: {
    filteredData: HistoryData[]
    setFilteredData: React.Dispatch<React.SetStateAction<HistoryData[]>>
  }
}

export const MarketDataContext = React.createContext<MarketContextProps>({
  filteredDataState: {
    filteredData: [],
    setFilteredData: () => {},
  },
})

// TODO(0xdef1cafe): remove this whole provider
export const MarketDataProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [filteredData, setFilteredData] = React.useState<HistoryData[]>([])

  return (
    <MarketDataContext.Provider
      value={{
        filteredDataState: { filteredData, setFilteredData },
      }}
    >
      {children}
    </MarketDataContext.Provider>
  )
}
