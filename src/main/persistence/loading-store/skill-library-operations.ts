import type { SavedSkill, SkillPreset } from '../../../shared/skills'
import {
  listSavedSkills as listPersistedSavedSkills,
  listSkillPresets as listPersistedSkillPresets,
  removeSavedSkill as removePersistedSavedSkill,
  removeSkillPreset as removePersistedSkillPreset,
  saveSkill as savePersistedSkill,
  saveSkillPreset as savePersistedSkillPreset
} from '../../skills/skill-library-persistence'
import type { StoreRuntimeState } from './store-runtime-state'
import type { WriteSchedulingOperations } from './write-scheduling'
import { scheduleSave } from './write-scheduling'

type SkillLibraryRuntime = Pick<StoreRuntimeState, 'state'>

const skillLibraryOperationsContext = Symbol('SkillLibraryOperations')
type SkillLibraryOperationsContext = {
  runtime: SkillLibraryRuntime
  scheduling: WriteSchedulingOperations
}

export class SkillLibraryOperations {
  readonly [skillLibraryOperationsContext]: SkillLibraryOperationsContext

  constructor(runtime: SkillLibraryRuntime, scheduling: WriteSchedulingOperations) {
    this[skillLibraryOperationsContext] = { runtime, scheduling }
  }

  listSavedSkills(): SavedSkill[] {
    return listPersistedSavedSkills(this[skillLibraryOperationsContext].runtime.state)
  }

  saveSkill(skill: SavedSkill): SavedSkill {
    const saved = savePersistedSkill(this[skillLibraryOperationsContext].runtime.state, skill)
    scheduleSave(this[skillLibraryOperationsContext].scheduling)
    return saved
  }

  removeSavedSkill(skillId: string): void {
    if (removePersistedSavedSkill(this[skillLibraryOperationsContext].runtime.state, skillId)) {
      scheduleSave(this[skillLibraryOperationsContext].scheduling)
    }
  }

  listSkillPresets(): SkillPreset[] {
    return listPersistedSkillPresets(this[skillLibraryOperationsContext].runtime.state)
  }

  saveSkillPreset(preset: SkillPreset): SkillPreset {
    const saved = savePersistedSkillPreset(this[skillLibraryOperationsContext].runtime.state, preset)
    scheduleSave(this[skillLibraryOperationsContext].scheduling)
    return saved
  }

  removeSkillPreset(presetId: string): void {
    if (removePersistedSkillPreset(this[skillLibraryOperationsContext].runtime.state, presetId)) {
      scheduleSave(this[skillLibraryOperationsContext].scheduling)
    }
  }
}

export function installSkillLibraryOperationsContext(
  target: SkillLibraryOperations,
  source: SkillLibraryOperations
): void {
  Object.defineProperty(target, skillLibraryOperationsContext, {
    value: source[skillLibraryOperationsContext]
  })
}
