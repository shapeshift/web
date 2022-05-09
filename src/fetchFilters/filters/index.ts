import type { FetchFilterClass } from '../../../sw/src/fetchFilters'
import { DemoFilter } from './DemoFilter'
import { Localhost8545Filter } from './Localhost8545Filter'

// eslint-disable-next-line prettier/prettier
export const fetchFilterClasses: Array<FetchFilterClass> = [
  DemoFilter,
  Localhost8545Filter
]
