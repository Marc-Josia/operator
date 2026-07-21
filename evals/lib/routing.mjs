// Tier-2 routing engine — a *lexical approximation* of skill routing.
//
// Operator routes through the constitution's decision tree (ADR-0013/0021), not
// through model-invocation of `description:` fields. But the description is still
// the "second net" (AGENTS.md, authoring rule 1): its vocabulary must uniquely
// identify the skill and not collide with its siblings. This module measures that
// property cheaply and deterministically — stemmed TF-IDF cosine over the shipped
// descriptions — so a description that goes vague or overlaps a neighbour shows up
// as a rank miss or a similarity warning, without paying for a real agent (Tier 3).
//
// Zero dependencies, no network, Node builtins only — same discipline as the rest
// of the harness so `npm run eval` stays free and offline.

// A compact English stopword set. Small on purpose: Operator descriptions are
// dense with domain tokens (spec, gate, lane, triage, repro, harvest) and we want
// those to survive tokenization while structural filler drops out.
const STOPWORDS = new Set(
  ('a an and or the of to in on at for with without into from by as is are be been being it its this that these those ' +
    'you your yours we our not no nor but if then else when while so than too very can could should would will just ' +
    'up down out over under again more most some any each other one two three do does did done use used using use-it ' +
    'run runs ran runs whenever ever even still yet only about which what who whom whose where why how per via they them ' +
    'their he she his her i me my mine us also has have had was were')
    .split(/\s+/)
);

/** Light stemmer: fold obvious inflections so "reproduces"/"reproduce"/"repro"
 *  and "gates"/"gate" collapse. Deliberately conservative — over-stemming would
 *  merge distinct tokens and hide real collisions. */
function stem(w) {
  if (w.length <= 3) return w;
  // Conservative order: longest inflection first, then a lone plural 's'. No 'es'
  // rule — it mangles roots that legitimately end in 'e' ("gates" → "gat").
  for (const suf of ['ing', 'ed', 's']) {
    if (w.endsWith(suf) && w.length - suf.length >= 3) return w.slice(0, -suf.length);
  }
  return w;
}

/** Lowercase, split on non-alphanumerics, drop stopwords and 1-char tokens, stem. */
export function tokenize(text) {
  const out = [];
  for (const raw of String(text).toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length < 2) continue;
    if (STOPWORDS.has(raw)) continue;
    const s = stem(raw);
    if (s.length < 2 || STOPWORDS.has(s)) continue;
    out.push(s);
  }
  return out;
}

/** Term frequencies (raw counts) for a token list. */
export function termFreq(tokens) {
  const tf = new Map();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  return tf;
}

/**
 * Build the corpus from the shipped skills.
 * @param {{name:string, description:string}[]} skills
 * @returns {{ order:string[], tf:Map<string,Map<string,number>>, idf:Map<string,number> }}
 */
export function buildCorpus(skills) {
  const order = [];
  const tf = new Map();
  const df = new Map();
  for (const { name, description } of skills) {
    order.push(name);
    // The skill's own name is a strong, intentional signal — include it.
    const tokens = [...tokenize(name.replace(/-/g, ' ')), ...tokenize(description)];
    const f = termFreq(tokens);
    tf.set(name, f);
    for (const term of f.keys()) df.set(term, (df.get(term) ?? 0) + 1);
  }
  const n = order.length;
  const idf = new Map();
  for (const [term, d] of df) idf.set(term, Math.log(1 + n / (1 + d)));
  return { order, tf, idf };
}

/** TF-IDF vector (Map term->weight) for a term-frequency map against an idf table. */
export function vec(tf, idf) {
  const v = new Map();
  for (const [term, f] of tf) {
    const w = f * (idf.get(term) ?? Math.log(1 + tf.size)); // OOV terms get a mild weight
    if (w > 0) v.set(term, w);
  }
  return v;
}

/** Cosine similarity between two term->weight maps. */
export function cosine(a, b) {
  let dot = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const [term, wa] of small) {
    const wb = large.get(term);
    if (wb) dot += wa * wb;
  }
  if (dot === 0) return 0;
  let na = 0;
  for (const w of a.values()) na += w * w;
  let nb = 0;
  for (const w of b.values()) nb += w * w;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Rank every skill against a prompt, best first.
 * @returns {{name:string, score:number}[]}
 */
export function rankSkills(prompt, corpus) {
  const { order, tf, idf } = corpus;
  const pv = vec(termFreq(tokenize(prompt)), idf);
  const scored = order.map((name) => ({ name, score: cosine(pv, vec(tf.get(name), idf)) }));
  // Deterministic order: score desc, then name asc so ties never depend on input order.
  scored.sort((x, y) => y.score - x.score || x.name.localeCompare(y.name));
  return scored;
}

/** 1-based rank of `name` in a ranked list (Infinity if scored zero / absent). */
export function rankOf(ranked, name) {
  const i = ranked.findIndex((r) => r.name === name);
  if (i === -1 || ranked[i].score === 0) return Infinity;
  return i + 1;
}

/** Pairwise description similarity matrix (name->name->cosine), for collision checks. */
export function similarityMatrix(corpus) {
  const { order, tf, idf } = corpus;
  const vecs = new Map(order.map((n) => [n, vec(tf.get(n), idf)]));
  const rows = [];
  for (let i = 0; i < order.length; i++) {
    for (let j = i + 1; j < order.length; j++) {
      rows.push({ a: order[i], b: order[j], sim: cosine(vecs.get(order[i]), vecs.get(order[j])) });
    }
  }
  rows.sort((x, y) => y.sim - x.sim);
  return rows;
}
