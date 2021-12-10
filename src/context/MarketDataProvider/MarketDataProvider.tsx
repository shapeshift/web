import React from 'react'
import { useFindAllQuery } from 'state/slices/marketDataSlice/marketDataSlice'
// import { useSelector } from 'react-redux'
// import { selectPortfolioAssetIds } from 'state/slices/portfolioSlice/portfolioSlice'

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
  // const portfolioAssetIds = useSelector(selectPortfolioAssetIds)

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
