<template>
  <span v-if="currentUser && currentUser.name" class="ant-pro-account-avatar qd-account-trigger">
      <a-dropdown placement="bottomRight" overlayClassName="qd-account-dropdown">
      <span class="account-identity" @click.stop="handleProfile">
        <a-avatar :size="28" :src="currentUser.avatar" class="antd-pro-global-header-index-avatar" />
        <span class="account-name">{{ currentUser.name }}</span>
      </span>
        <a-menu slot="overlay" mode="vertical" class="qd-account-menu" :selected-keys="[]">
          <a-menu-item key="profile" @click="handleProfile">
            <a-icon type="user" />
            {{ $t('menu.myProfile') || $t('menu.profile') || 'Profile' }}
          </a-menu-item>
          <a-menu-item key="logout" @click="handleLogout">
            <a-icon type="logout" />
            {{ $t('menu.account.logout') }}
          </a-menu-item>
        </a-menu>
      </a-dropdown>
    </span>
  <span v-else>
    <a-spin size="small" :style="{ marginLeft: 8, marginRight: 8 }" />
  </span>
</template>

<script>
import { Modal } from 'ant-design-vue'

export default {
  name: 'AvatarDropdown',
  props: {
    currentUser: {
      type: Object,
      default: () => null
    },
    menu: {
      type: Boolean,
      default: true
    }
  },
  methods: {
    handleProfile () {
      this.$router.push({ name: 'Profile' }).catch(() => {})
    },
    handleLogout (e) {
      Modal.confirm({
        title: this.$t('layouts.usermenu.dialog.title'),
        content: this.$t('layouts.usermenu.dialog.content'),
        onOk: () => {
          return this.$store.dispatch('Logout').then(() => {
            this.$router.push({ name: 'login' })
          })
        },
        onCancel () {}
      })
    }
  }
}
</script>

<style lang="less">
.qd-account-trigger {
  display: inline-flex !important;
  align-items: center !important;
  gap: 14px;
  min-width: 0;
  height: 64px !important;
  margin-right: 18px;
  padding: 0 6px !important;
  line-height: normal !important;
  vertical-align: top;

  .account-identity {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    min-width: 0;
    height: 32px;
    padding: 0 9px 0 4px;
    border-radius: 9px;
    cursor: pointer;
    transition: background-color 0.2s ease;

    &:hover {
      background: rgba(0, 0, 0, 0.04);
    }
  }

  .account-name {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
    color: rgba(0, 0, 0, 0.85);
  }

  .antd-pro-global-header-index-avatar {
    flex-shrink: 0;
  }
}

.qd-account-dropdown {
  .qd-account-menu {
    min-width: 140px;
  }
}
</style>
