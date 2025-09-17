// /js/auth.js
import { supabase } from "./supabase.js";

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { emailRedirectTo: `${location.origin}/dashboard.html` }
  });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
  location.replace("/auth.html");
}
