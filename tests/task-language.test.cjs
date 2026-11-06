const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, dependencies, globals = {}) {
  const code = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const context = { exports: {}, require: (name) => {
    if (name in dependencies) return dependencies[name];
    throw new Error('Unexpected dependency: ' + name);
  }, ...globals };
  vm.runInNewContext(code, context);
  return context.exports;
}
const lesson = {
  explanation: 'Покой тела определяется равновесием сил.',
  examples: [{ question: 'A heavy box rests on the floor.', steps: ['Compare all the forces.'], answer: 'Balanced forces.' }],
  exercises: Array.from({ length: 5 }, (_, i) => ({ question: `Find force number ${i}.`, hint: 'Compare all the forces.', answer: `${i}` })),
};
const step = { id: 1, state: 'done', xp: 50, icon: 'book', title: 'Первый закон Ньютона', subtitle: 'Тема',
  details: { objective: 'Understand the first law.', expected_answer: 'Balanced forces.', duration_minutes: 25,
    category: 'Practice', checklist: [{ title: 'Read the explanation.', hint: 'Compare all forces.' }], lesson,
    resources: [{ type: 'video', title: 'Original title', url: 'https://youtu.be/abcdefghijk', language: 'en' }] } };
const taskLesson = load('src/lib/taskLesson.ts', {});
function translator() {
  return load('src/lib/translateTask.ts', {
    './taskLesson': taskLesson,
    './languages': { languageName: (code) => code === 'ru' ? 'Russian' : 'Kazakh' },
    './ai': { parseAiJson: JSON.parse, askAi: async (source) => ({
      text: JSON.stringify(JSON.parse(source).map((text) => /^\d+$/.test(text) ? text : 'Переведённый текст')), error: null,
    }) },
  });
}

test('Russian explanation with English examples and checklist still requires translation', () => {
  assert.equal(translator().taskNeedsTranslation(step, 'ru'), true);
});

test('translation includes every lesson section and checklist while preserving progress and media', async () => {
  const api = translator();
  const updated = await api.translateTask(step, 'ru', 'Законы Ньютона');
  assert.equal(updated.details.language, 'ru');
  assert.equal(updated.details.objective, 'Переведённый текст');
  assert.equal(updated.details.checklist[0].hint, 'Переведённый текст');
  assert.equal(updated.details.lesson.examples[0].steps[0], 'Переведённый текст');
  assert.equal(updated.details.lesson.exercises.length, 5);
  assert.equal(updated.details.lesson.exercises[4].answer, '4');
  assert.equal(updated.state, 'done');
  assert.equal(updated.xp, 50);
  assert.equal(updated.details.resources, step.details.resources);
  assert.equal(step.details.lesson.examples[0].question, 'A heavy box rests on the floor.');
});

test('changing account language re-translates an existing lesson', async () => {
  const api = translator();
  const russian = await api.translateTask(step, 'ru', 'Физика');
  assert.equal(api.taskNeedsTranslation(russian, 'kk'), true);
  const kazakh = await api.translateTask(russian, 'kk', 'Физика');
  assert.equal(kazakh.details.language, 'kk');
  assert.equal(api.taskNeedsTranslation(kazakh, 'kk'), false);
});

test('account language replaces stale browser language when settings load', async () => {
  const remembered = [];
  const api = load('src/lib/useSettings.ts', {
    react: { useState: () => [null, () => {}], useRef: (current) => ({ current }), useEffect: (effect) => effect() },
    './settingsCache': { cachedSettings: () => null, cacheSettings: () => {} },
    './languages': { detectLanguage: () => 'en', rememberLanguage: (code) => remembered.push(code) },
    './userProfile': { loadSettings: async () => ({ data: { language: 'ru', theme: 'light' }, error: null }) },
  }, { AbortController, window: { setTimeout: () => 1, clearTimeout() {} }, document: { documentElement: { dataset: {} } } });
  api.useSettings('user');
  await Promise.resolve();
  assert.deepEqual(remembered, ['ru']);
});

