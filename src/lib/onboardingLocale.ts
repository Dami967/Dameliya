type InterviewCopy = {
  next: string; back: string; finish: string; saving: string; step: string; privacy: string;
  titles: string[]; texts: string[]; labels: string[]; placeholders: string[];
};

const english: InterviewCopy = {
  next: 'Continue', back: 'Back', finish: 'Create my quest', saving: 'Saving…', step: 'Step', privacy: '🔒 Answers are visible only to you and your AI mentor',
  titles: ['Let’s meet', 'Tell us about yourself', 'What is your superpower?', 'Choose your main goal'],
  texts: ['This will help create your personal AI profile.', 'We will suggest tasks that fit you.', 'There are no wrong answers — be yourself.', 'It will become your first personal quest.'],
  labels: ['What is your name?', 'Choose a username', 'How old are you?', 'Which country do you live in?', 'Where do you study or work?', 'Your interests', 'Your strengths', 'What feels difficult?', 'What do you want to achieve?', 'Why is it important?', 'Minutes per day'],
  placeholders: ['Alice', 'alice', '15', 'Your country', 'School, university or work', 'Design, technology, music', 'Creativity, curiosity', 'Planning', 'Launch my first project', 'I want to create something useful', '30'],
};

const copies: Record<string, Partial<InterviewCopy>> = {
  ru: { next: 'Продолжить', back: 'Назад', finish: 'Создать мой квест', saving: 'Сохраняем…', step: 'Шаг', privacy: '🔒 Ответы видны только тебе и твоему AI-наставнику',
    titles: ['Давай познакомимся', 'Расскажи о себе', 'В чём твоя суперсила?', 'Выбери главную цель'],
    texts: ['Это поможет создать твой личный AI-профиль.', 'Мы подберём задания, которые подходят именно тебе.', 'Здесь нет неправильных ответов — будь собой.', 'Она станет твоим первым персональным квестом.'],
    labels: ['Как тебя зовут?', 'Придумай username', 'Сколько тебе лет?', 'В какой стране ты живёшь?', 'Где учишься или работаешь?', 'Твои интересы', 'Сильные стороны', 'Что пока даётся сложно?', 'Чего хочешь достичь?', 'Почему это важно?', 'Минут в день'] },
  kk: { next: 'Жалғастыру', back: 'Артқа', finish: 'Квестімді құру', saving: 'Сақталуда…', step: 'Қадам', privacy: '🔒 Жауаптарды тек сен және AI-тәлімгерің көре алады',
    titles: ['Танысайық', 'Өзің туралы айтып бер', 'Сенің күшті жағың қандай?', 'Негізгі мақсатыңды таңда'],
    texts: ['Бұл жеке AI-профиліңді құруға көмектеседі.', 'Саған сәйкес тапсырмаларды ұсынамыз.', 'Қате жауап жоқ — өз ойыңды жаз.', 'Ол сенің алғашқы жеке квестің болады.'],
    labels: ['Атың кім?', 'Username ойлап тап', 'Жасың нешеде?', 'Қай елде тұрасың?', 'Қайда оқисың немесе жұмыс істейсің?', 'Қызығушылықтарың', 'Күшті жақтарың', 'Не қиын болып жүр?', 'Не нәрсеге қол жеткізгің келеді?', 'Бұл неге маңызды?', 'Күніне неше минут?'] },
  es: { next: 'Continuar', back: 'Atrás', finish: 'Crear mi misión', saving: 'Guardando…', step: 'Paso', privacy: '🔒 Solo tú y tu mentor de IA podéis ver las respuestas',
    titles: ['Vamos a conocernos', 'Cuéntanos sobre ti', '¿Cuál es tu superpoder?', 'Elige tu objetivo principal'] },
  fr: { next: 'Continuer', back: 'Retour', finish: 'Créer ma quête', saving: 'Enregistrement…', step: 'Étape', privacy: '🔒 Seuls toi et ton mentor IA voyez les réponses',
    titles: ['Faisons connaissance', 'Parle-nous de toi', 'Quel est ton super-pouvoir ?', 'Choisis ton objectif principal'] },
  de: { next: 'Weiter', back: 'Zurück', finish: 'Meine Quest erstellen', saving: 'Speichern…', step: 'Schritt', privacy: '🔒 Nur du und dein KI-Mentor sehen die Antworten',
    titles: ['Lernen wir uns kennen', 'Erzähl uns von dir', 'Was ist deine Superkraft?', 'Wähle dein Hauptziel'] },
  tr: { next: 'Devam et', back: 'Geri', finish: 'Görevimi oluştur', saving: 'Kaydediliyor…', step: 'Adım', privacy: '🔒 Yanıtları yalnızca sen ve AI mentorun görebilir',
    titles: ['Tanışalım', 'Bize kendinden bahset', 'Süper gücün nedir?', 'Ana hedefini seç'] },
  uk: { next: 'Продовжити', back: 'Назад', finish: 'Створити мій квест', saving: 'Зберігаємо…', step: 'Крок', privacy: '🔒 Відповіді бачите лише ти та твій AI-наставник',
    titles: ['Познайоммося', 'Розкажи про себе', 'У чому твоя суперсила?', 'Обери головну ціль'] },
  pt: { next: 'Continuar', back: 'Voltar', finish: 'Criar minha jornada', saving: 'Salvando…', step: 'Etapa', privacy: '🔒 Só você e seu mentor de IA podem ver as respostas',
    titles: ['Vamos nos conhecer', 'Conte sobre você', 'Qual é o seu superpoder?', 'Escolha seu objetivo principal'] },
};

export function interviewCopy(language: string): InterviewCopy {
  const localized = copies[language] ?? {};
  return { ...english, ...localized };
}
