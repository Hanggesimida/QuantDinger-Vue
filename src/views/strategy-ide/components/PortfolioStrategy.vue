<template>
  <div class="portfolio-strategy" :class="{ 'theme-dark': isDark }">
    <section class="ps-panel">
      <div class="ps-header">
        <div>
          <h2 class="ps-title">{{ t.title }}</h2>
          <p class="ps-desc">{{ t.desc }}</p>
        </div>
        <a-tag color="blue">CNStock</a-tag>
      </div>

      <div class="ps-form">
        <div class="ps-field ps-field--pool">
          <label class="ps-label">{{ t.symbolPool }}</label>
          <div class="ps-pool-input">
            <a-textarea
              v-model="symbolInput"
              :rows="3"
              :placeholder="t.symbolPlaceholder"
              @change="onSymbolInputChange"
            />
            <div class="ps-pool-actions">
              <a-button size="small" @click="addFromInput">{{ t.add }}</a-button>
              <a-button size="small" @click="restoreDefaults">{{ t.restoreDefault }}</a-button>
            </div>
          </div>
          <div class="ps-tags" v-if="symbols.length">
            <a-tag
              v-for="sym in symbols"
              :key="sym"
              closable
              @close="(e) => onTagClose(e, sym)"
            >{{ sym }}</a-tag>
          </div>
          <div class="ps-hint" :class="{ 'ps-hint--error': poolError }">
            {{ poolError || t.poolHint }}
          </div>
          <div v-if="normalizeHints.length" class="ps-normalize">
            <div v-for="(h, i) in normalizeHints" :key="i" class="ps-normalize-item">{{ h }}</div>
          </div>
        </div>

        <div class="ps-field-row">
          <div class="ps-field">
            <label class="ps-label">{{ t.capital }}</label>
            <a-input-number
              v-model="capital"
              :min="10000"
              :max="100000000"
              :step="10000"
              style="width: 100%"
            />
          </div>
          <div class="ps-field">
            <label class="ps-label">{{ t.startDate }}</label>
            <a-date-picker
              v-model="startDate"
              valueFormat="YYYY-MM-DD"
              style="width: 100%"
            />
          </div>
          <div class="ps-field">
            <label class="ps-label">{{ t.endDate }}</label>
            <a-date-picker
              v-model="endDate"
              valueFormat="YYYY-MM-DD"
              style="width: 100%"
            />
          </div>
          <div class="ps-field ps-field--run">
            <label class="ps-label">&nbsp;</label>
            <a-button type="primary" :loading="running" :disabled="!!poolError" block @click="runBacktest">
              {{ running ? t.running : t.run }}
            </a-button>
          </div>
        </div>
      </div>

      <a-alert
        v-if="jobStatus"
        :type="jobAlertType"
        show-icon
        :message="jobStatusText"
        style="margin-bottom: 16px"
      />
    </section>

    <section v-if="result" class="ps-panel ps-results">
      <div class="ps-metrics">
        <div class="ps-metric" v-for="m in metricCards" :key="m.key">
          <div class="ps-metric-label">{{ m.label }}</div>
          <div class="ps-metric-value" :class="m.tone">{{ m.value }}</div>
        </div>
      </div>

      <div class="ps-chart-wrap">
        <div class="ps-chart-title">{{ t.equityChart }}</div>
        <div ref="chartEl" class="ps-chart" />
      </div>

      <div class="ps-tables">
        <div class="ps-table-block">
          <div class="ps-table-head">
            <h3>{{ t.finalPositions }}</h3>
          </div>
          <a-table
            size="small"
            :columns="positionColumns"
            :data-source="positions"
            :pagination="false"
            row-key="symbol"
            :locale="{ emptyText: t.noPositions }"
          />
        </div>

        <div class="ps-table-block">
          <div class="ps-table-head">
            <h3>{{ t.trades }}</h3>
            <div class="ps-downloads" v-if="runId">
              <a-button size="small" :loading="downloadingReport" @click="downloadReport">{{ t.downloadReport }}</a-button>
              <a-button size="small" :loading="downloadingTrades" @click="downloadTrades">{{ t.downloadTrades }}</a-button>
            </div>
          </div>
          <a-table
            size="small"
            :columns="tradeColumns"
            :data-source="trades"
            :pagination="{ pageSize: 20 }"
            row-key="__key"
            :locale="{ emptyText: noTradeText }"
          />
        </div>

        <div class="ps-meta" v-if="metaText">
          <h3>{{ t.meta }}</h3>
          <pre>{{ metaText }}</pre>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import * as echarts from 'echarts'
