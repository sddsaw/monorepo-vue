import type { Ref } from 'vue'
import { onBeforeUnmount, onMounted } from 'vue'

/** Keep each native Dockview group's selected tab centered without scrolling its content. */
export function useCenteredDockviewTabs(host: Ref<HTMLElement | null>) {
  const strips = new Set<HTMLElement>()
  const observed = new Set<HTMLElement>()
  let resizeObserver: ResizeObserver | undefined
  let mutationObserver: MutationObserver | undefined
  let frame = 0

  function centerTabs() {
    frame = 0
    for (const strip of strips) {
      const active = strip.querySelector<HTMLElement>(':scope > .tab.active-tab')
      if (!active || strip.clientWidth === 0)
        continue
      const viewport = strip.getBoundingClientRect()
      const tab = active.getBoundingClientRect()
      // Same center-delta approach as admin's global-tab; clamp naturally at either end.
      const delta = tab.left + tab.width / 2 - viewport.left - viewport.width / 2
      const scale = viewport.width / strip.offsetWidth || 1
      const target = Math.max(0, Math.min(strip.scrollWidth - strip.clientWidth, strip.scrollLeft + delta / scale))
      if (Math.abs(strip.scrollLeft - target) > 0.5)
        strip.scrollLeft = target
    }
  }

  function scheduleCenter() {
    if (!frame)
      frame = requestAnimationFrame(centerTabs)
  }

  function syncStrips() {
    const current = new Set(host.value?.querySelectorAll<HTMLElement>('.tabs-container'))
    for (const strip of strips) {
      if (!current.has(strip)) {
        strips.delete(strip)
      }
    }
    for (const strip of current) {
      if (!strips.has(strip)) {
        strips.add(strip)
      }
    }
    // Observe tab widths too: font changes and delayed font loading can change
    // the active center without changing the strip's overall dimensions.
    const sizedElements = new Set<HTMLElement>(current)
    for (const strip of current)
      strip.querySelectorAll<HTMLElement>(':scope > .tab').forEach(tab => sizedElements.add(tab))
    for (const element of observed) {
      if (!sizedElements.has(element)) {
        resizeObserver?.unobserve(element)
        observed.delete(element)
      }
    }
    for (const element of sizedElements) {
      if (!observed.has(element)) {
        resizeObserver?.observe(element)
        observed.add(element)
      }
    }
    scheduleCenter()
  }

  onMounted(() => {
    if (!host.value)
      return
    resizeObserver = new ResizeObserver(scheduleCenter)
    mutationObserver = new MutationObserver((records) => {
      if (records.some((record) => {
        if (record.type === 'childList') {
          return record.target instanceof Element && (record.target.closest('.tabs-container') !== null
            || [...record.addedNodes, ...record.removedNodes].some(node => node instanceof Element
              && (node.matches('.groupview, .tabs-container') || node.querySelector('.tabs-container'))))
        }
        return record.target instanceof Element && record.target.matches('.tab')
          && record.target.classList.contains('active-tab') !== (record.oldValue?.split(' ').includes('active-tab') ?? false)
      })) {
        syncStrips()
      }
    })
    mutationObserver.observe(host.value, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true })
    syncStrips()
  })

  onBeforeUnmount(() => {
    mutationObserver?.disconnect()
    resizeObserver?.disconnect()
    cancelAnimationFrame(frame)
    strips.clear()
    observed.clear()
  })

  return { scheduleCenter }
}
