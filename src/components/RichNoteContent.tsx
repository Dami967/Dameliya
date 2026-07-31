import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { NoteAttachment } from '../lib/noteAttachments';

const richPrefix = '<!--goalquest-rich-note-->';
export type RichNoteContentHandle = { insertAttachment: (item: NoteAttachment) => void };

export const RichNoteContent = forwardRef<RichNoteContentHandle, {
  value: string; attachments: NoteAttachment[]; onChange: (value: string) => void;
}>(({ value, attachments, onChange }, ref) => {
  const editor = useRef<HTMLDivElement>(null);
  const range = useRef<Range | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!editor.current || initialized.current) return;
    editor.current.innerHTML = value.startsWith(richPrefix)
      ? sanitizeHtml(value.slice(richPrefix.length)) : plainTextToHtml(value);
    initialized.current = true;
  }, [value]);

  useEffect(() => {
    if (!editor.current || !initialized.current) return;
    const embedded = new Set(Array.from(editor.current.querySelectorAll('figure[data-note-attachment]'))
      .map((figure) => figure.getAttribute('data-note-attachment')));
    let added = false;
    attachments.filter((item) => item.mime_type.startsWith('image/')).forEach((item) => {
      const existing = editor.current?.querySelector(`figure[data-note-attachment="${item.id}"] img`);
      if (existing instanceof HTMLImageElement) existing.src = item.url ?? '';
      else if (!embedded.has(item.id) && item.url && editor.current) {
        editor.current.append(makePhoto(item), makeParagraph()); added = true;
      }
    });
    if (added) emitChange();
  }, [attachments]);

  useImperativeHandle(ref, () => ({ insertAttachment(item) {
    if (!editor.current || !item.mime_type.startsWith('image/') || !item.url) return;
    editor.current.focus();
    const selection = window.getSelection();
    const insertion = range.current && editor.current.contains(range.current.commonAncestorContainer)
      ? range.current : document.createRange();
    if (!range.current || !editor.current.contains(insertion.commonAncestorContainer)) {
      insertion.selectNodeContents(editor.current); insertion.collapse(false);
    }
    const paragraph = makeParagraph(); const fragment = document.createDocumentFragment();
    fragment.append(makePhoto(item), paragraph); insertion.deleteContents(); insertion.insertNode(fragment);
    const nextRange = document.createRange(); nextRange.setStart(paragraph, 0); nextRange.collapse(true);
    selection?.removeAllRanges(); selection?.addRange(nextRange); range.current = nextRange; emitChange();
  }}));

  function rememberRange() {
    const selection = window.getSelection(); const current = selection?.rangeCount ? selection.getRangeAt(0) : null;
    if (current && editor.current?.contains(current.commonAncestorContainer)) range.current = current.cloneRange();
  }
  function emitChange() { if (editor.current) onChange(serialize(editor.current)); }

  return <div ref={editor} className="note-content rich-note-content" contentEditable suppressContentEditableWarning
    data-placeholder="Начни писать здесь…" onInput={() => { rememberRange(); emitChange(); }}
    onKeyUp={rememberRange} onMouseUp={rememberRange} onBlur={rememberRange}
    onPaste={(event) => { event.preventDefault(); document.execCommand('insertText', false,
      event.clipboardData.getData('text/plain')); }} />;
});

function makePhoto(item: NoteAttachment) {
  const figure = document.createElement('figure'); figure.dataset.noteAttachment = item.id;
  const image = document.createElement('img'); image.src = item.url ?? ''; image.alt = item.name;
  const caption = document.createElement('figcaption'); caption.textContent = item.name;
  figure.append(image, caption); return figure;
}
function makeParagraph() { const paragraph = document.createElement('p'); paragraph.append(document.createElement('br')); return paragraph; }
function plainTextToHtml(value: string) {
  const element = document.createElement('div'); element.textContent = value;
  return element.innerHTML.replace(/\n/g, '<br>');
}
function serialize(source: HTMLElement) {
  const clone = source.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('img').forEach((image) => image.removeAttribute('src'));
  sanitizeElement(clone);
  return `${richPrefix}${clone.innerHTML}`;
}

export function notePlainText(value: string) {
  const element = document.createElement('div'); element.innerHTML = value.startsWith(richPrefix)
    ? sanitizeHtml(value.slice(richPrefix.length)) : plainTextToHtml(value);
  return element.textContent?.trim() ?? '';
}

function sanitizeHtml(value: string) {
  const element = document.createElement('div'); element.innerHTML = value; sanitizeElement(element); return element.innerHTML;
}
function sanitizeElement(root: HTMLElement) {
  const allowed = new Set(['BR', 'DIV', 'P', 'UL', 'OL', 'LI', 'B', 'STRONG', 'I', 'EM', 'FIGURE', 'IMG', 'FIGCAPTION']);
  Array.from(root.querySelectorAll('*')).forEach((element) => {
    if (!allowed.has(element.tagName)) { element.replaceWith(document.createTextNode(element.textContent ?? '')); return; }
    Array.from(element.attributes).forEach((attribute) => {
      const keep = element.tagName === 'FIGURE' && attribute.name === 'data-note-attachment'
        || element.tagName === 'IMG' && attribute.name === 'alt';
      if (!keep) element.removeAttribute(attribute.name);
    });
  });
}
