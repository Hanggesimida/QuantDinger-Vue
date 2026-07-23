<template>
  <div class="strategy-library" :class="{ 'theme-dark': isDarkTheme }">
    <header class="sl-header">
      <div class="sl-header-main">
        <h1 class="sl-title">{{ $t('strategyLibrary.title') }}</h1>
        <p class="sl-sub">{{ $t('strategyLibrary.subtitle') }}</p>
      </div>
      <div class="sl-toolbar">
        <a-radio-group v-model="assetFilter" button-style="solid" size="small" @change="reload">
          <a-radio-button value="">{{ $t('strategyLibrary.filterAll') }}</a-radio-button>
          <a-radio-button value="indicator">{{ $t('strategyLibrary.filterIndicator') }}</a-radio-button>
          <a-radio-button value="script">{{ $t('strategyLibrary.filterScript') }}</a-radio-button>
        </a-radio-group>
        <a-input-search
          v-model="keyword"
          allow-clear
          class="sl-search"
          :placeholder="$t('strategyLibrary.searchPlaceholder')"
          @search="reload"
        />
      </div>
    </header>

    <a-spin :spinning="loading">
      <div v-if="!items.length && !loading" class="sl-empty">
        <a-empty :description="$t('strategyLibrary.empty')" />
      </div>
      <div v-else class="sl-grid">
        <article
          v-for="item in items"
          :key="item.id"
          class="sl-card"
          @click="openDetail(item)"
        >
          <div class="sl-card-top">
            <a-tag :color="item.asset_type === 'script' ? 'blue' : 'cyan'">
              {{ item.asset_type === 'script' ? $t('strategyLibrary.typeScript') : $t('strategyLibrary.typeIndicator') }}
            </a-tag>
            <span class="sl-clone">{{ $t('strategyLibrary.cloneCount', { n: item.clone_count || 0 }) }}</span>
          </div>
          <h2 class="sl-card-title">{{ item.title }}</h2>
          <p class="sl-card-summary">
            {{ (item.ai_summary && item.ai_summary.summary) || item.description || $t('strategyLibrary.noSummary') }}
          </p>
          <div class="sl-card-meta">
            <span>{{ item.publisher_name || ('#' + item.publisher_user_id) }}</span>
            <span>{{ formatTime(item.created_at) }}</span>
          </div>
        </article>
      </div>

      <div v-if="total > pageSize" class="sl-pagination">
        <a-pagination
          :current="page"
          :page-size="pageSize"
          :total="total"
          @change="onPageChange"
        />
      </div>
    </a-spin>

    <a-drawer
      :visible="drawerVisible"
      :width="drawerWidth"
      :title="detail && detail.title"
      destroy-on-close
      @close="closeDetail"
    >
      <a-spin :spinning="detailLoading">
        <template v-if="detail">
          <div class="sl-detail-tags">
            <a-tag :color="detail.asset_type === 'script' ? 'blue' : 'cyan'">
              {{ detail.asset_type === 'script' ? $t('strategyLibrary.typeScript') : $t('strategyLibrary.typeIndicator') }}
            </a-tag>
            <span>{{ $t('strategyLibrary.publisher') }}: {{ detail.publisher_name || ('#' + detail.publisher_user_id) }}</span>
            <span>{{ $t('strategyLibrary.cloneCount', { n: detail.clone_count || 0 }) }}</span>
          </div>

          <section class="sl-section">
            <h3>{{ $t('strategyLibrary.aiSummary') }}</h3>
            <p class="sl-ai-summary">{{ (detail.ai_summary && detail.ai_summary.summary) || $t('strategyLibrary.noSummary') }}</p>
            <div v-if="detail.ai_summary" class="sl-ai-grid">
              <div v-if="detail.ai_summary.logic"><strong>{{ $t('strategyLibrary.aiLogic') }}</strong><p>{{ detail.ai_summary.logic }}</p></div>
              <div v-if="detail.ai_summary.signals"><strong>{{ $t('strategyLibrary.aiSignals') }}</strong><p>{{ detail.ai_summary.signals }}</p></div>
              <div v-if="detail.ai_summary.risks"><strong>{{ $t('strategyLibrary.aiRisks') }}</strong><p>{{ detail.ai_summary.risks }}</p></div>
              <div v-if="detail.ai_summary.suitability"><strong>{{ $t('strategyLibrary.aiSuitability') }}</strong><p>{{ detail.ai_summary.suitability }}</p></div>
            </div>
          </section>

          <section v-if="detail.description" class="sl-section">
            <h3>{{ $t('strategyLibrary.description') }}</h3>
            <p>{{ detail.description }}</p>
          </section>

          <section class="sl-section">
            <h3>{{ $t('strategyLibrary.code') }}</h3>
            <pre class="sl-code">{{ detail.code }}</pre>
          </section>

          <div class="sl-actions">
            <a-button type="primary" :loading="cloning" @click="handleClone">
              {{ $t('strategyLibrary.clone') }}
            </a-button>
            <a-button
              v-if="canWithdraw"
              :loading="withdrawing"
              @click="handleWithdraw"
            >
              {{ $t('strategyLibrary.withdraw') }}
            </a-button>
          </div>
        </template>
      </a-spin>
    </a-drawer>
  </div>
