import type { RouteKey, RoutePath } from '@elegant-router/types'
import type { RouteLocationNormalized, RouteLocationRaw, Router } from 'vue-router'
import { useAuthStore } from '@/store/modules/auth'
import { useRouteStore } from '@/store/modules/route'

/**
 * create route guard
 *
 * @param router router instance
 */
export function createRouteGuard(router: Router) {
  router.beforeEach(async (to, from) => {
    const location = await initRoute(to)

    if (location) {
      return location
    }

    const authStore = useAuthStore()

    const rootRoute: RouteKey = 'root'
    const loginRoute: RouteKey = 'login'
    const noAuthorizationRoute: RouteKey = '403'

    const routeRoles = to.meta.roles || []
    const hasRole = authStore.userInfo.roles.some(role => routeRoles.includes(role))
    const hasAuth = authStore.isStaticSuper || !routeRoles.length || hasRole

    // In desktop mode, login is not needed; redirect /login to root
    if (to.name === loginRoute) {
      return { name: rootRoute }
    }

    // if the user does not have authorization, then switch to the 403 page
    if (!hasAuth) {
      return { name: noAuthorizationRoute }
    }

    // switch route normally
    return handleRouteSwitch(to, from)
  })
}

/**
 * initialize route
 *
 * @param to to route
 */
async function initRoute(to: RouteLocationNormalized): Promise<RouteLocationRaw | null> {
  const routeStore = useRouteStore()

  const notFoundRoute: RouteKey = 'not-found'
  const isNotFoundRoute = to.name === notFoundRoute

  // 1. if the constant route is not initialized, then initialize the constant route
  if (!routeStore.isInitConstantRoute) {
    await routeStore.initConstantRoute()

    // after the constant route is initialized, redirect to the original route
    const path = to.fullPath
    const location: RouteLocationRaw = {
      path,
      replace: true,
      query: to.query,
      hash: to.hash,
    }

    return location
  }

  // 2. Desktop app does not require login: directly initialize auth routes if not already initialized
  if (!routeStore.isInitAuthRoute) {
    await routeStore.initAuthRoute()

    // after the auth route is initialized, redirect to the original route
    if (isNotFoundRoute) {
      const rootRoute: RouteKey = 'root'
      const path = to.redirectedFrom?.name === rootRoute ? '/' : to.fullPath

      const location: RouteLocationRaw = {
        path,
        replace: true,
        query: to.query,
        hash: to.hash,
      }

      return location
    }
  }

  routeStore.onRouteSwitchWhenLoggedIn()

  // the auth route is initialized
  // it is not the "not-found" route, then it is allowed to access
  if (!isNotFoundRoute) {
    return null
  }

  // it is captured by the "not-found" route, then check whether the route exists
  const exist = await routeStore.getIsAuthRouteExist(to.path as RoutePath)
  const noPermissionRoute: RouteKey = '403'

  if (exist) {
    const location: RouteLocationRaw = {
      name: noPermissionRoute,
    }

    return location
  }

  return null
}

function handleRouteSwitch(to: RouteLocationNormalized, from: RouteLocationNormalized) {
  // route with href
  if (to.meta.href) {
    window.open(to.meta.href, '_blank')

    return { path: from.fullPath, replace: true, query: from.query, hash: to.hash }
  }
}
