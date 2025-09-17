// /js/auth.js
import { supabase } from "./supabase.js";

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${location.origin}/auth.html?confirmed=1` } // 👈 after email confirm, go to Sign in
  });
  if (error) throw error;
  return data; // { user, session }
}