import moment from 'moment'
import {
  submitPortfolioBacktest,
  getQuantAgentJob,
  getQuantAgentRunResult,
  downloadQuantAgentFile,
  saveBlobAsFile
} from '@/api/quant-agent'
import { formatBrowserLocalDateTime, formatShanghaiMarketTime } from '@/utils/userTime'

const DEFAULT_SYMBOLS = ['600519.SH', '000001.SZ', '300750.SZ', '601318.SH']
const MAX_SYMBOLS = 50
const MIN_SYMBOLS = 1
const POLL_MS = 1500

function splitSymbols (raw) {
  return String(raw || '')
    .split(/[\s,;，；\n\r\t]+/)
    .map(s => s.trim())
    .filter(Boolean)
}

/** Lightweight client-side A-share normalize for immediate feedback. */
function tryNormalizeCn (raw) {
  const s = String(raw || '').trim().toUpperCase()
  if (!s) return { ok: false, error: 'empty' }
  let code = s
  let exchange = ''
  const m1 = s.match(/^(\d{6})\.(SH|SZ|SS)$/)
  if (m1) {
    code = m1[1]
    exchange = m1[2] === 'SS' ? 'SH' : m1[2]
  } else {
    const m2 = s.match(/^(SH|SZ|SS)[\.\-_]?(\d{6})$/)
    if (m2) {
      exchange = m2[1] === 'SS' ? 'SH' : m2[1]
      code = m2[2]
    } else if (/^\d{6}$/.test(s)) {
      code = s
      if (code.startsWith('6') || code.startsWith('9')) exchange = 'SH'
      else if (code.startsWith('0') || code.startsWith('3')) exchange = 'SZ'
    } else {
      const m3 = s.match(/^(SH|SZ)\.(\d{6})$/)
      if (m3) {
        exchange = m3[1]
        code = m3[2]
      }
    }
  }
  if (!/^\d{6}$/.test(code)) {
    return { ok: false, error: `无法识别代码: ${raw}` }
  }
  if (code.startsWith('4') || code.startsWith('8') || code.startsWith('92')) {
    return { ok: false, error: `暂不支持北交所代码: ${code}` }
  }
  if (!exchange) {
    if (code.startsWith('6') || code.startsWith('9')) exchange = 'SH'
    else if (code.startsWith('0') || code.startsWith('3')) exchange = 'SZ'
    else return { ok: false, error: `无法判断交易所: ${code}` }
  }
  return { ok: true, symbol: `${code}.${exchange}` }
}

