import { Download, GitBranch, Loader2, Search, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { translate } from '@/i18n/i18n'

type PreviewResult = {
  tempDir: string
  skills: {
    name: string
    relativePath: string
    description: string | null
    hasSkillMd: boolean
  }[]
}

export function GitSection(): React.JSX.Element {
  const [url, setUrl] = useState('')
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [previewing, setPreviewing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const toggleSkill = (id: string): void => {
    setSelectedSkills((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  }

  const handlePreview = async (): Promise<void> => {
    if (!url.trim()) {
      return
    }
    setPreviewing(true)
    setError(null)
    try {
      const result = await window.api.skills.previewGitInstall({ url: url.trim() })
      setPreviewResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed')
    } finally {
      setPreviewing(false)
    }
  }

  const handleConfirm = async (): Promise<void> => {
    if (!previewResult || selectedSkills.length === 0) {
      return
    }
    setConfirming(true)
    try {
      const selections = previewResult.skills
        .filter((s) => selectedSkills.includes(s.relativePath))
        .map((s) => ({ name: s.name, relativePath: s.relativePath }))
      await window.api.skills.confirmGitInstall({
        tempDir: previewResult.tempDir,
        selections
      })
      toast.success(`Installed ${selections.length} skill${selections.length !== 1 ? 's' : ''}`)
      setUrl('')
      setSelectedSkills([])
      setPreviewResult(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Install failed')
    } finally {
      setConfirming(false)
    }
  }

  const handleCancel = (): void => {
    setUrl('')
    setSelectedSkills([])
    setPreviewResult(null)
    setError(null)
  }

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-sm font-medium">
        <GitBranch className="size-3.5" />
        {translate('auto.components.skills.SkillsInstallTab.installFromGit', 'Install from Git')}
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="https://github.com/user/repo.git"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="h-8 flex-1 bg-background/50 text-xs"
          disabled={!!previewResult}
        />
        {!previewResult && (
          <Button
            size="sm"
            className="h-8 shrink-0 gap-1.5 text-xs"
            disabled={!url.trim() || previewing}
            onClick={() => void handlePreview()}
          >
            {previewing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Search className="size-3.5" />
            )}
            Preview
          </Button>
        )}
      </div>

      {previewResult && previewResult.skills.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {previewResult.skills.length} skill
            {previewResult.skills.length !== 1 ? 's' : ''} found
          </p>
          <div className="scrollbar-sleek max-h-48 space-y-0.5 overflow-y-auto">
            {previewResult.skills.map((skill) => (
              <button
                type="button"
                key={skill.relativePath}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent/40"
                onClick={() => toggleSkill(skill.relativePath)}
              >
                <Checkbox
                  checked={selectedSkills.includes(skill.relativePath)}
                  onCheckedChange={() => toggleSkill(skill.relativePath)}
                />
                <span className="truncate">{skill.name}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-7 flex-1 gap-1.5 text-xs"
              disabled={selectedSkills.length === 0 || confirming}
              onClick={() => void handleConfirm()}
            >
              {confirming ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              {translate('auto.components.skills.SkillsInstallTab.3719319720', 'Install')} (
              {selectedSkills.length})
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 text-xs"
              onClick={handleCancel}
            >
              <X className="size-3.5" />
              {translate('auto.components.skills.SkillsInstallTab.cancel', 'Cancel')}
            </Button>
          </div>
        </div>
      )}

      {previewResult && previewResult.skills.length === 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          {translate(
            'auto.components.skills.SkillsInstallTab.noSkillsFound',
            'No skills found in this repository'
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
