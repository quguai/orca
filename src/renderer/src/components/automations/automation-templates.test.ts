import { afterEach, describe, expect, it } from 'vitest'
import { i18n } from '@/i18n/i18n'
import { getAutomationTemplates } from './automation-templates'

afterEach(async () => {
  await i18n.changeLanguage('en')
})

describe('automation templates', () => {
  it('uses the weekly-report skill without Orca evidence injection', async () => {
    await i18n.changeLanguage('zh')

    const weeklyReport = getAutomationTemplates().find(
      (template) => template.id === 'weekly-report'
    )

    expect(weeklyReport).toMatchObject({
      kind: 'global_task',
      category: '周报',
      label: '本周产品研发周报',
      name: '本周产品研发周报',
      description: '使用 a1-weekly-report Skill 生成结构化周报。',
      prompt: '使用 $a1-weekly-report 按推荐直接生成本周周报。'
    })
    expect(weeklyReport?.prompt).not.toContain('Orca')
  })
})
