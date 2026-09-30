# Figma alignment patch для Sprint 4A prompt

## Как применить

Вставить разделы 5A–20A ниже сразу после раздела «ОБЯЗАТЕЛЬНО ПРОЧИТАТЬ»
исходного prompt Sprint 4A. Они заменяют прежние разделы про visible
personalization, demo personas, frontend pages и соответствующую часть Definition
of Done. Затем применить дополнения к schema-разделам в конце этого документа.
Не оставлять рядом противоречащие версии требований.

Исходный prompt Sprint 4A предоставлен пользователем. Объединённая версия
с применённым patch находится в [SPRINT_4A_AGENT_PROMPT.md](SPRINT_4A_AGENT_PROMPT.md).
Корневой `AGENT_PROMPT.md` посвящён Sprint 0 и сохранён. Этот файл — блок
для вставки, а не полный prompt Sprint 4A и не отчёт о реализации. JSON ниже
показывает дополнения к существующим контрактам, а не полные схемы.

Количество Figma frames, masters и styles ниже указано по заданию; фактическая
проверка Figma, handoff и production screenshots выполняется при реализации.
Файлы `FIGMA_SPRINT_4A_MAP.md` и `FIGMA_VISUAL_QA.md` должны фиксировать реальные
node IDs и результаты проверки; не заполнять их вымышленными данными.

## 5A. FIGMA ЯВЛЯЕТСЯ SOURCE OF TRUTH ДЛЯ UX/UI

Существующий Figma-файл: **Dungeon Master — Motion Studio**.

Существующий дизайн является обязательным источником истины для:

- information architecture;
- user flow;
- visual hierarchy;
- colors;
- typography;
- spacing;
- responsive behavior;
- camera coaching layout;
- loading/error/recovery states;
- component variants;
- wording hierarchy.

Не создавай отдельный новый AI-dashboard и не заменяй текущую визуальную систему.

Существующий Figma содержит:

- 54 screens/states;
- 43 desktop frames;
- 10 mobile frames;
- 1 tablet frame;
- clickable desktop/mobile flows;
- 27 reusable component masters;
- 10 text styles.

Основной flow:

```text
CONTEXT
  -> PERSONALIZED PLAN
  -> CAMERA SETUP
  -> CAMERA COACHING
  -> RESULTS
  -> PROGRESS
```

Перед frontend-изменениями:

1. Открой Figma Dungeon Master — Motion Studio.
2. Изучи clickable prototype.
3. Изучи desktop, mobile и tablet frames.
4. Найди component masters и text styles.
5. Не угадывай значения цветов, шрифтов, радиусов и spacing.
6. Используй точные Figma/CSS tokens из handoff.
7. Создай `docs/FIGMA_SPRINT_4A_MAP.md`.

Формат:

| Figma frame/node | Screen/state | Route/AppMode | Code component | Data source | Desktop/mobile |
|---|---|---|---|---|---|

Для каждого нового Sprint 4A состояния укажи его существующий Figma frame.

Если новый backend state уже визуально представлен существующим error/loading
frame, переиспользуй его вместо создания нового дизайна.

Если Figma временно недоступен:

- используй существующий design handoff;
- используй существующие CSS tokens;
- не изобретай новый стиль;
- явно перечисли frames, которые не удалось проверить.

## 5B. НЕ СОЗДАВАТЬ ПАРАЛЛЕЛЬНУЮ INFORMATION ARCHITECTURE

Не создавай в главном MENU набор новых несвязанных разделов:

- AI Context;
- AI Profile;
- Documents;
- Demo Personas;
- AI Plan;
- Exercise Drafts;

как отдельные generic dashboard cards, если это расходится с Figma.

Вместо этого встрой функции в существующий flow:

```text
ONBOARDING / CONTEXT
  -> данные пользователя;
  -> цели;
  -> предпочтения;
  -> coach style;
  -> optional document upload.

DOCUMENT REVIEW
  -> extracted facts;
  -> source quote;
  -> confirm/reject;
  -> delete source;
  -> continue.

PERSONALIZED PLAN
  -> AI summary;
  -> why this plan;
  -> daily plan;
  -> exercise details;
  -> source chips;
  -> swaps.

CAMERA COACH
  -> existing camera shell;
  -> generated instructions;
  -> generated phases;
  -> rep counting;
  -> concrete correction.

RESULTS
  -> existing result layout;
  -> personalized recommendation.

PROGRESS
  -> existing progress system.
```

