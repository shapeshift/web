/**
 * IMPORTANT NOTE:
 *  if you are importing selectors from another slice selectors file,
 *  to avoid circular imports, those selectors must be imported from
 *  `state/slices/[sliceName]/selectors` instead of this file.
 *
 * for the rest of the files, they CAN be imported from `state/slices/selectors`.
 */

export * from '../slices/assetsSlice/selectors'
export * from '../slices/marketDataSlice/selectors'
export * from '../slices/portfolioSlice/selectors'
export * from '../slices/preferencesSlice/selectors'
export * from '../slices/txHistorySlice/selectors'
export * from '../slices/opportunitiesSlice/selectors'
export * from '../slices/tradeInputSlice/selectors'

/**
 * some selectors span multiple business logic domains, e.g. portfolio and opportunities
 * slices are closely related in logic
 *
 * to avoid both circular dependencies and duplication of logic,
 * we define them higher up the tree at a common place
 */
export * from '../slices/common-selectors'
