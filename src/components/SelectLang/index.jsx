import './index.less'

import { Icon, Menu, Dropdown } from 'ant-design-vue'
import { i18nRender } from '@/locales'
import i18nMixin from '@/store/i18n-mixin'

// Internal deployment: keep Simplified Chinese + English only.
const locales = [
  'zh-CN',
  'en-US'
]

const languageLabels = {
  'zh-CN': '\u7b80\u4f53\u4e2d\u6587',
  'en-US': 'English'
}

const languageIcons = {
  'zh-CN': 'CN',
  'en-US': 'EN'
}

const languageShortLabels = {
  'zh-CN': '\u4e2d\u6587',
  'en-US': 'EN'
}

const SelectLang = {
  props: {
    prefixCls: {
      type: String,
      default: 'ant-pro-drop-down'
    }
  },
  name: 'SelectLang',
  mixins: [i18nMixin],
  render () {
    const { prefixCls } = this
    const changeLang = ({ key }) => {
      this.setLang(key)
    }
    const langMenu = (
      <Menu class={['menu', 'ant-pro-header-menu']} selectedKeys={[this.currentLang]} onClick={changeLang}>
        {locales.map(locale => (
          <Menu.Item key={locale}>
            <span class="language-code" aria-label={languageLabels[locale]}>
              {languageIcons[locale]}
            </span>
            {languageLabels[locale]}
          </Menu.Item>
        ))}
      </Menu>
    )
    const currentLabel = languageShortLabels[this.currentLang] || 'Lang'
    const title = `${i18nRender('navBar.lang')} · ${languageLabels[this.currentLang] || currentLabel}`
    return (
      <Dropdown overlay={langMenu} placement="bottomRight">
        <span class={[prefixCls, 'language-action']} title={title} aria-label={title}>
          <Icon type="global" class="language-action-icon" />
          <span class="language-action-label">{currentLabel}</span>
        </span>
      </Dropdown>
    )
  }
}

export default SelectLang