Demo Persona Selector является jury/development shortcut, а не основной
пользовательской навигацией.

Разрешён dev-only entry: `?juryDemo=1`.

Он открывает persona switcher, после которого пользователь попадает в обычный
существующий onboarding/plan flow.

## 6A. ВИЗУАЛЬНАЯ СИСТЕМА

Сохрани две визуальные среды существующего Figma.

PLANNING MODE:

- warm ivory background;
- editorial layout;
- condensed display headings;
- calm text hierarchy;
- source-linked cards;
- restrained accents;
- generous whitespace.

WORKOUT MODE:

- graphite/dark surface;
- citron as the primary counter/action/accent color;
- high contrast;
- minimal text;
- distance-readable hierarchy;
- camera is the primary canvas.

Не добавляй:

- generic SaaS dashboard styling;
- glassmorphism;
- random gradients;
- purple AI glow;
- generic chatbot bubbles;
- unrelated neon colors;
- новую typography system;
- новую icon language.

Не угадывай HEX values. Используй exact values из Figma tokens/handoff.

Создай или обнови CSS variables на основе Figma:

- planning background;
- planning surface;
- planning text;
- graphite background;
- graphite surface;
- citron accent;
- border colors;
- feedback warning;
- feedback success;
- typography tokens;
- spacing tokens;
- radius tokens.

Не создавай 54 отдельных React pages. Переиспользуй компоненты и variants для
состояний.

## 6B. COMPONENT REUSE

Перед созданием нового компонента проверь:

- существующий React component;
- Figma component master;
- существующий state/variant;
- существующий CSS token.

Сохрани или создай аналоги существующих Figma components:

- EditorialPageShell;
- SectionHeader;
- ContextCard;
- SourceChip;
- DocumentCard;
- ExtractedFactCard;
- ConfirmationControls;
- PersonaCard;
- PlanDayCard;
- ExercisePlanCard;
- CameraCoachingBadge;
- ExerciseDetailPanel;
- SwapExercisePanel;
- CameraCoachShell;
- DistanceCue;
- RepCounter;
- TrackingStatus;
- RecoveryPanel;
- RestPanel;
- ResultMetric;
- ProgressCard;
- GestureNavigationHint.

Названия разрешено адаптировать под существующий codebase.
Не дублируй визуально одинаковые components разными реализациями.

## 7A. FIGMA-ALIGNED PERSONAS

Замени generic personas Beginner / Active / Office на существующие personas.

### MAYA — LOW-IMPACT RETURN

Основная история:

- возвращается к регулярным тренировкам;
- предпочитает спокойный, поддерживающий стиль;
- хочет контролируемые low-impact sessions;
- нуждается в понятных коротких подсказках;
- избегает резких и прыжковых движений.

AI должен визуально показать:

- calm/supportive coach persona;
- lower-impact exercise selection;
- controlled tempo;
- longer recovery;
- shorter sets;
- gentle progression;
- причины исключения high-impact exercises.

### ARMAN — STRENGTH

Основная история:

- strength-focused user;
- выше тренировочный объём;
- доступно оборудование;
- предпочитает energetic или strict coach persona;
- готов к более сложной структуре плана.

AI должен визуально показать:

- strength-oriented exercise selection;
- higher sets/reps или harder variants;
- shorter rest where appropriate;
- energetic/strict copy;
- equipment-aware plan;
- более насыщенную weekly structure.

### DANA — DESK RESET

Основная история:

- много времени проводит за компьютером;
- хочет короткие восстановительные сессии;
- предпочитает standing movements;
- нуждается в простом коротком плане;
- план может включать desk reset, morning и pre-sleep blocks.

AI должен визуально показать:

- short 5–10 minute routines;
- desk reset blocks;
- standing exercises;
- concise supportive coach;
- morning/pre-sleep routine suggestions;
- ограничения, если они заданы profile/document facts.

Не создавай persona D, E или F в Sprint 4A.

Жюри должно сравнить Maya, Arman и Dana за 20–30 секунд и сразу увидеть:

- разные планы;
- разные упражнения;
- разный объём;
- разный темп;
- разные coach messages;
- разные routine blocks.

## 8A. FIGMA-ALIGNED JURY FLOW

Главный jury flow:

