import type { Person, Relationship } from '../types/family';
import type { TranslationDictionary } from '../locales/translations';

export interface KinshipResult {
  key: string;
  label: string;
  reverseLabel: string;
  viaMarriage: boolean;
  generationDiff?: number;
  path: Person[];
}

export function formatGenerationLabel(
  genDiff: number | undefined,
  t: TranslationDictionary
): string | null {
  if (genDiff === undefined) return null;
  if (genDiff === 0) return t.kinshipGenSame;
  if (genDiff > 0) {
    const template = genDiff === 1 ? t.kinshipGenAboveSingular : t.kinshipGenAbovePlural;
    return template.replace('{n}', String(genDiff));
  }
  const abs = Math.abs(genDiff);
  const template = abs === 1 ? t.kinshipGenBelowSingular : t.kinshipGenBelowPlural;
  return template.replace('{n}', String(abs));
}

function toOrdinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function formatRemoved(n: number): string {
  if (n === 1) return 'Once';
  if (n === 2) return 'Twice';
  return `${n}x`;
}

interface GraphMaps {
  personMap: Map<string, Person>;
  parentsMap: Map<string, Set<string>>;
  childrenMap: Map<string, Set<string>>;
  spousesMap: Map<string, Set<string>>;
  formerSpousesMap: Map<string, Set<string>>;
}

function buildGraph(persons: Person[], relationships: Relationship[]): GraphMaps {
  const personMap = new Map<string, Person>();
  const parentsMap = new Map<string, Set<string>>();
  const childrenMap = new Map<string, Set<string>>();
  const spousesMap = new Map<string, Set<string>>();
  const formerSpousesMap = new Map<string, Set<string>>();

  for (const p of persons) {
    personMap.set(p.id, p);
  }

  const addEdge = (map: Map<string, Set<string>>, from: string, to: string) => {
    const set = map.get(from) || new Set<string>();
    set.add(to);
    map.set(from, set);
  };

  for (const rel of relationships) {
    if (rel.rel_type === 'parent_child') {
      addEdge(childrenMap, rel.person_a_id, rel.person_b_id);
      addEdge(parentsMap, rel.person_b_id, rel.person_a_id);
    } else if (rel.rel_type === 'spouse') {
      addEdge(spousesMap, rel.person_a_id, rel.person_b_id);
      addEdge(spousesMap, rel.person_b_id, rel.person_a_id);
    } else if (rel.rel_type === 'former_spouse') {
      addEdge(formerSpousesMap, rel.person_a_id, rel.person_b_id);
      addEdge(formerSpousesMap, rel.person_b_id, rel.person_a_id);
    }
  }

  return { personMap, parentsMap, childrenMap, spousesMap, formerSpousesMap };
}

function getAncestors(
  startId: string,
  parentsMap: Map<string, Set<string>>
): Map<string, { dist: number; path: string[] }> {
  const result = new Map<string, { dist: number; path: string[] }>();
  const queue: Array<{ id: string; dist: number; path: string[] }> = [
    { id: startId, dist: 0, path: [startId] },
  ];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (result.has(curr.id)) continue;
    result.set(curr.id, { dist: curr.dist, path: curr.path });

    const parents = parentsMap.get(curr.id);
    if (parents) {
      for (const pId of parents) {
        if (!result.has(pId)) {
          queue.push({ id: pId, dist: curr.dist + 1, path: [...curr.path, pId] });
        }
      }
    }
  }

  return result;
}

