import { Download, LayoutDashboard, Library, FolderOpen, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMountedRef } from '@/hooks/useMountedRef'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import type { CentralSkill, ToolInfo } from '../../../../shared/skills'
import { SkillsDashboardTab } from './SkillsDashboardTab'
import { SkillsInstallTab } from './SkillsInstallTab'
import { SkillsMySkillsTab } from './SkillsMySkillsTab'
import { SkillsWorkspacesTab } from './SkillsWorkspacesTab'
import type { SkillsPageTab } from './skills-page-tabs'

const TAB_ITEMS: {
  id: SkillsPageTab
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'my-skills', label: 'My Skills', icon: Library },
  { id: 'install', label: 'Install', icon: Download },
  { id: 'workspaces', label: 'Workspaces', icon: FolderOpen }
]

export default function SkillsPage(): React.JSX.Element {
  const mountedRef = useMountedRef()
  const activeTab = useAppStore((s) => s.skillsViewActiveTab)
  const setActiveTab = useAppStore((s) => s.setSkillsViewActiveTab)
  const setActiveView = useAppStore((s) => s.setActiveView)
  const [skills, setSkills] = useState<CentralSkill[]>([])
  const [tools, setTools] = useState<ToolInfo[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const [nextSkills, nextTools] = await Promise.all([
        window.api.skills.list(),
        window.api.skills.getToolsStatus()
      ])
      if (mountedRef.current) {
        setSkills(nextSkills)
        setTools(nextTools)
      }
    } catch (error) {
      console.error('Failed to load skills:', error)
      if (mountedRef.current) {
        toast.error(
          translate('auto.components.skills.SkillsPage.ea72d6185b', 'Could not scan local skills')
        )
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [mountedRef])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleDelete = useCallback(
    async (skillId: string): Promise<void> => {
      try {
        await window.api.skills.delete({ skillId })
        if (mountedRef.current) {
          setSkills((prev) => prev.filter((s) => s.id !== skillId))
          toast.success(translate('auto.components.skills.SkillsPage.deleted', 'Skill deleted'))
        }
      } catch {
        toast.error(translate('auto.components.skills.SkillsPage.deleteFail', 'Failed to delete'))
      }
    },
    [mountedRef]
  )

  const handleSync = useCallback(
    async (skillId: string, toolKey: string): Promise<void> => {
      await window.api.skills.syncToTool({ skillId, toolKey })
      void loadData()
    },
    [loadData]
  )

  const handleUnsync = useCallback(
    async (skillId: string, toolKey: string): Promise<void> => {
      await window.api.skills.unsyncFromTool({ skillId, toolKey })
      void loadData()
    },
    [loadData]
  )

  const handleCheckUpdate = useCallback(
    async (skillId: string): Promise<void> => {
      const updated = await window.api.skills.checkUpdate({ skillId })
      if (mountedRef.current) {
        setSkills((prev) => prev.map((s) => (s.id === skillId ? updated : s)))
      }
    },
    [mountedRef]
  )

  const handleCheckAllUpdates = useCallback(async (): Promise<void> => {
    await window.api.skills.checkAllUpdates()
    void loadData()
  }, [loadData])

  const skillCount = skills.length

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-card">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as SkillsPageTab)}
        className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-1.5">
          <span className="text-xs font-medium text-foreground/70">
            {translate('auto.components.skills.SkillsPage.f43ad6edf3', 'Skills')}
            <span className="ml-2 text-foreground/40">{skillCount}</span>
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setActiveView('terminal')}
            className="size-7 shrink-0 text-foreground/60 hover:text-foreground"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1 border-b border-border/50 px-4 py-2">
          <TabsList className="h-auto justify-start gap-1 bg-transparent p-0">
            {TAB_ITEMS.map(({ id, label, icon: Icon }) => (
              <TabsTrigger
                key={id}
                value={id}
                className="gap-1.5 rounded-md px-3 py-1.5 text-xs data-[state=active]:bg-accent data-[state=active]:shadow-none"
              >
                <Icon className="size-3.5" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <TabsContent value="dashboard" className="scrollbar-sleek m-0 h-full overflow-auto">
            <SkillsDashboardTab skills={skills} tools={tools} onSelectTab={setActiveTab} />
          </TabsContent>
          <TabsContent value="my-skills" className="m-0 h-full overflow-hidden">
            <SkillsMySkillsTab
              skills={skills}
              tools={tools}
              loading={loading}
              onDelete={handleDelete}
              onSyncToTool={handleSync}
              onUnsyncFromTool={handleUnsync}
              onCheckUpdate={handleCheckUpdate}
              onCheckAllUpdates={handleCheckAllUpdates}
            />
          </TabsContent>
          <TabsContent value="install" className="m-0 h-full overflow-hidden">
            <SkillsInstallTab onSkillsChanged={loadData} />
          </TabsContent>
          <TabsContent value="workspaces" className="scrollbar-sleek m-0 h-full overflow-auto">
            <SkillsWorkspacesTab skills={skills} tools={tools} />
          </TabsContent>
        </div>
      </Tabs>
    </main>
  )
}
