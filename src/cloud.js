import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

const el = id => document.getElementById(id);
const status = message => { el('cloudStatus').textContent = message; };
const configured = Boolean(supabaseUrl && supabasePublishableKey);
const supabase = configured ? createClient(supabaseUrl, supabasePublishableKey) : null;
let user = null;
let openPlanId = null;
let accountRevision = 0;

function showAccount(signedIn) {
  el('authForm').hidden = signedIn;
  el('cloudAccount').hidden = !signedIn;
  el('signedInEmail').textContent = signedIn ? user.email || 'your account' : '';
}

async function listPlans() {
  const { data, error } = await supabase.from('plans')
    .select('id,title,updated_at')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  const picker = el('savedPlans');
  picker.replaceChildren(new Option('Select a saved plan', ''));
  for (const plan of data) {
    const label = `${plan.title} · ${new Date(plan.updated_at).toLocaleDateString()}`;
    picker.add(new Option(label, plan.id));
  }
  if (openPlanId && data.some(plan => plan.id === openPlanId)) picker.value = openPlanId;
  return data.length;
}

async function syncAccount(nextUser) {
  const revision = ++accountRevision;
  user = nextUser;
  if (!user) {
    openPlanId = null;
    el('savedPlans').replaceChildren(new Option('Select a saved plan', ''));
    window.plannerStorage.clear();
    showAccount(false);
    status('Sign in to save and reopen plans.');
    return;
  }
  showAccount(true);
  try {
    const count = await listPlans();
    if (revision === accountRevision) status(`${count} saved ${count === 1 ? 'plan' : 'plans'} available.`);
  } catch (error) {
    if (revision === accountRevision) status(`Could not load saved plans: ${error.message}`);
  }
}

function setAuthBusy(busy) {
  for (const button of el('authForm').querySelectorAll('button')) button.disabled = busy;
}

el('authForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (!supabase) return;
  setAuthBusy(true);
  status('Signing in…');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: el('authEmail').value.trim(),
    password: el('authPassword').value
  });
  setAuthBusy(false);
  if (error) return status(error.message);
  el('authPassword').value = '';
  await syncAccount(data.user);
});

el('signUp').addEventListener('click', async () => {
  if (!supabase || !el('authForm').reportValidity()) return;
  setAuthBusy(true);
  status('Creating account…');
  const { data, error } = await supabase.auth.signUp({
    email: el('authEmail').value.trim(),
    password: el('authPassword').value,
    options: { emailRedirectTo: location.origin + location.pathname }
  });
  setAuthBusy(false);
  if (error) return status(error.message);
  el('authPassword').value = '';
  if (data.session) await syncAccount(data.user);
  else status('Check your email to confirm your account, then sign in.');
});

el('savePlan').addEventListener('click', async () => {
  if (!user) return status('Sign in before saving.');
  const payload = window.plannerStorage.snapshot();
  const title = payload.fields.title || 'Untitled hardening plan';
  const row = { title, payload, updated_at: new Date().toISOString() };
  el('savePlan').disabled = true;
  status('Saving plan…');
  const query = openPlanId
    ? supabase.from('plans').update(row).eq('id', openPlanId).eq('user_id', user.id).select('id').single()
    : supabase.from('plans').insert({ ...row, user_id: user.id }).select('id').single();
  const { data, error } = await query;
  el('savePlan').disabled = false;
  if (error) return status(`Could not save plan: ${error.message}`);
  openPlanId = data.id;
  try { await listPlans(); status('Plan saved.'); }
  catch (refreshError) { status(`Plan saved, but the list could not refresh: ${refreshError.message}`); }
});

el('loadPlan').addEventListener('click', async () => {
  const id = el('savedPlans').value;
  if (!user || !id) return status('Select a saved plan to open.');
  status('Opening plan…');
  const { data, error } = await supabase.from('plans')
    .select('id,payload').eq('id', id).eq('user_id', user.id).single();
  if (error) return status(`Could not open plan: ${error.message}`);
  try {
    window.plannerStorage.restore(data.payload);
    openPlanId = data.id;
    status('Plan opened. Edits are saved only when you select Save plan.');
  } catch (restoreError) { status(restoreError.message); }
});

el('newPlan').addEventListener('click', () => {
  openPlanId = null;
  el('savedPlans').value = '';
  window.plannerStorage.clear();
  status('New plan started. Select Save plan when ready.');
});

el('signOut').addEventListener('click', async () => {
  status('Signing out…');
  const { error } = await supabase.auth.signOut();
  if (error) status(`Could not sign out: ${error.message}`);
  else await syncAccount(null);
});

if (!supabase) {
  el('authForm').hidden = true;
  status('Cloud saving is being configured. Draft generation is available.');
} else {
  supabase.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => syncAccount(session?.user || null), 0);
  });
  void (async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error && error.name !== 'AuthSessionMissingError') status(`Could not check sign-in: ${error.message}`);
    else await syncAccount(data.user);
  })();
}
