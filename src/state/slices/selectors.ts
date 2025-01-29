/**
 * IMPORTANT NOTE:
 *  if you are importing selectors from another slice selectors file,
 *  to avoid circular imports, those selectors must be imported from
 *  `state/slices/[sliceName]/selectors` instead of this file.
 *
 * for the rest of the files, they CAN be imported from `state/slices/selectors`.
 */

export * from './assetsSlice/selectors'
export * from './marketDataSlice/selectors'
export * from './portfolioSlice/selectors'
export * from './preferencesSlice/selectors'
export * from './txHistorySlice/selectors'
export * from './opportunitiesSlice/selectors'

/**
 * some selectors span multiple business logic domains, e.g. portfolio and opportunities
 * slices are closely related in logic
 *
 * to avoid both circular dependencies and duplication of logic,
 * we define them higher up the tree at a common place
 */
export * from './common-selectors'
