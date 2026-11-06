const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { renderToStaticMarkup } = require('react-dom/server');
const React = require('react');

function load(file, dependencies) {
  const code = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const context = { exports: {}, URL, require: (name) => {
    if (name in dependencies) return dependencies[name];
    if (name === 'react/jsx-runtime') return require(name);
    throw new Error('Unexpected dependency: ' + name);
  } };
  vm.runInNewContext(code, context);
  return context.exports;
}

const video = { language: 'ru', type: 'video', title: 'Newton first law', url: 'https://youtu.be/abcdefghijk', description: 'Lesson' };
function resourcesHtml(resources, chosen = null) {
  const videos = load('src/lib/questVideos.ts', { './ai': {} });
  let state = 0;
  const component = load('src/components/TaskResources.tsx', {
    react: { useState: (initial) => [state++ === 0 ? chosen : initial, () => {}] },
    '../lib/questVideos': videos,
    './VideoLesson': { VideoLesson: () => null },
    './TaskMaterial': { TaskMaterial: () => null },
    './TaskQuiz': { TaskQuiz: () => null },
  });
  return renderToStaticMarkup(React.createElement(component.TaskResources, {
    resources, language: 'ru', expectsVideo: true, loading: false, task: 'Задание: Инерция', notes: '', chat: [],
    readOnly: false, onNotes() {}, onChat() {},
  }));
}

test('playable video is displayed despite different title language or missing version tag', () => {
  const html = resourcesHtml([video]);
  assert.match(html, /Видеоурок/);
  assert.doesNotMatch(html, /Видео не удалось/);
});

test('video selected in player removes the stale missing-video banner', () => {
  assert.match(resourcesHtml([]), /Видеоурок/);
  const html = resourcesHtml([], video);
  assert.match(html, /Видеоурок/);
  assert.doesNotMatch(html, /Видео не удалось/);
});


test('previously saved Russian video remains playable without a new language marker', () => {
  const html = resourcesHtml([{ ...video, language: undefined, title: 'Первый закон Ньютона' }]);
  assert.match(html, /Первый закон Ньютона/);
  assert.match(html, /Видеоурок/);
});

test('known wrong-language video is not offered as the current lesson', () => {
  const html = resourcesHtml([{ ...video, language: 'en' }]);
  assert.doesNotMatch(html, /Newton first law/);
  assert.match(html, /Видеоурок/);
});
