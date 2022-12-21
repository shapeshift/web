import { useContext } from 'react'

import { OsmosisContext } from './OsmosisProvider'

export const useOsmosis = () => {
  const context = useContext(OsmosisContext)
  if (!context) throw new Error("useOsmosis can't be used outside of the OsmosisProvider")
  return context
}
