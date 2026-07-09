/**
 * Seed: FEC (id=1) — club1fec..club5fec + logins + 8 atletas por categoría.
 * Uso: node scripts/seed-fec-clubes-atletas.mjs
 */
const API_BASE = process.env.API_BASE || 'https://sporttrack-sigdef.onrender.com/api';
const FED_ID = 1;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';

const CLUBS = ['club1fec', 'club2fec', 'club3fec', 'club4fec', 'club5fec'];

// Categorías de competencia (sin Control id=11). Edad referencia 2026.
const CATEGORIES = [
  { id: 1, slug: 'preinf', birthYear: 2017 },
  { id: 2, slug: 'inf', birthYear: 2014 },
  { id: 3, slug: 'menor', birthYear: 2012 },
  { id: 4, slug: 'cad', birthYear: 2010 },
  { id: 5, slug: 'jun', birthYear: 2008 },
  { id: 6, slug: 'sub23', birthYear: 2005 },
  { id: 7, slug: 'sen', birthYear: 1995 },
  { id: 8, slug: 'ma', birthYear: 1982 },
  { id: 9, slug: 'mb', birthYear: 1972 },
  { id: 10, slug: 'mc', birthYear: 1962 },
];

const ATHLETES_PER_CATEGORY = 8;

async function request(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json', 'X-Client-App': 'sporttrack' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg = typeof data === 'object' ? (data.message || data.title || JSON.stringify(data)) : data;
    const err = new Error(`${method} ${path} → ${res.status}: ${msg}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function clubDisplayName(slug) {
  const n = slug.replace('club', '').replace('fec', '');
  return `Club${n}Fec`;
}

function clubSigla(slug) {
  const n = slug.replace('club', '').replace('fec', '');
  return `C${n}FEC`;
}

function dniFor(clubIdx, catId, athleteIdx) {
  // club 2→20, club3→30, etc. + cat + idx → único 8 dígitos
  return String(20 + clubIdx * 10).padStart(2, '0') + String(catId).padStart(2, '0') + String(athleteIdx).padStart(2, '0') + String(clubIdx).padStart(4, '0');
}

async function main() {
  console.log(`API: ${API_BASE}`);
  console.log('Login SuperAdmin...');
  const login = await request('/auth/login', {
    method: 'POST',
    body: { username: ADMIN_USER, password: ADMIN_PASS },
  });
  const token = login.token;
  if (!token) throw new Error('Sin token de admin');

  const existingClubes = await request('/clubes', { token });
  const clubByName = new Map(
    (existingClubes || []).map((c) => [(c.nombre || '').toLowerCase(), c])
  );

  const usuarios = await request('/auth/usuarios', { token }).catch(() => []);
  const userByName = new Map(
    (usuarios || []).map((u) => [(u.username || '').toLowerCase(), u])
  );

  const existingAtletas = await request('/participantes', { token });
  const dniSet = new Set(
    (existingAtletas || []).map((a) => String(a.dni || a.documento || '').trim()).filter(Boolean)
  );

  const summary = { clubes: [], logins: [], atletas: { creados: 0, omitidos: 0, errores: 0 } };

  for (let i = 0; i < CLUBS.length; i++) {
    const slug = CLUBS[i];
    const clubIdx = Number(slug.match(/\d+/)?.[0] ?? i + 1);
    const displayName = clubDisplayName(slug);
    let club = clubByName.get(displayName.toLowerCase()) || clubByName.get(slug);

    if (!club) {
      console.log(`Creando club ${displayName}...`);
      club = await request('/clubes', {
        method: 'POST',
        token,
        body: {
          nombre: displayName,
          sigla: clubSigla(slug),
          email: `${slug}@test.fec`,
          telefono: `099${clubIdx}000000`,
          direccion: 'Quito, Ecuador',
          ubicacion: 'Quito',
          federacionId: FED_ID,
          activo: true,
        },
      });
      summary.clubes.push({ nombre: displayName, id: club.id, accion: 'creado' });
    } else {
      console.log(`Club ${displayName} ya existe (id=${club.id})`);
      summary.clubes.push({ nombre: displayName, id: club.id, accion: 'existente' });
    }

    const clubId = club.id ?? club.Id ?? club.idClub;

    if (!userByName.has(slug)) {
      console.log(`Registrando login ${slug}...`);
      try {
        await request('/auth/register', {
          method: 'POST',
          token,
          body: {
            username: slug,
            password: slug,
            email: `${slug}@login.fec`,
            rolFederacion: 'Club',
            clubId,
            federacionId: FED_ID,
            nombre: displayName,
            apellido: 'Test',
          },
        });
        summary.logins.push({ username: slug, accion: 'creado' });
      } catch (e) {
        if (e.status === 400 && String(e.message).toLowerCase().includes('existe')) {
          summary.logins.push({ username: slug, accion: 'ya existía' });
        } else throw e;
      }
    } else {
      console.log(`Login ${slug} ya existe`);
      summary.logins.push({ username: slug, accion: 'existente' });
    }

    for (const cat of CATEGORIES) {
      for (let a = 1; a <= ATHLETES_PER_CATEGORY; a++) {
        const dni = dniFor(clubIdx, cat.id, a);
        if (dniSet.has(dni)) {
          summary.atletas.omitidos++;
          continue;
        }
        const sexoId = a % 2 === 0 ? 2 : 1;
        const nombre = `Atleta${cat.slug}${a}`;
        const apellido = displayName.replace(/\s/g, '');
        const fechaNacimiento = `${cat.birthYear}-06-${String(10 + (a % 18)).padStart(2, '0')}T00:00:00.000Z`;

        try {
          await request('/participantes', {
            method: 'POST',
            token,
            body: {
              nombre,
              apellido,
              fechaNacimiento,
              sexoId,
              categoriaId: cat.id,
              clubId,
              federacionId: FED_ID,
              dni,
              email: `${slug}.${cat.slug}${a}@atleta.fec`,
              pais: 'ECU',
              pagoAfiliacionAlDia: true,
            },
          });
          dniSet.add(dni);
          summary.atletas.creados++;
        } catch (e) {
          console.error(`  Error atleta ${dni}: ${e.message}`);
          summary.atletas.errores++;
        }
      }
    }
    console.log(`  ${displayName}: atletas listos para categorías 1-10`);
  }

  console.log('\n=== RESUMEN ===');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nTotal atletas creados: ${summary.atletas.creados}`);
  console.log(`Omitidos (DNI duplicado): ${summary.atletas.omitidos}`);
  console.log(`Errores: ${summary.atletas.errores}`);
}

main().catch((e) => {
  console.error('FALLÓ:', e.message);
  process.exit(1);
});