1. Открыть Jury Persona Switcher.
2. Выбрать Maya.
3. Увидеть заполненный context.
4. Открыть synthetic source document.
5. Увидеть extracted facts.
6. Confirm/reject facts.
7. Сгенерировать personalized plan.
8. Увидеть why-this-plan и source-linked reasons.
9. Открыть exercise details.
10. При необходимости выполнить swap.
11. Начать camera coaching.
12. Увидеть конкретную ошибку.
13. Исправить движение.
14. Завершить подход.
15. Увидеть personalized result.
16. Открыть progress.
17. Вернуться и выбрать Arman или Dana.
18. Увидеть другой AI Profile и другой plan.

Весь flow должен занимать максимум 3–5 минут.

Не заставляй жюри:

- вручную заполнять большой профиль;
- ждать долгую AI generation;
- читать весь документ;
- проходить все 54 состояния;
- создавать аккаунт;
- вводить medical information.

Synthetic personas должны загружаться мгновенно.

## 9A. DOCUMENT UX ДОЛЖЕН СООТВЕТСТВОВАТЬ FIGMA

Используй существующие состояния document flow:

- empty;
- selected;
- uploading;
- extracting;
- extracted;
- review;
- confirmed;
- unreadable;
- offline;
- failed;
- deleted/source removed.

Document review показывает не весь документ, а extracted facts.

Каждый fact card показывает:

- normalized fact;
- короткий source excerpt;
- source document;
- confidence, если предусмотрено Figma;
- Confirm;
- Reject.

После подтверждения пользователь видит: «Использовано для персонализации».

Plan UI должен связывать решение с источником.

Примеры source chips:

- «Из профиля: 15 минут»;
- «Из предпочтений: спокойный темп»;
- «Из документа: избегать высокой ударной нагрузки»;
- «Из прогресса: слишком быстрый темп в прошлой тренировке».

Удаление document/source должно использовать существующий deletion state.
Не выводи full raw document на экран по умолчанию.

## 10A. AI PROFILE НЕ ДОЛЖЕН ВЫГЛЯДЕТЬ КАК CHATBOT

Не создавай чат с AI.

AI Profile отображается как editorial summary внутри context/plan flow.

Показывай:

- краткий summary;
- goals;
- schedule;
- equipment;
- preferences;
- confirmed constraints;
- coach persona;
- personalization highlights.

Основной заголовок: «Что тренер учёл» или существующий Figma copy.

Не используй:

- AI avatar bubble;
- typing indicator bubble;
- message thread;
- prompt field как основной UI;
- generic sparkle icon everywhere.

AI должен ощущаться через качество персонализации, а не через чат-интерфейс.

## 11A. SOURCE-LINKED PLAN

Каждый plan item должен поддерживать:

- reason;
- source references;
- camera coaching status;
- exercise source;
- details;
- swap action.

Plan item visual states:

- predefined + validated camera coach;
- AI-generated + experimental camera coach;
- manual-only;
- excluded/replaced.

Показывай:

- exercise name;
- sets × reps;
- tempo;
- rest;
- reason;
- camera angle;
- camera coach badge;
- source chips.

Exercise details panel:

- short instruction;
- camera placement;
- target joints/body area;
- expected phases;
- common generated corrections;
- reason for selection;
- alternative/swap.

Swap должен сохранять profile constraints и показывать причину замены.

## 12A. MORNING / DESK RESET / PRE-SLEEP ROUTINES

AI plan может дополнительно вернуть lightweight routine blocks:

- morning_reset;
- desk_reset;
- pre_sleep.

Эти blocks существуют отдельно от основной workout session.

Пример schema:

```json
{
  "routine_type": "desk_reset",
  "title": "Desk Reset",
  "estimated_minutes": 7,
  "items": [],
  "camera_coaching_available": true
}
```

`items` заполняется элементами routine из AI response; пустой массив здесь только
показывает структуру примера.

Routine blocks:

- отображаются существующими Figma cards;
- не обязаны иметь camera coaching для каждого item;
- могут использовать timer/manual completion;
- не заменяют основной workout;
- помогают визуально показать различия Maya / Arman / Dana.

Dana должна особенно демонстрировать desk reset.
Не добавляй routines, если их нет в AI response.

## 13A. CAMERA COACH ДОЛЖЕН ПЕРЕИСПОЛЬЗОВАТЬ FIGMA WORKOUT SHELL

Generic MovementSpec не генерирует новый layout.

Для любого упражнения используется единый Figma Camera Coach shell.

Dynamic fields:

