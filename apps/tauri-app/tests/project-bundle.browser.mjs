import assert from 'node:assert/strict'
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

async function main() {
  if (!process.env.PROJECT_FIXTURE)
    throw new Error('Set PROJECT_FIXTURE to the directory containing Prox.prx, SimulatedConfig.json and DefFiles')
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } })
  const errors = []
  const temp = await mkdtemp(path.join(tmpdir(), 'prx-browser-'))
  page.on('pageerror', error => errors.push(error.message))
  try {
    await page.goto(process.env.WORKBENCH_URL || 'http://127.0.0.1:9530')
    await page.getByRole('button', { name: /选择.*工程目录/ }).waitFor()
    // A manifest without its definition directory must fail before replacing the project.
    await cp(path.join(process.env.PROJECT_FIXTURE, 'Prox.prx'), path.join(temp, 'Prox.prx'))
    await cp(path.join(process.env.PROJECT_FIXTURE, 'SimulatedConfig.json'), path.join(temp, 'SimulatedConfig.json'))
    const missingChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /选择.*工程目录/ }).click()
    await (await missingChooserPromise).setFiles(temp)
    await page.getByRole('alert').filter({ hasText: '定义目录不存在或为空' }).waitFor()
    assert.equal(await page.locator('.workbench-shell').count(), 0)
    assert.equal(await page.getByRole('progressbar', { name: '程序加载进度' }).count(), 0)
    await page.getByRole('button', { name: '返回', exact: true }).click()
    const chooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /选择.*工程目录/ }).click()
    const chooser = await chooserPromise
    await chooser.setFiles(process.env.PROJECT_FIXTURE)
    // Set this flag to match the Vite server; reference validation defaults to disabled.
    if (process.env.VITE_VALIDATE_PROJECT_REFERENCES === 'true') {
      const preflightError = page.getByRole('alert').filter({ hasText: '文件检查未通过' })
      await preflightError.waitFor()
      assert.match(await preflightError.textContent(), /DefFiles\/raw_pattern.pat/)
      assert.match(await preflightError.textContent(), /TestProgram\/TestProgram.csproj/)
      assert.equal(await page.getByRole('progressbar', { name: '程序加载进度' }).count(), 0)
      assert.equal(await page.locator('.workbench-shell').count(), 0)
      await page.screenshot({ path: '/tmp/prx-preflight-missing.png', animations: 'disabled' })
      await page.getByRole('button', { name: '返回', exact: true }).click()
    }
    else {
      await page.locator('.workbench-shell').waitFor()
      await page.locator('.ate-workbench-tree').getByText('pinmap', { exact: true }).click()
      await page.locator('.pin-table-editor:visible').getByText('A0', { exact: true }).waitFor()
      await page.goto(new URL('#/project', page.url()).href)
    }

    // Complete only the temporary test fixture; do not change user files or imply waveform validity.
    await cp(path.join(process.env.PROJECT_FIXTURE, 'DefFiles'), path.join(temp, 'DefFiles'), { recursive: true })
    await writeFile(path.join(temp, 'DefFiles', 'raw_pattern.pat'), 'existence-check fixture only')
    await mkdir(path.join(temp, 'TestProgram'))
    await writeFile(path.join(temp, 'TestProgram', 'TestProgram.csproj'), '<Project />')
    const completeChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /选择.*工程目录/ }).click()
    await (await completeChooserPromise).setFiles(temp)
    await page.getByRole('progressbar', { name: '程序加载进度' }).waitFor()
    await page.locator('.workbench-shell').waitFor()
    const tree = page.locator('.ate-workbench-tree')
    await tree.waitFor()
    // Initially only the selected pinmap path is open; expand others explicitly for this full-tree audit.
    const expandedLabels = await tree.locator('.n-tree-node').filter({ has: page.locator('.n-tree-node-switcher--expanded') }).locator('.n-tree-node-content__text').allTextContents()
    assert.deepEqual(expandedLabels, ['DUT', 'Pin Table'])
    async function expandAllBranches() {
      const collapsed = tree.locator('.n-tree-node-switcher:not(.n-tree-node-switcher--expanded)').filter({ has: page.locator('svg') })
      while (await collapsed.count())
        await collapsed.first().click()
    }
    await expandAllBranches()

    assert.match(await tree.textContent(), /DUT.*Tester.*Test Conditions.*Job/s)
    assert.equal(await tree.getByText('PPMU', { exact: true }).count(), 2)
    assert.equal(await tree.getByText('FILLER(0)', { exact: true }).count(), 2)
    assert.match(await tree.textContent(), /MIO16\(3\)/)
    assert.equal(await tree.getByText('Instrument', { exact: true }).count(), 0)
    // Every visible tree node must render a locally bundled SVG, including custom ATE icons.
    const prefixes = tree.locator('.n-tree-node-content__prefix')
    assert.ok(await prefixes.count() > 30)
    assert.equal(await prefixes.locator('svg').count(), await prefixes.count())
    const instruments = tree.locator('.n-tree-node').filter({ has: page.getByText('Instruments', { exact: true }) })
    const rack = instruments.locator('.n-tree-node-content__prefix svg')
    assert.equal(await rack.count(), 1)
    const rackShape = await rack.innerHTML()
    await instruments.locator('.n-tree-node-switcher').click()
    assert.equal(await rack.innerHTML(), rackShape)
    await instruments.locator('.n-tree-node-switcher').click()
    for (const tabName of ['Inspector', 'Help', 'Issues'])
      assert.equal(await page.getByRole('tab', { name: tabName, exact: true }).locator('svg').count(), 1)

    await tree.getByText('pinmap', { exact: true }).click()
    await page.locator('.pin-table-editor:visible').getByText('A0', { exact: true }).waitFor()
    await page.screenshot({ path: '/tmp/prx-bundle-pinmap.png' })

    for (const label of ['SITEASSEMBLY(1)', 'MIO16(2)', 'MVS1A(4)', 'FILLER(0)']) {
      await tree.getByText(label, { exact: true }).first().click()
      await page.locator('.hardware-view h2').filter({ hasText: label }).waitFor()
    }
    await tree.getByText('PPMU', { exact: true }).first().click()
    await page.locator('.hardware-view h2').filter({ hasText: 'PPMU' }).waitFor()
    await page.screenshot({ path: '/tmp/prx-bundle-hardware.png' })

    const expected = {
      channelmap: 'CK_t',
      flowtable: 'TC_023_PPMU_Current_Test',
      testinstance: 'TestClassPPMU.TC_023_PPMU_Current_Test',
      pinlevels: 'VDriveLo',
      timesetsbasic: 'TSET1',
      pinscramble: 'ps_cmd',
      patternset: 'pattern_phase1',
      globalspec: 'Vcl_default',
      joblist: 'JobTest',
    }
    for (const [label, content] of Object.entries(expected)) {
      await tree.getByText(label, { exact: true }).click()
      await page.locator('.definition-view').getByText(content, { exact: true }).first().waitFor()
      if (label === 'patternset') {
        assert.equal(await page.locator('.definition-view:visible').getByRole('alert').count(), 0)
        await page.screenshot({ path: '/tmp/prx-bundle-patterns.png' })
      }
    }
    // Category rows don't open editor tabs; external tool stays disabled.
    const before = await page.locator('.workbench-dock-tab').count()
    await tree.getByText('Characterization', { exact: true }).click()
    assert.equal(await page.locator('.workbench-dock-tab').count(), before)
    const external = tree.getByText('PatternTool (External)', { exact: true })
    await external.click({ force: true })
    assert.equal(await page.locator('.workbench-dock-tab').count(), before)

    // Native switcher remains available on hardware nodes that also open an editor.
    const assemblyRow = tree.locator('.n-tree-node').filter({ has: page.getByText('SITEASSEMBLY(1)', { exact: true }) })
    await page.waitForTimeout(300)
    await assemblyRow.locator('.n-tree-node-switcher').click()
    await tree.getByText('MIO16(2)', { exact: true }).waitFor({ state: 'hidden' })
    await assemblyRow.locator('.n-tree-node-switcher').click()
    await tree.getByText('MIO16(2)', { exact: true }).waitFor()

    await tree.getByText('pinmap', { exact: true }).click()
    await page.locator('.pin-table-editor:visible').getByText('A0', { exact: true }).waitFor()
    await page.setViewportSize({ width: 1000, height: 800 })
    for (const scheme of ['light', 'dark']) {
      for (const size of [12, 14, 18]) {
        await page.evaluate(async ({ scheme, size }) => {
          const { useThemeStore } = await import('/src/store/modules/theme/index.ts')
          const theme = useThemeStore()
          theme.setThemeScheme(scheme)
          theme.setFontSize(size)
        }, { scheme, size })
        await page.waitForTimeout(300)
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false)
        assert.equal(await page.locator('.pin-table-editor:visible').evaluate(el => el.scrollWidth > el.clientWidth + 1), false)
        if ((scheme === 'light' && size === 12) || (scheme === 'dark' && size === 18))
          await page.screenshot({ path: `/tmp/prx-bundle-${scheme}-${size}.png` })
      }
    }
    await page.setViewportSize({ width: 1500, height: 1000 })

    // Unknown definitions can contain scalar/null array rows without crashing the view.
    await writeFile(path.join(temp, 'DefFiles', 'unknown.json'), JSON.stringify({ DefFileType: 'custom', data: [null, 0, false, 'scalar-row'] }))
    await page.goto(new URL('#/project', page.url()).href)
    const customChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /选择.*工程目录/ }).click()
    await (await customChooserPromise).setFiles(temp)
    await tree.getByText('Other Definitions', { exact: true }).click()
    await tree.getByText('unknown', { exact: true }).waitFor()
    await tree.getByText('unknown', { exact: true }).click()
    await page.locator('.definition-view').getByText('scalar-row', { exact: true }).waitFor()
    await page.locator('.definition-view').getByText('false', { exact: true }).waitFor()
    assert.deepEqual(errors, [])
    console.warn('PASS reference validation flag, required definition directory, all 10 definitions, hardware hierarchy, themes, unknown types and disabled tool')
  }
  catch (error) {
    await page.screenshot({ path: '/tmp/prx-bundle-failure.png' })
    console.error('PAGE ERRORS', errors)
    throw error
  }
  finally {
    await browser.close()
    await rm(temp, { recursive: true, force: true })
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
