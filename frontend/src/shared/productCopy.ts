import type { Language } from '../api/release';
const copy = {
  voiceTitle: ['Выберите голос тренера','Жаттықтырушы дауысын таңдаңыз','Choose your coach voice'],
  voiceDescription: ['Предпрослушивание воспроизводит выбранный голос. Язык и стиль сохраняются отдельно.','Таңдалған дауысты тыңдаңыз. Тіл мен стиль бөлек сақталады.','Preview plays the selected voice. Language and tone are saved separately.'],
  language: ['Язык','Тіл','Language'], style: ['Стиль','Стиль','Tone'],
  calm: ['Спокойный','Сабырлы','Calm'], supportive: ['Поддерживающий','Қолдаушы','Supportive'], energetic: ['Энергичный','Қуатты','Energetic'], strict: ['Строгий','Талапшыл','Strict'],
  select: ['Выбрать','Таңдау','Select'], preview: ['Послушать','Тыңдау','Preview'], stopPreview: ['Остановить preview','Тыңдауды тоқтату','Stop preview'],
  enableAudio: ['Включить звук','Дыбысты қосу','Enable audio'], saveContinue: ['Сохранить и продолжить','Сақтау және жалғастыру','Save and continue'], silent: ['Продолжить без звука','Дыбыссыз жалғастыру','Continue without audio'],
  loadingVoices: ['Загружаем доступные голоса…','Дауыстар жүктелуде…','Loading available voices…'],
  coach: ['Тренер','Жаттықтырушы','Coach'], message: ['Сообщение тренеру','Жаттықтырушыға хабарлама','Message your coach'], send: ['Отправить','Жіберу','Send'],
  coachDescription: ['Спросите о плане или предложите перенос. Изменения требуют подтверждения.','Жоспар туралы сұраңыз немесе уақытын ауыстыруды ұсыныңыз. Өзгерісті растау қажет.','Ask about your plan or propose a change. Changes need confirmation.'],
  record: ['Записать вопрос (до 30 с)','Сұрақты жазу (30 с дейін)','Record question (up to 30 s)'], stopRecording: ['Остановить запись','Жазуды тоқтату','Stop recording'], cancelRecording: ['Отменить запись','Жазудан бас тарту','Cancel recording'],
  schedule: ['Неделя и расписание','Апта және кесте','Week and schedule'], week: ['Неделя','Апта','Week'], refresh: ['Обновить','Жаңарту','Refresh'],
  scheduleDescription: ['Напоминания работают в открытой вкладке. Google подключается отдельно; экспорт .ics доступен без Google.','Еске салғыштар ашық қойындыда жұмыс істейді. Google бөлек қосылады; .ics экспорты Google-сыз қолжетімді.','Reminders work in an open tab. Connect Google separately; .ics export works without Google.'],
  newAppointment: ['Новое занятие','Жаңа жаттығу','New appointment'], move: ['Перенести','Ауыстыру','Move'], cancel: ['Отменить','Бас тарту','Cancel'], title: ['Название','Атауы','Title'], datetime: ['Дата и время','Күні мен уақыты','Date and time'],
  propose: ['Предложить изменение','Өзгерісті ұсыну','Propose change'], slots: ['Свободные слоты','Бос уақыттар','Available slots'], export: ['Скачать .ics','.ics жүктеу','Download .ics'],
  confirm: ['Подтвердить','Растау','Confirm'], reject: ['Отклонить','Қабылдамау','Reject'], confirmed: ['Подтверждено сервером','Сервер растады','Confirmed by server'], rejected: ['Отклонено','Қабылданбады','Rejected'], pending: ['Изменение ожидает вашего подтверждения','Өзгеріс растауыңызды күтуде','Change awaits your confirmation'],
  connectGoogle: ['Подключить Google','Google қосу','Connect Google'], syncGoogle: ['Синхронизировать','Синхрондау','Sync'], disconnectGoogle: ['Отключить Google','Google ажырату','Disconnect Google'],
  repeat: ['Повторить','Қайталау','Repeat'], skipStep: ['Пропустить шаг','Қадамды өткізу','Skip step'], stopGuide: ['Остановить обучение','Оқытуды тоқтату','Stop guide'],
} as const;
export function productText(language: Language, key: keyof typeof copy) { return copy[key][language === 'kk' ? 1 : language === 'en' ? 2 : 0]; }
