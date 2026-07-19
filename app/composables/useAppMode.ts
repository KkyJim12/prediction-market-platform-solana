export type AppMode = 'main' | 'test'

const MODE_STORAGE_KEY = 'purplex-app-mode'

export function useAppMode() {
  const mode = useState<AppMode>('purplex-app-mode', () => 'main')

  function setMode(nextMode: AppMode) {
    mode.value = nextMode
    if (import.meta.client) localStorage.setItem(MODE_STORAGE_KEY, nextMode)
  }

  function restoreMode() {
    if (!import.meta.client) return
    const saved = localStorage.getItem(MODE_STORAGE_KEY)
    if (saved === 'main' || saved === 'test') mode.value = saved
  }

  return {
    mode,
    isTestMode: computed(() => mode.value === 'test'),
    setMode,
    restoreMode
  }
}