</template>

<script>
import { mapGetters, mapState } from 'vuex'
import {
  listStrategyLibrary,
  getStrategyLibraryDetail,
  cloneStrategyLibrary,
  withdrawStrategyLibrary
} from '@/api/strategyLibrary'

export default {
  name: 'StrategyLibrary',
  data () {
    return {
      loading: false,
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      keyword: '',
      assetFilter: '',
      drawerVisible: false,
      detailLoading: false,
      detail: null,
      cloning: false,
      withdrawing: false
    }
  },
  computed: {
    ...mapState({
      navTheme: state => state.app.theme
    }),
    ...mapGetters(['userInfo']),
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    drawerWidth () {
      if (typeof window !== 'undefined' && window.innerWidth < 768) return '100%'
      return 640
    },
    canWithdraw () {
      const uid = Number((this.userInfo && (this.userInfo.id || this.userInfo.user_id)) || 0)
      return this.detail && uid && Number(this.detail.publisher_user_id) === uid
    }
  },
  mounted () {
    this.reload()
  },
  methods: {
    formatTime (value) {
      if (!value) return ''
      try {
        const d = new Date(value)
        if (Number.isNaN(d.getTime())) return String(value)
        return d.toLocaleString()
      } catch (_) {
        return String(value)
      }
    },
    reload () {
      this.page = 1
      this.fetchList()
    },
    onPageChange (page) {
      this.page = page
      this.fetchList()
    },
    async fetchList () {
      this.loading = true
      try {
        const res = await listStrategyLibrary({
          q: this.keyword || undefined,
          asset_type: this.assetFilter || undefined,
          page: this.page,
          page_size: this.pageSize
        })
        const data = (res && res.data) || {}
        this.items = data.items || []
        this.total = Number(data.total || 0)
      } catch (e) {
        this.$message.error((e && e.message) || this.$t('strategyLibrary.loadFailed'))
      } finally {
        this.loading = false
      }
    },
    async openDetail (item) {
      this.drawerVisible = true
      this.detail = null
      this.detailLoading = true
      try {
        const res = await getStrategyLibraryDetail(item.id)
        this.detail = (res && res.data) || null
      } catch (e) {
        this.$message.error((e && e.message) || this.$t('strategyLibrary.loadFailed'))
        this.drawerVisible = false
      } finally {
        this.detailLoading = false
      }
    },
    closeDetail () {
      this.drawerVisible = false
      this.detail = null
    },
    async handleClone () {
      if (!this.detail || !this.detail.id) return
      this.cloning = true
      try {
        const res = await cloneStrategyLibrary(this.detail.id)
        const data = (res && res.data) || {}
        this.$message.success(this.$t('strategyLibrary.cloneSuccess'))
        this.closeDetail()
        this.fetchList()
        const redirect = data.redirect
        if (redirect) {
          const qIdx = String(redirect).indexOf('?')
          if (qIdx > -1) {
            const path = redirect.slice(0, qIdx)
            const qs = new URLSearchParams(redirect.slice(qIdx + 1))
            const query = {}
            qs.forEach((v, k) => { query[k] = v })
            this.$router.push({ path, query }).catch(() => {})
          } else {
            this.$router.push(redirect).catch(() => {})
          }
        }
      } catch (e) {
        this.$message.error((e && e.message) || this.$t('strategyLibrary.cloneFailed'))
      } finally {
        this.cloning = false
      }
    },
    async handleWithdraw () {
      if (!this.detail || !this.detail.id) return
      const self = this
      this.$confirm({
        title: this.$t('strategyLibrary.withdrawConfirmTitle'),
        content: this.$t('strategyLibrary.withdrawConfirmContent'),
        okType: 'danger',
        onOk () {
          return self.doWithdraw()
        }
      })
    },
    async doWithdraw () {
      this.withdrawing = true
      try {
        await withdrawStrategyLibrary(this.detail.id)
        this.$message.success(this.$t('strategyLibrary.withdrawSuccess'))
        this.closeDetail()
        this.fetchList()
      } catch (e) {
        this.$message.error((e && e.message) || this.$t('strategyLibrary.withdrawFailed'))
      } finally {
        this.withdrawing = false
      }
    }
  }
}
</script>

