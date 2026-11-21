/* eslint-disable test/no-import-node-test -- 使用项目现有的 Node 内置测试运行器。 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { it } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { compileScript, parse } from 'vue/compiler-sfc'

const source = readFileSync(new URL('../src/components/common/ResizeHandle.vue', import.meta.url), 'utf8')
const { descriptor } = parse(source)
const script = compileScript(descriptor, { id: 'resize-handle-test' })
const { outputText } = ts.transpileModule(script.content, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
})

function mountHandle(config) {
  const events = []
  let drag
  const module = { exports: {} }
  runInNewContext(outputText, {
    exports: module.exports,
    require(name) {
      if (name === 'vue') {
        return {
          defineComponent: options => options,
          ref: value => ({ value }),
          watch() {},
          onUnmounted() {},
        }
      }
      if (name === '@vueuse/core') {
        return {
          useDraggable(_target, options) {
            drag = options
            return { isDragging: { value: false } }
          },
        }
      }
      throw new Error(`Unexpected dependency: ${name}`)
    },
  })
  const component = module.exports.default
  const props = { ...Object.fromEntries(Object.entries(component.props).map(([key, value]) => [key, value.default])), ...config }
  component.setup(props, {
    expose() {},
    emit(name, value) {
      events.push([name, value])
      if (name === 'update:modelValue')
        props.modelValue = value
    },
  })
  const pointer = coordinate => ({ clientX: coordinate, clientY: coordinate })
  return { events, props, start: x => drag.onStart({}, pointer(x)), move: x => drag.onMove({}, pointer(x)), end: () => drag.onEnd() }
}

for (const config of [
  { name: 'left', direction: 'col', reverse: false, modelValue: 240, min: 200, max: 500, collapseThreshold: 160, expandThreshold: 40 },
  { name: 'right', direction: 'col', reverse: true, modelValue: 340, min: 260, max: 600, collapseThreshold: 200, expandThreshold: 40 },
  { name: 'bottom', direction: 'row', reverse: true, modelValue: 180, min: 100, max: 500, collapseThreshold: 80, expandThreshold: 30 },
]) {
  it(`${config.name}: continued dragging below the minimum never toggles visibility`, () => {
    const handle = mountHandle(config)
    const origin = 600
    const coordinateForSize = size => origin + (size - config.modelValue) * (config.reverse ? -1 : 1)
    handle.start(origin)
    // Cross the former collapse threshold, keep moving within its overlapping
    // expand range, then continue past zero without releasing the pointer.
    for (const size of [config.min, config.collapseThreshold - 1, config.expandThreshold + 2, config.expandThreshold + 1, 0, -100]) {
      handle.move(coordinateForSize(size))
      assert.equal(handle.props.modelValue, config.min)
      assert.ok(handle.events.every(([name]) => ['start', 'update:modelValue', 'resize'].includes(name)))
    }
    handle.move(coordinateForSize(config.min + 20))
    assert.equal(handle.props.modelValue, config.min + 20)
    handle.move(coordinateForSize(config.max + 100))
    assert.equal(handle.props.modelValue, config.max)
    handle.end()
    assert.equal(handle.events.filter(([name]) => name === 'start').length, 1)
    assert.equal(handle.events.filter(([name]) => name === 'end').length, 1)
  })
}
