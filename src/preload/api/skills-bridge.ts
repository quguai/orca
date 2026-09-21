import { ipcRenderer } from 'electron'
import type {
  SkillDeletePlan,
  SkillDeleteRequest,
  SkillDeleteResult
} from '../../shared/skill-delete-contract'
import type { SkillDiscoveryResult, SkillDiscoveryTarget } from '../../shared/skills'
import type {
  CentralSkill,
  DiscoveredSkill,
  GitPreviewResult,
  SavedSkill,
  SkillPreset,
  SkillsShSkill,
  ToolInfo
} from '../../shared/skills'
import type {
  SkillCloudOwnedShare,
  SkillCloudOperation,
  SkillCloudPackageDetails
} from '../../shared/skill-cloud-contract'
import type {
  SkillBundleInstallPreviewInput,
  SkillBundleInstallPreviewOperation,
  SkillBundlePackageVersionInstallInput,
  SkillBundleShareInstallInput,
  SkillBundleShareInstallOperation,
  SkillInstallPreviewInput,
  SkillInstallPreviewOperation,
  ManagedSkillInstallListOperation,
  SkillPackageVersionInstallInput,
  SkillRemoveInput,
  SkillRemoveOperation,
  SkillShareInstallInput,
  SkillShareInstallOperation,
  SkillInstallCancelInput,
  SkillInstallProgress,
  SkillSharePreview,
  SkillShareProgress,
  SkillSharePublishInput,
  SkillSharePublishOperation,
  SkillShareResolvedOperation
} from '../../shared/skill-sharing-contract'
import type {
  SkillFreshnessInventory,
  SkillUpdateRun,
  SkillUpdateStartResult
} from '../../shared/skill-freshness'
import type { PreloadApi } from '../api-types'

