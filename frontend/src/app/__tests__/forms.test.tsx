import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ApiClient } from '../../api/client'
import { ReleaseClient, type CoachTurn, type Proposal, type Schedule, type SchedulePreferences } from '../../api/release'
import { AudioCoordinator } from '../../audio/audioCoordinator'
import { CoachPanel } from '../../features/coach/CoachPanel'
import { SchedulePanel } from '../../features/schedule/SchedulePanel'
import { BackendStore } from '../../store/backend'
import { SafeStorage } from '../../store/persistence'

let root: Root, host: HTMLDivElement, backend: BackendStore, client: ReleaseClient, audio: AudioCoordinator
const preferences: SchedulePreferences = { timezone: 'Asia/Almaty', duration_minutes: 30, revision: 4, availability: [{ weekday: 0, start_minute: 1080, end_minute: 1260 }] }
const schedule: Schedule = { timezone: 'Asia/Almaty', revision: 7, appointments: [], slots: [] }
const proposal: Proposal = { id: 'proposal', kind: 'schedule', payload: {}, source_revision: 7, payload_hash: 'hash', expires_at: '2099-01-01T00:00:00Z', status: 'pending', result: null }

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
  backend = new BackendStore(new ApiClient(), new SafeStorage()); client = new ReleaseClient(backend); audio = new AudioCoordinator()
  vi.spyOn(backend, 'request').mockImplementation(async <T,>(path: string) => {
    if (path === '/schedule/preferences') return structuredClone(preferences) as T
    if (path.startsWith('/schedule?')) return schedule as T
    if (path === '/schedule/proposals') return proposal as T
    return { configured: false, connected: false, sync_status: 'unavailable' } as T
  })
})
afterEach(() => { act(() => root.unmount()); host.remove(); audio.stop(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

function input(selector: string, value: string) {
  const element = host.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  act(() => { Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(element, value); element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true })) })
}
function click(label: string) {
  const button = [...host.querySelectorAll('button')].find(element => element.textContent === label)!
  act(() => button.click())
}

it('keeps native appointment validation, timezone help and proposal confirmation after editing', async () => {
  await act(async () => root.render(<SchedulePanel client={client} audio={audio} />))
  const date = host.querySelector<HTMLInputElement>('input[type=datetime-local]')!
  expect(date.required).toBe(true)
  expect(host.querySelector(`#${date.getAttribute('aria-describedby')}`)?.textContent).toBe('Asia/Almaty')
  click('Предложить изменение')
  expect(backend.request).not.toHaveBeenCalledWith('/schedule/proposals', expect.anything(), 'POST')
  input('.schedule-editor input:not([type])', 'Моя тренировка')
  input('input[type=datetime-local]', '2026-10-12T18:30')
  await act(async () => click('Предложить изменение'))
  expect(backend.request).toHaveBeenCalledWith('/schedule/proposals', expect.objectContaining({ action: 'create', title: 'Моя тренировка', starts_at: '2026-10-12T13:30:00.000Z', duration_minutes: 30, expected_revision: 7 }), 'POST')
  expect(host.querySelector('.proposal-card')?.textContent).toContain('Изменение ожидает вашего подтверждения')
  expect(host.querySelector<HTMLInputElement>('input[type=datetime-local]')?.value).toBe('2026-10-12T18:30')
})

it('saves individually labelled day/time controls without losing availability or revisions', async () => {
  await act(async () => root.render(<SchedulePanel client={client} audio={audio} />))
  expect(host.querySelector('input[aria-label="Пн · С"]')).not.toBeNull()
  input('input[aria-label="Пн · С"]', '17:15')
  input('input[type=number]', '45')
  const tuesday = host.querySelectorAll<HTMLInputElement>('input[type=checkbox]')[1]
  act(() => tuesday.click())
  expect(host.querySelector<HTMLInputElement>('input[aria-label="Вт · До"]')?.value).toBe('21:00')
  await act(async () => click('Сохранить доступное время'))
  expect(backend.request).toHaveBeenCalledWith('/schedule/preferences', {
    timezone: 'Asia/Almaty', duration_minutes: 45, expected_revision: 4,
    availability: [{ weekday: 0, start_minute: 1035, end_minute: 1260 }, { weekday: 1, start_minute: 1080, end_minute: 1260 }],
  }, 'PUT')
})

it('retains a coach draft on failure and clears it only after a successful retry', async () => {
  const turn = vi.spyOn(client, 'turn').mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ conversation_id: 'conversation', message_id: 'message', display_text: 'Готово', speech_text: '', source_references: [], proposal_ids: [], proposals: [], ui_actions: [], provenance: { execution_mode: 'fixture', model_used: null, cached: false, input_revision: '', prompt_version: '', generated_at: '' }, error_category: null } satisfies CoachTurn)
  act(() => root.render(<CoachPanel client={client} audio={audio} screen="planning" onAction={vi.fn()} />))
  input('textarea', 'Помоги спланировать неделю')
  await act(async () => host.querySelector('form')!.requestSubmit())
  expect(host.querySelector('textarea')?.value).toBe('Помоги спланировать неделю')
  expect(host.querySelector('[role=alert]')).not.toBeNull()
  await act(async () => host.querySelector('form')!.requestSubmit())
  expect(turn.mock.calls[1][0]).toBe('Помоги спланировать неделю')
  expect(turn.mock.calls[1][4]).toBe(turn.mock.calls[0][4])
  expect(host.querySelector('textarea')?.value).toBe('')
  expect(host.querySelector('.coach-transcript')?.textContent).toContain('Готово')
})
