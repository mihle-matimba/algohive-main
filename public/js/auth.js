// /js/auth.js
import { supabase } from "./supabase.js";

// SIGN IN
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;           // surfaces "Invalid login" or "Email not confirmed"
  return data;                      // { user, session }
}

// SIGN UP (send them back to auth.html with a banner after confirming)
export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: "/auth.html?confirmed=1" }
  });
  if (error) throw error;           // surfaces "User already registered" etc.
  return data;                      // { user, session }
}

// SIGN OUT
export async function signOut() {
  await supabase.auth.signOut();
  location.replace("/auth.html");
}

// GET CURRENT SESSION
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
