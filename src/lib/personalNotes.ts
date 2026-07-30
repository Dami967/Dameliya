import { supabase } from './supabase';

export type PersonalNote = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export function loadPersonalNotes(userId: string) {
  return supabase.from('personal_notes').select('*').eq('user_id', userId)
    .order('updated_at', { ascending: false }).returns<PersonalNote[]>();
}

export function loadPersonalNote(userId: string, noteId: string) {
  return supabase.from('personal_notes').select('*').eq('user_id', userId)
    .eq('id', noteId).single<PersonalNote>();
}

export function createPersonalNote(userId: string) {
  return supabase.from('personal_notes').insert({ user_id: userId })
    .select('*').single<PersonalNote>();
}

export function updatePersonalNote(noteId: string, title: string, content: string) {
  return supabase.from('personal_notes').update({
    title, content, updated_at: new Date().toISOString(),
  }).eq('id', noteId);
}

export function deletePersonalNote(noteId: string) {
  return supabase.from('personal_notes').delete().eq('id', noteId);
}
