import type { GestureExampleKind } from '../gesture-navigation/GestureExample'
export type GuideEvent = 'voice.selected' | 'context.opened' | 'plan.ready' | 'exercise.opened' | 'camera.ready' | 'gesture.success' | 'calibration.completed' | 'countdown.started' | 'workout.started' | 'rest.started' | 'results.opened' | 'progress.opened'
type Copy = { ru: string; kk: string; en: string }
export type GuideStep = { target: string; title: Copy; text: Copy; kind: GestureExampleKind }
const navigation: GuideStep = { target: 'navigation', kind: 'pinch', title: { ru: 'Выбирай разделы', kk: 'Бөлімді таңда', en: 'Find your way around' }, text: { ru: 'Сверху — план, прогресс, профиль и расписание. Наведи курсор на раздел и выбери его щипком.', kk: 'Жоғарыда жоспар, прогресс, профиль және кесте бар. Меңзерді апарып, саусақтарды қосып таңда.', en: 'Your plan, progress, context and schedule are at the top. Point at a tab and pinch to open it.' } }
const scrolling: GuideStep = { target: 'gesture', kind: 'scroll', title: { ru: 'Прокручивай двумя пальцами', kk: 'Екі саусақпен айналдыр', en: 'Scroll with two fingers' }, text: { ru: 'Выпрями указательный и средний пальцы, согни безымянный и мизинец. Содержимое движется вместе с рукой. Раскрой ладонь, чтобы вернуть курсор.', kk: 'Сұқ және ортаңғы саусақты созып, қалған екеуін бүк. Мазмұн қолмен бірге қозғалады. Меңзер үшін алақаныңды аш.', en: 'Extend your index and middle fingers, curl your ring and little fingers, and move up or down. Open your palm to move the cursor again.' } }
const audio: GuideStep = { target: 'audio-controls', kind: 'pinch', title: { ru: 'Настрой звук и голос', kk: 'Дыбыс пен дауысты таңда', en: 'Make it yours' }, text: { ru: 'Внизу страницы — звук, голос тренера и настройки рук. Голоса разделены по языкам. Обучение можно открыть снова в любой момент.', kk: 'Беттің төменінде дыбыс, жаттықтырушы дауысы және қол баптауы бар. Дауыстар тіл бойынша бөлінген. Оқытуды кез келген уақытта қайта аш.', en: 'Audio, coach voice and hand settings are at the bottom. Voices are grouped by language. You can reopen this guide any time.' } }
const select: GuideStep = { target: 'plan', kind: 'pinch', title: { ru: 'Открой упражнение', kk: 'Жаттығуды аш', en: 'Choose an exercise' }, text: { ru: 'Наведи круг на кнопку инструкции и соедини большой и указательный пальцы. Разъедини их перед следующим выбором.', kk: 'Меңзерді нұсқаулық батырмасына апар да, бас және сұқ саусақты қос. Келесі таңдау алдында ажырат.', en: 'Point at the instructions button, pinch your thumb and index finger, then release before selecting again.' } }
const back: GuideStep = { target: 'navigation', kind: 'back', title: { ru: 'Вернись назад', kk: 'Артқа қайт', en: 'Go back' }, text: { ru: 'Удерживай кулак, чтобы вернуться на предыдущий экран. Отпусти жест перед новой командой. Кнопки также работают мышью.', kk: 'Алдыңғы экранға қайту үшін жұдырығыңды ұстап тұр. Келесі пәрмен алдында босат. Тінтуір де жұмыс істейді.', en: 'Hold a fist to return to the previous screen. Release before another command. Mouse controls work too.' } }
const context: GuideStep = { target: 'context', kind: 'point', title: { ru: 'Начни с себя', kk: 'Өзің туралы айт', en: 'Start with your context' }, text: { ru: 'Введи цели и доступное время с клавиатуры. Затем выбери «Продолжить» щипком. Документы необязательны: шаг можно пропустить.', kk: 'Мақсат пен уақытыңды пернетақтамен енгіз. «Жалғастыру» батырмасын саусақтарды қосып таңда. Құжат міндетті емес.', en: 'Use your keyboard to enter your goals and time. Pinch Continue when ready. Documents are optional.' } }
const progress: GuideStep = { target: 'progress', kind: 'scroll', title: { ru: 'Посмотри прогресс', kk: 'Прогресті қара', en: 'See your progress' }, text: { ru: 'Здесь результаты сохранённых тренировок. Прокручивай список двумя пальцами. Статус покажет, если результат ещё ожидает сохранения.', kk: 'Мұнда сақталған жаттығу нәтижелері бар. Тізімді екі саусақпен айналдыр. Күй нәтижелердің сақталуын көрсетеді.', en: 'Review saved workouts here. Scroll with two fingers. The status tells you when a result is still waiting to sync.' } }
const schedule: GuideStep = { target: 'schedule', kind: 'pinch', title: { ru: 'Выбери время занятия', kk: 'Жаттығу уақытын таңда', en: 'Plan your next session' }, text: { ru: 'Проверь неделю и свободное время. Изменение расписания применяется только после твоего подтверждения.', kk: 'Апта мен бос уақытты тексер. Кесте өзгерісі тек растағаннан кейін қолданылады.', en: 'Review your week and available times. Schedule changes only apply after your confirmation.' } }
const results: GuideStep = { target: 'results', kind: 'pinch', title: { ru: 'Тренировка завершена', kk: 'Жаттығу аяқталды', en: 'Your workout is complete' }, text: { ru: 'Посмотри результат и статус сохранения. Выбери план или прогресс щипком, чтобы продолжить.', kk: 'Нәтиже мен сақталу күйін қара. Жалғастыру үшін жоспарды не прогресті таңда.', en: 'Review your results and save status. Pinch Plan or Progress to continue.' } }
const menu: GuideStep = { target: 'gesture', kind: 'confirm', title: { ru: 'Выбери и подтверди', kk: 'Таңда да раста', en: 'Choose, then confirm' }, text: { ru: 'Сначала выбери тренировку щипком. Затем удерживай большой палец вверх, чтобы начать. Каждую команду завершай отпусканием жеста.', kk: 'Алдымен жаттығуды таңда. Бастау үшін бас бармақты жоғары ұстап тұр. Әр пәрменнен кейін қолыңды босат.', en: 'Pinch to choose your workout, then hold a thumbs-up to start. Release your gesture after each command.' } }
const screens: Record<string, readonly GuideStep[]> = {
  PROFILE: [navigation, context, scrolling, audio], PLAN: [navigation, select, scrolling, back, audio],
  PROGRESS: [navigation, progress, audio], SCHEDULE: [navigation, schedule, scrolling, audio],
  RESULTS: [results, navigation, audio], MENU: [menu, scrolling, audio], TUTORIAL: [menu, scrolling, audio],
}
export class GuideMachine {
  private listeners = new Set<() => void>()
  private screen: string
  private step = 0
  private stopped = false
  constructor(screen = 'PROFILE') { this.screen = screen }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private publish() { this.listeners.forEach(listener => listener()) }
  getSnapshot = () => this.stopped ? null : screens[this.screen]?.[this.step] ?? null
  get total() { return screens[this.screen]?.length ?? 0 }
  get index() { return this.step }
  setScreen(screen: string) { if (screen === this.screen) return; this.screen = screen; this.step = 0; this.stopped = false; this.publish() }
  skip() { this.step++; this.publish() }
  stop() { this.stopped = true; this.publish() }
  restart() { this.step = 0; this.stopped = false; this.publish() }
}