- exercise name;
- camera angle;
- camera placement instruction;
- current phase;
- target reps;
- rep count;
- primary cue;
- secondary explanation;
- skeleton/highlight;
- tracking state;
- recovery instruction;
- coach persona;
- audio state.

Workout shell визуально разделён на:

1. TRACKING — person/body visibility, camera angle, skeleton, calibration state.
2. REPETITIONS — current / target, current phase, tempo/progress.
3. RECOVERY / CORRECTION — one primary correction, short secondary explanation,
   rest/recovery status.

Не смешивай эти данные в один debug panel.
Не показывай одновременно несколько competing error messages.

Приоритет:

```text
tracking/readiness error
  -> technique correction
  -> positive feedback
  -> neutral phase instruction
```

## 14A. DISTANCE-READABLE COACHING COPY

Используй существующий Figma-паттерн большой одиночной команды:
**SLOW THE WAY DOWN**.

Primary coaching cue:

- один смысл;
- максимум две строки;
- крупный display style;
- расположен в верхней или центральной видимой зоне;
- high contrast;
- читается с расстояния полного-body camera setup;
- не перекрывается skeleton/HUD;
- остаётся достаточно долго для прочтения.

Generated cue limits:

- primary cue: максимум 56 Unicode characters;
- maximum 2 visual lines;
- secondary explanation: максимум 120 characters;
- phase label: максимум 32 characters;
- exercise title: максимум 48 characters.

Если AI вернул более длинный текст:

1. backend/schema rejects или сокращает structured output;
2. frontend использует short fallback;
3. никогда не уменьшает font до нечитаемого размера.

Coach persona меняет tone, но не длину и визуальную иерархию.

Examples:

- calm: «Медленнее опускайся»;
- energetic: «Контроль вниз — отлично!»;
- strict: «Вернись в исходное положение»;
- supportive: «Почти получилось — чуть ниже».

## 15A. LOCALIZED COACH MESSAGES

Figma предусматривает Russian/Kazakh cue previews.

MovementSpec coach messages должны поддерживать:

```json
{
  "ru": "...",
  "kk": "...",
  "en": "..."
}
```

Минимально для:

- calibration instruction;
- ready;
- current phase;
- good repetition;
- every correction;
- tracking recovery;
- completed.

Preferred language выбирается из profile/persona.

Fallback:

```text
requested language
  -> ru
  -> en
  -> stable system message
```

Не вызывать LLM во время workout для перевода.
Messages создаются вместе с MovementSpec и валидируются заранее.

## 16A. VOICE COACHING В SPRINT 4A

Сохрани существующий Figma voice coaching toggle и audio states.

В Sprint 4A:

- использовать SpeechSynthesis или существующие local sounds;
- не использовать ElevenLabs;
- не заявлять, что ElevenLabs подключён;
- не включать microphone capture без отдельного реализованного use case;
- не показывать активный mic, если приложение не слушает пользователя.

UI states:

- voice on;
- voice muted;
- speech unavailable;
- visual-only fallback.

Russian/Kazakh preview разрешён.
ElevenLabs остаётся annotation / planned integration для Sprint 4B.

## 17A. RESPONSIVE IMPLEMENTATION

Desktop является главным jury target.

Также реализуй Figma-defined responsive states:

- соответствующие mobile frames;
- tablet camera frame;
- existing mobile navigation;
- distance cue behavior;
- document review stacking;
- plan card stacking;
- camera overlay safe areas.

Не придумывай новые breakpoints без причины.
Используй размеры существующих Figma frames и handoff tokens.

На mobile:

- primary cue остаётся крупным;
- camera занимает основную площадь;
- counter не перекрывает лицо/тело;
- gesture targets остаются достаточно крупными;
- source chips могут scroll/wrap;
- details открываются как sheet, если это задано Figma.

## 18A. ERROR / LOADING / FALLBACK STATES

Переиспользуй существующие Figma states для:

- camera denied;
- tracking lost;
- wrong camera angle;
- body outside frame;
- document unreadable;
- extraction failed;
- AI unavailable;
- offline;
- deterministic fallback;
- invalid MovementSpec;
- manual-only exercise;
- early stop;
- source deleted;
- sync pending.

Каждый error state содержит:

- что произошло;
- что пользователь может сделать;
- primary action;
- secondary/back action;
- no internal exception details.

AI fallback state:

«AI временно недоступен. Мы подготовили базовый план по вашим настройкам».

Invalid MovementSpec:

«Для этого упражнения пока доступно ручное выполнение».

