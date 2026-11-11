import path from 'node:path'

// Each surface ships its own catalogs under one contract: same call shape, key rules and gates.
export const LOCALIZATION_SURFACES = {
  desktop: {
    localesDir: path.join('src', 'renderer', 'src', 'i18n', 'locales'),
    sourceRoots: [path.join('src', 'renderer', 'src'), path.join('src', 'main')],
    runtimeRequiredPath: path.join('src', 'renderer', 'src', 'i18n', 'en-runtime-required.json'),
    // Desktop runtimes load built-in catalogs as-is; plural forms CLDR adds beyond `_other` are committed.
    fillsPluralForms: true,
    syncCatalogCommand: 'pnpm run sync:localization-catalog',
    syncRuntimeCatalogCommand: 'pnpm run sync:localization-runtime-catalog'
  }
}

export function readLocalizationSurface(argv) {
  const index = argv.indexOf('--surface')
  const name = index === -1 ? 'desktop' : argv[index + 1]
  const surface = Object.hasOwn(LOCALIZATION_SURFACES, name) ? LOCALIZATION_SURFACES[name] : null
  if (!surface) {
    throw new Error(`Unknown localization surface: ${String(name)}`)
  }
  return surface
}
