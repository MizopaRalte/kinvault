import type { Person, Relationship } from '../types/family';
import type { TranslationDictionary } from '../locales/translations';

export interface KinshipResult {
  key: string;
  label: string;
  reverseLabel: string;
  viaMarriage: boolean;
  path: Person[];
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
}

function buildGraph(persons: Person[], relationships: Relationship[]): GraphMaps {
  const personMap = new Map<string, Person>();
  const parentsMap = new Map<string, Set<string>>();
  const childrenMap = new Map<string, Set<string>>();
  const spousesMap = new Map<string, Set<string>>();

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
    }
  }

  return { personMap, parentsMap, childrenMap, spousesMap };
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
  if (dA === 0 && dB > 3) return `${dB - 2}x ${t.kinshipGreatGrandchild}`;
  if (dA > 3 && dB === 0) return `${dA - 2}x ${t.kinshipGreatGrandparent}`;

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
      path: toPersons([sourceId]),
    };
  }

  // 1. Direct Spouse
  if (graph.spousesMap.get(sourceId)?.has(targetId)) {
    return {
      key: 'spouse',
      label: t.kinshipSpouse,
      reverseLabel: t.kinshipSpouse,
      viaMarriage: true,
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
      path: toPersons(blood.pathIds),
    };
  }

  // 3. One Marriage Hop: A's Blood Relative -> B (Spouse of A's blood relative)
  const targetSpouses = graph.spousesMap.get(targetId) || new Set<string>();
  for (const spId of targetSpouses) {
    const spBlood = findDirectBloodMatch(sourceId, spId, graph, t);
    if (spBlood) {
      let label = `${spBlood.label} ${t.kinshipByMarriageSuffix}`;
      let reverseLabel = `${spBlood.reverseLabel} ${t.kinshipByMarriageSuffix}`;

      if (spBlood.dA === 1 && spBlood.dB === 1) {
        label = t.kinshipSiblingInLaw;
        reverseLabel = t.kinshipSiblingInLaw;
      } else if (spBlood.dA === 0 && spBlood.dB === 1) {
        label = t.kinshipChildInLaw;
        reverseLabel = t.kinshipParentInLaw;
      } else if (spBlood.dA === 2 && spBlood.dB === 1) {
        label = t.kinshipAuntUncleByMarriage;
        reverseLabel = `${t.kinshipNieceNephew} ${t.kinshipByMarriageSuffix}`;
      }

      return {
        key: `marriage_target_${spBlood.dA}_${spBlood.dB}`,
        label,
        reverseLabel,
        viaMarriage: true,
        path: toPersons([...spBlood.pathIds, targetId]),
      };
    }
  }

  // 4. One Marriage Hop: A's Spouse -> Blood Relative B
  const sourceSpouses = graph.spousesMap.get(sourceId) || new Set<string>();
  for (const spId of sourceSpouses) {
    const spBlood = findDirectBloodMatch(spId, targetId, graph, t);
    if (spBlood) {
      let label = `${spBlood.label} ${t.kinshipByMarriageSuffix}`;
      let reverseLabel = `${spBlood.reverseLabel} ${t.kinshipByMarriageSuffix}`;

      if (spBlood.dA === 1 && spBlood.dB === 0) {
        label = t.kinshipParentInLaw;
        reverseLabel = t.kinshipChildInLaw;
      } else if (spBlood.dA === 1 && spBlood.dB === 1) {
        label = t.kinshipSiblingInLaw;
        reverseLabel = t.kinshipSiblingInLaw;
      } else if (spBlood.dA === 1 && spBlood.dB === 2) {
        label = `${t.kinshipNieceNephew} ${t.kinshipByMarriageSuffix}`;
        reverseLabel = t.kinshipAuntUncleByMarriage;
      }

      return {
        key: `marriage_source_${spBlood.dA}_${spBlood.dB}`,
        label,
        reverseLabel,
        viaMarriage: true,
        path: toPersons([sourceId, ...spBlood.pathIds]),
      };
    }
  }

  // 5. Fallback: Shortest path across extended marriage/family graph
  const anyPath = findShortestAnyPath(sourceId, targetId, graph);
  if (anyPath) {
    const steps = anyPath.length - 1;
    const extLabel = t.kinshipExtended.replace('{steps}', String(steps));
    return {
      key: `extended_${steps}`,
      label: extLabel,
      reverseLabel: extLabel,
      viaMarriage: true,
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
