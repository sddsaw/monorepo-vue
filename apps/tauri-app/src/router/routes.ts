import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
    meta: {
      title: '控制台主页',
    },
  },
  {
    path: '/sub-window',
    name: 'SubWindow',
    component: () => import('../views/SubWindow.vue'),
    meta: {
      title: '子窗口',
    },
  },
]
