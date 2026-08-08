/**
 * Seed: 4 atletas por categoría × cada club de federación 7.
 *
 * Uso:
 *   node scripts/seed-atletas-fed7.mjs
 *
 * Env (opcionales):
 *   API_BASE=https://sporttrack-sigdef.onrender.com/api
 *   USERNAME=admin
 *   PASSWORD=admin123
 *   TOKEN=...   (si ya tenés JWT, no hace falta USERNAME/PASSWORD)
 *   FEDERACION_ID=7
 *   PER_CATEGORY=4
 */
const API_BASE = (process.env.API_BASE || 'https://sporttrack-sigdef.onrender.com/api').replace(/\/$/, '');
const FED_ID = Number(process.env.FEDERACION_ID || 7);
const PER_CAT = Number(process.env.PER_CATEGORY || 4);

const CATEGORIES = [
  { id: 1, name: 'Preinfantil', birthYear: 2017 },
  { id: 2, name: 'Infantil', birthYear: 2014 },
  { id: 3, name: 'Menor', birthYear: 2012 },
  { id: 4, name: 'Cadete', birthYear: 2010 },
  { id: 5, name: 'Junior', birthYear: 2008 },
  { id: 6, name: 'Sub23', birthYear: 2004 },
  { id: 7, name: 'Senior', birthYear: 1995 },
  { id: 8, name: 'MasterA', birthYear: 1980 },
  { id: 9, name: 'MasterB', birthYear: 1970 },
  { id: 10, name: 'MasterC', birthYear: 1960 },
];

const NOMBRES_M = ['Lucas', 'Mateo', 'Santiago', 'Nicolas', 'Bruno', 'Facundo', 'Tomas', 'Franco'];
const NOMBRES_F = ['Sofia', 'Valentina', 'Martina', 'Lucia', 'Camila', 'Belen', 'Agustina', 'Julieta'];
const APELLIDOS = ['Rios', 'Vega', 'Paz', 'Molina', 'Navarro', 'Silva', 'Castro', 'Rojas', 'Peralta', 'Dominguez'];

async function login() {
  if (process.env.TOKEN) return process.env.TOKEN;
  const username = process.env.USERNAME || 'admin';
  const password = process.env.PASSWORD || 'admin123';
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Login falló (${res.status}): ${t}`);
  }
  const data = await res.json();
  const token = data.token || data.Token;
  if (!token) throw new Error('Login OK pero sin token');
  return token;
}

async function api(token, method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg = data?.message || data?.title || text || res.statusText;
    const err = new Error(`${method} ${path} -> ${res.status}: ${msg}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function pickClubId(c) {
  return c.id ?? c.idClub ?? c.IdClub ?? c.Id;
}

function pickFedId(c) {
  return c.idFederacion ?? c.IdFederacion ?? c.federacionId ?? c.FederacionId;
}

function dniFor(clubId, catId, n) {
  // 11 dígitos únicos: 7 + club(3) + cat(2) + n(2) + random-ish stamp
  const stamp = String(Date.now()).slice(-3);
  return `7${String(clubId).padStart(3, '0')}${String(catId).padStart(2, '0')}${String(n).padStart(2, '0')}${stamp}`.slice(0, 11);
}

async function main() {
  console.log(`API: ${API_BASE}`);
  console.log(`Federación: ${FED_ID} | ${PER_CAT} atletas × ${CATEGORIES.length} categorías × club`);

  const token = await login();
  console.log('Login OK');

  const clubesAll = await api(token, 'GET', '/clubes');
  const clubes = (Array.isArray(clubesAll) ? clubesAll : [])
    .filter(c => Number(pickFedId(c)) === FED_ID);

  if (!clubes.length) {
    console.error(`No hay clubes con IdFederacion=${FED_ID}. Total clubes API: ${Array.isArray(clubesAll) ? clubesAll.length : 0}`);
    process.exit(1);
  }

  console.log(`Clubes fed ${FED_ID}: ${clubes.map(c => `${pickClubId(c)}:${c.nombre || c.Nombre}`).join(', ')}`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const club of clubes) {
    const clubId = Number(pickClubId(club));
    const clubName = club.nombre || club.Nombre || `Club${clubId}`;
    console.log(`\n→ ${clubName} (id=${clubId})`);

    for (const cat of CATEGORIES) {
      for (let i = 0; i < PER_CAT; i++) {
        const sexoId = i % 2 === 0 ? 1 : 2; // M / F
        const nombres = sexoId === 1 ? NOMBRES_M : NOMBRES_F;
        const nombre = nombres[(clubId + cat.id + i) % nombres.length];
        const apellido = APELLIDOS[(clubId * 3 + cat.id + i) % APELLIDOS.length];
        const payload = {
          nombre,
          apellido,
          fechaNacimiento: `${cat.birthYear}-06-15T00:00:00.000Z`,
          sexoId,
          categoriaId: cat.id,
          clubId,
          federacionId: FED_ID,
          pais: 'Argentina',
          dni: dniFor(clubId, cat.id, i + 1),
          email: `seed.fed${FED_ID}.c${clubId}.cat${cat.id}.n${i + 1}@example.test`,
          pagoAfiliacionAlDia: true,
        };

        try {
          await api(token, 'POST', '/participantes', payload);
          created += 1;
          process.stdout.write('.');
        } catch (err) {
          if (err.status === 409 || /documento|dni|existe|duplicate/i.test(String(err.message))) {
            skipped += 1;
            process.stdout.write('s');
          } else if (/límite|limite|MaxAtletas|plan/i.test(String(err.message))) {
            console.log(`\n  ⛔ Límite de plan: ${err.message}`);
            failed += 1;
            // no seguir en este club
            i = PER_CAT;
            break;
          } else {
            failed += 1;
            console.log(`\n  ✗ ${payload.nombre} ${payload.apellido} (${cat.name}): ${err.message}`);
          }
        }
      }
    }
  }

  console.log(`\n\nListo. Creados: ${created} | omitidos: ${skipped} | errores: ${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
