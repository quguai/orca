import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { GitSection } from './install-git-section'
import { LocalSection } from './install-local-section'
import { MarketSection } from './install-market-section'
import type { SkillsInstallTab as SkillsInstallTabValue } from './skills-page-tabs'

export function SkillsInstallTab({
  onSkillsChanged
}: {
  onSkillsChanged: () => Promise<void>
}): React.JSX.Element {
  const installTab = useAppStore((s) => s.skillsViewInstallTab)
  const setInstallTab = useAppStore((s) => s.setSkillsViewInstallTab)

  const tabs: { id: SkillsInstallTabValue; label: string }[] = [
    {
      id: 'market',
      label: translate('auto.components.skills.SkillsInstallTab.e6252b3d68', 'Market')
    },
    {
      id: 'local',
      label: translate('auto.components.skills.SkillsInstallTab.0c74e7ff34', 'Local')
    },
    { id: 'git', label: translate('auto.components.skills.SkillsInstallTab.11fd2a7db8', 'Git') }
  ]

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2">
        <div className="flex items-center gap-0.5 rounded-md bg-background/50 p-0.5">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setInstallTab(id)}
              className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                installTab === id
                  ? 'bg-accent text-foreground'
                  : 'text-foreground/60 hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="scrollbar-sleek flex-1 overflow-auto p-4">
        {installTab === 'market' && <MarketSection />}
        {installTab === 'local' && <LocalSection onSkillsChanged={onSkillsChanged} />}
        {installTab === 'git' && <GitSection />}
      </div>
    </div>
  )
}
