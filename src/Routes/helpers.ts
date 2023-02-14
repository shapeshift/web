import type React from 'react'

/*
 * Article for context -- https://sneas.github.io/blog/react-nested-navigation/
 */

/**
 * Combine paths
 *
 * @param {string} parent
 * @param {string} child
 * @returns {string}
 */

export enum RouteCategory {
  Wallet = 'wallet',
  Explore = 'explore',
}

export type Route = {
  path: string
  label: string
  shortLabel?: string
  main: React.ElementType<{ route?: Route }> | null
  parent?: Route | null
  routes?: Route[]
  icon?: JSX.Element
  disable?: boolean
  hide?: boolean
  breadcrumb?: string | React.ReactNode
  category?: RouteCategory
} & (
  | {
      mobileNav: boolean
      priority: number
    }
  | {
      mobileNav?: never
      priority?: never
    }
)

const combinePaths = (parent: string, child: string): string =>
  `${parent.replace(/\/$/, '')}/${child.replace(/^\//, '')}`

/**
 * Recursively build paths for each navigation item
 *
 * @param routes
 * @param {string} parentPath
 * @returns {*}
 */
const buildPaths = (routes: Route[], parentPath = ''): Route[] =>
  routes.map(route => {
    const path = combinePaths(parentPath, route.path)

    return {
      ...route,
      path,
      ...(route.routes && { routes: buildPaths(route.routes, path) }),
    }
  })

/**
 * Recursively provide parent reference for each navigation item
 *
 * @param routes
 * @param Route
 * @returns {*}
 */
const setupParents = (routes: Route[], Route?: Route): Route[] =>
  routes.map(route => {
    const withParent = {
      ...route,
      ...(Route && { parent: Route }),
    }

    return {
      ...withParent,
      ...(withParent.routes && {
        routes: setupParents(withParent.routes, withParent),
      }),
    }
  })

/**
 * Convert navigation tree into flat array
 *
 * @param routes
 * @returns {Route[]}
 */
const flattenRoutes = (routes: Route[]): Route[] =>
  routes
    .filter(route => !route.disable)
    .map(route => [route.routes ? flattenRoutes(route.routes) : ([] as any[]), route])
    .flat(Infinity)

/**
 * Combine all the above functions together
 *
 * @param routes
 * @returns {Route[]}
 */
export const generateAppRoutes = (routes: Route[]) => {
  return flattenRoutes(setupParents(buildPaths(routes)))
}

/**
 * Provides path from root to the element
 *
 * @param route
 * @returns {Route[]}
 */
export const pathTo = (route: Route): Route[] => {
  if (!route.parent) {
    return [route]
  }

  return [...pathTo(route.parent), route]
}
