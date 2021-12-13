import React from 'react'

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

// TODO(0xdef1cafe): remove this whole provider
export const MarketDataProvider: React.FC = ({ children }) => {
  const [filteredData, setFilteredData] = React.useState<DataProps[]>([])

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
