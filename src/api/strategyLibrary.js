import request from '@/utils/request'

const BASE = '/api/strategy-library'

export function listStrategyLibrary (params) {
  return request({
    url: `${BASE}/items`,
    method: 'get',
    params
  })
}

export function getStrategyLibraryDetail (id) {
  return request({
    url: `${BASE}/${id}`,
    method: 'get'
  })
}

export function publishStrategyLibrary (data) {
  return request({
    url: `${BASE}/publish`,
    method: 'post',
    data,
    timeout: 180000
  })
}

export function cloneStrategyLibrary (id) {
  return request({
    url: `${BASE}/${id}/clone`,
    method: 'post'
  })
}

export function withdrawStrategyLibrary (id) {
  return request({
    url: `${BASE}/${id}/withdraw`,
    method: 'post'
  })
}
