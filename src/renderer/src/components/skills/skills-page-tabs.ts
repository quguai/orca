import { Download, FolderOpen, LayoutDashboard, Library } from 'lucide-react'

export type SkillsPageTab = 'dashboard' | 'my-skills' | 'install' | 'workspaces'

export type SkillsInstallTab = 'market' | 'local' | 'git'

export const skillsPageTabs = [
  { id: 'dashboard', icon: LayoutDashboard },
  { id: 'my-skills', icon: Library },
  { id: 'install', icon: Download },
  { id: 'workspaces', icon: FolderOpen }
] satisfies {
  id: SkillsPageTab
  icon: React.ComponentType<{ className?: string }>
}[]

export const skillsInstallTabs = [{ id: 'market' }, { id: 'local' }, { id: 'git' }] satisfies {
  id: SkillsInstallTab
}[]
