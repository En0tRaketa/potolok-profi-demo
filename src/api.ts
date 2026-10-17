import type { CompanyConfig, PublicConfig } from './config/types';
import type { LeadInput } from './lib/lead';
import { defaultConfig } from './config/defaults';
export class ApiError extends Error {
  errors: string[];
  status: number;
  constructor(status: number, errors: string[]) {
    super(errors.join('; '));
    this.status = status;
    this.errors = errors;
  }
}

async function call<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  let res: Response;
  try {
    res = await fetch(path, {
      credentials: 'same-origin',
      ...rest,
      headers: json !== undefined ? { 'Content-Type': 'application/json', ...rest.headers } : rest.headers,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    throw new ApiError(0, ['Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.']);
  }
  const body = (await res.json().catch(() => null)) as (T & { ok?: boolean; errors?: string[] }) | null;
  if (!res.ok || !body || body.ok === false) throw new ApiError(res.status, body?.errors ?? [`Ошибка сервера (${res.status})`]);
  return body;
}

export const getConfig = () => call<PublicConfig>('/api/config');

export interface LeadResponse {
  ok: true;
  id: string;
  delivered: boolean;
  channels: { telegram?: string; vk?: string };
}
export const sendLead = (lead: LeadInput & { website: string }) => call<LeadResponse>('/api/lead', { method: 'POST', json: lead });

// ---------- Админка
export interface MaskedIntegrations {
  telegram: { enabled: boolean; chatId: string; botToken: string | null; tokenHint: string };
  vk: { enabled: boolean; peerIds: string; groupToken: string | null; tokenHint: string };
}
export interface Delivery {
  status: 'sent' | 'failed' | 'off';
  error?: string;
}
export interface LeadRecord {
  id: string;
  createdAt: string;
  message: string;
  total: string;
  name: string;
  phone: string;
  delivery: { telegram: Delivery; vk: Delivery };
}

export const admin = {
  session: () => call<{ authenticated: boolean; passwordSet: boolean }>('/api/admin/session'),
  login: (password: string) => call<{ ok: true }>('/api/admin/login', { method: 'POST', json: { password } }),
  logout: () => call<{ ok: true }>('/api/admin/logout', { method: 'POST', json: {} }),
  settings: () => call<{ config: CompanyConfig; integrations: MaskedIntegrations }>('/api/admin/settings'),
  save: (config: CompanyConfig, integrations: MaskedIntegrations) =>
    call<{ integrations: MaskedIntegrations }>('/api/admin/settings', { method: 'PUT', json: { config, integrations } }),
  leads: () => call<{ leads: LeadRecord[] }>('/api/admin/leads'),
  testLead: () => call<{ channels: { telegram: Delivery; vk: Delivery } }>('/api/admin/test-lead', { method: 'POST', json: {} }),
  upload: (data: string) => call<{ url: string }>('/api/admin/upload', { method: 'POST', json: { data } }),
  password: (current: string, next: string) => call<{ ok: true }>('/api/admin/password', { method: 'POST', json: { current, next } }),
};
