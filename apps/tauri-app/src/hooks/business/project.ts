import { useRouter } from 'vue-router'
import { useTpStore } from '@/store/modules/tp'

/** 加载成功后进入工作台，取消和失败时保留当前路由。 */
export function useProjectNavigation() {
  const router = useRouter()
  const tpStore = useTpStore()

  async function openProject(path?: string) {
    const loaded = path === undefined
      ? await tpStore.chooseAndOpenFile()
      : await tpStore.openRecentProject(path)

    if (loaded && router.currentRoute.value.name !== 'workbench') {
      await router.push({ name: 'workbench' })
    }
  }

  async function openProjectDirectory() {
    if (await tpStore.chooseAndOpenDirectory())
      await router.push({ name: 'workbench' })
  }

  function retryOpenProject() {
    tpStore.cancelProjectLoad()
    return openProject()
  }

  return { openProject, openProjectDirectory, retryOpenProject }
}