<style scoped>
.strategy-library {
  padding: 20px 24px 40px;
  min-height: calc(100vh - 64px);
  background:
    radial-gradient(ellipse 80% 50% at 10% -10%, rgba(14, 116, 144, 0.08), transparent 55%),
    linear-gradient(180deg, #f7fafc 0%, #eef2f6 100%);
}
.strategy-library.theme-dark {
  background:
    radial-gradient(ellipse 70% 40% at 0% 0%, rgba(34, 211, 238, 0.08), transparent 50%),
    linear-gradient(180deg, #0f1419 0%, #151b22 100%);
  color: #e8eef4;
}
.sl-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}
.sl-title {
  margin: 0 0 6px;
  font-size: 26px;
  font-weight: 650;
  letter-spacing: -0.02em;
}
.sl-sub {
  margin: 0;
  color: rgba(0, 0, 0, 0.55);
  max-width: 560px;
}
.theme-dark .sl-sub {
  color: rgba(232, 238, 244, 0.65);
}
.sl-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
.sl-search {
  width: 240px;
}
.sl-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}
.sl-card {
  padding: 16px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.92);
  cursor: pointer;
  transition: border-color 0.15s ease, transform 0.15s ease;
}
.theme-dark .sl-card {
  background: rgba(22, 28, 36, 0.92);
  border-color: rgba(255, 255, 255, 0.08);
}
.sl-card:hover {
  border-color: rgba(14, 116, 144, 0.45);
  transform: translateY(-1px);
}
.sl-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.sl-clone {
  font-size: 12px;
  opacity: 0.65;
}
.sl-card-title {
  margin: 0 0 8px;
  font-size: 17px;
  font-weight: 600;
}
.sl-card-summary {
  margin: 0 0 12px;
  min-height: 44px;
  font-size: 13px;
  line-height: 1.5;
  opacity: 0.78;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.sl-card-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  opacity: 0.55;
}
.sl-empty {
  padding: 64px 0;
}
.sl-pagination {
  margin-top: 20px;
  text-align: right;
}
.sl-detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 16px;
  font-size: 13px;
  opacity: 0.8;
}
.sl-section {
  margin-bottom: 18px;
}
.sl-section h3 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
}
.sl-ai-summary {
  margin: 0 0 10px;
  line-height: 1.6;
}
.sl-ai-grid {
  display: grid;
  gap: 10px;
}
.sl-ai-grid p {
  margin: 4px 0 0;
  opacity: 0.8;
  line-height: 1.5;
}
.sl-code {
  margin: 0;
  padding: 12px;
  max-height: 360px;
  overflow: auto;
  border-radius: 8px;
  background: #0b1220;
  color: #d7e2f0;
  font-size: 12px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}
.sl-actions {
  display: flex;
  gap: 10px;
  padding-top: 8px;
}
@media (max-width: 640px) {
  .strategy-library {
    padding: 16px;
  }
  .sl-search {
    width: 100%;
  }
}
</style>
