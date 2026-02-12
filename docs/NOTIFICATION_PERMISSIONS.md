# Notification Permission System

## 概要

Browser Spaceでは、プロファイルごとにWebサイトからの通知許可を管理できます。

## 現在の動作

### 自動ダイアログ方式（デフォルト）

1. Webサイト（Gmail、Slackなど）が通知を要求
2. Electronネイティブダイアログが表示
3. ユーザーが「Allow」または「Block」を選択
4. 選択結果をプロファイルに保存（ドメイン単位）
5. 次回以降、同じドメインでは保存された設定を使用

### データ構造

プロファイルデータ（electron-store）に保存：

```typescript
interface Profile {
  // ...
  notificationPermissions: {
    [domain: string]: 'granted' | 'denied' | 'default'
  }
}
```

例：
```json
{
  "notificationPermissions": {
    "mail.google.com": "granted",
    "slack.com": "denied",
    "calendar.google.com": "granted"
  }
}
```

## 実装場所

### メインプロセス

- `src/main/notificationManager.ts` - 許可ダイアログ表示
- `src/main/browserViewManager.ts` - `setPermissionRequestHandler`でリクエスト処理

### データ層

- `src/shared/types.ts` - `Profile.notificationPermissions`型定義
- `src/main/profileManager.ts` - プロファイル作成時のデフォルト値

## ドメイン単位の事前許可

### 方法1: プロファイル作成時にデフォルト設定

`src/main/profileManager.ts`の`createProfile`関数で初期値を設定：

```typescript
export function createProfile(
  data: Omit<Profile, 'id' | 'createdAt' | 'updatedAt' | 'order'>
): Profile {
  const profile: Profile = {
    // ...
    notificationPermissions: {
      'mail.google.com': 'granted',  // Gmail用プロファイルなら事前許可
      'calendar.google.com': 'granted'
    }
  }
  // ...
}
```

### 方法2: UIから設定（未実装）

将来的に実装可能：

```typescript
// ProfileFormに追加
const [notificationDomains, setNotificationDomains] = useState<string[]>([])

// プロファイル作成時に変換
const notificationPermissions = notificationDomains.reduce((acc, domain) => {
  acc[domain] = 'granted'
  return acc
}, {} as Record<string, 'granted' | 'denied' | 'default'>)
```

### 方法3: 既存プロファイルに手動追加

設定画面から`window.profileApi.update()`を使用：

```typescript
await window.profileApi.update(profileId, {
  notificationPermissions: {
    ...existingPermissions,
    'new-domain.com': 'granted'
  }
})
```

## セキュリティ考慮事項

- ドメイン単位で管理（サブドメイン別）
- プロファイル間で許可設定は独立
- ユーザーの明示的な許可が必要（デフォルトは拒否）

## 将来の改善案

### 案1: プリセット + カスタム

よく使うサービスをプリセットとして提供し、必要に応じてカスタムドメイン追加。

### 案2: 包括的な許可設定

プロファイル作成時に「すべて許可」「毎回確認」「すべて拒否」を選択可能に。

### 案3: 許可済みサイト管理UI

設定画面で許可済みドメインの一覧表示と個別削除機能。

## トラブルシューティング

### 通知が届かない

1. プロファイルの`notificationPermissions`を確認
2. 該当ドメインが`'granted'`になっているか
3. OS側の通知許可を確認（macOS: システム環境設定 > 通知）

### 通知許可をリセット

データクリア機能で`appData`をクリアすると、通知許可設定も削除されます。
