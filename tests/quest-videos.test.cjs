const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, globals = {}) {
  const code = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = { exports: {}, URL, AbortSignal, require: (name) => {
    if (['./videoScope.ts', './videoQuery.ts', './videoLanguage.ts', './videoMetadata.ts', './exactVideoTopic.ts', './youtube.ts'].includes(name))
      return load('supabase/functions/ai/' + name.slice(2), globals);
    throw new Error('Unexpected dependency: ' + name);
  }, ...globals };
  vm.runInNewContext(code, context);
  return context.exports;
}

const renderer = (videoId, title) => ({ videoRenderer: {
  videoId, title: { runs: [{ text: title }] },
  lengthText: { simpleText: '12:00' }, ownerText: { runs: [{ text: 'Учитель' }] },
} });

test('algebra search rejects the music clip and unrelated lessons', async () => {
  const videos = load('supabase/functions/ai/youtube.ts', {
    fetch: async () => ({ ok: true, json: async () => [
      renderer('dQw4w9WgXcQ', 'Rick Astley - Never Gonna Give You Up (Official Video)'),
      renderer('abcdefghijk', 'Степень с натуральным показателем — Алгебра 7 класс'),
      renderer('lmnopqrstuv', 'Урок рисования акварелью'),
    ] }),
  });
  const results = await videos.searchVideos('Степень с натуральным показателем. Алгебра 7 класс');
  assert.equal(results.length, 1);
  assert.equal(results[0].videoId, 'abcdefghijk');
  assert.equal((await videos.searchVideos('Степень с натуральным показателем', 'abcdefghijk')).length, 0);
});

test('music goals can still find music lessons', async () => {
  let query;
  const videos = load('supabase/functions/ai/youtube.ts', {
    fetch: async (_url, options) => {
      query = JSON.parse(options.body).query;
      return { ok: true, json: async () => [renderer('abcdefghijk', 'Guitar lesson: first chords')] };
    },
  });
  assert.equal((await videos.searchVideos('Learn guitar chords')).length, 1);
  assert.ok(!query.includes('-music'));
});