export default {
  name: 'PortfolioStrategy',
  props: {
    isDark: { type: Boolean, default: false }
  },
  data () {
    const end = moment().format('YYYY-MM-DD')
    const start = moment().subtract(1, 'year').format('YYYY-MM-DD')
    return {
      symbolInput: DEFAULT_SYMBOLS.join(', '),
      symbols: [...DEFAULT_SYMBOLS],
      normalizeHints: [],
      capital: 1000000,
      startDate: start,
      endDate: end,
      running: false,
      jobId: null,
      jobStatus: '',
      jobError: '',
      runId: null,
      result: null,
      pollTimer: null,
      chart: null,
      downloadingReport: false,
      downloadingTrades: false
    }
  },
  computed: {
    isZh () {
      return String((this.$i18n && this.$i18n.locale) || '').toLowerCase().startsWith('zh')
    },
    t () {
      return {
        title: this.$t('portfolioStrategy.title'),
        desc: this.$t('portfolioStrategy.desc'),
        symbolPool: this.$t('portfolioStrategy.symbolPool'),
        symbolPlaceholder: this.$t('portfolioStrategy.symbolPlaceholder'),
        add: this.$t('portfolioStrategy.add'),
        restoreDefault: this.$t('portfolioStrategy.restoreDefault'),
        poolHint: this.$t('portfolioStrategy.poolHint'),
        capital: this.$t('portfolioStrategy.capital'),
        startDate: this.$t('portfolioStrategy.startDate'),
        endDate: this.$t('portfolioStrategy.endDate'),
        run: this.$t('portfolioStrategy.run'),
        running: this.$t('portfolioStrategy.running'),
        equityChart: this.$t('portfolioStrategy.equityChart'),
        finalPositions: this.$t('portfolioStrategy.finalPositions'),
        trades: this.$t('portfolioStrategy.trades'),
        meta: this.$t('portfolioStrategy.meta'),
        noPositions: this.$t('portfolioStrategy.noPositions'),
        downloadReport: this.$t('portfolioStrategy.downloadReport'),
        downloadTrades: this.$t('portfolioStrategy.downloadTrades'),
        finalEquity: this.$t('portfolioStrategy.finalEquity'),
        totalReturn: this.$t('portfolioStrategy.totalReturn'),
        benchmarkReturn: this.$t('portfolioStrategy.benchmarkReturn'),
        maxDrawdown: this.$t('portfolioStrategy.maxDrawdown'),
        sharpe: this.$t('portfolioStrategy.sharpe'),
        winRate: this.$t('portfolioStrategy.winRate'),
        totalTrades: this.$t('portfolioStrategy.totalTrades')
      }
    },
    poolError () {
      if (this.symbols.length < MIN_SYMBOLS) {
        return this.$t('portfolioStrategy.errMin', { n: MIN_SYMBOLS })
      }
      if (this.symbols.length > MAX_SYMBOLS) {
        return this.$t('portfolioStrategy.errMax', { n: MAX_SYMBOLS })
      }
      return ''
    },
    jobAlertType () {
      if (this.jobStatus === 'succeeded') return 'success'
      if (this.jobStatus === 'failed') return 'error'
      return 'info'
    },
    jobStatusText () {
      if (this.jobStatus === 'failed') {
        return this.jobError || this.$t('portfolioStrategy.jobFailed')
      }
      if (this.jobStatus === 'succeeded') {
        return this.$t('portfolioStrategy.jobSucceeded', { id: this.runId || '-' })
      }
      if (this.jobStatus === 'running' || this.jobStatus === 'queued') {
        return this.$t('portfolioStrategy.jobPolling', { status: this.jobStatus, id: this.jobId || '-' })
      }
      return this.jobStatus || ''
    },
    metricCards () {
      if (!this.result) return []
      const r = this.result
      const tone = (v) => (Number(v) >= 0 ? 'tone-up' : 'tone-down')
      return [
        { key: 'eq', label: this.t.finalEquity, value: this.fmtNum(r.finalEquity), tone: '' },
        { key: 'ret', label: this.t.totalReturn, value: this.fmtPct(r.totalReturn), tone: tone(r.totalReturn) },
        { key: 'bm', label: this.t.benchmarkReturn, value: this.fmtPct(r.benchmarkReturn), tone: tone(r.benchmarkReturn) },
        { key: 'dd', label: this.t.maxDrawdown, value: this.fmtPct(r.maxDrawdown), tone: 'tone-down' },
        { key: 'sh', label: this.t.sharpe, value: this.fmtNum(r.sharpeRatio, 4), tone: '' },
        { key: 'wr', label: this.t.winRate, value: this.fmtPct(r.winRate), tone: '' },
        { key: 'tr', label: this.t.totalTrades, value: String(r.totalTrades || 0), tone: '' }
      ]
    },
    positions () {
      return (this.result && this.result.finalPositions) || []
    },
    trades () {
      const list = (this.result && this.result.trades) || []
      return list.map((row, i) => ({ ...row, __key: `${row.time}-${row.symbol}-${row.type}-${i}` }))
    },
    noTradeText () {
      const reason = this.result && this.result.noTradeReason
      return reason || this.$t('common.noData')
    },
    positionColumns () {
      return [
        { title: this.$t('portfolioStrategy.col.symbol'), dataIndex: 'symbol', key: 'symbol' },
        { title: this.$t('portfolioStrategy.col.shares'), dataIndex: 'shares', key: 'shares' },
        { title: this.$t('portfolioStrategy.col.avgCost'), dataIndex: 'avgCost', key: 'avgCost' },
        { title: this.$t('portfolioStrategy.col.lastPrice'), dataIndex: 'lastPrice', key: 'lastPrice' },
        { title: this.$t('portfolioStrategy.col.marketValue'), dataIndex: 'marketValue', key: 'marketValue' },
        { title: this.$t('portfolioStrategy.col.unrealized'), dataIndex: 'unrealizedPnl', key: 'unrealizedPnl' },
        {
          title: this.$t('portfolioStrategy.col.weight'),
          dataIndex: 'weight',
          key: 'weight',
          customRender: (v) => this.fmtPct(Number(v || 0) * 100)
        }
      ]
    },
    tradeColumns () {
      return [
        {
          title: this.$t('portfolioStrategy.col.time'),
          dataIndex: 'time',
          key: 'time',
          customRender: (v) => formatShanghaiMarketTime(v)
        },
        { title: this.$t('portfolioStrategy.col.symbol'), dataIndex: 'symbol', key: 'symbol' },
        { title: this.$t('portfolioStrategy.col.type'), dataIndex: 'type', key: 'type' },
        { title: this.$t('portfolioStrategy.col.reason'), dataIndex: 'reason', key: 'reason' },
        { title: this.$t('portfolioStrategy.col.price'), dataIndex: 'price', key: 'price' },
        { title: this.$t('portfolioStrategy.col.amount'), dataIndex: 'amount', key: 'amount' },
        { title: this.$t('portfolioStrategy.col.profit'), dataIndex: 'profit', key: 'profit' },
        { title: this.$t('portfolioStrategy.col.cash'), dataIndex: 'cash', key: 'cash' }
      ]
    },
    metaText () {
      if (!this.result) return ''
      const meta = this.result.meta || {}
      const created = this.resultCreatedAt
      const lines = [
        `timezone: ${this.result.timezone || 'Asia/Shanghai'}`,
        `timeSemantics: ${this.result.timeSemantics || 'Asia/Shanghai local date'}`,
        created ? `createdAt(display): ${created}` : '',
        `symbols: ${(meta.symbols || []).join(', ')}`,
        `active: ${(meta.activeSymbols || []).join(', ')}`,
        `range: ${((meta.dataRange || {}).start) || '-'} ~ ${((meta.dataRange || {}).end) || '-'}`,
        `bars: ${((meta.dataRange || {}).bars) || '-'}`,
        `rejectStats: ${JSON.stringify(meta.rejectStats || {})}`,
        meta.warnings && meta.warnings.length ? `warnings: ${meta.warnings.join(' | ')}` : ''
      ].filter(Boolean)
      return lines.join('\n')
    },
    resultCreatedAt () {
      // Job finished timestamps are UTC ISO; display in browser local to avoid double +8.
      return ''
    }
  },
  watch: {
    isDark () {
      this.$nextTick(() => this.renderChart())
    },
    result () {
      this.$nextTick(() => this.renderChart())
    }
  },
  mounted () {
    window.addEventListener('resize', this.onResize)
  },
  beforeDestroy () {
    this.stopPolling()
    window.removeEventListener('resize', this.onResize)
    if (this.chart) {
      this.chart.dispose()
      this.chart = null
    }
  },
  methods: {
    fmtNum (v, digits = 2) {
      const n = Number(v)
      if (!Number.isFinite(n)) return '--'
      return n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 })
    },
    fmtPct (v) {
      const n = Number(v)
      if (!Number.isFinite(n)) return '--'
      return `${n.toFixed(2)}%`
    },
    onSymbolInputChange () {
      // live normalize preview of tokens currently typed
      const tokens = splitSymbols(this.symbolInput)
      const hints = []
      tokens.forEach(tok => {
        const r = tryNormalizeCn(tok)
        if (!r.ok) hints.push(r.error)
        else if (r.symbol !== tok.toUpperCase() && r.symbol !== tok) {
          hints.push(`${tok} → ${r.symbol}`)
        }
      })
      this.normalizeHints = hints.slice(0, 8)
    },
    addFromInput () {
      const tokens = splitSymbols(this.symbolInput)
      const next = [...this.symbols]
      const seen = new Set(next)
      const hints = []
      tokens.forEach(tok => {
        const r = tryNormalizeCn(tok)
        if (!r.ok) {
          hints.push(r.error)
          return
        }
        if (seen.has(r.symbol)) return
        if (next.length >= MAX_SYMBOLS) {
          hints.push(this.$t('portfolioStrategy.errMax', { n: MAX_SYMBOLS }))
          return
        }
        seen.add(r.symbol)
        next.push(r.symbol)
        if (r.symbol !== tok) hints.push(`${tok} → ${r.symbol}`)
      })
      this.symbols = next
      this.symbolInput = next.join(', ')
      this.normalizeHints = hints
    },
    removeSymbol (sym) {
      this.symbols = this.symbols.filter(s => s !== sym)
      this.symbolInput = this.symbols.join(', ')
    },
    onTagClose (e, sym) {
      if (e && typeof e.preventDefault === 'function') e.preventDefault()
      this.removeSymbol(sym)
    },
    restoreDefaults () {
      this.symbols = [...DEFAULT_SYMBOLS]
      this.symbolInput = DEFAULT_SYMBOLS.join(', ')
      this.normalizeHints = []
    },
    stopPolling () {
      if (this.pollTimer) {
        clearInterval(this.pollTimer)
        this.pollTimer = null
      }
    },
    async runBacktest () {
      this.addFromInput()
      if (this.poolError) {
        this.$message.warning(this.poolError)
        return
      }
      if (!this.startDate || !this.endDate) {
        this.$message.warning(this.$t('portfolioStrategy.errDates'))
        return
      }
      this.stopPolling()
      this.running = true
      this.jobStatus = 'queued'
      this.jobError = ''
      this.result = null
      this.runId = null
      try {
        const resp = await submitPortfolioBacktest({
          capital: this.capital,
          startDate: this.startDate,
          endDate: this.endDate,
          mode: 'score',
          symbols: this.symbols
        })
        if (resp && Number(resp.code) === 0) {
          throw new Error(resp.msg || 'submit failed')
        }
        const payload = (resp && resp.data) || resp || {}
        this.jobId = payload.jobId || payload.job_id
        if (!this.jobId) throw new Error((resp && resp.msg) || 'No jobId')
        this.pollTimer = setInterval(() => this.pollJob(), POLL_MS)
        await this.pollJob()
      } catch (e) {
        this.running = false
        this.jobStatus = 'failed'
        this.jobError = (e && e.message) || String(e)
        this.$message.error(this.jobError)
      }
    },
    async pollJob () {
      if (!this.jobId) return
      try {
        const resp = await getQuantAgentJob(this.jobId)
        if (resp && Number(resp.code) === 0) {
          throw new Error(resp.msg || 'job not found')
        }
        const job = (resp && resp.data) || resp || {}
        const status = String(job.status || '').toLowerCase()
        this.jobStatus = status
        if (status === 'succeeded' || status === 'success') {
          this.stopPolling()
          this.running = false
          const result = job.result || {}
          this.runId = result.runId || result.run_id
          if (this.runId) {
            await this.loadResult(this.runId)
          }
        } else if (status === 'failed' || status === 'error') {
          this.stopPolling()
          this.running = false
          this.jobError = job.error || this.$t('portfolioStrategy.jobFailed')
        }
      } catch (e) {
        // keep polling unless hard failure
        console.warn('poll job failed', e)
      }
    },
    async loadResult (runId) {
      const resp = await getQuantAgentRunResult(runId)
      if (resp && Number(resp.code) === 0) {
        throw new Error(resp.msg || 'load result failed')
      }
      const payload = (resp && resp.data) || resp || {}
      this.result = payload.result || payload
      this.$nextTick(() => this.renderChart())
    },
    renderChart () {
      if (!this.$refs.chartEl || !this.result) return
      const equity = this.result.equityCurve || []
      const bench = this.result.benchmarkCurve || []
      if (!this.chart) {
        this.chart = echarts.init(this.$refs.chartEl)
      }
      const dark = this.isDark
      const times = equity.map(p => p.time)
      this.chart.setOption({
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis' },
        legend: {
          data: [this.t.equityChart, this.t.benchmarkReturn],
          textStyle: { color: dark ? '#cbd5e1' : '#334155' }
        },
        grid: { left: 48, right: 24, top: 40, bottom: 40 },
        xAxis: {
          type: 'category',
          data: times,
          axisLabel: { color: dark ? '#94a3b8' : '#64748b' }
        },
        yAxis: {
          type: 'value',
          scale: true,
          axisLabel: { color: dark ? '#94a3b8' : '#64748b' },
          splitLine: { lineStyle: { color: dark ? '#1e293b' : '#e2e8f0' } }
        },
        series: [
          {
            name: this.t.equityChart,
            type: 'line',
            showSymbol: false,
            data: equity.map(p => p.value),
            lineStyle: { width: 2, color: '#2563eb' },
            itemStyle: { color: '#2563eb' }
          },
          {
            name: this.t.benchmarkReturn,
            type: 'line',
            showSymbol: false,
            data: bench.map(p => p.value),
            lineStyle: { width: 1.5, color: '#94a3b8', type: 'dashed' },
            itemStyle: { color: '#94a3b8' }
          }
        ]
      }, true)
    },
    onResize () {
      if (this.chart) this.chart.resize()
    },
    async downloadReport () {
      if (!this.runId) return
      this.downloadingReport = true
      try {
        const blob = await downloadQuantAgentFile(this.runId, 'report.md')
        saveBlobAsFile(blob, `quant-agent-report-${this.runId}.md`)
      } catch (e) {
        this.$message.error(e.message || 'download failed')
      } finally {
        this.downloadingReport = false
      }
    },
    async downloadTrades () {
      if (!this.runId) return
      this.downloadingTrades = true
      try {
        const blob = await downloadQuantAgentFile(this.runId, 'trades.csv')
        saveBlobAsFile(blob, `quant-agent-trades-${this.runId}.csv`)
      } catch (e) {
        this.$message.error(e.message || 'download failed')
      } finally {
        this.downloadingTrades = false
      }
    },
    // Expose for meta created display without UTC→local double shift on Shanghai dates
    formatCreated (iso) {
      if (!iso) return '-'
      return formatBrowserLocalDateTime(iso)
    }
  }
}
</script>