Не показывай raw JSON validation errors пользователю.

## 19A. DESIGN QA

Создай `docs/FIGMA_VISUAL_QA.md`.

Для каждого реализованного Sprint 4A screen укажи:

- Figma node/frame;
- frontend route/state;
- tested viewport;
- responsive counterpart;
- implementation status;
- known visual deviation.

Обязательная visual review:

- Context intake;
- Document upload;
- Fact review;
- Personalized plan;
- Exercise details;
- Camera Coach;
- Error correction;
- Results;
- Progress;
- Maya;
- Arman;
- Dana;
- mobile planning;
- mobile camera;
- tablet camera.

Сравни production screenshots с Figma.

Проверь:

- typography;
- hierarchy;
- spacing;
- colors;
- radii;
- component states;
- overflow;
- localized copy;
- generated long content;
- empty states;
- loading states;
- distance readability.

Не считать screen готовым только потому, что он функционально работает.

## 20A. FIGMA-ALIGNED DEFINITION OF DONE

Добавь к Sprint 4A Definition of Done:

- [ ] Existing Figma remains the UI source of truth.
- [ ] docs/FIGMA_SPRINT_4A_MAP.md создан.
- [ ] docs/FIGMA_VISUAL_QA.md создан.
- [ ] Не создан параллельный generic AI dashboard.
- [ ] Warm ivory planning visual language сохранён.
- [ ] Graphite/citron workout visual language сохранён.
- [ ] Existing typography hierarchy сохранена.
- [ ] Existing component masters переиспользованы в коде.
- [ ] Maya persona реализована.
- [ ] Arman persona реализована.
- [ ] Dana persona реализована.
- [ ] Persona differences visible within 20–30 seconds.
- [ ] Jury persona switcher не загрязняет основной navigation.
- [ ] Document upload/review соответствует Figma flow.
- [ ] Extracted facts подтверждаются до использования.
- [ ] Plan показывает why-this-plan.
- [ ] Plan показывает source-linked reasons.
- [ ] Exercise details реализованы.
- [ ] Exercise swaps реализованы или честно помечены unavailable.
- [ ] Generic exercises используют existing Camera Coach shell.
- [ ] AI does not generate layout.
- [ ] One primary cue shown at a time.
- [ ] Primary cue readable at full-body camera distance.
- [ ] Generated messages obey character limits.
- [ ] RU/KK/EN message fallback works.
- [ ] Tracking/repetitions/recovery visually separated.
- [ ] Camera denied state matches Figma.
- [ ] Tracking lost state matches Figma.
- [ ] AI fallback state matches Figma.
- [ ] Manual-only exercise state matches Figma.
- [ ] Results screen matches Figma hierarchy.
- [ ] Progress screen remains consistent.
- [ ] Relevant mobile frames implemented.
- [ ] Tablet camera layout checked.
- [ ] No glassmorphism/generic AI dashboard visual drift.
- [ ] Screenshot-based visual QA completed.

## Дополнительные изменения в существующих schema-разделах prompt

### AIUserProfileV1

Добавь:

```json
{
  "persona_key": "maya",
  "source_highlights": [
    {
      "label": "Короткие сессии",
      "source_type": "profile",
      "source_id": null
    }
  ],
  "routine_preferences": [
    "desk_reset",
    "pre_sleep"
  ]
}
```

### AI plan item

Добавь:

```json
{
  "reason": "Низкая ударная нагрузка и короткая продолжительность",
  "source_references": [
    {
      "type": "profile",
      "label": "15 минут на тренировку"
    },
    {
      "type": "document",
      "label": "Избегать высокой ударной нагрузки"
    }
  ],
  "camera_coaching_mode": "ai_generated",
  "detail_available": true,
  "swap_available": true
}
```

### MovementSpec

Замени одиночные `message_ru` на:

```json
{
  "messages": {
    "ru": "Медленнее опускайся",
    "kk": "Баяуырақ төмен түс",
    "en": "Lower more slowly"
  }
}
```

Добавь validation:

- primary cue <= 56 Unicode characters;
- secondary cue <= 120 characters;
- phase label <= 32 characters;
- exercise title <= 48 characters;
- maximum two visual lines.

Пределы текста проверяются заранее для локализованных значений. Две визуальные
строки проверяются на Figma-defined viewports при visual QA; schema-валидация
длины сама по себе не гарантирует число строк. При переполнении frontend
использует короткий fallback и сохраняет читаемый display style.
