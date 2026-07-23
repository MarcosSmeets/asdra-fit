import * as SecureStore from 'expo-secure-store';

const ACCESS = 'adsidera.accessToken';
const REFRESH = 'adsidera.refreshToken';
const ACCOUNT_USER_ID = 'adsidera.accountUserId';

/** Tokens sensíveis ficam no SecureStore (nunca no SQLite/AsyncStorage). */
export const tokenStore = {
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await SecureStore.setItemAsync(ACCESS, accessToken);
    await SecureStore.setItemAsync(REFRESH, refreshToken);
  },
  setAccountUserId(userId: string): Promise<void> {
    return SecureStore.setItemAsync(ACCOUNT_USER_ID, userId);
  },
  getAccountUserId(): Promise<string | null> {
    return SecureStore.getItemAsync(ACCOUNT_USER_ID);
  },
  getAccess(): Promise<string | null> {
    return SecureStore.getItemAsync(ACCESS);
  },
  getRefresh(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH);
  },
  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(ACCESS);
    await SecureStore.deleteItemAsync(REFRESH);
    await SecureStore.deleteItemAsync(ACCOUNT_USER_ID);
  },
};