<style scoped>
.portfolio-strategy {
  padding: 8px 4px 24px;
  color: #0f172a;
}
.portfolio-strategy.theme-dark {
  color: #e2e8f0;
}
.ps-panel {
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
}
.theme-dark .ps-panel {
  background: rgba(15, 23, 42, 0.55);
  border-color: rgba(71, 85, 105, 0.55);
}
.ps-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}
.ps-title {
  margin: 0 0 6px;
  font-size: 20px;
  font-weight: 650;
}
.ps-desc {
  margin: 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
}
.theme-dark .ps-desc { color: #94a3b8; }
.ps-label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}
.theme-dark .ps-label { color: #cbd5e1; }
.ps-field { margin-bottom: 14px; }
.ps-field-row {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr 0.9fr;
  gap: 12px;
  align-items: end;
}
.ps-pool-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.ps-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.ps-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #64748b;
}
.ps-hint--error { color: #dc2626; }
.ps-normalize {
  margin-top: 6px;
  font-size: 12px;
  color: #2563eb;
}
.ps-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}
.ps-metric {
  padding: 12px;
  border-radius: 10px;
  background: rgba(241, 245, 249, 0.8);
}
.theme-dark .ps-metric {
  background: rgba(30, 41, 59, 0.8);
}
.ps-metric-label {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 4px;
}
.ps-metric-value {
  font-size: 18px;
  font-weight: 650;
}
.ps-metric-value.tone-up { color: #16a34a; }
.ps-metric-value.tone-down { color: #dc2626; }
.ps-chart-wrap { margin-bottom: 18px; }
.ps-chart-title {
  font-weight: 600;
  margin-bottom: 8px;
}
.ps-chart {
  width: 100%;
  height: 320px;
}
.ps-table-block { margin-bottom: 18px; }
.ps-table-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.ps-table-head h3,
.ps-meta h3 {
  margin: 0;
  font-size: 15px;
}
.ps-downloads { display: flex; gap: 8px; }
.ps-meta pre {
  margin: 8px 0 0;
  padding: 12px;
  border-radius: 8px;
  background: rgba(241, 245, 249, 0.85);
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-word;
}
.theme-dark .ps-meta pre {
  background: rgba(30, 41, 59, 0.85);
}
@media (max-width: 900px) {
  .ps-field-row {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 600px) {
  .ps-field-row {
    grid-template-columns: 1fr;
  }
  .ps-chart { height: 240px; }
}
</style>
