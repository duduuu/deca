import type { GlobalSettings } from '../../../../../shared/global-settings-types'
import { PrivacyDiagnosticsSection } from './PrivacyDiagnosticsSection'

type PrivacyPaneProps = {
  settings: GlobalSettings
}

// Deca has no usage-data sharing; only local diagnostics remain.
export function PrivacyPane(_props: PrivacyPaneProps): React.JSX.Element {
  return (
    <div className="space-y-4">
      <PrivacyDiagnosticsSection />
    </div>
  )
}
