import React from 'react'
import { useFindAllQuery } from 'state/slices/marketDataSlice/marketDataSlice'

export interface DataProps {
  date: string
  price: number
}

export interface MarketContextProps {
  filteredDataState: {
    filteredData: DataProps[]
    setFilteredData: React.Dispatch<React.SetStateAction<DataProps[]>>
  }
}

export const MarketDataContext = React.createContext<MarketContextProps>({
  filteredDataState: {
    filteredData: [],
    setFilteredData: () => {}
  }
})

export const MarketDataProvider: React.FC = ({ children }) => {
  const [filteredData, setFilteredData] = React.useState<DataProps[]>([])

  // we always want to load market cap data
  useFindAllQuery({})

  return (
    <MarketDataContext.Provider
      value={{
        filteredDataState: { filteredData, setFilteredData }
      }}
    >
      {children}
    </MarketDataContext.Provider>
  )
}
