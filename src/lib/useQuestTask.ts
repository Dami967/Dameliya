import { isTaskLesson } from './taskLesson';
import { useEffect, useRef, useState } from 'react';
import { loadAiQuest, loadAiQuestById, type AiQuestPlan } from './aiQuest';
import { ensureQuestTaskDetails, ensureTaskVideo, saveUpdatedStep } from './ensureQuestTask';
import { normalizeQuestStep } from './questDetails';
import { questSteps, type QuestStep } from './questData';
import { loadTaskRecord, saveTaskRecord, type TaskChatMessage, type TaskRecord } from './taskRecords';
import { loadQuestLearning } from './questLearning';

export function useQuestTask(userId: string | undefined, planId: string | null, stepId: number) {
  const [plan, setPlan] = useState<AiQuestPlan | null>(null);
  const [step, setStep] = useState<QuestStep | null>(null);
  const [record, setRecord] = useState<TaskRecord | null>(null);
  const [notes, setNotes] = useState('');
  const [chat, setChat] = useState<TaskChatMessage[]>([]);
  const [learningContext, setLearningContext] = useState('');
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [lessonReady, setLessonReady] = useState(false);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [recordLoaded, setRecordLoaded] = useState(false);
  const generation = useRef(0);

  async function prepare(currentPlan: AiQuestPlan, selected: QuestStep, request: number) {
    if (!userId) return;
    const active = () => request === generation.current;
    setLessonLoading(true); setLessonReady(isTaskLesson(selected.details?.lesson)); setLoadError('');
    setResourcesLoading(true);
    const videoRequest = ensureTaskVideo(userId, currentPlan, selected, false).then((video) => {
      if (active() && video.data.details) {
        const resources = video.data.details.resources;
        setStep((current) => current?.details ? { ...current, details: { ...current.details, resources } } : current);
      }
      return video;
    }).catch(() => null);
    let prepared = selected;
    try {
      const result = await ensureQuestTaskDetails(userId, currentPlan, selected.id);
      if (!active()) return;
      if (result.error) throw result.error;
      prepared = result.data ?? selected;
    } catch (reason) {
      if (!active()) return;
      setLoadError(reason instanceof Error ? reason.message : 'Не удалось обновить урок.');
    }
    if (!active()) return;
    const nextPlan = { ...currentPlan, steps: currentPlan.steps.map((item) => item.id === prepared.id ? prepared : item) };
    setLessonReady(isTaskLesson(prepared.details?.lesson));
    setStep(prepared); setPlan(nextPlan); setLessonLoading(false); setResourcesLoading(true);
    // A translation outage must not skip video lookup or erase the saved lesson.
    try {
      const video = await videoRequest;
      if (!active() || !video?.data.details || !prepared.details) return;
      const combined = { ...prepared, details: { ...prepared.details, resources: video.data.details.resources } };
      setStep(combined);
      setPlan({ ...nextPlan, steps: nextPlan.steps.map((item) => item.id === prepared.id ? combined : item) });
      const saved = await saveUpdatedStep(userId, nextPlan, combined);
      if (active() && saved.error) setSaveError('Видео найдено, но пока не сохранено.');
    } catch {
      if (active()) setSaveError('Подбор нового видео временно недоступен. Сохранённые материалы доступны.');
    } finally {
      if (active()) setResourcesLoading(false);
    }
  }

  useEffect(() => {
    const request = ++generation.current;
    setLessonReady(false); setStep(null); setPlan(null); setRecord(null); setNotes(''); setChat([]); setLearningContext('');
    setRecordLoaded(false); setLoadError(''); setSaveError('');
    if (!userId) return;
    let active = true;
    void (async () => {
      const result = await (planId ? loadAiQuestById(userId, planId) : loadAiQuest(userId));
      if (!active) return;
      if (result.error) throw result.error;
      const currentPlan = result.data;
      if (!currentPlan) { setStep(questSteps[0]); return; }
      const selected = normalizeQuestStep(currentPlan.steps.find((item) => item.id === stepId)
        ?? currentPlan.steps.find((item) => item.state === 'active') ?? currentPlan.steps[0]);
      setStep(selected); setPlan(currentPlan); setLessonReady(isTaskLesson(selected.details?.lesson));
      const saved = await loadTaskRecord(userId, currentPlan.goal, selected.id);
      if (!active) return;
      if (saved.error) throw saved.error;
      setRecord(saved.data); setNotes(saved.data?.notes ?? ''); setChat(saved.data?.chat ?? []);
      setRecordLoaded(true);
      void loadQuestLearning(userId, currentPlan.goal).then((learning) => {
        if (active) setLearningContext(learning.context);
      }).catch(() => {});
      await prepare(currentPlan, selected, request);
    })().catch(() => { if (active) setLoadError('Не удалось загрузить задание. Обнови страницу.'); });
    return () => { active = false; generation.current += 1; };
  }, [userId, planId, stepId]);

  useEffect(() => {
    if (!userId || !plan || !step || !recordLoaded) return;
    let active = true;
    const timer = window.setTimeout(() => {
      void Promise.resolve(saveTaskRecord(userId, plan.goal, step.id, { notes, chat })).then(({ error }) => {
        if (active) setSaveError(error ? 'Ответы пока не сохранены. Не закрывай страницу; проверь интернет.' : '');
      }).catch(() => { if (active) setSaveError('Не удалось сохранить ответы. Проверь интернет.'); });
    }, 700);
    return () => { active = false; window.clearTimeout(timer); };
  }, [userId, plan?.goal, step?.id, notes, chat, recordLoaded]);

  return { plan, step, record, notes, setNotes, chat, setChat, learningContext, resourcesLoading,
    lessonReady, lessonLoading, loadError, saveError,
    retry: () => { if (plan && step && !lessonLoading && !resourcesLoading) void prepare(plan, step, generation.current); } };
}
