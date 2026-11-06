import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TaskResources } from '../src/components/TaskResources';
import { NotificationBell } from '../src/components/NotificationBell';
import { MapPracticeStop } from '../src/components/MapPracticeStop';
import { ReviewGame } from '../src/components/ReviewGame';
import '../src/index.css';

function Fixture() {
  const [notes, setNotes] = useState('');
  return <main style={{maxWidth:800,margin:'auto',padding:16}}>
    <NotificationBell userId="00000000-0000-4000-8000-000000000001" />
    <TaskResources resources={[]} loading={false} expectsVideo notes={notes}
      task={new URLSearchParams(window.location.search).get('task') ?? 'Цель: итальянский с нуля. Задание: приветствия и знакомство.'} chat={[]} readOnly={false}
      onNotes={setNotes} onChat={() => {}} />
    <MapPracticeStop planId="test-plan" steps={[{id:1,title:'Приветствия',subtitle:'Готово',state:'done',xp:50,icon:'book'}]} />
    <ReviewGame initialMode="cards" questions={[{question:'Как сказать «привет» по-итальянски?',options:['Ciao','Hello','Hola','Salut'],correct:0,explanation:'Ciao — итальянское приветствие.'}]}
      busy={false} onFinish={() => {}} />
  </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
