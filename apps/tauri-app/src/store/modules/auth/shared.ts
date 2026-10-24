import { isTauri } from '@/plugins/tauri'
import { deleteStoreValue, getStoreValue, setStoreValue } from '@/services/store'
import { localStg } from '@/utils/storage'

type AuthStorageKey = 'token' | 'refreshToken'

async function getAuthValue(key: AuthStorageKey): Promise<string> {
  if (isTauri()) {
    return (await getStoreValue<string>(key, '')) || ''
  }

  return localStg.get(key) || ''
}

/** Get the access token from the platform auth store. */
export function getToken(): Promise<string> {
  return getAuthValue('token')
}

/** Get the refresh token from the platform auth store. */
export function getRefreshToken(): Promise<string> {
  return getAuthValue('refreshToken')
}

/** Persist both tokens through one platform-specific storage abstraction. */
export async function setAuthTokens(token: string, refreshToken: string): Promise<void> {
  if (isTauri()) {
    await setStoreValue('token', token)
    await setStoreValue('refreshToken', refreshToken)
    return
  }

  localStg.set('token', token)
  localStg.set('refreshToken', refreshToken)
}

/** Clear auth storage through the same abstraction used for reads and writes. */
export async function clearAuthStorage(): Promise<void> {
  if (isTauri()) {
    await deleteStoreValue('token')
    await deleteStoreValue('refreshToken')
    return
  }

  localStg.remove('token')
  localStg.remove('refreshToken')
}
