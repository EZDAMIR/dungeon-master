# Sprint 4A — Personal AI Coach, RAG Profile and Universal Camera Coaching

Ты работаешь в репозитории `EZDAMIR/dungeon-master`.

Текущая задача: **СПРИНТ 4A — PERSONAL AI COACH, RAG PROFILE AND UNIVERSAL CAMERA COACHING**.

Это hackathon-прототип, предназначенный для демонстрации жюри.

Главный приоритет:

- эффектная и понятная демонстрация;
- видимая персонализация;
- оригинальность;
- разные планы для разных пользователей;
- способность AI создавать camera coaching под выбранные упражнения;
- сохранение уже работающего gesture/pose сценария.

Не трать время на production-grade compliance, сложное шифрование, enterprise
authorization, сложные очереди, распределённый RAG, юридические consent workflows
или инфраструктуру, которая не будет видна жюри.

Во всех новых документах, commit messages, отчётах и комментариях используй
слово Sprint / Спринт для обозначения этапов разработки. Технические ключи
MovementSpec и имена модулей из этого prompt сохраняются.

Этот документ объединяет исходный prompt с Figma alignment patch. При
реализации не возвращай заменённые требования к generic personas и отдельному
AI dashboard. Количество Figma frames/styles/masters указано по заданию и требует
проверки; сам prompt не подтверждает реализацию или visual QA.

## 1. ОСНОВНАЯ ИДЕЯ ПРОДУКТА

Dungeon Master должен демонстрировать не обычный GPT-wrapper, а систему:

1. Пользователь описывает себя.
2. Пользователь может загрузить PDF/TXT с дополнительной информацией: цели,
   уровень подготовки, расписание, оборудование, предпочтения, ограничения,
   демонстрационную медицинскую карту.
3. Система извлекает текст и сохраняет его в базе.
4. RAG находит релевантные фрагменты.
5. Извлечённые facts показываются пользователю; подтверждённые facts могут
   использоваться для персонализации. Неподтверждённые ограничения не влияют на план.
6. LLM создаёт уникальный AI Profile пользователя.
7. LLM самостоятельно выбирает упражнения и параметры плана.
8. Для каждого упражнения LLM создаёт MovementSpec — декларативную схему
   анализа движения через MediaPipe Pose.
9. Generic Camera Coach интерпретирует MovementSpec: калибрует человека,
   определяет фазы движения, считает повторения, замечает ошибки и показывает
   персональные подсказки.
10. Результаты сохраняются в существующей progress-системе.

Ключевая формулировка проекта:

«AI не только составляет персональную программу, но и создаёт модель
camera coaching для каждого выбранного упражнения: определяет ракурс камеры,
ключевые суставы, фазы движения, условия повторения и правила ошибок».

## 2. ВИДИМАЯ УНИКАЛЬНОСТЬ

Персонализация должна быть очевидна жюри без изучения кода.

Для разных пользователей AI должен менять упражнения, количество тренировочных
дней, подходов и повторений, темп, отдых, сложность, порядок, ракурс камеры,
критерии завершения повторения, правила ошибок, подсказки, стиль тренера и
итоговые рекомендации.

Maya: возвращается к тренировкам, 15 минут, без оборудования, спокойный темп,
избегает прыжков, 2 дня в неделю. Возможный результат: Bodyweight Squat,
Standing Calf Raise, Wall Sit, короткие подходы, мягкие подсказки, медленный темп,
низкая ударная нагрузка.

Arman: средний уровень, 30 минут, есть гантели, цель — сила, 4 дня в неделю,
энергичный стиль. Возможный результат: Goblet Squat, Bicep Curl, Lateral Raise,
Reverse Lunge, больший объём, меньше отдыха, энергичные подсказки.

Dana: короткие standing routines для перерывов за компьютером, desk reset,
утренние и вечерние блоки, короткий поддерживающий стиль. Ограничения учитываются,
если указаны в profile или подтверждённых document facts.

На экране AI-плана обязательно показать:

- «Почему этот план подходит именно вам» или existing Figma copy;
- какие данные повлияли на решение;
- какие упражнения были исключены;
- какие упражнения поддерживают camera coaching;
- какой стиль тренера выбран;
- чем план отличается от стандартного.

## 3. DEMO-FIRST ПОДХОД

Разрешено упростить:

- документы хранить локально или в PostgreSQL;
- извлечённый текст хранить в обычном text/JSONB;
- embeddings хранить как JSONB, cosine similarity считать в Python;
- использовать только PDF/TXT/Markdown;
- не реализовывать OCR, сложное шифрование, production object storage;
- не реализовывать сложные consent/versioning workflows и background workers;
- обрабатывать небольшие документы синхронно в рамках demo;
- использовать синтетические документы и медицинские карты.

Обязательно:

- явно указать в README, что это hackathon prototype;
- использовать только синтетические данные в demo;
- не заявлять медицинскую точность или готовность для реальных пациентов;
- не ставить диагнозы, не рекомендовать лекарства, не менять дозировки;
- не использовать реальные медицинские документы.

## 4. STARTING POINT И GIT

Перед изменениями выполни:

```sh
git status
git branch --show-current
git log --oneline --decorate -20
git remote -v
```

Работу начать от актуального состояния `sprint/core-backend-domains`.
Создать новую ветку:

```sh
git checkout sprint/core-backend-domains
git pull origin sprint/core-backend-domains
git checkout -b sprint/ai-personalized-coach
```

Не работай напрямую в main. Сохраняй имеющиеся незакоммиченные изменения;
не переключай ветку способом, который их перезапишет.

Не делать force push, hard reset, удаление чужих изменений, случайное добавление
AGENT_PROMPT.md, переписывание истории существующих sprint-веток.

Перед каждым commit:

```sh
git status --short
git diff -- AGENT_PROMPT.md
```

