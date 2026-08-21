import type {
  CentralSkill,
  DiscoveredSkill,
  GitPreviewResult,
  SavedSkill,
  SkillDiscoveryResult,
  SkillDiscoveryTarget,
  SkillPreset,
  SkillsShSkill,
  ToolInfo
} from '../../shared/skills'
import type {
  SkillCloudOperation,
  SkillCloudOwnedShare,
  SkillCloudPackageDetails
} from '../../shared/skill-cloud-contract'
import type {
  ManagedSkillInstallListOperation,
  SkillBundleInstallPreviewInput,
  SkillBundleInstallPreviewOperation,
  SkillBundlePackageVersionInstallInput,
  SkillBundleShareInstallInput,
  SkillBundleShareInstallOperation,
  SkillInstallCancelInput,
  SkillInstallPreviewInput,
  SkillInstallPreviewOperation,
  SkillInstallProgress,
  SkillPackageVersionInstallInput,
  SkillRemoveInput,
  SkillRemoveOperation,
  SkillShareInstallInput,
  SkillShareInstallOperation,
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

export type SkillsApi = {
  discover: (target?: SkillDiscoveryTarget) => Promise<SkillDiscoveryResult>
  listSaved: () => Promise<SavedSkill[]>
  save: (args: { skill: DiscoveredSkill }) => Promise<SavedSkill>
  remove: (args: { skillId: string }) => Promise<void>
  listPresets: () => Promise<SkillPreset[]>
  savePreset: (args: { id?: string; name: string; skillIds: string[] }) => Promise<SkillPreset>
  removePreset: (args: { presetId: string }) => Promise<void>
  list: () => Promise<CentralSkill[]>
  getDocument: (args: { skillId: string }) => Promise<string | null>
  delete: (args: { skillId: string }) => Promise<void>
  installLocal: (args: { path: string; name?: string }) => Promise<CentralSkill>
  installGit: (args: { url: string }) => Promise<CentralSkill>
  installFromMarketplace: (args: { source: string; name: string }) => Promise<CentralSkill>
  previewGitInstall: (args: { url: string }) => Promise<GitPreviewResult>
  confirmGitInstall: (args: {
    tempDir: string
    selections: { relativePath: string; name: string }[]
  }) => Promise<CentralSkill[]>
  checkUpdate: (args: { skillId: string }) => Promise<CentralSkill>
  checkAllUpdates: () => Promise<void>
  scanInstalledSkills: () => Promise<CentralSkill[]>
  batchImportFolder: (args: { path: string }) => Promise<CentralSkill[]>
  syncToTool: (args: { skillId: string; toolKey: string }) => Promise<void>
  unsyncFromTool: (args: { skillId: string; toolKey: string }) => Promise<void>
  getToolsStatus: () => Promise<ToolInfo[]>
  marketplaceFetchLeaderboard: (args: {
    sort: 'hot' | 'trending' | 'all_time'
  }) => Promise<SkillsShSkill[]>
  marketplaceSearch: (args: { query: string }) => Promise<SkillsShSkill[]>
  freshnessInventory: () => Promise<SkillFreshnessInventory>
  startUpdateRun: (names: string[]) => Promise<SkillUpdateStartResult>
  cancelUpdateRun: () => Promise<void>
  acknowledgeUpdateRun: () => Promise<void>
  getUpdateRun: () => Promise<SkillUpdateRun>
  prepareShare: (input: {
    skillIds: string[]
    bundleName: string
    target?: SkillDiscoveryTarget
    packageId?: string
  }) => Promise<SkillSharePreview>
  publishShare: (input: SkillSharePublishInput) => Promise<SkillSharePublishOperation>
  cancelShare: (preparationId: string) => Promise<void>
  releaseShare: (preparationId: string) => Promise<void>
  resolveShare: (shareId: string) => Promise<SkillShareResolvedOperation>
  installShare: (input: SkillShareInstallInput) => Promise<SkillShareInstallOperation>
  installBundleShare: (
    input: SkillBundleShareInstallInput
  ) => Promise<SkillBundleShareInstallOperation>
  installBundlePackageVersion: (
    input: SkillBundlePackageVersionInstallInput
  ) => Promise<SkillBundleShareInstallOperation>
  installPackageVersion: (
    input: SkillPackageVersionInstallInput
  ) => Promise<SkillShareInstallOperation>
  cancelInstall: (input: SkillInstallCancelInput) => Promise<{ cancelled: boolean }>
  previewInstall: (input: SkillInstallPreviewInput) => Promise<SkillInstallPreviewOperation>
  previewBundleInstall: (
    input: SkillBundleInstallPreviewInput
  ) => Promise<SkillBundleInstallPreviewOperation>
  removeInstall: (input: SkillRemoveInput) => Promise<SkillRemoveOperation>
  listManagedInstalls: (environmentId?: string) => Promise<ManagedSkillInstallListOperation>
  getPackage: (packageId: string) => Promise<SkillCloudOperation<SkillCloudPackageDetails>>
  listOwnedShares: () => Promise<SkillCloudOperation<SkillCloudOwnedShare[]>>
  revokeShare: (shareId: string) => Promise<SkillCloudOperation<void>>
  deletePackageVersion: (input: {
    packageId: string
    versionId: string
  }) => Promise<SkillCloudOperation<void>>
  deletePackage: (packageId: string) => Promise<SkillCloudOperation<void>>
  listWslDistros: (environmentId?: string) => Promise<string[]>
  onInstallProgress: (callback: (progress: SkillInstallProgress) => void) => () => void
  onShareProgress: (callback: (progress: SkillShareProgress) => void) => () => void
  onUpdateRun: (callback: (run: SkillUpdateRun) => void) => () => void
}
