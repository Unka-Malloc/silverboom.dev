/* SILVERBOOM — trajectory intro + rack dossier */
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- member dossiers ---------- */
const MEMBERS = {
  a4aa: { code: 'A4AA', name: 'Adapter For All Agents', role: 'One crate owns every agent-client adaptation path — supervision, transports, ACP · RPC · CLI · serve lanes, and a lane-erased facade.', lic: 'Apache-2.0', repo: 'Adapters-for-All-Agents' },
  a4mp: { code: 'A4MP', name: 'Adapters For Model Providers', role: 'One foundation for every model provider, through every access mode they actually offer — SDK first, wire bridge optional.', lic: 'Apache-2.0', repo: 'Adapters-For-Model-Providers' },
  awp:  { code: 'AwP',  name: 'Agents With Profiles', role: 'Turns one base agent into many virtual agents — the profile decides model, persona, environment and dispatch.', lic: 'Apache-2.0', repo: 'Agents-with-Profiles' },
  va:   { code: 'VA',   name: 'Virtual Agent', role: 'User-facing custody over profiles: a canonical registry — save, edit, restore, share — fronted by a CLI.', lic: 'Apache-2.0', repo: 'Virtual-Agent' },
  ahe:  { code: 'AHE',  name: 'Agent Hook Engine', role: 'Agent lifecycle hooks as a DSL — a superset primitive set, adapted down to what each harness can carry.', lic: 'Apache-2.0', repo: 'Agent-Hook-Engine' },
  aor:  { code: 'AOR',  name: 'AgentOps-Runtime', role: 'The development pipeline as registered gates — seven failure-mode mechanisms, one mechanism per crate.', lic: 'AGPL-3.0', repo: 'AgentOps-Runtime' },
  aca:  { code: 'ACA',  name: 'Acativa', role: 'Compiles multi-agent collaboration strategies into immutable plans, executed as durable state machines.', lic: 'AGPL-3.0', repo: 'Acativa' },
  cl:   { code: 'CL',   name: 'Credential-Lease', role: 'Credentials issued as process-bound, time-limited, revocable leases — custody never enters the runtime.', lic: 'Apache-2.0', repo: 'Credential-Lease' },
};

const dCode = $('#d-code'), dName = $('#d-name'), dRole = $('#d-role'), dChips = $('#d-chips');
const rounds = $$('.round');
function select(m, focus) {
  const d = MEMBERS[m]; if (!d) return;
  rounds.forEach(b => {
    const on = b.dataset.m === m;
    b.setAttribute('aria-selected', on ? 'true' : 'false');
    b.tabIndex = on ? 0 : -1;
    if (on && focus) b.focus();
  });
  dCode.textContent = d.code;
  dName.textContent = d.name;
  dRole.textContent = d.role;
  dChips.innerHTML =
    `<span class="chip">Rust crate</span>` +
    `<span class="chip lic">${d.lic}</span>` +
    `<a class="chip repo" href="https://github.com/Unka-Malloc/${d.repo}" rel="noopener">Unka-Malloc/${d.repo} ↗</a>`;
}
rounds.forEach(b => b.addEventListener('click', () => select(b.dataset.m)));
$('.rack').addEventListener('keydown', e => {
  const i = rounds.indexOf(document.activeElement);
  if (i < 0) return;
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
  const j = step != null ? (i + step + rounds.length) % rounds.length
    : e.key === 'Home' ? 0 : e.key === 'End' ? rounds.length - 1 : -1;
  if (j < 0) return;
  e.preventDefault();
  select(rounds[j].dataset.m, true);
});
select('a4aa');

/* ---------- hero trajectory ---------- */
const stage = $('.stage'), traj = $('.traj'), bullet = $('.bullet'), flash = $('.flash');
const ghosts = $$('.ghost');
if (!RM && ghosts.length && traj && innerWidth > 760) {
  const box = stage.getBoundingClientRect();
  const vw = 1440, vh = 820;
  // scatter ghosts to their loose positions
  ghosts.forEach(g => {
    const slot = g.getBoundingClientRect();
    const cx = slot.left - box.left + slot.width / 2;
    const cy = slot.top - box.top + slot.height / 2;
    const gx = (+g.dataset.sx / 100) * box.width;
    const gy = (+g.dataset.sy / 100) * box.height;
    g.style.transition = 'none';
    g.style.transform = `translate(-50%,-50%) translate(${gx - cx}px, ${gy - cy}px) scale(.72)`;
    g.style.opacity = '0';
  });
  const L = traj.getTotalLength();
  const t0 = performance.now() + 350;
  let flashed = false;
  traj.classList.add('fly');
  function frame(now) {
    const t = (now - t0) / 2500;
    if (t < 0) { requestAnimationFrame(frame); return; }
    const bp = Math.min(t * 1.28, 1);
    const p = traj.getPointAtLength(L * bp);
    const p2 = traj.getPointAtLength(Math.min(L * bp + 4, L));
    const rot = Math.atan2(p2.y - p.y, p2.x - p.x) * 180 / Math.PI;
    bullet.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${rot})`);
    bullet.style.opacity = t * 1.28 >= 1 ? Math.max(0, 1 - (t * 1.28 - 1) * 5) : 1;
    if (!flashed && bp > 0.72) { flash.classList.add('go'); flashed = true; }
    ghosts.forEach((g, i) => {
      const start = 0.6 + i * 0.055;
      if (t > start && !g.dataset.done) {
        g.dataset.done = '1';
        g.style.transition = 'transform .6s cubic-bezier(.19,.9,.3,1.12), opacity .32s ease';
        g.style.transform = 'translate(-50%,-50%)';
        g.style.opacity = '1';
      }
    });
    if (t < 1.15) requestAnimationFrame(frame);
    else { traj.classList.remove('fly'); bullet.style.opacity = '0'; }
  }
  requestAnimationFrame(frame);
}
