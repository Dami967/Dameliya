const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function component(file, dependencies, dev = true) {
  const states = [];
  let cursor = 0;
  const context = { exports: {}, require: (name) => {
    if (name === 'react') return { useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = initial;
      return [states[index], (next) => { states[index] = typeof next === 'function' ? next(states[index]) : next; }];
    } };
    if (name === 'react/jsx-runtime') return require(name);
    return dependencies[name];
  } };
  vm.runInNewContext(ts.transpileModule(readFileSync(file, 'utf8').replaceAll('import.meta.env.DEV', String(dev)), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, context);
  return { exports: context.exports, render: (name, props) => { cursor = 0; return context.exports[name](props); } };
}
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
}
function text(tree) {
  if (tree == null || typeof tree === 'boolean') return '';
  if (typeof tree === 'string' || typeof tree === 'number') return String(tree);
  return tree?.props?.text ?? [tree?.props?.children].flat(Infinity).map(text).join('');
}
function click(tree, label) {
  const button = nodes(tree).find((node) => node.type === 'button' && text(node) === label);
  assert.ok(button, `Button ${label} exists`);
  assert.ok(!button.props.disabled, `Button ${label} is enabled`);
  button.props.onClick();
}
const data = component('tests/fixtures/developerReview.ts', {}).exports.developerReview;

test('developer quiz supports all five answers and finishes with the selected answers', () => {
  let submitted;
  const game = component('src/components/ReviewGame.tsx', { './LearningText': { LearningText() {} } });
  const render = () => game.render('ReviewGame', { questions: data, busy: false, onFinish: (answers) => { submitted = answers; } });
  for (let index = 0; index < data.length; index += 1) {
    click(render(), data[index].options[data[index].correct]);
    assert.match(text(render()), /Объяснение задания:/);
    click(render(), index === data.length - 1 ? 'Сохранить результат' : 'Дальше →');
  }
  assert.deepEqual(Array.from(submitted), Array.from(data, (question) => question.correct));
});

test('cards reveal their answer and advance without submitting quiz results', () => {
  let submissions = 0;
  const game = component('src/components/ReviewGame.tsx', { './LearningText': { LearningText() {} } });
  const render = () => game.render('ReviewGame', { initialMode: 'cards', questions: data,
    busy: false, onFinish: () => { submissions += 1; } });
  assert.ok(!text(render()).includes(data[0].explanation));
  click(render(), 'Перевернуть карточку');
  assert.ok(text(render()).includes(data[0].explanation));
  click(render(), 'Дальше →');
  assert.ok(text(render()).includes(data[1].question));
  assert.ok(!text(render()).includes(data[1].explanation));
  assert.equal(submissions, 0);
});

test('developer chest opens locally without calling the real reward service', () => {
  let calls = 0;
  let prize;
  const chest = component('src/components/RewardStop.tsx', {
    '../lib/personalChest': { openPersonalChest: async () => { calls += 1; return 'Actual reward'; } },
  });
  const tree = chest.render('RewardStop', { title: 'Обычный сундук', unlocked: true,
    chapterIndex: 0, preview: true, onOpened: (value) => { prize = value; } });
  const button = nodes(tree).find((node) => node.type === 'button');
  assert.equal(button.props.disabled, false);
  button.props.onClick();
  assert.match(prize, /Тестовый подарок/);
  assert.equal(calls, 0);
  const opened = chest.render('RewardStop', { title: 'Обычный сундук', unlocked: true,
    chapterIndex: 0, preview: true, prize, onOpened() {} });
  assert.ok(text(opened).includes('Получен ✓'));
  assert.equal(nodes(opened).find((node) => node.type === 'button').props.disabled, true);
});

test('a wrong answer turns red, the correct option turns green and explanation has the requested label', () => {
  const game = component('src/components/ReviewGame.tsx', { './LearningText': { LearningText() {} } });
  const render = () => game.render('ReviewGame', { questions: data, busy: false, onFinish() {} });
  assert.equal(nodes(render()).filter((node) => node.props?.className === 'is-correct').length, 0);
  click(render(), data[0].options[0]);
  const tree = render();
  const wrong = nodes(tree).find((node) => node.type === 'button' && text(node) === data[0].options[0]);
  const right = nodes(tree).find((node) => node.type === 'button' && text(node) === data[0].options[data[0].correct]);
  assert.equal(wrong.props.className, 'is-incorrect');
  assert.equal(right.props.className, 'is-correct');
  assert.match(text(tree), /Объяснение задания:/);
  assert.doesNotMatch(text(tree), /Попробуем разобраться/);
});

test('cached questions are tied to the selected goal, step material and account language', () => {
  const source = component('src/lib/reviewSource.ts', {}).exports.reviewSourceKey;
  const step = { id: 1, title: 'Слова для приветствия', details: { objective: 'Итальянский', lesson: { explanation: 'Ciao' } } };
  const plan = { id: 'italian', goal: 'Выучить итальянский' };
  const key = source(plan, step, 'ru');
  assert.notEqual(key, source({ ...plan, goal: 'Изучить физику' }, step, 'ru'));
  assert.notEqual(key, source(plan, { ...step, id: 2 }, 'ru'));
  assert.notEqual(key, source(plan, { ...step, details: { objective: 'Другая тема' } }, 'ru'));
  assert.notEqual(key, source(plan, step, 'kk'));
  assert.equal(key, source(plan, { ...step, state: 'done' }, 'ru'));
});