test('generated video URLs are replaced with search results or removed', async () => {
  let result = null;
  const videos = load('src/lib/questVideos.ts', {
    require: () => ({ searchYoutubeVideo: async () => result }),
  });
  const details = { objective: 'Посмотри видео', checklist: [], resources: [
    { type: 'video', title: 'Алгебра', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  ] };
  assert.equal((await videos.verifyDetailsResources(details, 'Алгебра')).resources.length, 0);
  result = { type: 'video', title: 'Настоящий урок', url: 'https://youtu.be/abcdefghijk', description: 'Урок' };
  const verified = (await videos.verifyDetailsResources(details, 'Алгебра')).resources[0];
  assert.equal(verified.url, result.url);
  assert.ok(verified.description.includes(videos.VIDEO_VERSION_TAG));
  assert.equal(videos.youtubeEmbed('https://evil.example/watch?v=abcdefghijk'), null);
  assert.ok(videos.youtubeEmbed(result.url));
});


test('search keeps both the exact topic and the target language without long instructions', () => {
  const { videoSearchQuery } = load('supabase/functions/ai/videoQuery.ts');
  assert.equal(videoSearchQuery('Цель: итальянский с нуля. Задание: Приветствия. Прочитай длинное объяснение.'),
    'Приветствия итальянский с нуля');
  const { matchesTargetLanguage } = load('supabase/functions/ai/videoLanguage.ts');
  assert.equal(matchesTargetLanguage('Цель: итальянский с нуля. Задание: приветствия.', 'English greetings', 'English school'), false);
  assert.equal(matchesTargetLanguage('Цель: итальянский с нуля. Задание: приветствия.', 'Приветствия по-итальянски', 'Школа языков'), true);
});

test('selection skips unavailable embeds and uses a real embeddable candidate', async () => {
  const candidates = [{ videoId: 'abcdefghijk', title: 'Степень', channel: 'Математика' },
    { videoId: 'lmnopqrstuv', title: 'Степень и её свойства', channel: 'Математика' }];
  const selection = load('supabase/functions/ai/videoSelection.ts', {
    fetch: async (url) => {
      if (url.includes('generativelanguage')) return { ok: true, json: async () => ({ candidates: [{content:{parts:[{text:'{"indices":[0,1]}'}]}}] }) };
      if (url.includes('abcdefghijk')) return { ok: false };
      return { ok: true, json: async () => ({ title: 'Степень — настоящий урок', html: '<iframe src="https://www.youtube.com/embed/lmnopqrstuv"></iframe>' }) };
    },
  });
  const result = await selection.selectLessonVideo('Цель: алгебра. Задание: степень.', candidates, 'test-key', 'test-model');
  assert.equal(result.url, 'https://www.youtube.com/watch?v=lmnopqrstuv');
  assert.equal(result.title, 'Степень — настоящий урок');
});

test('reminders are due only in the configured minute, never an evening catch-up', () => {
  const { isReminderTime } = load('src/lib/reminderSchedule.ts');
  for (const [hour, minute, expected] of [[8,59,false],[9,0,true],[9,1,false],[20,0,false]]) {
    assert.equal(isReminderTime('09:00', new Date(2026,8,22,hour,minute)), expected);
  }
  assert.equal(isReminderTime('09:00:00', new Date(2026,8,22,9,0,59)), true);
});


test('AI outage fallback requires the exact stage topic and the correct language', async () => {
  const selection = load('supabase/functions/ai/videoSelection.ts', {
    fetch: async (url) => url.includes('generativelanguage') ? {ok:false} : {ok:true, json:async()=>({title:'Степень числа',html:'/embed/abcdefghijk'})},
  });
  const candidates = [{videoId:'abcdefghijk',title:'Степень числа',channel:'Математика'}];
  assert.ok(await selection.selectLessonVideo('Цель: алгебра. Задание: Что такое степень.', candidates, 'test', 'test'));
  assert.equal(await selection.selectLessonVideo('Цель: итальянский. Задание: приветствия.', candidates, 'test', 'test'), null);
});

test('slow metadata does not erase relevant public search results', async () => {
  const { availableLesson } = load('supabase/functions/ai/videoMetadata.ts', {
    fetch: async () => { throw new DOMException('Timeout', 'TimeoutError'); },
  });
  const result = await availableLesson('Цель: итальянский', [{videoId:'abcdefghijk',title:'Приветствия по-итальянски',channel:'Итальянский'}]);
  assert.equal(result.url, 'https://www.youtube.com/watch?v=abcdefghijk');
});

test('explicit unavailable videos are still rejected', async () => {
  const { availableLesson } = load('supabase/functions/ai/videoMetadata.ts', {fetch: async () => ({ok:false,status:404})});
  assert.equal(await availableLesson('Цель: алгебра', [{videoId:'abcdefghijk',title:'Степень'}]),null);
});

test('empty AI selection still checks exact topic matches', async () => {
  const selection = load('supabase/functions/ai/videoSelection.ts', {
    fetch: async url => url.includes('generativelanguage')
      ? {ok:true,json:async()=>({candidates:[{content:{parts:[{text:'{"indices":[]}'}]}}]})}
      : {ok:true,json:async()=>({title:'Степень числа',html:'/embed/abcdefghijk'})},
  });
  assert.ok(await selection.selectLessonVideo('Цель: алгебра. Задание: Что такое степень.',
    [{videoId:'abcdefghijk',title:'Степень числа',channel:'Математика'}],'test','test'));
});

test('HTML5 failure is distinguished from an embedding restriction', () => {
  const { videoPlaybackError } = load('src/lib/videoPlaybackError.ts');
  assert.match(videoPlaybackError(5, false), /формат видео/);
  assert.doesNotMatch(videoPlaybackError(5, true), /Автор запретил/);
  assert.match(videoPlaybackError(101, true), /Автор запретил/);
  assert.match(videoPlaybackError(100, true), /удалён/);
});


test('narrow stages exclude whole-subject courses even when AI recommends them', async () => {
  const { matchesLessonScope } = load('supabase/functions/ai/videoScope.ts');
  assert.equal(matchesLessonScope('Цель: Алгебра 7 класс. Задание: Что такое степень.', 'Вся алгебра 7 класс за 30 минут'), false);
  assert.equal(matchesLessonScope('Цель: Python. Задание: Циклы for.', 'Python full course'), false);
  assert.equal(matchesLessonScope('Цель: Итальянский. Задание: Приветствия.', 'Итальянский: полный курс за час'), false);
  assert.equal(matchesLessonScope('Цель: Алгебра. Задание: Что такое степень.', 'Степень с натуральным показателем'), true);
  assert.equal(matchesLessonScope('Цель: Алгебра. Задание: Что такое степень.', 'Что такое производная?'), false);
  assert.equal(matchesLessonScope('Цель: Алгебра. Задание: Свойства степеней.', 'Вся алгебра 7 класса за 30 минут'), false);
  assert.equal(matchesLessonScope('Цель: Алгебра. Задание: Обзор всего курса.', 'Вся алгебра 7 класс за 30 минут'), true);
});

test('saved video must still match the current task before it is reused', () => {
  const { videoMatchesTask } = load('src/lib/questVideos.ts', {
    require: (name) => name === './ai' ? {} : undefined,
  });
  assert.equal(videoMatchesTask('Задание: Что такое степень.', 'Степень с натуральным показателем'), true);
  assert.equal(videoMatchesTask('Задание: Что такое степень.', 'АЛГЕБРА С НУЛЯ — Что такое производная?'), false);
});

test('explicit video language rejects English physics videos for a Russian account', async () => {
  const videos = load('supabase/functions/ai/youtube.ts', {
    fetch: async () => ({ ok: true, json: async () => [
      renderer('abcdefghijk', 'Newton first law explained'),
      renderer('lmnopqrstuv', 'Первый закон Ньютона — урок физики'),
    ] }),
  });
  const result = await videos.searchVideos('Цель: Законы Ньютона. Задание: Первый закон Ньютона\nЯзык видео: ru.');
  assert.equal(result.length, 1);
  assert.equal(result[0].videoId, 'lmnopqrstuv');
});

test('video language comes from settings marker even when goal is English', () => {
  const language = load('supabase/functions/ai/videoLanguage.ts');
  const query = 'Цель: Newton laws.\nЯзык видео: ru (Russian).';
  assert.equal(language.requestedVideoLanguage(query), 'ru');
  assert.equal(language.matchesSpokenLanguage(query, 'Newton laws explained'), false);
  assert.equal(language.matchesSpokenLanguage(query, 'Законы Ньютона — объяснение'), true);
  assert.equal(language.matchesSpokenLanguage('Язык видео: en.', 'Законы Ньютона'), false);
});
