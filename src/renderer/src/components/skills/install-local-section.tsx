import { FolderInput, FolderSearch, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { translate } from '@/i18n/i18n'

export function LocalSection({
  onSkillsChanged
}: {
  onSkillsChanged: () => Promise<void>
}): React.JSX.Element {
  const [folderPath, setFolderPath] = useState('')
  const [batchPath, setBatchPath] = useState('')
  const [scanning, setScanning] = useState(false)
  const [importing, setImporting] = useState(false)
  const [batchImporting, setBatchImporting] = useState(false)

  const handleScan = async (): Promise<void> => {
    setScanning(true)
    try {
      const imported = await window.api.skills.scanInstalledSkills()
      await onSkillsChanged()
      toast.success(
        imported.length === 0
          ? 'No new local skills found'
          : `Imported ${imported.length} skill${imported.length === 1 ? '' : 's'}`
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Scan failed')
    } finally {
      setScanning(false)
    }
  }

  const handleImport = async (path: string): Promise<void> => {
    if (!path.trim()) {
      return
    }
    setImporting(true)
    try {
      await window.api.skills.installLocal({ path: path.trim() })
      toast.success('Imported successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const handleBatchImport = async (): Promise<void> => {
    if (!batchPath.trim()) {
      return
    }
    setBatchImporting(true)
    try {
      const result = await window.api.skills.batchImportFolder({ path: batchPath.trim() })
      toast.success(`Imported ${result.length} skill${result.length !== 1 ? 's' : ''}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Batch import failed')
    } finally {
      setBatchImporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border border-border/50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">
              {translate('auto.components.skills.SkillsInstallTab.703f136a7b', 'Auto Detect')}
            </p>
            <p className="text-xs text-muted-foreground">
              {translate(
                'auto.components.skills.SkillsInstallTab.scanAllAgents',
                'Scan all agent directories for existing skills'
              )}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 shrink-0 gap-1.5 text-xs"
            disabled={scanning}
            onClick={() => void handleScan()}
          >
            {scanning ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <FolderSearch className="size-3.5" />
            )}
            {translate('auto.components.skills.SkillsInstallTab.87f33d6694', 'Scan Installed')}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <FolderInput className="size-3.5" />
          {translate('auto.components.skills.SkillsInstallTab.d72c59a97e', 'Import Folder')}
        </p>
        <div className="flex gap-2">
          <Input
            placeholder={translate(
              'auto.components.skills.SkillsInstallTab.c0fa279c87',
              'Path to skill folder...'
            )}
            value={folderPath}
            onChange={(e) => setFolderPath(e.target.value)}
            className="h-8 flex-1 bg-background/50 text-xs"
          />
          <Button
            size="sm"
            className="h-8 shrink-0 gap-1.5 text-xs"
            disabled={!folderPath.trim() || importing}
            onClick={() => void handleImport(folderPath)}
          >
            {importing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <FolderInput className="size-3.5" />
            )}
            {translate('auto.components.skills.SkillsInstallTab.cf9d382ca1', 'Import')}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <FolderSearch className="size-3.5" />
          {translate('auto.components.skills.SkillsInstallTab.batchImport', 'Batch Import')}
        </p>
        <div className="flex gap-2">
          <Input
            placeholder={translate(
              'auto.components.skills.SkillsInstallTab.batchPlaceholder',
              'Folder to scan for skills...'
            )}
            value={batchPath}
            onChange={(e) => setBatchPath(e.target.value)}
            className="h-8 flex-1 bg-background/50 text-xs"
          />
          <Button
            size="sm"
            className="h-8 shrink-0 gap-1.5 text-xs"
            disabled={!batchPath.trim() || batchImporting}
            onClick={() => void handleBatchImport()}
          >
            {batchImporting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <FolderSearch className="size-3.5" />
            )}
            {translate('auto.components.skills.SkillsInstallTab.scan', 'Scan')}
          </Button>
        </div>
      </div>
    </div>
  )
}
