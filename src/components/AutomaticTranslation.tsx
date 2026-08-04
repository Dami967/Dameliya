import { useEffect, type ReactNode } from 'react';
import { detectLanguage } from '../lib/languages';
import { readUiTranslation, saveUiTranslations, translateUiBatch } from '../lib/uiTranslation';

type Target = { source: string; apply: (value: string) => void };
type OriginalValue = { source: string; lastApplied: string };

const originalText = new WeakMap<Text, OriginalValue>();
const originalAttributes = new WeakMap<Element, Map<string, OriginalValue>>();
const translatedAttributes = ['placeholder', 'title', 'aria-label'] as const;
const excluded = [
  'script', 'style', 'textarea', 'option', '[contenteditable="true"]', '[data-no-auto-translate]',
  '.note-content', '.notes-list', '.chat-messages', '.mentor-chat-log', '.ai-chat',
  '.profile-copy',
].join(',');

export function AutomaticTranslation({ children }: { children: ReactNode }) {
  useEffect(() => {
    let language = detectLanguage();
    let timer: number | undefined;
    let running = false;
    let rerun = false;
    let languageVersion = 0;

    function showSwitching() {
      document.documentElement.dataset.uiTranslating = language === 'kk' ? 'Тіл ауыстырылуда…'
        : language === 'ru' ? 'Переключаем язык…' : 'Changing language…';
    }

    function finishSwitching() {
      delete document.documentElement.dataset.uiTranslating;
    }

    async function translatePage() {
      if (running) { rerun = true; return; }
      const targets = collectTargets();
      if (language === 'ru') {
        targets.forEach((target) => target.apply(target.source));
        finishSwitching();
        return;
      }
      const missing = new Set<string>();
      targets.forEach((target) => {
        const translated = readUiTranslation(language, target.source);
        if (translated) target.apply(translated);
        else missing.add(target.source);
      });
      if (missing.size) showSwitching();
      const batch = takeBatch([...missing]);
      if (!batch.length) { finishSwitching(); return; }
      running = true;
      const requestedLanguage = language;
      const requestedVersion = languageVersion;
      const translations = await translateUiBatch(batch, requestedLanguage);
      if (requestedVersion !== languageVersion) return;
      running = false;
      if (!Object.keys(translations).length) { finishSwitching(); return; }
      saveUiTranslations(requestedLanguage, translations);
      if (language === requestedLanguage) schedule();
      if (rerun) { rerun = false; schedule(); }
    }

    function schedule() {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void translatePage(), 0);
    }

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...translatedAttributes],
    });
    const onLanguage = (event: Event) => {
      language = (event as CustomEvent<string>).detail || detectLanguage();
      languageVersion += 1;
      running = false;
      rerun = false;
      showSwitching();
      schedule();
    };
    window.addEventListener('goalquest-language-changed', onLanguage);
    if (language !== 'ru') showSwitching();
    schedule();
    return () => {
      observer.disconnect();
      window.removeEventListener('goalquest-language-changed', onLanguage);
      window.clearTimeout(timer);
      finishSwitching();
    };
  }, []);

  return children;
}

function collectTargets() {
  const targets: Target[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const text = node as Text;
    const parent = text.parentElement;
    if (parent && !parent.closest(excluded)) {
      const current = text.nodeValue ?? '';
      let original = originalText.get(text);
      if (!original || (current !== original.source && current !== original.lastApplied)) {
        original = { source: current, lastApplied: current };
        originalText.set(text, original);
      }
      if (isInterfaceText(original.source)) targets.push({ source: original.source, apply: (value) => {
        const next = preserveSpace(original.source, value);
        if (text.nodeValue !== next) text.nodeValue = next;
        original.lastApplied = next;
      } });
    }
    node = walker.nextNode();
  }
  document.querySelectorAll<HTMLElement>('*').forEach((element) => {
    if (element.closest(excluded)) return;
    translatedAttributes.forEach((attribute) => {
      const current = element.getAttribute(attribute);
      if (!current) return;
      const attributes = originalAttributes.get(element) ?? new Map<string, OriginalValue>();
      let original = attributes.get(attribute);
      if (!original || (current !== original.source && current !== original.lastApplied)) {
        original = { source: current, lastApplied: current };
        attributes.set(attribute, original);
      }
      originalAttributes.set(element, attributes);
      if (isInterfaceText(original.source)) targets.push({ source: original.source, apply: (value) => {
        if (element.getAttribute(attribute) !== value) element.setAttribute(attribute, value);
        original.lastApplied = value;
      } });
    });
  });
  return targets;
}

function isInterfaceText(value: string) {
  const text = value.trim();
  return text.length >= 2 && text.length <= 600 && /[А-Яа-яЁёІіҚқҒғҢңӨөҰұҮүҺһ]/.test(text);
}

function preserveSpace(source: string, translated: string) {
  return `${source.match(/^\s*/)?.[0] ?? ''}${translated.trim()}${source.match(/\s*$/)?.[0] ?? ''}`;
}

function takeBatch(sources: string[]) {
  const batch: string[] = [];
  let characters = 0;
  for (const source of sources) {
    if (batch.length >= 80 || characters + source.length > 12_000) break;
    batch.push(source);
    characters += source.length;
  }
  return batch;
}
