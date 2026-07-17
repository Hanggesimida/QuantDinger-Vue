import request from '@/utils/request'
import storage from 'store'
import { ACCESS_TOKEN } from '@/store/mutation-types'

/**
 * Quant Agent — shared-capital CN A-share portfolio backtest API.
 */

export function getQuantAgentHome () {
  return request({
    url: '/api/quant-agent/',
    method: 'get'
  })
}

export function getQuantAgentStatus () {
  return request({
    url: '/api/quant-agent/status',
    method: 'get'
  })
}

export function submitPortfolioBacktest (data) {
  return request({
    url: '/api/quant-agent/backtest',
    method: 'post',
    data,
    timeout: 60000
  })
}

export function getQuantAgentJob (jobId) {
  return request({
    url: `/api/quant-agent/jobs/${encodeURIComponent(jobId)}`,
    method: 'get'
  })
}

export function listQuantAgentRuns (params) {
  return request({
    url: '/api/quant-agent/runs',
    method: 'get',
    params
  })
}

export function getQuantAgentRunResult (runId) {
  return request({
    url: `/api/quant-agent/runs/${runId}/result`,
    method: 'get'
  })
}

export function getQuantAgentRunReport (runId) {
  return request({
    url: `/api/quant-agent/runs/${runId}/report`,
    method: 'get'
  })
}

/**
 * Download a whitelisted run artifact with JWT.
 * Returns a Blob for client-side save.
 */
export async function downloadQuantAgentFile (runId, filename) {
  const token = storage.get(ACCESS_TOKEN)
  const headers = {}
  if (token) {
    headers.Authorization = `Bearer ${typeof token === 'string' ? token : (token.token || token.value || '')}`
  }
  const resp = await fetch(`/api/quant-agent/runs/${runId}/files/${encodeURIComponent(filename)}`, {
    method: 'GET',
    headers,
    credentials: 'include'
  })
  if (!resp.ok) {
    let msg = `Download failed (${resp.status})`
    try {
      const data = await resp.json()
      if (data && data.msg) msg = data.msg
    } catch (e) { /* ignore */ }
    throw new Error(msg)
  }
  return resp.blob()
}

export function saveBlobAsFile (blob, filename) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}
