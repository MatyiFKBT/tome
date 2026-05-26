import { api } from './api'

export type TokenScope = 'full' | 'readonly'

export interface ApiTokenListItem {
  id: number
  name: string
  prefix: string
  scope: TokenScope
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
  user_id: number
  username: string
}

export interface ApiTokenCreateResponse {
  id: number
  name: string
  prefix: string
  scope: TokenScope
  token: string
  created_at: string
}

export function listTokens(allUsers = false): Promise<ApiTokenListItem[]> {
  return api.get<ApiTokenListItem[]>(`/tokens/${allUsers ? '?all=true' : ''}`)
}

export function createToken(name: string, scope: TokenScope = 'full'): Promise<ApiTokenCreateResponse> {
  return api.post<ApiTokenCreateResponse>('/tokens/', { name, scope })
}

export function revokeToken(id: number): Promise<void> {
  return api.delete<void>(`/tokens/${id}`)
}