function labelForConsanguinity(dA: number, dB: number, t: TranslationDictionary): string {
  if (dA === 0 && dB === 0) return t.kinshipSelf;
  if (dA === 0 && dB === 1) return t.kinshipChild;
  if (dA === 1 && dB === 0) return t.kinshipParent;
  if (dA === 0 && dB === 2) return t.kinshipGrandchild;
  if (dA === 2 && dB === 0) return t.kinshipGrandparent;
  if (dA === 0 && dB === 3) return t.kinshipGreatGrandchild;
  if (dA === 3 && dB === 0) return t.kinshipGreatGrandparent;
  if (dA === 0 && dB > 3) {
    return t.kinshipDescendantGen.replace('{times}', String(dB - 2)).replace('{gen}', String(dB));
  }
  if (dA > 3 && dB === 0) {
    return t.kinshipAncestorGen.replace('{times}', String(dA - 2)).replace('{gen}', String(dA));
  }

  if (dA === 1 && dB === 1) return t.kinshipSibling;
  if (dA === 1 && dB === 2) return t.kinshipNieceNephew;
  if (dA === 2 && dB === 1) return t.kinshipAuntUncle;
  if (dA === 1 && dB >= 3) return dB === 3 ? t.kinshipGreatNieceNephew : `${dB - 2}x ${t.kinshipGreatNieceNephew}`;
  if (dA >= 3 && dB === 1) return dA === 3 ? t.kinshipGreatAuntUncle : `${dA - 2}x ${t.kinshipGreatAuntUncle}`;

  const degree = Math.min(dA, dB) - 1;
  const removed = Math.abs(dA - dB);
  const ord = toOrdinal(degree);
  if (removed === 0) {
    return t.kinshipCousin.replace('{ordinal}', ord);
  }
  return t.kinshipCousinRemoved
    .replace('{ordinal}', ord)
    .replace('{removed}', formatRemoved(removed));
}

function findDirectBloodMatch(
  aId: string,
  bId: string,
  graph: GraphMaps,
  t: TranslationDictionary
): { dA: number; dB: number; label: string; reverseLabel: string; pathIds: string[] } | null {
  const ancA = getAncestors(aId, graph.parentsMap);
  const ancB = getAncestors(bId, graph.parentsMap);

  let bestLca: string | null = null;
  let bestScore = Infinity;
  let bestDA = 0;
  let bestDB = 0;

  for (const [ancId, infoA] of ancA.entries()) {
    const infoB = ancB.get(ancId);
    if (!infoB) continue;

    const score = infoA.dist + infoB.dist;
    const balance = Math.abs(infoA.dist - infoB.dist);
    const bestBalance = Math.abs(bestDA - bestDB);
    if (score < bestScore || (score === bestScore && balance < bestBalance)) {
      bestScore = score;
      bestLca = ancId;
      bestDA = infoA.dist;
      bestDB = infoB.dist;
    }
  }

  if (!bestLca) return null;

  const pathUp = ancA.get(bestLca)!.path;
  const pathDown = [...ancB.get(bestLca)!.path].reverse().slice(1);
  const pathIds = [...pathUp, ...pathDown];

  return {
    dA: bestDA,
    dB: bestDB,
    label: labelForConsanguinity(bestDA, bestDB, t),
    reverseLabel: labelForConsanguinity(bestDB, bestDA, t),
    pathIds,
  };
}

function findShortestAnyPath(aId: string, bId: string, graph: GraphMaps): string[] | null {
  const visited = new Set<string>([aId]);
  const queue: Array<{ id: string; path: string[] }> = [{ id: aId, path: [aId] }];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr.id === bId) return curr.path;

    const neighbors = new Set<string>([
      ...(graph.parentsMap.get(curr.id) || []),
      ...(graph.childrenMap.get(curr.id) || []),
      ...(graph.spousesMap.get(curr.id) || []),
      ...(graph.formerSpousesMap.get(curr.id) || []),
    ]);

    for (const nextId of neighbors) {
      if (!visited.has(nextId)) {
        visited.add(nextId);
        queue.push({ id: nextId, path: [...curr.path, nextId] });
      }
    }
  }

  return null;
}

/**
 * Calculates how `targetId` (Person B) is related to `sourceId` (Person A).
 * e.g. If Person B is Person A's 1st cousin, returns label: "1st Cousin".
 */
