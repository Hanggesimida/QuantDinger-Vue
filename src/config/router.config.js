// eslint-disable-next-line
import { UserLayout, BasicLayout, BlankLayout } from '@/layouts'

export const asyncRouterMap = [
  {
    path: '/',
    name: 'index',
    component: BasicLayout,
    meta: { title: 'menu.home' },
    redirect: '/strategy-center',
    children: [
      // Unified strategy workspace entry (default home for internal deployments).
      {
        path: '/strategy-center',
        name: 'StrategyCenter',
        component: () => import('@/views/strategy-center'),
        meta: { title: 'menu.dashboard.strategyCenter', keepAlive: true, icon: 'cluster', permission: ['dashboard'] }
      },
      {
        path: '/strategy-library',
        name: 'StrategyLibrary',
        component: () => import('@/views/strategy-library'),
        meta: { title: 'menu.dashboard.strategyLibrary', keepAlive: true, icon: 'cloud-server', permission: ['dashboard'] }
      },
      // AI asset analysis — kept but not the default landing page.
      {
        path: '/ai-asset-analysis',
        name: 'AIAssetAnalysis',
        component: () => import('@/views/ai-asset-analysis'),
        meta: { title: 'menu.dashboard.aiAssetAnalysis', keepAlive: true, icon: 'appstore', permission: ['dashboard'] }
      },
      // Strategy IDE.
      {
        path: '/strategy-ide',
        name: 'StrategyIDE',
        component: () => import('@/views/strategy-ide'),
        meta: { title: 'menu.dashboard.strategyIde', keepAlive: true, icon: 'code', permission: ['dashboard'] }
      },
      {
        path: '/indicator-ide',
        name: 'IndicatorIDE',
        component: () => import('@/views/indicator-ide'),
        hidden: true,
        meta: { title: 'menu.dashboard.indicatorIde', keepAlive: true, icon: 'code', permission: ['dashboard'] }
      },
      // Indicator live strategy management.
      {
        path: '/strategy-live',
        name: 'StrategyLive',
        component: () => import('@/views/trading-assistant'),
        meta: {
          title: 'menu.dashboard.tradingAssistant',
          keepAlive: true,
          icon: 'deployment-unit',
          permission: ['dashboard'],
          indicatorSignalOnly: true
        },
        beforeEnter: (to, from, next) => {
          if (to.query.tab === 'overview') {
            next({ path: '/strategy-center', query: { tab: 'overview' }, replace: true })
          } else {
            next()
          }
        }
      },
      // Python ScriptStrategy management.
      {
        path: '/strategy-script',
        name: 'StrategyScript',
        component: () => import('@/views/trading-assistant'),
        meta: {
          title: 'menu.dashboard.scriptStrategies',
          keepAlive: true,
          icon: 'code-sandbox',
          permission: ['dashboard'],
          scriptStrategiesOnly: true
        }
      },
      {
        path: '/strategy-scripts',
        redirect: '/strategy-live',
        hidden: true
      },
      // Template bot strategies.
      {
        path: '/trading-bot',
        name: 'TradingBot',
        component: () => import('@/views/trading-bot'),
        meta: { title: 'menu.dashboard.tradingBot', keepAlive: true, icon: 'robot', permission: ['dashboard'] }
      },
      // Broker accounts.
      {
        path: '/broker-accounts',
        name: 'BrokerAccounts',
        component: () => import('@/views/broker-accounts'),
        meta: { title: 'menu.dashboard.brokerAccounts', keepAlive: true, icon: 'bank', permission: ['dashboard'] }
      },
      // Legacy chart route.
      {
        path: '/indicator-analysis',
        name: 'Indicator',
        redirect: '/indicator-ide',
        hidden: true,
        meta: { title: 'menu.dashboard.indicator', keepAlive: false, icon: 'line-chart', permission: ['dashboard'] }
      },
      // Legacy trading assistant route.
      {
        path: '/trading-assistant',
        name: 'TradingAssistant',
        redirect: '/strategy-live',
        hidden: true,
        meta: { title: 'menu.dashboard.tradingAssistant', keepAlive: false, icon: 'deployment-unit', permission: ['dashboard'] }
      },
      // Legacy dashboard route.
      {
        path: '/dashboard',
        name: 'Dashboard',
        redirect: '/trading-bot',
        hidden: true,
        meta: { title: 'menu.dashboard', keepAlive: false, icon: 'dashboard', permission: ['dashboard'] }
      },
      // Hidden AI analysis route.
      {
        path: '/ai-analysis/:pageNo([1-9]\\d*)?',
        name: 'Analysis',
        component: () => import('@/views/ai-analysis'),
        hidden: true,
        meta: { title: 'menu.dashboard.analysis', keepAlive: false, icon: 'thunderbolt', permission: ['dashboard'] }
      },
      // Hidden portfolio route.
      {
        path: '/portfolio',
        name: 'Portfolio',
        component: () => import('@/views/portfolio'),
        hidden: true,
        meta: { title: 'menu.dashboard.portfolio', keepAlive: true, icon: 'fund', permission: ['dashboard'] }
      },
      // SaaS billing / indicator marketplace — retired for internal deployments.
      {
        path: '/billing',
        redirect: '/strategy-center',
        hidden: true
      },
      {
        path: '/indicator-community',
        redirect: '/strategy-library',
        hidden: true
      },
      // User profile. Admin-only items follow the menu divider.
      {
        path: '/profile',
        name: 'Profile',
        component: () => import('@/views/profile'),
        meta: { title: 'menu.myProfile', keepAlive: false, icon: 'user', permission: ['dashboard'], menuDividerAfter: true }
      },
      // User management.
      {
        path: '/user-manage',
        name: 'UserManage',
        component: () => import('@/views/user-manage'),
        meta: { title: 'menu.userManage', keepAlive: false, icon: 'team', permission: ['admin'] }
      },
      // Agent token management.
      {
        path: '/agent-tokens',
        name: 'AgentTokens',
        component: () => import('@/views/agent-tokens'),
        meta: { title: 'menu.agentTokens', keepAlive: false, icon: 'api', permission: ['admin'] }
      },
      {
        path: '/ai-skills',
        name: 'AiSkills',
        component: () => import('@/views/ai-skills'),
        meta: { title: 'menu.aiSkills', keepAlive: false, icon: 'experiment', permission: ['admin'] }
      },
      // System settings. Keep it last in the admin menu.
      {
        path: '/settings',
        name: 'Settings',
        component: () => import('@/views/settings'),
        meta: { title: 'menu.settings', keepAlive: false, icon: 'setting', permission: ['admin'] }
      }
    ]
  },
  {
    path: '*',
    redirect: '/404',
    hidden: true
  }
]

/**
 * Base routes.
 * @type { *[] }
 */
export const constantRouterMap = [
  {
    path: '/user',
    component: UserLayout,
    redirect: '/user/login',
    hidden: true,
    children: [
      {
        path: 'login',
        name: 'login',
        component: () => import(/* webpackChunkName: "user" */ '@/views/user/Login')
      }
    ]
  },

  {
    path: '/404',
    component: () => import(/* webpackChunkName: "fail" */ '@/views/exception/404')
  }
]
