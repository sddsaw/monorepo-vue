import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { getIconData } from '@iconify/utils'
import consola from 'consola'

interface IconConfig {
  [prefix: string]: string[]
}

export async function updateIcons() {
  const rootDir = process.cwd()
  const appsDir = path.resolve(rootDir, 'apps')

  if (!fs.existsSync(appsDir)) {
    consola.error('Cannot find apps directory at:', appsDir)
    return
  }

  const apps = fs.readdirSync(appsDir).filter((file) => {
    const stat = fs.statSync(path.join(appsDir, file))
    return stat.isDirectory()
  })

  consola.info(`Scanning apps: ${apps.join(', ')}`)

  // Cache for collections to avoid repeated disk reads and JSON parsing
  const collectionCache = new Map<string, any>()
  const localRequire = createRequire(import.meta.url)

  let iconifyJsonDir = ''
  try {
    const iconifyPackageJsonPath = localRequire.resolve('@iconify/json/package.json')
    iconifyJsonDir = path.join(path.dirname(iconifyPackageJsonPath), 'json')
  }
  catch {
    // Fallback if require.resolve fails (e.g. relative to rootDir)
    iconifyJsonDir = path.resolve(rootDir, 'node_modules/@iconify/json/json')
  }

  for (const app of apps) {
    const appPath = path.join(appsDir, app)
    const iconsConfigPath = path.join(appPath, 'icons.json')

    if (!fs.existsSync(iconsConfigPath)) {
      continue
    }

    consola.info(`Processing icons for app: ${app}...`)

    let config: IconConfig
    try {
      config = JSON.parse(fs.readFileSync(iconsConfigPath, 'utf-8'))
    }
    catch (error) {
      consola.error(`Failed to parse icons.json for app ${app}:`, error)
      continue
    }

    const collections: any[] = []

    for (const [prefix, iconNames] of Object.entries(config)) {
      if (!Array.isArray(iconNames)) {
        consola.warn(`Invalid icon names list for prefix "${prefix}" in app "${app}"`)
        continue
      }

      // Check cache first
      let rawCollection = collectionCache.get(prefix)

      if (!rawCollection) {
        const collectionJsonPath = path.join(iconifyJsonDir, `${prefix}.json`)

        if (!fs.existsSync(collectionJsonPath)) {
          consola.error(`Icon collection JSON file not found: ${collectionJsonPath}`)
          continue
        }

        try {
          rawCollection = JSON.parse(fs.readFileSync(collectionJsonPath, 'utf-8'))
          collectionCache.set(prefix, rawCollection)
        }
        catch (error) {
          consola.error(`Failed to parse collection file ${prefix}.json:`, error)
          continue
        }
      }

      const subset: any = {
        prefix,
        icons: {},
      }

      if (rawCollection.width)
        subset.width = rawCollection.width
      if (rawCollection.height)
        subset.height = rawCollection.height

      for (const name of iconNames) {
        const iconData = getIconData(rawCollection, name)
        if (iconData) {
          subset.icons[name] = iconData
        }
        else {
          consola.warn(`Icon "${name}" not found in collection "${prefix}" for app "${app}"`)
        }
      }

      if (Object.keys(subset.icons).length > 0) {
        collections.push(subset)
      }
    }

    if (collections.length > 0) {
      const outputDir = path.join(appPath, 'src', 'plugins')
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
      }

      const outputPath = path.join(outputDir, 'local-icons.json')
      fs.writeFileSync(outputPath, JSON.stringify(collections, null, 2), 'utf-8')
      consola.success(`Successfully generated ${outputPath} for app: ${app}`)
    }
    else {
      consola.warn(`No icons to write for app: ${app}`)
    }
  }
}