export function calculateKinship(
  sourceId: string,
  targetId: string,
  persons: Person[],
  relationships: Relationship[],
  t: TranslationDictionary
): KinshipResult {
  const graph = buildGraph(persons, relationships);
  const toPersons = (ids: string[]) =>
    ids.map((id) => graph.personMap.get(id)).filter((p): p is Person => !!p);

  if (sourceId === targetId) {
    return {
      key: 'self',
      label: t.kinshipSelf,
      reverseLabel: t.kinshipSelf,
      viaMarriage: false,
      generationDiff: 0,
      path: toPersons([sourceId]),
    };
  }

  // 1. Direct Spouse or Former Spouse
  if (graph.spousesMap.get(sourceId)?.has(targetId)) {
    return {
      key: 'spouse',
      label: t.kinshipSpouse,
      reverseLabel: t.kinshipSpouse,
      viaMarriage: true,
      generationDiff: 0,
      path: toPersons([sourceId, targetId]),
    };
  }

  if (graph.formerSpousesMap.get(sourceId)?.has(targetId)) {
    return {
      key: 'former_spouse',
      label: t.kinshipFormerSpouse,
      reverseLabel: t.kinshipFormerSpouse,
      viaMarriage: true,
      generationDiff: 0,
      path: toPersons([sourceId, targetId]),
    };
  }

  // 2. Direct Blood / Consanguinity via Lowest Common Ancestor
  const blood = findDirectBloodMatch(sourceId, targetId, graph, t);
  if (blood) {
    return {
      key: `blood_${blood.dA}_${blood.dB}`,
      label: blood.label,
      reverseLabel: blood.reverseLabel,
      viaMarriage: false,
      generationDiff: blood.dA - blood.dB,
      path: toPersons(blood.pathIds),
    };
  }

  // 3 & 4. One Marriage Hop (check active spouses first, then former spouses)
  const checkDirectMarriageHops = (useFormer: boolean): KinshipResult | null => {
    const spSourceMap = useFormer ? graph.formerSpousesMap : graph.spousesMap;

    // 3. A's Blood Relative -> B (Spouse / Former Spouse of A's blood relative)
    const targetSpouses = spSourceMap.get(targetId) || new Set<string>();
    for (const spId of targetSpouses) {
      const spBlood = findDirectBloodMatch(sourceId, spId, graph, t);
      if (spBlood) {
        let label = `${spBlood.label} ${t.kinshipByMarriageSuffix}`;
        let reverseLabel = `${spBlood.reverseLabel} ${t.kinshipByMarriageSuffix}`;

        if (!useFormer && spBlood.dA === 1 && spBlood.dB === 1) {
          label = t.kinshipSiblingInLaw;
          reverseLabel = t.kinshipSiblingInLaw;
        } else if (!useFormer && spBlood.dA === 0 && spBlood.dB === 1) {
          label = t.kinshipChildInLaw;
          reverseLabel = t.kinshipParentInLaw;
        } else if (!useFormer && spBlood.dA === 2 && spBlood.dB === 1) {
          label = t.kinshipAuntUncleByMarriage;
          reverseLabel = `${t.kinshipNieceNephew} ${t.kinshipByMarriageSuffix}`;
        }

        return {
          key: `marriage_target_${useFormer ? 'former_' : ''}${spBlood.dA}_${spBlood.dB}`,
          label,
          reverseLabel,
          viaMarriage: true,
          generationDiff: spBlood.dA - spBlood.dB,
          path: toPersons([...spBlood.pathIds, targetId]),
        };
      }
    }

    // 4. A's Spouse / Former Spouse -> Blood Relative B
    const sourceSpouses = spSourceMap.get(sourceId) || new Set<string>();
    for (const spId of sourceSpouses) {
      const spBlood = findDirectBloodMatch(spId, targetId, graph, t);
      if (spBlood) {
        let label = `${spBlood.label} ${t.kinshipByMarriageSuffix}`;
        let reverseLabel = `${spBlood.reverseLabel} ${t.kinshipByMarriageSuffix}`;

        if (!useFormer && spBlood.dA === 1 && spBlood.dB === 0) {
          label = t.kinshipParentInLaw;
          reverseLabel = t.kinshipChildInLaw;
        } else if (!useFormer && spBlood.dA === 1 && spBlood.dB === 1) {
          label = t.kinshipSiblingInLaw;
          reverseLabel = t.kinshipSiblingInLaw;
        } else if (!useFormer && spBlood.dA === 1 && spBlood.dB === 2) {
          label = `${t.kinshipNieceNephew} ${t.kinshipByMarriageSuffix}`;
          reverseLabel = t.kinshipAuntUncleByMarriage;
        }

        return {
          key: `marriage_source_${useFormer ? 'former_' : ''}${spBlood.dA}_${spBlood.dB}`,
          label,
          reverseLabel,
          viaMarriage: true,
          generationDiff: spBlood.dA - spBlood.dB,
          path: toPersons([sourceId, ...spBlood.pathIds]),
        };
      }
    }

    return null;
  };

  const activeHopMatch = checkDirectMarriageHops(false);
  if (activeHopMatch) return activeHopMatch;

  // 4b. Ancestor-Spouse / Co-Parent Lineage Bridge
  // Handles paths like Child -> Parent -> Parent's Spouse/Former Spouse -> Grandparent
  const ancA = getAncestors(sourceId, graph.parentsMap);
  const ancB = getAncestors(targetId, graph.parentsMap);
  let bestBridge: {
    dAEff: number;
    dBEff: number;
    score: number;
    penalty: number;
    pathIds: string[];
  } | null = null;

  for (const [ancId, infoA] of ancA.entries()) {
    if (infoA.dist < 1) continue;
    const partners: Array<{ id: string; isFormer: boolean }> = [
      ...Array.from(graph.spousesMap.get(ancId) || []).map((id) => ({ id, isFormer: false })),
      ...Array.from(graph.formerSpousesMap.get(ancId) || []).map((id) => ({ id, isFormer: true })),
    ];
    for (const partner of partners) {
      const spBlood = findDirectBloodMatch(partner.id, targetId, graph, t);
      if (!spBlood) continue;
      const dAEff = infoA.dist + spBlood.dA;
      const dBEff = spBlood.dB;
      const pathIds = [...infoA.path, ...spBlood.pathIds];
      const penalty = partner.isFormer ? 1 : 0;
      const score = pathIds.length - 1;
      if (
        !bestBridge ||
        penalty < bestBridge.penalty ||
        (penalty === bestBridge.penalty && score < bestBridge.score)
      ) {
        bestBridge = { dAEff, dBEff, score, penalty, pathIds };
      }
    }
  }

  for (const [ancId, infoB] of ancB.entries()) {
    if (infoB.dist < 1) continue;
    const partners: Array<{ id: string; isFormer: boolean }> = [
      ...Array.from(graph.spousesMap.get(ancId) || []).map((id) => ({ id, isFormer: false })),
      ...Array.from(graph.formerSpousesMap.get(ancId) || []).map((id) => ({ id, isFormer: true })),
    ];
    for (const partner of partners) {
      const spBlood = findDirectBloodMatch(sourceId, partner.id, graph, t);
      if (!spBlood) continue;
      const dAEff = spBlood.dA;
      const dBEff = spBlood.dB + infoB.dist;
      const pathIds = [...spBlood.pathIds, ...[...infoB.path].reverse()];
      const penalty = partner.isFormer ? 1 : 0;
      const score = pathIds.length - 1;
      if (
        !bestBridge ||
        penalty < bestBridge.penalty ||
        (penalty === bestBridge.penalty && score < bestBridge.score)
      ) {
        bestBridge = { dAEff, dBEff, score, penalty, pathIds };
      }
    }
  }

  if (bestBridge) {
    const baseLabel = labelForConsanguinity(bestBridge.dAEff, bestBridge.dBEff, t);
    const baseReverse = labelForConsanguinity(bestBridge.dBEff, bestBridge.dAEff, t);
    return {
      key: `ancestor_marriage_${bestBridge.dAEff}_${bestBridge.dBEff}`,
      label: `${baseLabel} ${t.kinshipByMarriageSuffix}`,
      reverseLabel: `${baseReverse} ${t.kinshipByMarriageSuffix}`,
      viaMarriage: true,
      generationDiff: bestBridge.dAEff - bestBridge.dBEff,
      path: toPersons(bestBridge.pathIds),
    };
  }

  const formerHopMatch = checkDirectMarriageHops(true);
  if (formerHopMatch) return formerHopMatch;

  // 5. Fallback: Shortest path across extended marriage/family graph
  const anyPath = findShortestAnyPath(sourceId, targetId, graph);
  if (anyPath) {
    const steps = anyPath.length - 1;
    let netGen = 0;
    for (let i = 0; i < anyPath.length - 1; i++) {
      const curr = anyPath[i];
      const next = anyPath[i + 1];
      if (graph.parentsMap.get(curr)?.has(next)) netGen += 1;
      else if (graph.childrenMap.get(curr)?.has(next)) netGen -= 1;
    }
    const extLabel = t.kinshipExtended.replace('{steps}', String(steps));
    return {
      key: `extended_${steps}`,
      label: extLabel,
      reverseLabel: extLabel,
      viaMarriage: true,
      generationDiff: netGen,
      path: toPersons(anyPath),
    };
  }

  return {
    key: 'none',
    label: t.kinshipNoLink,
    reverseLabel: t.kinshipNoLink,
    viaMarriage: false,
    path: [],
  };
}
