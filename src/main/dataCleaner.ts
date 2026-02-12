import { session } from 'electron'

export interface ClearDataOptions {
  cookies?: boolean // Cookie と他のサイトデータ
  cache?: boolean // キャッシュされた画像とファイル
  appData?: boolean // ホストされているアプリデータ (IndexedDB, WebSQL, LocalStorage)
}

// Clear profile data
export async function clearProfileData(
  profileId: string,
  options: ClearDataOptions
): Promise<void> {
  const partitionName = `persist:profile-${profileId}`
  const profileSession = session.fromPartition(partitionName)

  const storages: Array<
    | 'cookies'
    | 'filesystem'
    | 'indexdb'
    | 'localstorage'
    | 'shadercache'
    | 'websql'
    | 'serviceworkers'
    | 'cachestorage'
  > = []

  // Cookie と他のサイトデータ
  if (options.cookies) {
    storages.push('cookies')
  }

  // キャッシュされた画像とファイル
  if (options.cache) {
    storages.push('cachestorage', 'shadercache')
  }

  // ホストされているアプリデータ (IndexedDB, WebSQL, LocalStorage, Service Workers)
  if (options.appData) {
    storages.push('indexdb', 'websql', 'localstorage', 'serviceworkers', 'filesystem')
  }

  // Clear storage data
  if (storages.length > 0) {
    await profileSession.clearStorageData({
      storages
    })
  }

  // Clear HTTP cache separately if requested
  if (options.cache) {
    await profileSession.clearCache()
  }

  // Clear cookies more thoroughly if requested
  if (options.cookies) {
    const cookies = await profileSession.cookies.get({})
    for (const cookie of cookies) {
      await profileSession.cookies.remove(
        `${cookie.secure ? 'https' : 'http'}://${cookie.domain}${cookie.path}`,
        cookie.name
      )
    }
  }
}
