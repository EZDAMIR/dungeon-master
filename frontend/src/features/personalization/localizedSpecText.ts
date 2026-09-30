import { translateUi, type UiLanguage } from '../../shared/uiLanguage'
import { localized, type Messages, type MovementSpec } from '../../vision/exercises/generic/types'

/** Resolve existing multilingual coaching data at the presentation boundary. */
export function localizedSpecText(text: string, spec: MovementSpec | null, language: UiLanguage) {
  if (!spec) return translateUi(text, language)
  const messages: (Messages | null)[] = [
    spec.calibration.messages,
    ...spec.phases.map(phase => phase.messages),
    ...spec.error_rules.flatMap(rule => [rule.messages, rule.secondary]),
    ...Object.values(spec.coach_messages).flatMap(cue => [cue.messages, cue.secondary]),
  ]
  const match = messages.find(group => group && Object.values(group).includes(text))
  return translateUi(match ? localized(match, language, 160, text) : text, language)
}