test('server never reintroduces a video rejected by the availability check', async () => {
  let handler;
  load('supabase/functions/ai/index.ts', {
    './generateResponse.ts': {},
    './youtube.ts': { searchVideos: async () => [{ videoId: 'abcdefghijk', title: 'Deleted lesson' }] },
    './videoSelection.ts': { selectLessonVideo: async () => null },
  }, { Deno: { env: { get: () => undefined }, serve: (callback) => { handler = callback; } }, Response, console });
  const response = await handler({ method: 'POST', json: async () => ({ action: 'search_youtube', query: 'Физика' }) });
  const data = await response.json();
  assert.equal(data.video, null);
  assert.equal(data.reason, 'no_matching_video');
});

test('simultaneous requests share one translation instead of consuming AI quota twice', async () => {
  let calls = 0;
  const api = load('src/lib/translateTask.ts', {
    './taskLesson': taskLesson,
    './languages': { languageName: () => 'Russian' },
    './ai': { parseAiJson: JSON.parse, askAi: async (source) => {
      calls += 1;
      return { text: JSON.stringify(JSON.parse(source).map((text) => /^\d+$/.test(text) ? text : 'Переведённый текст')), error: null };
    } },
  });
  const [first, second] = await Promise.all([
    api.translateTask(step, 'ru', 'Физика'), api.translateTask(step, 'ru', 'Физика'),
  ]);
  assert.equal(calls, 1);
  assert.equal(first, second);
});

test('a failed translation can be retried without keeping a failed promise', async () => {
  let calls = 0;
  const api = load('src/lib/translateTask.ts', {
    './taskLesson': taskLesson,
    './languages': { languageName: () => 'Russian' },
    './ai': { parseAiJson: JSON.parse, askAi: async (source) => {
      calls += 1;
      if (calls === 1) return { text: null, error: new Error('Лимит AI') };
      return { text: JSON.stringify(JSON.parse(source).map(() => 'Переведённый текст')), error: null };
    } },
  });
  await assert.rejects(api.translateTask(step, 'ru', 'Физика'), /Лимит AI/);
  const updated = await api.translateTask(step, 'ru', 'Физика');
  assert.equal(updated.details.language, 'ru');
  assert.equal(calls, 2);
});

test('AI translation outage leaves video, notes and saved work accessible', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const dependencies = new Proxy({}, {
    has: () => true,
    get: (_target, name) => {
      if (name === 'react/jsx-runtime') return require('react/jsx-runtime');
      if (name === 'react') return { useEffect() {}, useState: (initial) => [initial, () => {}] };
      if (name === 'wouter') return { useLocation: () => ['/task/1', () => {}],
        useRoute: () => [true, { id: '1' }], Link: ({ children, href }) => React.createElement('a', { href }, children) };
      if (name === '../lib/useSession') return { useSession: () => ({ session: { user: { id: 'user' } } }) };
      if (name === '../lib/useSettings') return { useSettings: () => ({ settings: { language: 'ru' } }) };
      if (name === '../lib/useQuestTask') return { useQuestTask: () => ({
        plan: { id: 'plan', goal: 'Физика', steps: [step] }, step, record: null,
        notes: 'Мои сохранённые ответы', chat: [], learningContext: '',
        resourcesLoading: false, lessonReady: false, lessonLoading: false,
        loadError: 'Лимит AI', saveError: '', retry() {}, setNotes() {}, setChat() {},
      }) };
      if (name === '../lib/exerciseAnswers') return { readExerciseNotes: (notes) => ({ notes, answers: [] }) };
      if (name === '../components/TaskResources') return {
        TaskResources: () => React.createElement('button', null, 'Видеоурок'),
      };
      return new Proxy({}, { get: () => () => null });
    },
  });
  const page = load('src/pages/TaskPage.tsx', dependencies, { URLSearchParams, window: { location: { search: '?plan=plan' } } });
  const html = renderToStaticMarkup(React.createElement(page.TaskPage));
  assert.match(html, /Видеоурок/);
  assert.match(html, /Мои сохранённые ответы/);
  assert.match(html, /Лимит AI/);
  assert.doesNotMatch(html, /A heavy box/);
  assert.doesNotMatch(html, /Understand the first law/);
});
