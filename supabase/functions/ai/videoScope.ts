// Whole-subject recaps are not substitutes for an individual lesson.
export function matchesLessonScope(context: string, title: string) {
  const task = context.match(/(?:Задание|Этап):\s*([^\n.]+)/iu)?.[1] ?? '';
  const broad = /(?:вся|весь|всё|все)\s+(?:алгебр|математ|геометр|физик|хими|биолог|истори|граммат|англий|итальян)|(?:полный|весь|ускоренный)\s+курс|(?:full|complete|entire|crash)\s+course|весь\s+\d+\s*класс/iu;
  const overviewTask = /обзор|повторение всего|повторить весь|весь курс|вся программа|overview|full course/iu;
  if (!task || overviewTask.test(task)) return true;
  if (broad.test(title)) return false;

  // A search result is useful only when its title mentions the current stage.
  // Use stems so Russian inflections (степень/степени) still match.
  const ignored = new Set([
    'что', 'такое', 'это', 'как', 'для', 'при', 'про', 'изучи', 'изучить',
    'узнать', 'научиться', 'основы', 'первое', 'знакомство', 'урок', 'задание',
  ]);
  const words = task.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu)
    ?.filter((word) => word.length >= 4 && !ignored.has(word)) ?? [];
  if (!words.length) return true;
  const titleWords = title.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu)
    ?.filter((word) => word.length >= 4) ?? [];
  return words.some((word) => titleWords.some((part) =>
    part === word || part.startsWith(word.slice(0, Math.min(6, word.length)))
      || word.startsWith(part.slice(0, Math.min(6, part.length)))));
}
