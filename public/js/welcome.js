import { supabase } from "/js/supabase.js";

const preloader = document.getElementById("preloader");
const welcomeForm = document.getElementById("welcomeForm");
const investButton = document.getElementById("welcomeInvestButton");
const freeButton = document.getElementById("welcomeFreeButton");
const welcomeStatus = document.getElementById("welcomeStatus");
const welcomeInputs = [
    document.getElementById("welcomeFirstName"),
    document.getElementById("welcomeLastName"),
    document.getElementById("welcomePhone"),
];

const BASIC_INFO_FIELDS = ["first_name", "last_name", "phone"];
let supabaseUser = null;

const hidePreloader = () => {
    if (!preloader) return;
    preloader.classList.add("preloader--hide");
    setTimeout(() => preloader.remove(), 450);
};

function setStatus(message = "", tone = "info") {
    if (!welcomeStatus) return;
    welcomeStatus.textContent = message;
    welcomeStatus.classList.toggle("text-rose-200", tone === "error");
    welcomeStatus.classList.toggle("text-[var(--olive)]", tone === "success");
}

const getInputValue = (el) => (el?.value || "").trim();

function setInputValue(el, value) {
    if (!el) return;
    el.value = value || "";
}

function isBasicInfoComplete(row) {
    if (!row) return false;
    return BASIC_INFO_FIELDS.every((key) => !!(row?.[key] || "").toString().trim());
}

async function ensureProfile(userId, email) {
    let { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error && error.code !== "PGRST116") throw error;
    if (data) return data;

    const upsert = await supabase
        .from("profiles")
        .upsert({ id: userId, email, updated_at: new Date().toISOString() }, { onConflict: "id" })
        .select("*")
        .single();
    if (upsert.error) throw upsert.error;
    return upsert.data;
}

async function checkProgress() {
    try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session) {
            window.location.href = "/auth.html";
            return;
        }

        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) {
            window.location.href = "/auth.html";
            return;
        }

        supabaseUser = userData.user;
        const profile = await ensureProfile(supabaseUser.id, supabaseUser.email);

        if (isBasicInfoComplete(profile)) {
            window.location.href = "/onboarding.html";
            return;
        }

        setInputValue(welcomeInputs[0], profile?.first_name || "");
        setInputValue(welcomeInputs[1], profile?.last_name || "");
        setInputValue(welcomeInputs[2], profile?.phone || "");
    } catch (error) {
        console.error(error);
        setStatus(error.message || "Could not check your progress.", "error");
    } finally {
        hidePreloader();
    }
}

function clearInputErrors() {
    welcomeInputs.forEach((input) => input?.classList.remove("input-error"));
}

async function saveBasicInfo(payload) {
    if (!supabaseUser) throw new Error("Please sign in again.");
    const { data, error } = await supabase
        .from("profiles")
        .upsert({
            id: supabaseUser.id,
            email: supabaseUser.email || null,
            updated_at: new Date().toISOString(),
            ...payload,
        }, { onConflict: "id" })
        .select("*")
        .single();
    if (error) throw error;
    return data;
}

async function handleInvest(event) {
    event.preventDefault();
    clearInputErrors();
    setStatus("");

    const values = {
        first_name: getInputValue(welcomeInputs[0]),
        last_name: getInputValue(welcomeInputs[1]),
        phone: getInputValue(welcomeInputs[2]),
    };

    const missing = BASIC_INFO_FIELDS.filter((key) => !values[key]);
    if (missing.length) {
        welcomeInputs.forEach((input) => {
            if (input && !getInputValue(input)) input.classList.add("input-error");
        });
        setStatus("Add your name and mobile number to continue.", "error");
        return;
    }

    investButton.disabled = true;
    investButton.textContent = "Saving...";
    try {
        await saveBasicInfo(values);
        window.location.href = "/onboarding.html";
    } catch (error) {
        console.error(error);
        setStatus(error.message || "Could not save your details.", "error");
    } finally {
        investButton.disabled = false;
        investButton.textContent = "Invest with real money";
    }
}

async function handleFreeClick(event) {
    event.preventDefault();
    window.location.href = "/home.html";
}

welcomeForm?.addEventListener("submit", handleInvest);
freeButton?.addEventListener("click", handleFreeClick);

checkProgress();
