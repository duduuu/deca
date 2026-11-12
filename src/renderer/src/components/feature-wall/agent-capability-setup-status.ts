import { useMemo } from 'react'
import type {
  OnboardingFeatureSetupId,
  OnboardingFeatureSetupSelection
} from '../onboarding/onboarding-feature-setup'
import {
  ORCA_CLI_SKILL_NAME,
  ORCHESTRATION_SKILL_NAME
} from '@/lib/skills/installation/agent-feature-skill-names'
import {
  GLOBAL_AGENT_SKILL_SOURCE_KINDS,
  useInstalledAgentSkill
} from '@/hooks/skills/discovery/useInstalledAgentSkills'
import { useOnboardingSkillRuntime } from '@/hooks/skills/runtime/use-onboarding-skill-runtime'
import { translate } from '@/i18n/i18n'
import type { Translate } from '@/i18n/use-translate'
import { isAgentCapabilitiesDone } from './feature-wall-setup-progress'

export type AgentCapabilityInstallStatusTone =
  | 'ready'
  | 'pending'
  | 'checking'
  | 'error'
  | 'unavailable'

export type AgentCapabilityInstallStatus = {
  label: string
  tone: AgentCapabilityInstallStatusTone
  installed?: boolean
}

export type AgentCapabilityReadiness = {
  browserUseSkillInstalled: boolean
  browserUseSkillLoading: boolean
  orchestrationSkillInstalled: boolean
  orchestrationSkillLoading: boolean
}

export type AgentCapabilitySetupStatus = {
  readiness: AgentCapabilityReadiness
  installStatus: Record<OnboardingFeatureSetupId, AgentCapabilityInstallStatus>
}

export function useAgentCapabilitySetupStatus(): AgentCapabilitySetupStatus {
  const activeSkillRuntime = useOnboardingSkillRuntime()
  const skillOptions = {
    enabled: activeSkillRuntime.enabled,
    discoveryTarget: activeSkillRuntime.discoveryTarget,
    runtimeTarget: activeSkillRuntime.discoveryRuntimeTarget,
    agent: activeSkillRuntime.agent,
    sourceKinds: GLOBAL_AGENT_SKILL_SOURCE_KINDS
  }
  const browserUseSkill = useInstalledAgentSkill(ORCA_CLI_SKILL_NAME, skillOptions)
  const orchestrationSkill = useInstalledAgentSkill(ORCHESTRATION_SKILL_NAME, skillOptions)
  const readiness: AgentCapabilityReadiness = useMemo(
    () => ({
      browserUseSkillInstalled: browserUseSkill.installed,
      browserUseSkillLoading: browserUseSkill.loading,
      orchestrationSkillInstalled: orchestrationSkill.installed,
      orchestrationSkillLoading: orchestrationSkill.loading
    }),
    [
      browserUseSkill.installed,
      browserUseSkill.loading,
      orchestrationSkill.installed,
      orchestrationSkill.loading
    ]
  )

  const installStatus = useMemo(
    () => ({
      browserUse: getSkillInstallStatus(browserUseSkill),
      orchestration: getSkillInstallStatus(orchestrationSkill),
      // Retain the selection field without offering Linear installation in the generic feature wall.
      linearTickets: getFeatureWallExcludedLinearTicketsStatus()
    }),
    [browserUseSkill, orchestrationSkill]
  )

  return { readiness, installStatus }
}

export function getDefaultAgentCapabilitySetupSelection(
  readiness: AgentCapabilityReadiness
): OnboardingFeatureSetupSelection {
  return {
    browserUse: !readiness.browserUseSkillInstalled,
    orchestration: !readiness.orchestrationSkillInstalled,
    linearTickets: false
  }
}

export function isAgentCapabilityReadinessChecking(readiness: AgentCapabilityReadiness): boolean {
  return readiness.browserUseSkillLoading || readiness.orchestrationSkillLoading
}

export function isAgentCapabilityReadinessComplete(readiness: AgentCapabilityReadiness): boolean {
  return !isAgentCapabilityReadinessChecking(readiness) && isAgentCapabilitiesDone(readiness)
}

export function getAgentCapabilityStatusClassName(tone: AgentCapabilityInstallStatusTone): string {
  switch (tone) {
    case 'error':
      return 'text-destructive'
    case 'ready':
    case 'checking':
    case 'pending':
    case 'unavailable':
      return 'text-muted-foreground'
  }
}

function getSkillInstallStatus(
  skill: {
    installed: boolean
    loading: boolean
    error: string | null
  },
  t: Translate = translate
): AgentCapabilityInstallStatus {
  if (skill.loading) {
    return {
      label: t(
        'auto.components.feature.wall.agent.capability.setup.status.9b33e7fb13',
        'Checking install'
      ),
      tone: 'checking'
    }
  }
  if (skill.error) {
    return {
      label: t(
        'auto.components.feature.wall.agent.capability.setup.status.aa8e143a2f',
        'Could not check install'
      ),
      tone: 'error'
    }
  }
  if (skill.installed) {
    return {
      label: t(
        'auto.components.feature.wall.agent.capability.setup.status.8eccfcb314',
        'Installed'
      ),
      tone: 'ready',
      installed: true
    }
  }
  return {
    label: t(
      'auto.components.feature.wall.agent.capability.setup.status.notInstalled',
      'Not installed'
    ),
    tone: 'pending'
  }
}

function getFeatureWallExcludedLinearTicketsStatus(): AgentCapabilityInstallStatus {
  return {
    label: '',
    tone: 'pending'
  }
}