## 5. ОБЯЗАТЕЛЬНО ПРОЧИТАТЬ

До изменений прочитай:

Root:

- AGENTS.md;
- CLAUDE.md;
- docs/ARCHITECTURE.md;
- docs/PROJECT_STRUCTURE.md;
- docs/DOMAIN_MODEL.md;
- docs/API_CONTRACT.md;
- docs/VISION_PIPELINE.md;
- docs/IMPLEMENTATION_PLAN.md;
- docs/TEST_STRATEGY.md.

Backend:

- backend/AGENTS.md;
- backend/CLAUDE.md;
- backend/src/CLAUDE.md;
- backend/src/api/CLAUDE.md;
- backend/src/ai/CLAUDE.md;
- backend/src/migrations/postgres/CLAUDE.md;
- backend/src/core/config.py;
- backend/src/core/http_client.py;
- backend/src/core/storage.py;
- backend/src/api/controllers/training_plans.py;
- backend/src/api/controllers/exercises.py;
- backend/src/api/models/exercises.py;
- backend/src/api/models/training_plans.py;
- backend/src/api/schemas/exercises.py;
- backend/src/api/schemas/training_plans.py;
- все backend tests Sprint 3.

Frontend:

- frontend/AGENTS.md;
- frontend/CLAUDE.md;
- frontend/src/vision/CLAUDE.md;
- frontend/src/vision/pose/*;
- frontend/src/vision/exercises/squat/*;
- frontend/src/features/workout/*;
- frontend/src/api/*;
- frontend/src/store/*;
- frontend/src/pages/ProfilePage.tsx;
- frontend/src/pages/PlanPage.tsx;
- frontend/src/pages/ProgressPage.tsx;
- frontend/src/types/vision.ts;
- все frontend tests.

Прочитай ближайшие AGENTS.md и CLAUDE.md для каждого изменяемого каталога.
Не создавай параллельную архитектуру, если нужная структура уже существует.

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
  -> generated фазы движения;
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
- expected фазы движения;
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
- текущая фаза движения;
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
2. REPETITIONS — current / target, текущая фаза движения, tempo/progress.
3. RECOVERY / CORRECTION — one primary correction, short secondary explanation,
   rest/recovery status.

Не смешивай эти данные в один debug panel.
Не показывай одновременно несколько competing error messages.

Приоритет:

```text
tracking/readiness error
  -> technique correction
  -> positive feedback
  -> нейтральная инструкция движения
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
- label фазы движения: максимум 32 characters;
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
- текущая фаза движения;
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

## 6. NON-GOALS

В этот Sprint не входят:

- Google Calendar;
- ElevenLabs;
- production deployment;
- полноценная medical compliance;
- OCR и распознавание изображений медицинских документов;
- refresh tokens;
- real patient data;
- сложная document encryption;
- S3;
- message queue;
- Redis;
- LangChain;
- LlamaIndex;
- fine-tuning;
- обучение собственной нейросети;
- полноценное мобильное приложение.

Figma-defined responsive browser layouts входят в Sprint 4A.

## 7. УПРОЩЁННАЯ МОДЕЛЬ ДАННЫХ

Добавь минимальные таблицы в существующей архитектуре.

### 7.1. USER AI CONTEXT

`user_ai_context`:

- id UUID PK;
- user_id UUID FK;
- self_description TEXT;
- preferred_coach_style enum: calm, energetic, strict, supportive;
- preferred_language: ru, en, kk;
- additional_preferences JSONB;
- created_at;
- updated_at.

Один active context на пользователя.

Endpoints:

```text
GET /api/v1/ai-context
PUT /api/v1/ai-context
```

PUT выполняет full replacement.

### 7.2. USER DOCUMENTS

`user_documents`:

- id UUID PK;
- user_id UUID FK;
- filename;
- media_type;
- size_bytes;
- extracted_text TEXT;
- status enum: uploaded, processed, failed;
- created_at;
- updated_at.

Для prototype разрешено хранить extracted_text в PostgreSQL.
Raw file можно хранить через существующий LocalStorage либо не сохранять после
extraction. Выбранное поведение документировать.

Поддерживаемые форматы:

- application/pdf;
- text/plain;
- text/markdown.

PDF: использовать pypdf, извлекать только text layer. Если текста нет:
status = failed; message = «Сканированные документы пока не поддерживаются».

Ограничения:

- максимум 5 MB;
- максимум 5 документов на пользователя;
- максимум 50 000 символов извлечённого текста на документ.

Endpoints:

```text
POST /api/v1/documents
GET /api/v1/documents
DELETE /api/v1/documents/{document_id}
```

Все запросы фильтруются current_user.id.

Для Figma fact review сохраняй normalized fact, короткий source excerpt,
document/chunk reference и решение пользователя: pending / confirmed / rejected.
Используй минимальное хранение и API в текущих слоях; не создавай отдельную
инфраструктуру. Confirm/reject должен сохраняться, а не быть только визуальным
состоянием. Удаление source исключает его facts из будущей персонализации.

### 7.3. DOCUMENT CHUNKS

`document_chunks`:

- id UUID PK;
- document_id UUID FK;
- user_id UUID FK;
- chunk_index;
- content TEXT;
- embedding JSONB nullable;
- created_at.

Chunking:

- примерно 1200–1800 символов;
- overlap 150–250 символов;
- preserve paragraph boundaries;
- максимум 30 chunks на документ.

### 7.4. AI USER PROFILES

`ai_user_profiles`:

- id UUID PK;
- user_id UUID FK;
- version;
- profile JSONB;
- source_document_ids JSONB;
- model;
- created_at.

Profile JSON соответствует AIUserProfileV1 из раздела 10. Сохрани summary,
fitness level, goals, preferences, confirmed constraints, equipment, schedule,
coach persona, personalization highlights и дополнения Figma:
persona_key, source_highlights, routine_preferences.

### 7.5. AI EXERCISE SPECS

`ai_exercise_specs`:

- id UUID PK;
- user_id UUID FK;
- exercise_key unique;
- display_name;
- description;
- difficulty;
- equipment_codes JSONB;
- camera_angle;
- movement_spec JSONB;
- generated_by_model;
- status enum: generated, valid, invalid, manual_only;
- validation_errors JSONB;
- created_at;
- updated_at.

Generated exercises принадлежат текущему user.

### 7.6. AI PLAN RUNS

`ai_plan_runs`:

- id UUID PK;
- user_id UUID FK;
- model;
- profile_snapshot JSONB;
- retrieved_chunk_ids JSONB;
- output JSONB;
- status enum: completed, fallback, failed;
- created_at.

Для prototype разрешено сохранять structured AI output.
Не сохранять API key, Authorization headers или raw provider internals.

## 8. RAG PIPELINE

Реализуй простой и наглядный RAG.

Flow:

1. Получить self-description.
2. Получить текущий profile Sprint 3.
3. Получить confirmed constraints и confirmed document facts.
4. Получить document chunks текущего пользователя.
5. Создать AI user-profile query.
6. Найти top relevant chunks.
7. Передать profile + chunks + подтверждённые facts в LLM.
8. Получить structured AI Profile.
9. Использовать AI Profile для плана.

Retrieval:

- embeddings через OpenAI embedding model;
- хранить vectors в JSONB;
- cosine similarity считать в Python;
- top_k = 5;
- если embeddings unavailable: lexical keyword overlap fallback;
- документы только текущего пользователя.

Неподтверждённые или rejected facts из retrieved text не должны становиться
ограничениями плана. Source-linked decisions используют подтверждённые данные.
Не добавляй pgvector или отдельную vector database для prototype.

## 9. OPENAI CONFIGURATION

Добавь официальный OpenAI Python SDK exact version.

Configuration:

```dotenv
AI_FEATURE_ENABLED=false
OPENAI_API_KEY=
OPENAI_MODEL=
OPENAI_EMBEDDING_MODEL=
OPENAI_TIMEOUT_SECONDS=30
OPENAI_MAX_RETRIES=1
```

AI feature выключена без key. Приложение без AI продолжает использовать
deterministic plan Sprint 3.

Добавь adapter `backend/src/ai/openai.py`.

Functions:

- create_embeddings(texts);
- synthesize_user_profile(context);
- generate_personalized_plan(context);
- generate_movement_spec(exercise, user_profile);
- repair_movement_spec(spec, validation_errors).

Используй structured output / strict JSON schema.
Не парси freeform markdown. Provider calls полностью mock в tests.
Не нужен реальный API key для test suite.

## 10. AI PROFILE SYNTHESIS

LLM получает:

- обычный fitness profile;
- self-description;
- confirmed constraints;
- retrieved document chunks с подтверждёнными facts;
- previous progress;
- preferred coach style;
- equipment;
- schedule.

LLM имеет свободу сформировать holistic user profile.

Output: **AIUserProfileV1**.

```json
{
  "summary": "Короткие контролируемые тренировки дома",
  "fitness_level": "beginner",
  "primary_goals": ["general_fitness"],
  "secondary_goals": [],
  "preferences": ["short sessions", "calm coaching"],
  "constraints": ["avoid high impact"],
  "equipment": ["none"],
  "schedule": {
    "days_per_week": 2,
    "minutes_per_session": 15
  },
  "coach_persona": {
    "tone": "supportive",
    "verbosity": "short",
    "language": "ru",
    "motivation_style": "positive"
  },
  "plan_strategy": {
    "intensity": "low",
    "complexity": "simple",
    "preferred_tempo": "controlled",
    "rest_style": "generous"
  },
  "personalization_highlights": [
    "Reduced impact due to stated preference",
    "Short sessions based on schedule"
  ],
  "persona_key": "maya",
  "source_highlights": [
    {
      "label": "Короткие сессии",
      "source_type": "profile",
      "source_id": null
    }
  ],
  "routine_preferences": ["desk_reset", "pre_sleep"]
}
```

Это структурный пример; routine_preferences берутся из фактических предпочтений
profile/persona. persona_key для jury: maya, arman, dana; обычный пользователь
не обязан выбирать demo persona.

Разреши LLM самостоятельно интерпретировать предпочтения и создавать разные
стратегии для разных пользователей.

Но не позволять:

- ставить диагноз;
- рекомендовать лекарство;
- изменять медицинское лечение;
- утверждать, что упражнение безопасно с медицинской точки зрения.

## 11. AI PLAN GENERATION

Добавь режим `POST /api/v1/training-plans/generate`:

```json
{
  "mode": "ai_assisted"
}
```

Сохрани deterministic режим.

AI может выбрать существующие упражнения, придумать новые, создать custom
variations, выбрать количество дней, sets/reps, rest, tempo, camera angle,
coach messages, порядок и reason for every item.

Plan output:

```json
{
  "title": "Your adaptive plan",
  "summary": "Короткие тренировки с контролируемым темпом",
  "why_this_plan": [
    "15 минут по вашему расписанию",
    "Низкая ударная нагрузка по подтверждённым предпочтениям"
  ],
  "coach_persona": {
    "tone": "supportive",
    "language": "ru"
  },
  "days": [
    {
      "day_index": 0,
      "title": "Lower Body Control",
      "estimated_minutes": 15,
      "items": [
        {
          "exercise_key": "standing_calf_raise_custom_123",
          "display_name": "Standing Calf Raise",
          "sets": 2,
          "target_reps": 8,
          "rest_seconds": 45,
          "tempo_hint": "2 seconds up, 2 seconds down",
          "camera_coaching_requested": true,
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
      ]
    }
  ],
  "routine_blocks": []
}
```

Source references должны разрешаться в реальные profile/preferences,
подтверждённые document facts или progress. Для document references сохраняй
source identity; не заменяй связь с источником одной выдуманной подписью.
Availability flags отражают реализованную возможность, а не обещание LLM.

Bounds for demo:

- maximum 4 days;
- maximum 4 exercises per day;
- 1–4 sets;
- 3–20 reps;
- rest 15–180 sec;
- estimated session <= user session limit + 10 min;
- bounded strings, включая display name <= 48 Unicode characters.

Для каждого нового exercise:

1. Persist exercise draft.
2. Generate MovementSpec.
3. Validate.
4. Если valid: camera_coaching_status = experimental.
5. Если invalid: один repair call с validation errors.
6. Если всё ещё invalid: camera_coaching_status = manual_only.

Для prototype разрешено автоматически использовать valid experimental spec,
но UI обязан показывать «AI-generated camera coaching».

Optional routine_blocks содержит morning_reset / desk_reset / pre_sleep с
routine_type, title, estimated_minutes, items и camera_coaching_available.
Показывай только blocks из AI response, отдельно от основной workout session.
Не добавляй routines frontend-ом для имитации различий personas.

## 12. VISIBLE PERSONALIZATION В СУЩЕСТВУЮЩЕМ FLOW

Реализуй разделы 10A–12A: editorial summary «Что тренер учёл», why-this-plan,
source-linked reasons, excluded exercises, camera badges, exercise details,
constraint-preserving swaps и optional routine cards.

Используй существующие Figma frames и component variants. AI Profile находится
в context/plan flow. Отдельный generic AI dashboard или chatbot не создавать.

## 13. MOVEMENTSPEC V1

MovementSpec — декларативный JSON, создаваемый LLM.
Не генерировать JavaScript или TypeScript. Не использовать eval.

LLM получает свободу выбирать необходимые landmarks, ракурс, features, фазы
движения, transitions, rep completion, ошибки и correction messages.

Структурный фрагмент с локализованными полями ниже показывает форму контракта.
Это не готовый валидный fixture: полный spec обязан объявить все referenced
features, derived metrics и переходы полного цикла.

```json
{
  "version": 1,
  "exercise_key": "standing_calf_raise_custom_123",
  "display_name": "Standing Calf Raise",
  "camera": {
    "preferred_angle": "side",
    "body_scope": "full",
    "required_landmarks": [
      "shoulder", "hip", "knee", "ankle", "heel", "foot_index"
    ],
    "minimum_visibility": 0.55
  },
  "calibration": {
    "stable_ms": 700,
    "baseline_features": ["heel_height", "standing_knee_angle"],
    "messages": {
      "ru": "Встань боком, чтобы стопы были видны",
      "kk": "Аяқтарың көрінетіндей қырыңмен тұр",
      "en": "Stand side-on with your feet visible"
    }
  },
  "features": [
    {
      "id": "heel_height",
      "operation": "relative_y",
      "points": ["heel", "foot_index"],
      "normalize_by": "body_scale"
    }
  ],
  "phases": [
    {
      "id": "standing",
      "messages": {
        "ru": "Исходное положение",
        "kk": "Бастапқы қалып",
        "en": "Starting position"
      }
    },
    {
      "id": "raising",
      "messages": {"ru": "Подъём", "kk": "Көтерілу", "en": "Raising"}
    },
    {
      "id": "top",
      "messages": {"ru": "Верхняя точка", "kk": "Жоғарғы нүкте", "en": "Top"}
    },
    {
      "id": "lowering",
      "messages": {"ru": "Опускание", "kk": "Түсу", "en": "Lowering"}
    }
  ],
  "transitions": [
    {
      "from": "standing",
      "to": "raising",
      "condition": {
        "feature": "heel_height",
        "operator": "gt",
        "value": 0.02
      },
      "hold_ms": 100
    }
  ],
  "repetition": {
    "start_phase": "standing",
    "complete_from": "lowering",
    "complete_to": "standing",
    "minimum_duration_ms": 500,
    "maximum_duration_ms": 12000
  },
  "error_rules": [
    {
      "code": "range_too_small",
      "evaluate_at": "rep",
      "condition": {
        "feature": "max_heel_height",
        "operator": "lt",
        "value": 0.04
      },
      "messages": {
        "ru": "Подними пятки немного выше",
        "kk": "Өкшелеріңді сәл жоғары көтер",
        "en": "Raise your heels a little higher"
      },
      "reject_rep": true
    }
  ],
  "coach_messages": {
    "ready": {
      "messages": {
        "ru": "Начинаем подъёмы на носки",
        "kk": "Аяқ ұшына көтеріле бастаймыз",
        "en": "Let's begin calf raises"
      }
    },
    "good_rep": {
      "messages": {
        "ru": "Отличное повторение",
        "kk": "Тамаша қайталау",
        "en": "Great repetition"
      }
    },
    "tracking_recovery": {
      "messages": {
        "ru": "Вернись в кадр",
        "kk": "Кадрға қайта орал",
        "en": "Return to the frame"
      }
    },
    "complete": {
      "messages": {
        "ru": "Подход завершён",
        "kk": "Жиынтық аяқталды",
        "en": "Set completed"
      }
    }
  }
}
```

Все одиночные русские message/instruction/label поля заменены RU/KK/EN messages.
Минимум локализуются calibration, ready, текущая фаза движения, good repetition,
каждая correction, tracking recovery и completed. Secondary explanation, если
присутствует, тоже создаётся заранее для поддерживаемых языков.

Validation для локализованного текста:

- primary cue <= 56 Unicode characters;
- secondary cue <= 120 characters;
- label фазы движения <= 32 characters;
- exercise title <= 48 characters;
- максимум две визуальные строки primary cue на Figma-defined viewports.

Fallback: requested language -> ru -> en -> stable system message.
Не вызывать LLM во время workout для перевода или генерации сообщений.
При слишком длинном тексте backend отклоняет/сокращает structured output,
frontend использует short fallback и не уменьшает читаемый font.

## 14. ALLOWED POSE OPERATIONS

Generic engine должен поддерживать Feature operations:

- angle;
- distance;
- normalized_distance;
- relative_x;
- relative_y;
- position_x;
- position_y;
- velocity_x;
- velocity_y;
- delta;
- visibility;
- body_scale;
- average;
- minimum;
- maximum.

Landmarks:

- nose;
- shoulder;
- elbow;
- wrist;
- hip;
- knee;
- ankle;
- heel;
- foot_index;
- left_*;
- right_*;
- active_*.

Operators:

- gt;
- gte;
- lt;
- lte;
- between;
- approximately;
- trend_up;
- trend_down.

Validation:

- referenced features exist;
- landmarks valid;
- IDs фаз движения unique;
- transitions reference valid фазы движения;
- at least two фазы движения;
- maximum eight фаз движения;
- maximum twelve error rules;
- finite numeric values;
- no unknown operations;
- no unknown fields;
- no executable code;
- localized messages obey limits из раздела 13.

Если validation fails:

1. Отправить errors в repair_movement_spec.
2. Проверить repaired spec.
3. Если снова fails: mark manual_only.

Не останавливать весь plan. Raw validation errors не показывать пользователю.

## 15. GENERIC CAMERA COACH ENGINE

Создай `frontend/src/vision/exercises/generic/`.

Минимальная структура:

```text
types.ts
validator.ts
featureEvaluator.ts
conditionEvaluator.ts
phaseMachine.ts
genericAnalyzer.ts
analyzerFactory.ts
resultBuilder.ts
tests/
```

GenericAnalyzer:

- получает MovementSpec;
- использует существующий PoseSession;
- использует существующее smoothing;
- использует существующий overlay;
- использует existing VisionEvent;
- считает фазы движения;
- считает reps;
- создаёт error feedback;
- формирует WorkoutResult;
- отправляет aggregate result существующей session sync системе.

Не создавать вторую camera architecture.

AnalyzerFactory:

- bodyweight_squat + stable legacy profile: existing SquatAnalyzer;
- movement_spec valid: GenericAnalyzer;
- movement_spec invalid/manual_only: ManualWorkout mode.

React не содержит gesture thresholds или exercise rules.
Generic MovementSpec меняет поля Camera Coach shell, а не layout.

## 16. CAMERA COACHING ДЛЯ AI-УПРАЖНЕНИЙ

Для каждого упражнения в плане UI показывает:

1. `Camera Coach` — predefined stable analyzer.
2. `AI Camera Coach` — MovementSpec generated by AI, generic analyzer,
   experimental badge и «AI-generated camera coaching».
3. `Manual` — camera coaching unavailable, timer и manual completion button.

Не блокировать весь план из-за одного manual exercise.

На workout screen динамически использовать:

- exercise display name;
- camera instruction;
- текущую фазу движения;
- rep counter;
- generated correction messages;
- coach style;
- language;
- target reps.

Не hardcode squat labels в generic path.
Переиспользуй Figma shell с отдельными tracking, repetitions и recovery zones.
Один primary cue, приоритет readiness -> correction -> positive -> neutral.

## 17. COACH PERSONA

LLM выбирает стиль тренера для пользователя. Примеры коротких cues:

- calm: «Медленнее опускайся», «Хорошо, продолжай»;
- energetic: «Отлично! Ещё одно!», «Контроль вниз — отлично!»;
- strict: «Вернись в исходное положение», «Сохраняй заданный темп»;
- supportive: «Почти получилось — чуть ниже», «Хорошая попытка».

Frontend использует coach persona для text feedback, SpeechSynthesis,
Results recommendation и Plan wording. Tone не меняет длину и визуальную иерархию.
Сохрани voice toggle, voice on/muted, speech unavailable и visual-only fallback.
Не использовать ElevenLabs в Sprint 4A и не показывать активный microphone.

## 18. DEMO PERSONAS — MAYA / ARMAN / DANA

Реализуй ровно три synthetic personas из раздела 7A.

| persona_key | Persona | Context / synthetic document | Видимые различия |
|---|---|---|---|
| maya | Maya — Low-Impact Return | 15 минут, 2 дня, без оборудования, избегать high impact, спокойный темп | Low impact, shorter sets, longer recovery, controlled tempo, supportive coach |
| arman | Arman — Strength | 30 минут, 4 дня, гантели, цель — сила, energetic/strict style | Equipment-aware exercises, higher volume, harder variants, насыщенная неделя |
| dana | Dana — Desk Reset | Перерывы 5–10 минут, standing preference, concise supportive coach | Desk reset и optional morning/pre-sleep routines; ограничения только если заданы |

Если synthetic document Dana содержит avoid overhead movements, это ограничение
вступает в силу после подтверждения fact пользователем.

Для каждого demo profile должно быть видно, что AI Profile, plan, упражнения,
MovementSpecs, volume/tempo/rest, coaching messages и routine blocks различаются.

Demo personas используют только synthetic data. Загрузка готового synthetic
context/document выполняется мгновенно без обязательного live AI вызова.
Generation использует bounded provider request или честно обозначенный fallback.

Switcher открывается dev/jury entry `?juryDemo=1`, затем ведёт в обычный
context/document-review/plan flow. Не добавляй его в основной MENU.

## 19. API ENDPOINTS

Добавь:

```text
GET /api/v1/ai-context
PUT /api/v1/ai-context

POST /api/v1/documents
GET /api/v1/documents
DELETE /api/v1/documents/{document_id}

POST /api/v1/ai-profile/generate
GET /api/v1/ai-profile/current

POST /api/v1/training-plans/generate

GET /api/v1/exercise-specs/{exercise_key}
POST /api/v1/exercise-specs/{exercise_key}/regenerate

POST /api/v1/demo-personas/{persona_key}/load
```

Request для AI plan: `{"mode": "ai_assisted"}`.

Document API должен поддерживать сохранение Confirm/Reject и source removal
из разделов 7.2 и 9A; конкретный минимальный контракт документируй в API_CONTRACT.md.
Exercise details использует существующие данные plan/spec. Swap сохраняет
constraints; если swap не реализован, честно пометь unavailable.

Demo endpoint разрешён только при APP_ENV=development либо ENABLE_DEMO_PERSONAS=true.
persona_key: maya, arman, dana.
Все user-owned queries фильтруются current_user.id.

## 20. FRONTEND — СУЩЕСТВУЮЩИЙ FIGMA FLOW

Встрой функции в существующую information architecture из раздела 5B.
Не создавать отдельные разделы AI Context / Documents / AI Profile / AI Plan /
Demo Personas как generic dashboard cards в MENU.

### 20.1. ONBOARDING / CONTEXT

- описание себя;
- данные пользователя, цели, расписание и оборудование;
- предпочтения, coach style и язык;
- optional document upload.

Для prototype допускается обычный textarea и keyboard input.
Gesture-only ввод текста не обязателен. Navigation/actions используют существующую
gesture систему и доступные обычные controls.

### 20.2. DOCUMENT UPLOAD / FACT REVIEW

Переиспользуй Figma document states. Review показывает normalized extracted facts,
короткие source excerpts, document reference, Confirm/Reject и delete source.
Confidence показывай только если предусмотрено Figma.
После подтверждения: «Использовано для персонализации».
Не показывать full raw document по умолчанию.

### 20.3. EDITORIAL AI PROFILE

Внутри context/plan: summary, goals, schedule, equipment, preferences,
confirmed constraints, coach persona, personalization highlights и source chips.
Заголовок «Что тренер учёл» или existing Figma copy. Никакого chatbot UI.
Regenerate action располагается в существующем flow, а не на новой dashboard page.

### 20.4. PERSONALIZED PLAN / DETAILS / SWAPS

Plan title, summary, why_this_plan, days, cards с reason, sets × reps, tempo,
rest, camera angle, source, badge и source chips.
Details: short instruction, placement, target joints/body area, expected фазы
движения, common corrections, reason, alternative/swap.
«Создать другой вариант» сохраняет constraints пользователя.
Optional routines только из response, отдельно от workout.

### 20.5. JURY PERSONA SWITCHER

Три existing Figma persona cards: Maya / Arman / Dana.
Выбор заполняет synthetic context и source document, ведёт в обычный flow.
Compare differences за 20–30 секунд. Main navigation не загрязнять.

### 20.6. CAMERA / RESULTS / PROGRESS

Existing graphite/citron Camera Coach shell, distance-readable cue и audio states.
Results сохраняет Figma hierarchy и personalized recommendation.
Progress использует существующую persistence/progress систему.
Desktop/mobile/tablet layouts из Figma; не создавать отдельную новую UI систему.

## 21. USER-FACING DEMO FLOW

Используй полный jury flow из раздела 8A:

1. Открыть `?juryDemo=1` и выбрать Maya.
2. Увидеть заполненный context и synthetic source document.
3. Review extracted facts, Confirm/Reject, continue.
4. Generate personalized plan, увидеть summary, why-this-plan и source reasons.
5. Open exercise details, при необходимости swap.
6. Start existing camera coaching shell с generated instructions.
7. Выполнить повторения, увидеть конкретную correction, исправить движение.
8. Завершить подход, увидеть personalized results и progress.
9. Вернуться к switcher, выбрать Arman или Dana.
10. Увидеть другой AI Profile и plan.

Весь flow максимум 3–5 минут. Не требовать account creation, большой ручной
профиль, medical information или прохождение всех 54 состояний.

## 22. AI PROMPTS

Создай versioned prompts:

```text
backend/src/ai/prompts/
├── user_profile_v1.md
├── workout_plan_v1.md
├── movement_spec_v1.md
└── movement_spec_repair_v1.md
```

user_profile prompt:

- понять пользователя;
- найти цели;
- найти предпочтения;
- использовать подтверждённые ограничения;
- выбрать coach persona;
- сформировать personalization highlights и source_highlights.

workout_plan prompt:

- свободно выбрать упражнения;
- создавать custom exercises;
- объяснить выбор;
- адаптировать volume/tempo/rest;
- соблюдать явно указанные ограничения;
- source references к реальным входным данным;
- optional routine blocks по предпочтениям;
- не давать диагноз;
- не генерировать layout.

movement_spec prompt:

- описать exercise через pose landmarks;
- выбрать camera angle;
- выбрать фазы движения;
- выбрать transitions;
- выбрать error rules;
- создать короткие RU/KK/EN correction messages;
- соблюдать текстовые limits;
- не генерировать code.

repair prompt:

- получить validation errors;
- исправить только invalid части;
- сохранить exercise intent;
- сохранить localization и cue limits.

## 23. FALLBACK

Если AI недоступен:

- deterministic plan Sprint 3 продолжает работать;
- squat camera coaching продолжает работать;
- progress продолжает работать;
- frontend переиспользует existing Figma fallback state:
  «AI временно недоступен. Мы подготовили базовый план по вашим настройкам».

Если MovementSpec invalid: одна repair attempt, затем manual_only; весь plan
не падает. UI: «Для этого упражнения пока доступно ручное выполнение».

Если document parsing failed: self-description всё ещё используется;
AI Profile можно создать без документа. Existing Figma error/recovery states
содержат explanation, primary action и secondary/back action без internal errors.

## 24. TESTS — BACKEND

Mock all OpenAI calls.

Documents:

- valid TXT;
- valid text PDF;
- unsupported type;
- size limit;
- ownership;
- delete;
- empty PDF;
- chunking;
- normalized facts / source excerpt;
- Confirm/Reject persisted;
- unconfirmed/rejected facts не влияют на plan;
- source deletion исключает facts из будущей персонализации.

RAG:

- chunks created;
- embeddings stored;
- top-K;
- lexical fallback;
- no cross-user retrieval.

AI Profile:

- structured output;
- Maya / Arman / Dana produce different profiles;
- coach persona persisted;
- source_highlights и routine_preferences;
- unavailable provider fallback.

AI Plan:

- structured output;
- new exercises persisted;
- different users receive different plans;
- explicit constraints respected;
- regeneration can produce alternative;
- deterministic fallback;
- source references соответствуют подтверждённым входным данным;
- optional routines не выдумываются вне AI response;
- swap preserves constraints либо unavailable.

MovementSpec:

- valid spec;
- invalid feature;
- unknown landmark;
- unknown operation;
- invalid фаза движения;
- repair succeeds;
- repair fails -> manual_only;
- no executable code;
- Unicode message bounds и RU/KK/EN fields.

Ownership:

- user A cannot see user B documents;
- user A cannot see user B specs;
- user A cannot see user B AI Profile.

## 25. TESTS — FRONTEND

Test:

- context intake внутри existing flow;
- document upload/list states;
- fact review, Confirm/Reject, source removed;
- editorial AI Profile rendering;
- AI Plan rendering;
- why-this-plan section;
- source chips;
- exercise details;
- swap или honest unavailable;
- camera badges;
- jury-only persona loading;
- Maya / Arman / Dana visibly differ;
- generic analyzer valid spec;
- generic analyzer rep count;
- generated error message;
- manual-only exercise;
- provider fallback UI;
- requested language -> ru -> en -> stable message;
- long generated content uses short fallback;
- one primary cue with readiness priority;
- voice on / muted / unavailable / visual-only;
- existing Sprint 1–3 tests continue to pass.

Generic engine tests:

- features;
- conditions;
- переходы фаз движения;
- rep completion;
- error rules;
- tracking loss;
- no duplicate rep;
- invalid spec rejected.

Screenshot QA дополняет functional tests; не заменяй visual comparison
утверждением «компонент отрендерился».

## 26. MANUAL CHECKLIST

Создай `docs/SPRINT_4A_MANUAL_CHECKLIST.md`.

Проверить:

1. Открыть Jury Persona Switcher через `?juryDemo=1`.
2. Load Maya, context и synthetic document без большого ручного ввода.
3. Review extracted facts; Confirm/Reject.
4. Generate AI Profile и record summary/source highlights.
5. Generate plan и record exercises/why-this-plan/source chips.
6. Verify calm/supportive coach, controlled tempo, short sets, longer recovery.
7. Open exercise details, проверить swap или unavailable.
8. Open camera exercise, verify generated camera instructions.
9. Trigger one error, verify generated correction и one primary cue.
10. Исправить движение, complete workout, verify results и progress.
11. Load Arman, generate profile и plan.
12. Verify different profile, equipment-aware exercises, volume, weekly structure.
13. Verify energetic/strict coach.
14. Load Dana, verify short standing plan и desk reset.
15. Если задан/подтверждён avoid overhead fact, verify overhead exclusion.
16. Compare Maya / Arman / Dana за 20–30 секунд; полный flow за 3–5 минут.
17. Disable OpenAI, verify deterministic fallback и legacy squat.
18. Generate invalid spec through mocked/dev control, verify one repair/manual fallback.
19. Verify source deletion, unreadable/extraction/offline states.
20. Verify RU/KK previews, language fallback и generated long copy.
21. Verify voice toggle и visual-only fallback без microphone capture.
22. Verify mobile planning, mobile camera и tablet camera safe areas.
23. Compare production screenshots to Figma и заполнить FIGMA_VISUAL_QA.md.
24. Verify no real medical data used.

Не отмечай manual acceptance выполненным без реального выполнения проверки.

## 27. DOCUMENTATION

Обнови:

- README.md;
- frontend/README.md;
- docs/ARCHITECTURE.md;
- docs/DOMAIN_MODEL.md;
- docs/API_CONTRACT.md;
- docs/VISION_PIPELINE.md;
- docs/IMPLEMENTATION_PLAN.md;
- docs/TEST_STRATEGY.md;
- docs/development-log.md;
- backend/docs/development-log.md.

Создай:

- docs/MOVEMENT_SPEC_V1.md;
- docs/AI_PERSONALIZATION.md;
- docs/SPRINT_4A_MANUAL_CHECKLIST.md;
- docs/FIGMA_SPRINT_4A_MAP.md;
- docs/FIGMA_VISUAL_QA.md.

README должен объяснять:

- это hackathon prototype;
- используются synthetic demo profiles Maya / Arman / Dana;
- AI создаёт plan и MovementSpec;
- generic pose-engine исполняет spec;
- camera frames остаются локально;
- AI не анализирует video;
- AI не ставит диагноз;
- custom camera coaching экспериментальный;
- deterministic fallback;
- existing Figma является UI source of truth;
- jury shortcut `?juryDemo=1`.

В документации различай реализованное, автоматически проверенное и manual/visual
проверку, которая ещё не выполнена. Не выдумывай Figma node IDs, tokens или результаты.

## 28. ENVIRONMENT

Обнови `backend/.env.example`:

```dotenv
AI_FEATURE_ENABLED=false
OPENAI_API_KEY=
OPENAI_MODEL=
OPENAI_EMBEDDING_MODEL=
OPENAI_TIMEOUT_SECONDS=30
OPENAI_MAX_RETRIES=1

ENABLE_DEMO_PERSONAS=true

RAG_TOP_K=5
RAG_CHUNK_SIZE=1600
RAG_CHUNK_OVERLAP=200

MAX_DOCUMENTS_PER_USER=5
MAX_DOCUMENT_SIZE_MB=5
MAX_EXTRACTED_CHARS=50000
```

Не коммить реальный API key.

## 29. VERIFICATION

Backend:

```sh
cd backend
make install
make check
make test
make migrate
.venv/bin/alembic check
```

Frontend:

```sh
cd frontend
npm ci
npm run lint
npm run type-check
npm run test
npm run test:coverage
npm run build
npm run build -- --base=/dungeon-master/
```

Root:

```sh
python3 scripts/verify_architecture.py
git diff --check
git status --short
```

Проверить:

- no API keys;
- no real medical docs;
- no `.env`;
- no DB dump;
- no node_modules;
- no dist;
- no coverage artifacts;
- no eval;
- no new Function;
- no generated executable code.

Обязательна screenshot-based visual QA из раздела 19A на desktop, mobile и
tablet Figma viewports. Functional pass не означает visual acceptance.

## 30. РЕКОМЕНДУЕМЫЕ COMMITS

Каждый commit message должен содержать Sprint / Спринт:

1. `feat(ai-context): add Sprint 4A descriptions documents and lightweight RAG`
2. `feat(ai-profile): generate Sprint 4A visible personalized user profiles`
3. `feat(ai-plans): add Sprint 4A personalized plan generation and fallback`
4. `feat(movement-spec): add Sprint 4A MovementSpec validation`
5. `feat(coaching): add Sprint 4A generic camera coaching runtime`
6. `feat(demo): add Sprint 4A Maya Arman and Dana jury personas`
7. `feat(frontend): align Sprint 4A context plan and coaching with Figma`
8. `test: cover Sprint 4A personalization coaching and fallbacks`
9. `docs: document Sprint 4A prototype Figma QA and demo flow`

Push only: `sprint/ai-personalized-coach`.

## 31. DEFINITION OF DONE

Sprint 4A завершён, если выполнены core criteria и Figma criteria из раздела 20A:

- [ ] User can enter self-description.
- [ ] User can upload PDF/TXT.
- [ ] Text is extracted and chunked.
- [ ] Lightweight RAG works.
- [ ] Document facts подтверждаются до персонализации.
- [ ] AI Profile is generated.
- [ ] AI Profile visibly differs by Maya / Arman / Dana.
- [ ] Coach persona is generated.
- [ ] AI Plan is generated.
- [ ] AI freely chooses exercises and parameters.
- [ ] Different personas receive visibly different plans.
- [ ] AI may generate new exercises.
- [ ] New exercises receive MovementSpec.
- [ ] MovementSpec contains no executable code.
- [ ] Generic analyzer interprets MovementSpec.
- [ ] Generic analyzer counts reps.
- [ ] Generic analyzer gives concrete error feedback.
- [ ] Invalid spec gets one repair attempt.
- [ ] Still-invalid spec becomes manual_only.
- [ ] Existing SquatAnalyzer still works.
- [ ] Results sync still works.
- [ ] Progress still works.
- [ ] Synthetic Maya / Arman / Dana demo personas exist.
- [ ] Jury can compare personas within 20–30 seconds.
- [ ] Deterministic fallback works.
- [ ] No real medical data is committed.
- [ ] No API key is committed.
- [ ] Backend tests pass.
- [ ] Frontend tests pass.
- [ ] Builds pass.
- [ ] Migration drift is clean.
- [ ] README clearly says prototype.
- [ ] README explains unique AI-generated camera coaching.
- [ ] Все 36 Figma-aligned criteria из раздела 20A выполнены.

Не считать Sprint завершённым, пока mandatory manual и screenshot QA не выполнены.

## 32. FINAL REPORT

Выдай отчёт:

```text
Sprint:
Sprint 4A — Personal AI Coach, RAG and Universal Camera Coaching

Branch:
<branch>

Starting commit:
<SHA>

Final commits:
- ...

AI personalization:
- input sources:
- RAG:
- confirmed facts:
- AI Profile:
- coach persona:
- plan differences:

Demo personas:
- Maya:
- Arman:
- Dana:
- comparison time:

AI plan:
- model:
- prompt version:
- exercises generated:
- plan variability:
- source-linked reasons:
- routines:
- details/swaps:
- fallback:

MovementSpec:
- supported operations:
- validation:
- localized cue limits:
- repair:
- manual fallback:

Generic camera coaching:
- analyzer:
- generated exercises tested:
- repetition counting:
- error feedback:
- language fallback:
- local voice/audio states:
- legacy squat regression:

Frontend:
- context:
- documents/fact review:
- editorial AI Profile:
- why-this-plan:
- jury persona switcher:
- coaching badges:
- Camera Coach shell:
- results/progress:

Figma alignment:
- file / verified frames:
- component masters / text styles:
- exact tokens / handoff:
- FIGMA_SPRINT_4A_MAP.md:
- FIGMA_VISUAL_QA.md:
- desktop/mobile/tablet screenshots:
- unverified frames / deviations:

Automated verification:
- backend:
- frontend:
- migration:
- build:
- coverage:

Manual demo:
- Maya:
- Arman:
- Dana:
- visible differences:
- generated exercise:
- error feedback:
- fallback:
- duration:
- performed / not performed:

Known limitations:
- ...

Next Sprint:
Sprint 4B — ElevenLabs voice and Google Calendar.
```

Не переходи к Sprint 4B.
Не заявляй production readiness.
Не заявляй medical accuracy.
Не заявляй использование реальными пациентами.
