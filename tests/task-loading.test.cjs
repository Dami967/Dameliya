const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
function load(file, dependencies, globals = {}) {
  const context = { exports: {}, require: (name) => dependencies[name], ...globals };
  vm.runInNewContext(ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, context);
  return context.exports;
}

test('translation failure preserves the original exercises and still starts video lookup', async () => {
  const states = [];
  const effects = [];
  const lesson = { explanation: 'Saved explanation', examples: [{}], exercises: [{ question: 'Saved question' }] };
  const step = { id: 1, state: 'active', details: { lesson, resources: [] } };
  const plan = { id: 'plan', goal: 'Физика', steps: [step] };
  const video = { type: 'video', url: 'https://youtu.be/abcdefghijk', title: 'Физика', language: 'ru' };
  let videoCalls = 0;
  const api = load('src/lib/useQuestTask.ts', {
    react: { useState(initial) {
      const index = states.length;
      states.push(initial);
      return [initial, (next) => { states[index] = typeof next === 'function' ? next(states[index]) : next; }];
    }, useRef: (current) => ({ current }), useEffect: (callback) => effects.push(callback) },
    './aiQuest': { loadAiQuestById: async () => ({ data: plan }), loadAiQuest: async () => ({ data: plan }) },
    './taskLesson': { isTaskLesson: (value) => value === lesson },
    './questDetails': { normalizeQuestStep: (value) => value },
    './questData': { questSteps: [] },
    './taskRecords': { loadTaskRecord: async () => ({ data: { notes: 'Saved answers', chat: [] } }) },
    './questLearning': { loadQuestLearning: async () => ({ context: '' }) },
    './ensureQuestTask': {
      ensureQuestTaskDetails: async () => { throw new Error('AI unavailable'); },
      ensureTaskVideo: async () => { videoCalls += 1; return { data: { ...step, details: { ...step.details, resources: [video] } } }; },
      saveUpdatedStep: async () => ({ error: null }),
    },
  });
  api.useQuestTask('user', 'plan', 1);
  effects.forEach((effect) => effect());
  await new Promise(setImmediate);
  assert.equal(videoCalls, 1);
  const displayed = states[1];
  assert.equal(displayed.details.lesson.exercises[0].question, 'Saved question');
  assert.equal(displayed.details.resources[0].url, video.url);
  assert.ok(states.includes('Saved answers'));
  assert.ok(states.includes(true));
});

test('temporary provider failure is retried, but a quota error is not', async () => {
  let calls = 0;
  const api = load('supabase/functions/ai/generateResponse.ts', {}, {
    Response, AbortSignal, setTimeout: (callback) => callback(), fetch: async () => {
      calls += 1;
      return new Response('{}', { status: calls === 1 ? 503 : 200 });
    },
  });
  assert.equal((await api.generateResponse('https://example.test', {})).status, 200);
  assert.equal(calls, 2);
  let quotaCalls = 0;
  const quota = load('supabase/functions/ai/generateResponse.ts', {}, {
    Response, AbortSignal, setTimeout: (callback) => callback(), fetch: async () => {
      quotaCalls += 1; return new Response('{}', { status: 429 });
    },
  });
  assert.equal((await quota.generateResponse('https://example.test', {})).status, 429);
  assert.equal(quotaCalls, 1);
});
