// js/auth.js
import { supabase } from "./supabase.js";

// SIGN UP
export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { emailRedirectTo: `${location.origin}/dashboard.html` }
  });
  if (error) throw error;
  return data;
}

// SIGN IN
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// SIGN OUT
export async function signOut() {
  await supabase.auth.signOut();
  location.replace("/index.html");
}

// Get current session/user
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// Watch auth changes (optional)
supabase.auth.onAuthStateChange((_event, session) => {
  // You can update UI here if using a single page
});
