import { readJSONSync } from 'fs-extra/esm';
import path from 'node:path';
import axios, { isAxiosError } from 'axios';

export interface Config {
  authCodes?: AuthCodeUser[];
  gcpdLogins?: LoginCredential[];
  authCodeLogin?: LoginCredential;
  steamApiKey?: string;
  logLevel?: string;
  runOnStartup?: boolean;
  runOnce?: boolean;
  cronSchedule?: string;
  timezone?: string;
}

export interface AuthCodeUser {
  authCode: string;
  steamId64: string;
  oldestShareCode: string;
}

export interface LoginCredential {
  username: string;
  password: string;
  secret: string;
}

const configDir = process.env['CONFIG_DIR'] || 'config';
const configFile = path.join(configDir, 'config.json');

export const config = readJSONSync(configFile, 'utf-8') as Config;
try {
  const url = 'https://ys440sg844kg8oockc4cwsos.is-on.cloud/api/v1/counter_strike_users/';
  const headers = {
    'X-API-Token': '117cb41fec941f9d746e1a9f73197d14f3f8c2fb5aa301ec6a49baef2db0bb7a',
  };
  const response = await axios.get(url, { headers });
  config.authCodes = response.data;
} catch (e) {
  if (isAxiosError(e)) {
    console.error('Axios error', e.message);
  } else {
    console.error('error fetching auth codes from server:', e);
  }
  config.authCodes = [];
}
