import { useLoading } from '@sa/hooks'
import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { SetupStoreId } from '@/enum'
import { useRouterPush } from '@/hooks/common/router'
import { fetchGetUserInfo, fetchLogin } from '@/service/api'
import { localStg } from '@/utils/storage'
import { useDictStore } from '../dict'
import { useRouteStore } from '../route'
import { useTabStore } from '../tab'
import { clearAuthStorage, getToken, setAuthTokens } from './shared'

const DEFAULT_USER_INFO: Api.Auth.UserInfo = {
  userId: '1',
  userName: 'VSCode Developer',
  roles: ['R_SUPER'],
  buttons: [],
}

export const useAuthStore = defineStore(SetupStoreId.Auth, () => {
  const authStore = useAuthStore()
  const routeStore = useRouteStore()
  const tabStore = useTabStore()
  const { redirectFromLogin } = useRouterPush(false)
  const { loading: loginLoading, startLoading, endLoading } = useLoading()

  const token = ref('desktop-token')

  const userInfo: Api.Auth.UserInfo = reactive({ ...DEFAULT_USER_INFO })

  /** is super role in static route */
  const isStaticSuper = computed(() => {
    const { VITE_AUTH_ROUTE_MODE, VITE_STATIC_SUPER_ROLE } = import.meta.env

    return VITE_AUTH_ROUTE_MODE === 'static' && userInfo.roles.includes(VITE_STATIC_SUPER_ROLE || 'R_SUPER')
  })

  /** Is login */
  const isLogin = computed(() => true)

  /** Reset auth store */
  async function resetStore() {
    recordUserId()

    await clearAuthStorage()

    authStore.$reset()
    Object.assign(userInfo, DEFAULT_USER_INFO)
    token.value = 'desktop-token'

    tabStore.cacheTabs()
    routeStore.resetStore()
  }

  /** Record the user ID of the previous login session Used to compare with the current user ID on next login */
  function recordUserId() {
    if (!userInfo.userId) {
      return
    }

    // Store current user ID locally for next login comparison
    localStg.set('lastLoginUserId', userInfo.userId)
  }

  /**
   * Check if current login user is different from previous login user If different, clear all tabs
   *
   * @returns {boolean} Whether to clear all tabs
   */
  function checkTabClear(): boolean {
    if (!userInfo.userId) {
      return false
    }

    const lastLoginUserId = localStg.get('lastLoginUserId')

    // Clear all tabs if current user is different from previous user
    if (!lastLoginUserId || lastLoginUserId !== userInfo.userId) {
      localStg.remove('globalTabs')
      tabStore.clearTabs()

      localStg.remove('lastLoginUserId')
      return true
    }

    localStg.remove('lastLoginUserId')
    return false
  }

  /**
   * Login
   *
   * @param userName User name
   * @param password Password
   * @param [redirect] Whether to redirect after login. Default is `true`
   */
  async function login(userName: string, password: string, redirect = true) {
    startLoading()

    const { data: loginToken, error } = await fetchLogin(userName, password)

    if (!error) {
      const pass = await loginByToken(loginToken)

      if (pass) {
        // Check if the tab needs to be cleared
        const isClear = checkTabClear()
        let needRedirect = redirect

        if (isClear) {
          // If the tab needs to be cleared,it means we don't need to redirect.
          needRedirect = false
        }
        await redirectFromLogin(needRedirect)

        window.$notification?.success({
          title: '登录成功',
          content: `欢迎回来，${userInfo.userName} ！`,
          duration: 4500,
        })
      }
    }
    else {
      resetStore()
    }

    endLoading()
  }

  async function loginByToken(loginToken: Api.Auth.LoginToken) {
    // 1. Persist tokens through the platform-specific auth storage.
    await setAuthTokens(loginToken.token, loginToken.refreshToken)

    // 2. get user info
    const pass = await getUserInfo()

    if (pass) {
      token.value = loginToken.token

      return true
    }

    return false
  }

  async function getUserInfo() {
    const { data: info, error } = await fetchGetUserInfo()

    if (!error) {
      // update store
      Object.assign(userInfo, info)

      const dictStore = useDictStore()
      await dictStore.fetchAllDicts()

      return true
    }

    return false
  }

  async function initUserInfo() {
    const maybeToken = await getToken()

    if (maybeToken) {
      token.value = maybeToken
      const pass = await getUserInfo()

      if (!pass) {
        Object.assign(userInfo, DEFAULT_USER_INFO)
      }
    }
    else {
      Object.assign(userInfo, DEFAULT_USER_INFO)
    }
  }

  return {
    token,
    userInfo,
    isStaticSuper,
    isLogin,
    loginLoading,
    resetStore,
    login,
    initUserInfo,
  }
})
