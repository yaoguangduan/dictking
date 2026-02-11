import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import {
  Tabbar,
  TabbarItem,
  Field,
  Button,
  Popup,
  Dialog,
  Slider,
  Icon,
  Loading,
  Search,
  Empty,
  Tag,
  List,
  Cell,
  CellGroup,
  NavBar,
  Switch,
  Radio,
  RadioGroup,
  Picker,
  Form
} from 'vant'
import 'vant/lib/index.css'

// 版本控制 - 更新代码时修改这个版本号
const APP_VERSION = '1.0.1'
const STORAGE_KEY = 'app_version'

// 检查版本并清除缓存
const storedVersion = localStorage.getItem(STORAGE_KEY)
if (storedVersion !== APP_VERSION) {
  console.log(`版本更新: ${storedVersion} -> ${APP_VERSION}`)
  // 清除所有缓存（除了认证信息）
  const token = localStorage.getItem('auth_token')
  const userInfo = localStorage.getItem('user_info')
  localStorage.clear()
  if (token) localStorage.setItem('auth_token', token)
  if (userInfo) localStorage.setItem('user_info', userInfo)
  localStorage.setItem(STORAGE_KEY, APP_VERSION)
  // 强制刷新页面
  window.location.reload()
}

const app = createApp(App)
app.use(router)
app.use(Tabbar)
app.use(TabbarItem)
app.use(Field)
app.use(Button)
app.use(Popup)
app.use(Dialog)
app.use(Slider)
app.use(Icon)
app.use(Loading)
app.use(Search)
app.use(Empty)
app.use(Tag)
app.use(List)
app.use(Cell)
app.use(CellGroup)
app.use(NavBar)
app.use(Switch)
app.use(Radio)
app.use(RadioGroup)
app.use(Picker)
app.use(Form)
app.mount('#app')
