import { DeveloperPermissionsPane } from '../developer-permissions/DeveloperPermissionsPane'
import { PrivacyPane } from '../privacy/PrivacyPane'
import { RuntimeEnvironmentsPane } from '../runtime-environments/catalog/RuntimeEnvironmentsPane'
import { RuntimeServersPageProvider } from '../runtime-environments/runtime-servers-page-context'
import { SettingsSection } from '../section-layout/SettingsSection'
import { translate } from '@/i18n/i18n'
import type { Translate } from '@/i18n/use-translate'
import type { SettingsRenderContext } from './settings-render-context'

export function renderServersSettingsSection(
  context: SettingsRenderContext,
  t: Translate = translate
): React.JSX.Element {
  const { model, navigation, view } = context
  const mounted = view.isSectionMounted('servers')
  return (
    <RuntimeServersPageProvider>
      <SettingsSection
        id="servers"
        title={t('auto.components.settings.Settings.wslHostsTitle', 'WSL hosts')}
        description={t(
          'auto.components.settings.Settings.wslHostsDescription',
          'Run Deca in a WSL distro on this computer and choose the default host.'
        )}
        searchEntries={navigation.getSectionSearchEntries('servers')}
        // Rows/cards already supply surfaces; another frame would nest cards.
        bodyClassName="rounded-none border-0 bg-transparent px-0 py-0 shadow-none"
      >
        {mounted ? (
          <RuntimeEnvironmentsPane
            settings={model.settings}
            setActiveRuntimeEnvironmentPreference={model.setActiveRuntimeEnvironmentPreference}
            canGeneratePairingUrl={false}
            allowLocalRuntime={!model.isWebClient}
            addServerIntentSignal={model.remoteServerAddIntentSignal}
          />
        ) : null}
      </SettingsSection>
    </RuntimeServersPageProvider>
  )
}

export function renderDeveloperPermissionsSettingsSection(
  context: SettingsRenderContext,
  t: Translate = translate
): React.JSX.Element | null {
  const { model, navigation, view } = context
  return model.showDesktopOnlySettings && model.isMac ? (
    <SettingsSection
      id="developer-permissions"
      grouped
      title={t('auto.components.settings.Settings.65660d4548', 'macOS Permissions')}
      description={t(
        'auto.components.settings.Settings.9b83cc62c2',
        'macOS privacy access for terminal-launched developer tools.'
      )}
      searchEntries={navigation.getSectionSearchEntries('developer-permissions')}
    >
      {view.isSectionMounted('developer-permissions') ? (
        <DeveloperPermissionsPane
          highlightedSettingId={model.highlightedSettingsTarget?.id ?? null}
        />
      ) : null}
    </SettingsSection>
  ) : null
}

export function renderPrivacySettingsSection(
  context: SettingsRenderContext,
  t: Translate = translate
): React.JSX.Element {
  const { model, navigation, view } = context
  return (
    <SettingsSection
      id="privacy"
      title={t('auto.components.settings.Settings.742ca66ea6', 'Privacy')}
      description={t(
        'auto.components.settings.Settings.c1b43dc4e2',
        'Local diagnostics. Deca sends no usage data.'
      )}
      searchEntries={navigation.getSectionSearchEntries('privacy')}
    >
      {view.isSectionMounted('privacy') ? <PrivacyPane settings={model.settings} /> : null}
    </SettingsSection>
  )
}