export const skillsApi = {
  discover: (target?: SkillDiscoveryTarget): Promise<SkillDiscoveryResult> =>
    ipcRenderer.invoke('skills:discover', target),
  listSaved: (): Promise<SavedSkill[]> => ipcRenderer.invoke('skills:listSaved'),
  save: (args: { skill: DiscoveredSkill }): Promise<SavedSkill> =>
    ipcRenderer.invoke('skills:save', args),
  remove: (args: { skillId: string }): Promise<void> => ipcRenderer.invoke('skills:remove', args),
  listPresets: (): Promise<SkillPreset[]> => ipcRenderer.invoke('skills:listPresets'),
  savePreset: (args: { id?: string; name: string; skillIds: string[] }): Promise<SkillPreset> =>
    ipcRenderer.invoke('skills:savePreset', args),
  removePreset: (args: { presetId: string }): Promise<void> =>
    ipcRenderer.invoke('skills:removePreset', args),
  list: (): Promise<CentralSkill[]> => ipcRenderer.invoke('skills:list'),
  getDocument: (args: { skillId: string }): Promise<string | null> =>
    ipcRenderer.invoke('skills:getDocument', args),
  deleteCentral: (args: { skillId: string }): Promise<void> =>
    ipcRenderer.invoke('skills:deleteCentral', args),
  installLocal: (args: { path: string; name?: string }): Promise<CentralSkill> =>
    ipcRenderer.invoke('skills:installLocal', args),
  installGit: (args: { url: string }): Promise<CentralSkill> =>
    ipcRenderer.invoke('skills:installGit', args),
  installFromMarketplace: (args: { source: string; name: string }): Promise<CentralSkill> =>
    ipcRenderer.invoke('skills:installFromMarketplace', args),
  previewGitInstall: (args: { url: string }): Promise<GitPreviewResult> =>
    ipcRenderer.invoke('skills:previewGitInstall', args),
  confirmGitInstall: (args: {
    tempDir: string
    selections: { relativePath: string; name: string }[]
  }): Promise<CentralSkill[]> => ipcRenderer.invoke('skills:confirmGitInstall', args),
  checkUpdate: (args: { skillId: string }): Promise<CentralSkill> =>
    ipcRenderer.invoke('skills:checkUpdate', args),
  checkAllUpdates: (): Promise<void> => ipcRenderer.invoke('skills:checkAllUpdates'),
  scanInstalledSkills: (): Promise<CentralSkill[]> =>
    ipcRenderer.invoke('skills:scanInstalledSkills'),
  batchImportFolder: (args: { path: string }): Promise<CentralSkill[]> =>
    ipcRenderer.invoke('skills:batchImportFolder', args),
  syncToTool: (args: { skillId: string; toolKey: string }): Promise<void> =>
    ipcRenderer.invoke('skills:syncToTool', args),
  unsyncFromTool: (args: { skillId: string; toolKey: string }): Promise<void> =>
    ipcRenderer.invoke('skills:unsyncFromTool', args),
  getToolsStatus: (): Promise<ToolInfo[]> => ipcRenderer.invoke('skills:getToolsStatus'),
  marketplaceFetchLeaderboard: (args: {
    sort: 'hot' | 'trending' | 'all_time'
  }): Promise<SkillsShSkill[]> => ipcRenderer.invoke('skills:marketplace:fetchLeaderboard', args),
  marketplaceSearch: (args: { query: string }): Promise<SkillsShSkill[]> =>
    ipcRenderer.invoke('skills:marketplace:search', args),
  freshnessInventory: (): Promise<SkillFreshnessInventory> =>
    ipcRenderer.invoke('skills:freshnessInventory'),
  startUpdateRun: (names: string[]): Promise<SkillUpdateStartResult> =>
    ipcRenderer.invoke('skills:startUpdateRun', names),
  cancelUpdateRun: (): Promise<void> => ipcRenderer.invoke('skills:cancelUpdateRun'),
  acknowledgeUpdateRun: (): Promise<void> => ipcRenderer.invoke('skills:acknowledgeUpdateRun'),
  getUpdateRun: (): Promise<SkillUpdateRun> => ipcRenderer.invoke('skills:getUpdateRun'),
  prepareShare: (input: {
    skillIds: string[]
    bundleName: string
    target?: SkillDiscoveryTarget
    packageId?: string
  }): Promise<SkillSharePreview> => ipcRenderer.invoke('skills:prepareShare', input),
  publishShare: (input: SkillSharePublishInput): Promise<SkillSharePublishOperation> =>
    ipcRenderer.invoke('skills:publishShare', input),
  cancelShare: (preparationId: string): Promise<void> =>
    ipcRenderer.invoke('skills:cancelShare', preparationId),
  releaseShare: (preparationId: string): Promise<void> =>
    ipcRenderer.invoke('skills:releaseShare', preparationId),
  resolveShare: (shareId: string): Promise<SkillShareResolvedOperation> =>
    ipcRenderer.invoke('skills:resolveShare', shareId),
  installShare: (input: SkillShareInstallInput): Promise<SkillShareInstallOperation> =>
    ipcRenderer.invoke('skills:installShare', input),
  installBundleShare: (
    input: SkillBundleShareInstallInput
  ): Promise<SkillBundleShareInstallOperation> =>
    ipcRenderer.invoke('skills:installBundleShare', input),
  installBundlePackageVersion: (
    input: SkillBundlePackageVersionInstallInput
  ): Promise<SkillBundleShareInstallOperation> =>
    ipcRenderer.invoke('skills:installBundlePackageVersion', input),
  installPackageVersion: (
    input: SkillPackageVersionInstallInput
  ): Promise<SkillShareInstallOperation> =>
    ipcRenderer.invoke('skills:installPackageVersion', input),
  cancelInstall: (input: SkillInstallCancelInput): Promise<{ cancelled: boolean }> =>
    ipcRenderer.invoke('skills:cancelInstall', input),
  previewInstall: (input: SkillInstallPreviewInput): Promise<SkillInstallPreviewOperation> =>
    ipcRenderer.invoke('skills:previewInstall', input),
  previewBundleInstall: (
    input: SkillBundleInstallPreviewInput
  ): Promise<SkillBundleInstallPreviewOperation> =>
    ipcRenderer.invoke('skills:previewBundleInstall', input),
  removeInstall: (input: SkillRemoveInput): Promise<SkillRemoveOperation> =>
    ipcRenderer.invoke('skills:removeInstall', input),
  // Desktop always registers the delete IPC handlers in its own main process.
  deleteSupported: (): Promise<boolean> => Promise.resolve(true),
  previewDelete: (request: SkillDeleteRequest): Promise<SkillDeletePlan> =>
    ipcRenderer.invoke('skills:previewDelete', request),
  delete: (request: SkillDeleteRequest): Promise<SkillDeleteResult> =>
    ipcRenderer.invoke('skills:delete', request),
  listManagedInstalls: (environmentId?: string): Promise<ManagedSkillInstallListOperation> =>
    ipcRenderer.invoke('skills:listManagedInstalls', environmentId),
  getPackage: (packageId: string): Promise<SkillCloudOperation<SkillCloudPackageDetails>> =>
    ipcRenderer.invoke('skills:getPackage', packageId),
  listOwnedShares: (): Promise<SkillCloudOperation<SkillCloudOwnedShare[]>> =>
    ipcRenderer.invoke('skills:listOwnedShares'),
  revokeShare: (shareId: string): Promise<SkillCloudOperation<void>> =>
    ipcRenderer.invoke('skills:revokeShare', shareId),
  deletePackageVersion: (input: {
    packageId: string
    versionId: string
  }): Promise<SkillCloudOperation<void>> =>
    ipcRenderer.invoke('skills:deletePackageVersion', input),
  deletePackage: (packageId: string): Promise<SkillCloudOperation<void>> =>
    ipcRenderer.invoke('skills:deletePackage', packageId),
  listWslDistros: (environmentId?: string): Promise<string[]> =>
    ipcRenderer.invoke('skills:listWslDistros', environmentId),
  onInstallProgress: (callback: (progress: SkillInstallProgress) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: SkillInstallProgress): void =>
      callback(progress)
    ipcRenderer.on('skills:installProgress', listener)
    return () => ipcRenderer.removeListener('skills:installProgress', listener)
  },
  onShareProgress: (callback: (progress: SkillShareProgress) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: SkillShareProgress): void =>
      callback(progress)
    ipcRenderer.on('skills:shareProgress', listener)
    return () => ipcRenderer.removeListener('skills:shareProgress', listener)
  },
  onUpdateRun: (callback: (run: SkillUpdateRun) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, run: SkillUpdateRun): void => callback(run)
    ipcRenderer.on('skills:updateRun', listener)
    return () => ipcRenderer.removeListener('skills:updateRun', listener)
  }
} satisfies PreloadApi['skills']
