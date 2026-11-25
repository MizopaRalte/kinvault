import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import * as d3 from 'd3-hierarchy';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Plus,
  Minus,
  Heart,
  HeartCrack,
  Trees,
  ChevronsDownUp,
  ChevronsUpDown,
  X,
  GitCompare,
  Search,
  LocateFixed,
  Pencil,
} from 'lucide-react';
import type { Household, Person, Relationship, Tree, Role, PresenceUser } from '../types/family';
import type { TranslationDictionary } from '../locales/translations';
import { PersonDetailModal } from './PersonDetailModal';
import { KinshipModal } from './KinshipModal';
import { calculateKinship, type KinshipResult } from '../utils/kinshipCalculator';

interface TreeCanvasProps {
  tree: Tree;
  households: Household[];
  persons: Person[];
  relationships: Relationship[];
  t: TranslationDictionary;
  activePersonId?: string;
  userRole?: Role;
  deviceId: string;
  focusPersonRequest?: { personId: string; nonce: number } | null;
  presenceUsers?: PresenceUser[];
  onPresenceContextChange?: (ctx: {
    activeHouseholdId: string;
    activity: 'viewing' | 'editing' | 'adding';
    targetName: string;
  }) => void;
  onOpenMemberModal: (person?: Person, household?: Household, initialMode?: string) => void;
  onUpdatePersonAvatar?: (person: Person, avatarB64: string) => Promise<void>;
  onToggleSpouseStatus?: (relationshipId: string, status: 'spouse' | 'former_spouse') => Promise<void>;
  onInviteBranchMember?: (person: Person) => Promise<void>;
  onRenameTree?: () => void;
  onLayoutCalculated?: (layouts: Map<string, { x: number; y: number; width: number; height: number }>) => void;
}

interface HouseholdNodeData {
  id: string;
  household: Household;
  members: Person[];
  children?: HouseholdNodeData[];
}

interface PairConnector {
  leftX: number;
  rightX: number;
  centerX: number;
  isDivorced: boolean;
}

interface PositionedNode {
  x: number;
  y: number;
  width: number;
  height: number;
  household: Household;
  members: Person[];
  isCouple: boolean;
  heartX: number;
  heartY: number;
  incomingX: number;
  outgoingX: number;
  outgoingY: number;
  personCentersX: number[];
  pairConnectors: PairConnector[];
  directChildrenCount: number;
  hiddenGrandkidsCount: number;
  hasChildren: boolean;
}

const AVATAR_SIZE = 64;
const PERSON_COL_WIDTH = 96;
const COUPLE_GAP = 28;
const SINGLE_NODE_WIDTH = 112;
const NODE_HEIGHT = 118;
const HORIZONTAL_GAP = 28;
const VERTICAL_GAP = 72;
const SIBLING_GAP = 22;
const SUBTREE_GAP = 28;
const D3_UNIT_X = 20;

export const TreeCanvas: React.FC<TreeCanvasProps> = ({
  tree,
  households,
  persons,
  relationships,
  t,
  activePersonId,
  userRole,
  deviceId,
  focusPersonRequest,
  presenceUsers,
  onPresenceContextChange,
  onOpenMemberModal,
  onUpdatePersonAvatar,
  onToggleSpouseStatus,
  onInviteBranchMember,
  onRenameTree,
  onLayoutCalculated,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Transform state: pan, pinch-zoom & measured viewport for virtual culling
  const [scale, setScale] = useState(0.9);
  const [translate, setTranslate] = useState({ x: 200, y: 120 });
  const transformRef = useRef({ scale: 0.9, x: 200, y: 120 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const pointerDownScreen = useRef({ x: 0, y: 0 });
  const didDragRef = useRef(false);
  const suppressClickUntilRef = useRef(0);
  const pinchRef = useRef<{ dist: number; midX: number; midY: number } | null>(null);

  // Drill-down state: collapsed branch IDs & optional focused branch
  const [collapsedBranchIds, setCollapsedBranchIds] = useState<Set<string>>(new Set());
  const [focusedHouseholdId, setFocusedHouseholdId] = useState<string | null>(null);
  const didAutoCollapseRef = useRef(false);

  // Detail, comparison & photo inspection state
  const [detailTarget, setDetailTarget] = useState<{
    person: Person;
    household?: Household;
    openAddRelativeSheet?: boolean;
  } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressNextPortraitClickRef = useRef(false);
  const [compareSource, setCompareSource] = useState<{ person: Person; household?: Household } | null>(null);
  const [kinshipState, setKinshipState] = useState<{
    personA: Person;
    personB: Person;
    result: KinshipResult;
  } | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Quick Find / Jump & Highlight navigation state
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [highlightedPersonId, setHighlightedPersonId] = useState<string | null>(null);
  const pendingFocusPersonIdRef = useRef<string | null>(null);
  const skipAutoFitUntilRef = useRef(0);
  const lastHandledFocusNonceRef = useRef<number | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Group persons by household
  const householdMembers = useMemo(() => {
    const map = new Map<string, Person[]>();
    for (const p of persons) {
      if (p.household_id) {
        const list = map.get(p.household_id) || [];
        list.push(p);
        map.set(p.household_id, list);
      }
    }
    return map;
  }, [persons]);

  // Map person to household
  const personToHousehold = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of persons) {
      if (p.household_id) map.set(p.id, p.household_id);
    }
    return map;
  }, [persons]);

  // Track which persons have an incoming parent_child edge (bloodline children)
  const bloodlineChildIds = useMemo(() => {
    const set = new Set<string>();
    for (const rel of relationships) {
      if (rel.rel_type === 'parent_child') {
        set.add(rel.person_b_id);
      }
    }
    return set;
  }, [relationships]);

  // Build parent <-> child household adjacency maps
  const { childrenHouseholdMap, parentHouseholdMap, rootHouseholdIds, descendantCountMap } = useMemo(() => {
    const cMap = new Map<string, Set<string>>();
    const pMap = new Map<string, Set<string>>();

    for (const rel of relationships) {
      if (rel.rel_type === 'parent_child') {
        const parentH = personToHousehold.get(rel.person_a_id);
        const childH = personToHousehold.get(rel.person_b_id);
        if (parentH && childH && parentH !== childH) {
          const children = cMap.get(parentH) || new Set();
          children.add(childH);
          cMap.set(parentH, children);

          const parents = pMap.get(childH) || new Set();
          parents.add(parentH);
          pMap.set(childH, parents);
        }
      }
    }

    const roots: string[] = [];
    for (const h of households) {
      const parents = pMap.get(h.id);
      if (!parents || parents.size === 0) {
        roots.push(h.id);
      }
    }
    if (roots.length === 0 && households.length > 0) {
      roots.push(households[0].id);
    }

    // Count total descendant households under each node
    const countMap = new Map<string, number>();
    function countDescendants(hId: string, seen = new Set<string>()): number {
      if (seen.has(hId)) return 0;
      seen.add(hId);
      const children = cMap.get(hId);
      if (!children || children.size === 0) {
        countMap.set(hId, 0);
        return 0;
      }
      let total = 0;
      for (const cId of children) {
        total += 1 + countDescendants(cId, seen);
      }
      countMap.set(hId, total);
      return total;
    }

    for (const h of households) {
      if (!countMap.has(h.id)) countDescendants(h.id);
    }

    return {
      childrenHouseholdMap: cMap,
      parentHouseholdMap: pMap,
      rootHouseholdIds: roots,
      descendantCountMap: countMap,
    };
  }, [households, relationships, personToHousehold]);

  // Default Parents-First Drill-Down: on initial load, collapse all child branches under root parents
  useEffect(() => {
    if (!didAutoCollapseRef.current && households.length > 1) {
      didAutoCollapseRef.current = true;
      const toCollapse = new Set<string>();
      for (const h of households) {
        const children = childrenHouseholdMap.get(h.id);
        if (children && children.size > 0) {
          toCollapse.add(h.id);
        }
      }
      setCollapsedBranchIds(toCollapse);
    }
  }, [households, childrenHouseholdMap]);

  const handleParentsOnlyView = () => {
    const toCollapse = new Set<string>();
    for (const h of households) {
      const children = childrenHouseholdMap.get(h.id);
      if (children && children.size > 0) {
        toCollapse.add(h.id);
      }
    }
    setCollapsedBranchIds(toCollapse);
  };

  const handleExpandAll = () => {
    setCollapsedBranchIds(new Set());
  };

  // Optional branch focus filter (direct ancestors + descendants of focusedHouseholdId)
  const visibleHouseholdFilter = useMemo(() => {
    if (!focusedHouseholdId) return null;
    const allowed = new Set<string>([focusedHouseholdId]);

    // Walk up ancestors
    const upQueue = [focusedHouseholdId];
    while (upQueue.length > 0) {
      const curr = upQueue.shift()!;
      const parents = parentHouseholdMap.get(curr);
      if (parents) {
        for (const pId of parents) {
          if (!allowed.has(pId)) {
            allowed.add(pId);
            upQueue.push(pId);
          }
        }
      }
    }

    // Walk down descendants
    const downQueue = [focusedHouseholdId];
    while (downQueue.length > 0) {
      const curr = downQueue.shift()!;
      const children = childrenHouseholdMap.get(curr);
      if (children) {
        for (const cId of children) {
          if (!allowed.has(cId)) {
            allowed.add(cId);
            downQueue.push(cId);
          }
        }
      }
    }

    return allowed;
  }, [focusedHouseholdId, parentHouseholdMap, childrenHouseholdMap]);

  // Compute node positions and orthogonal flowchart links
  const { nodePositions, links } = useMemo(() => {
    const householdMap = new Map<string, Household>();
    for (const h of households) {
      if (!visibleHouseholdFilter || visibleHouseholdFilter.has(h.id)) {
        householdMap.set(h.id, h);
      }
    }

    const activeRoots = rootHouseholdIds.filter((id) => householdMap.has(id));
    if (activeRoots.length === 0 && householdMap.size > 0) {
      activeRoots.push(Array.from(householdMap.keys())[0]);
    }

    const positions = new Map<string, PositionedNode>();
    const calculatedLinks: Array<{
      sourceHouseholdId: string;
      targetHouseholdId: string;
      sourceX: number;
      sourceY: number;
      targetX: number;
      targetY: number;
      busY?: number;
      color: string;
    }> = [];

    const childParentsMap = new Map<string, Set<string>>();
    for (const rel of relationships) {
      if (rel.rel_type === 'parent_child') {
        const set = childParentsMap.get(rel.person_b_id) || new Set<string>();
        set.add(rel.person_a_id);
        childParentsMap.set(rel.person_b_id, set);
      }
    }

    const visited = new Set<string>();
    const hiddenByCollapse = new Set<string>();

    function markSubtreeHidden(hId: string) {
      const children = childrenHouseholdMap.get(hId);
      if (!children) return;
      for (const cId of children) {
        if (!hiddenByCollapse.has(cId)) {
          hiddenByCollapse.add(cId);
          markSubtreeHidden(cId);
        }
      }
    }

    function buildTree(hId: string): HouseholdNodeData | null {
      if (visited.has(hId) || !householdMap.has(hId)) return null;
      visited.add(hId);

      const h = householdMap.get(hId)!;
      const members = householdMembers.get(hId) || [];
      const isCollapsed = collapsedBranchIds.has(hId);

      if (isCollapsed) {
        markSubtreeHidden(hId);
      }

      const childIds = isCollapsed
        ? []
        : Array.from(childrenHouseholdMap.get(hId) || []).filter((cId) => householdMap.has(cId));

      if (childIds.length > 1 && members.length > 1) {
        const arrangedParent = arrangeMembers(members);
        const getOrderScore = (cId: string) => {
          const cMembers = householdMembers.get(cId) || [];
          const matched: number[] = [];
          for (let i = 0; i < arrangedParent.length; i++) {
            const pId = arrangedParent[i].id;
            if (cMembers.some((cm) => childParentsMap.get(cm.id)?.has(pId))) {
              matched.push(i);
            }
          }
          if (matched.length === 0) return (arrangedParent.length - 1) / 2;
          return matched.reduce((sum, idx) => sum + idx, 0) / matched.length;
        };
        childIds.sort((a, b) => getOrderScore(a) - getOrderScore(b));
      }

      const childNodes: HouseholdNodeData[] = [];
      for (const cId of childIds) {
        const childNode = buildTree(cId);
        if (childNode) childNodes.push(childNode);
      }

      return {
        id: hId,
        household: h,
        members,
        children: childNodes.length > 0 ? childNodes : undefined,
      };
    }

    const pairRelTypeMap = new Map<string, 'spouse' | 'former_spouse'>();
    const spouseDegreeMap = new Map<string, number>();
    const pairKey = (id1: string, id2: string) => (id1 < id2 ? `${id1}|${id2}` : `${id2}|${id1}`);
    for (const rel of relationships) {
      if (rel.rel_type === 'spouse' || rel.rel_type === 'former_spouse') {
        pairRelTypeMap.set(pairKey(rel.person_a_id, rel.person_b_id), rel.rel_type);
        spouseDegreeMap.set(rel.person_a_id, (spouseDegreeMap.get(rel.person_a_id) || 0) + 1);
        spouseDegreeMap.set(rel.person_b_id, (spouseDegreeMap.get(rel.person_b_id) || 0) + 1);
      }
    }

    const arrangeMembers = (rawMembers: Person[]): Person[] => {
      if (rawMembers.length <= 2) return rawMembers;
      // Place pivot person (highest spouse degree or bloodline) centrally among their partners
      const pivot =
        [...rawMembers].sort((a, b) => {
          const degDiff = (spouseDegreeMap.get(b.id) || 0) - (spouseDegreeMap.get(a.id) || 0);
          if (degDiff !== 0) return degDiff;
          const aBlood = bloodlineChildIds.has(a.id) ? 1 : 0;
          const bBlood = bloodlineChildIds.has(b.id) ? 1 : 0;
          return bBlood - aBlood;
        })[0];
      const formerList: Person[] = [];
      const currentList: Person[] = [];
      const unlinkedList: Person[] = [];
      for (const m of rawMembers) {
        if (m.id === pivot.id) continue;
        const relType = pairRelTypeMap.get(pairKey(pivot.id, m.id));
        if (relType === 'former_spouse') {
          formerList.push(m);
        } else if (relType === 'spouse') {
          currentList.push(m);
        } else {
          unlinkedList.push(m);
        }
      }

      if (currentList.length === 0 && formerList.length >= 2) {
        const mid = Math.ceil(formerList.length / 2);
        return [...formerList.slice(0, mid), pivot, ...formerList.slice(mid), ...unlinkedList];
      }
      if (formerList.length === 0 && currentList.length >= 2) {
        const mid = Math.ceil(currentList.length / 2);
        return [...currentList.slice(0, mid), pivot, ...currentList.slice(mid), ...unlinkedList];
      }
      return [...formerList, pivot, ...currentList, ...unlinkedList];
    };

    const getNodeGeometry = (h: Household, rawMembers: Person[]) => {
      const members = arrangeMembers(rawMembers);
      const count = members.length;
      if (count <= 1) {
        const width = SINGLE_NODE_WIDTH;
        const centerX = width / 2;
        return {
          width,
          height: NODE_HEIGHT,
          orderedMembers: members,
          isCouple: false,
          heartX: centerX,
          heartY: AVATAR_SIZE / 2,
          incomingOffsetX: centerX,
          outgoingOffsetX: centerX,
          outgoingOffsetY: NODE_HEIGHT,
          personCentersX: count === 1 ? [centerX] : [],
          pairConnectors: [] as PairConnector[],
        };
      }

      if (count === 2) {
        const width = PERSON_COL_WIDTH * 2 + COUPLE_GAP;
        const leftCenter = PERSON_COL_WIDTH / 2;
        const rightCenter = PERSON_COL_WIDTH + COUPLE_GAP + PERSON_COL_WIDTH / 2;
        const heartX = width / 2;
        const heartY = AVATAR_SIZE / 2;
        const isDivorced = pairRelTypeMap.get(pairKey(members[0].id, members[1].id)) === 'former_spouse';

        // Drop parent line onto whichever spouse is the bloodline child
        const isRightBloodline = !bloodlineChildIds.has(members[0].id) && bloodlineChildIds.has(members[1].id);
        const incomingOffsetX = isRightBloodline ? rightCenter : leftCenter;

        return {
          width,
          height: NODE_HEIGHT,
          orderedMembers: members,
          isCouple: true,
          heartX,
          heartY,
          incomingOffsetX,
          outgoingOffsetX: heartX,
          outgoingOffsetY: heartY + 14,
          personCentersX: [leftCenter, rightCenter],
          pairConnectors: [
            {
              leftX: leftCenter,
              rightX: rightCenter,
              centerX: heartX,
              isDivorced,
            },
          ],
        };
      }

      // 3+ members in same household (e.g. Former Spouse </3 Pivot <3 Current Spouse)
      const gap = COUPLE_GAP;
      const width = count * PERSON_COL_WIDTH + (count - 1) * gap;
      const centers: number[] = [];
      for (let i = 0; i < count; i++) {
        centers.push(i * (PERSON_COL_WIDTH + gap) + PERSON_COL_WIDTH / 2);
      }
      const pairConnectors: PairConnector[] = [];
      for (let i = 0; i < count - 1; i++) {
        const relType = pairRelTypeMap.get(pairKey(members[i].id, members[i + 1].id));
        if (!relType) continue;
        pairConnectors.push({
          leftX: centers[i],
          rightX: centers[i + 1],
          centerX: (centers[i] + centers[i + 1]) / 2,
          isDivorced: relType === 'former_spouse',
        });
      }

      const bloodlineIdx = members.findIndex((m) => bloodlineChildIds.has(m.id));
      let pivotIdx = bloodlineIdx;
      if (pivotIdx < 0) {
        pivotIdx = 0;
        let maxDeg = -1;
        for (let i = 0; i < members.length; i++) {
          const deg = spouseDegreeMap.get(members[i].id) || 0;
          if (deg > maxDeg) {
            maxDeg = deg;
            pivotIdx = i;
          }
        }
      }
      const incomingOffsetX = centers[pivotIdx];
      const activeConn = pairConnectors.find((c) => !c.isDivorced);
      const heartX = activeConn ? activeConn.centerX : centers[pivotIdx];
      const heartY = AVATAR_SIZE / 2;

      return {
        width,
        height: NODE_HEIGHT,
        orderedMembers: members,
        isCouple: true,
        heartX,
        heartY,
        incomingOffsetX,
        outgoingOffsetX: heartX,
        outgoingOffsetY: activeConn ? heartY + 14 : NODE_HEIGHT,
        personCentersX: centers,
        pairConnectors,
      };
    };

    const getMembersWidth = (members: Person[]) => {
      const c = members.length;
      if (c <= 1) return SINGLE_NODE_WIDTH;
      return c * PERSON_COL_WIDTH + (c - 1) * COUPLE_GAP;
    };

    let globalXOffset = 0;

    for (const rootId of activeRoots) {
      const rootData = buildTree(rootId);
      if (!rootData) continue;

      const d3Root = d3.hierarchy<HouseholdNodeData>(rootData);
      const treeLayout = d3
        .tree<HouseholdNodeData>()
        .nodeSize([D3_UNIT_X, NODE_HEIGHT + VERTICAL_GAP])
        .separation((a, b) => {
          const gap = a.parent === b.parent ? SIBLING_GAP : SUBTREE_GAP;
          const wA = getMembersWidth(a.data.members);
          const wB = getMembersWidth(b.data.members);
          return ((wA + wB) / 2 + gap) / D3_UNIT_X;
        });

      treeLayout(d3Root);

      let localMinX = Infinity;
      let localMaxX = -Infinity;
      d3Root.each((d) => {
        const halfW = getMembersWidth(d.data.members) / 2;
        const leftEdge = (d.x ?? 0) - halfW;
        const rightEdge = (d.x ?? 0) + halfW;
        if (leftEdge < localMinX) localMinX = leftEdge;
        if (rightEdge > localMaxX) localMaxX = rightEdge;
      });

      const shiftX = globalXOffset - localMinX;

      d3Root.each((d) => {
        const h = d.data.household;
        const members = d.data.members;
        const geom = getNodeGeometry(h, members);
        // Center node cleanly around its D3 x coordinate
        const posX = (d.x ?? 0) + shiftX - geom.width / 2;
        const posY = d.y ?? 0;

        const childrenCount = childrenHouseholdMap.get(h.id)?.size || 0;
        const totalDescCount = descendantCountMap.get(h.id) || 0;

        positions.set(h.id, {
          x: posX,
          y: posY,
          width: geom.width,
          height: geom.height,
          household: h,
          members: geom.orderedMembers,
          isCouple: geom.isCouple,
          heartX: posX + geom.heartX,
          heartY: posY + geom.heartY,
          incomingX: posX + geom.incomingOffsetX,
          outgoingX: posX + geom.outgoingOffsetX,
          outgoingY: posY + geom.outgoingOffsetY,
          personCentersX: geom.personCentersX,
          pairConnectors: geom.pairConnectors,
          directChildrenCount: childrenCount,
          hiddenGrandkidsCount: Math.max(0, totalDescCount - childrenCount),
          hasChildren: childrenCount > 0,
        });
      });

      const sourceAnchorBuckets = new Map<string, number[]>();

      d3Root.links().forEach((link) => {
        const sourcePos = positions.get(link.source.data.id);
        const targetPos = positions.get(link.target.data.id);
        if (sourcePos && targetPos) {
          let sourceX = sourcePos.outgoingX;
          let sourceY = sourcePos.outgoingY;

          const matchedIndices: number[] = [];
          for (let i = 0; i < sourcePos.members.length; i++) {
            const pId = sourcePos.members[i].id;
            if (targetPos.members.some((cm) => childParentsMap.get(cm.id)?.has(pId))) {
              matchedIndices.push(i);
            }
          }

          if (matchedIndices.length === 2) {
            const avgCenter =
              (sourcePos.personCentersX[matchedIndices[0]] +
                sourcePos.personCentersX[matchedIndices[1]]) /
              2;
            sourceX = sourcePos.x + avgCenter;
            sourceY = sourcePos.y + AVATAR_SIZE / 2 + 14;
          } else if (matchedIndices.length === 1) {
            const pIdx = matchedIndices[0];
            const isIntactCouple =
              sourcePos.members.length === 2 &&
              sourcePos.pairConnectors.length === 1 &&
              !sourcePos.pairConnectors[0].isDivorced;
            if (!isIntactCouple && sourcePos.personCentersX[pIdx] !== undefined) {
              sourceX = sourcePos.x + sourcePos.personCentersX[pIdx];
              sourceY = sourcePos.y + NODE_HEIGHT;
            }
          }

          const parentKey = sourcePos.household.id;
          const anchors = sourceAnchorBuckets.get(parentKey) || [];
          const roundedX = Math.round(sourceX);
          if (!anchors.includes(roundedX)) {
            anchors.push(roundedX);
            anchors.sort((a, b) => a - b);
            sourceAnchorBuckets.set(parentKey, anchors);
          }

          calculatedLinks.push({
            sourceHouseholdId: sourcePos.household.id,
            targetHouseholdId: targetPos.household.id,
            sourceX,
            sourceY,
            targetX: targetPos.incomingX,
            targetY: targetPos.y,
            busY:
              anchors.length > 1
                ? targetPos.y - VERTICAL_GAP * (0.5 - anchors.indexOf(roundedX) * 0.1)
                : undefined,
            color: targetPos.household.branch_color || '#94A3B8',
          });
        }
      });

      globalXOffset += Math.max(0, localMaxX - localMinX) + HORIZONTAL_GAP * 2;
    }

    // Disconnected fallback (skip nodes intentionally hidden under collapsed parent branches)
    let disconnectedX = globalXOffset;
    for (const h of householdMap.values()) {
      if (!positions.has(h.id) && !hiddenByCollapse.has(h.id)) {
        const members = householdMembers.get(h.id) || [];
        const geom = getNodeGeometry(h, members);
        const childrenCount = childrenHouseholdMap.get(h.id)?.size || 0;
        const totalDescCount = descendantCountMap.get(h.id) || 0;
        positions.set(h.id, {
          x: disconnectedX,
          y: 0,
          width: geom.width,
          height: geom.height,
          household: h,
          members: geom.orderedMembers,
          isCouple: geom.isCouple,
          heartX: disconnectedX + geom.heartX,
          heartY: geom.heartY,
          incomingX: disconnectedX + geom.incomingOffsetX,
          outgoingX: disconnectedX + geom.outgoingOffsetX,
          outgoingY: geom.outgoingOffsetY,
          personCentersX: geom.personCentersX,
          pairConnectors: geom.pairConnectors,
          directChildrenCount: childrenCount,
          hiddenGrandkidsCount: Math.max(0, totalDescCount - childrenCount),
          hasChildren: childrenCount > 0,
        });
        disconnectedX += geom.width + HORIZONTAL_GAP;
      }
    }

    return { nodePositions: positions, links: calculatedLinks };
  }, [
    households,
    visibleHouseholdFilter,
    rootHouseholdIds,
    householdMembers,
    collapsedBranchIds,
    childrenHouseholdMap,
    bloodlineChildIds,
    descendantCountMap,
    relationships,
  ]);

  // Report simplified layout for PDF exporter
  useEffect(() => {
    if (onLayoutCalculated) {
      const simplified = new Map<string, { x: number; y: number; width: number; height: number }>();
      nodePositions.forEach((val, key) => {
        simplified.set(key, { x: val.x, y: val.y, width: val.width, height: val.height });
      });
      onLayoutCalculated(simplified);
    }
  }, [nodePositions, onLayoutCalculated]);

  const applyTransform = useCallback((nextScale: number, nextX: number, nextY: number) => {
    transformRef.current = { scale: nextScale, x: nextX, y: nextY };
    setScale(nextScale);
    setTranslate({ x: nextX, y: nextY });
  }, []);

  const zoomAtViewportCenter = useCallback(
    (factor: number) => {
      const { scale: prevScale, x: prevX, y: prevY } = transformRef.current;
      const nextScale = Math.min(Math.max(0.2, prevScale * factor), 2.2);
      const el = containerRef.current;
      if (!el) {
        applyTransform(nextScale, prevX, prevY);
        return;
      }
      const cx = el.clientWidth / 2;
      const cy = el.clientHeight / 2;
      const worldX = (cx - prevX) / prevScale;
      const worldY = (cy - prevY) / prevScale;
      applyTransform(nextScale, cx - worldX * nextScale, cy - worldY * nextScale);
    },
    [applyTransform]
  );

  // Measure container size via ResizeObserver for viewport virtualization
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      setContainerSize((prev) =>
        prev.width === el.clientWidth && prev.height === el.clientHeight
          ? prev
          : { width: el.clientWidth, height: el.clientHeight }
      );
    };
    const raf = requestAnimationFrame(measure);
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(measure);
      observer.observe(el);
      return () => {
        cancelAnimationFrame(raf);
        observer.disconnect();
      };
    }
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
    };
  }, []);

  // Attach non-passive wheel listener for smooth focal-point zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;
      const { scale: prevScale, x: prevX, y: prevY } = transformRef.current;
      const zoomFactor = e.deltaY > 0 ? 0.92 : 1.08;
      const nextScale = Math.min(Math.max(0.2, prevScale * zoomFactor), 2.2);
      const worldX = (cursorX - prevX) / prevScale;
      const worldY = (cursorY - prevY) / prevScale;
      applyTransform(nextScale, cursorX - worldX * nextScale, cursorY - worldY * nextScale);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [applyTransform]);

  const resetFit = useCallback(() => {
    if (nodePositions.size === 0 || !containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    nodePositions.forEach((n) => {
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x + n.width > maxX) maxX = n.x + n.width;
      if (n.y + n.height > maxY) maxY = n.y + n.height;
    });

    const isMobile = clientWidth < 640;
    const topReserve = isMobile ? 96 : 40;
    const availH = Math.max(240, clientHeight - topReserve);

    const treeW = maxX - minX + (isMobile ? 80 : 180);
    const treeH = maxY - minY + (isMobile ? 120 : 180);

    const newScale = Math.min(
      Math.max(0.25, Math.min(clientWidth / treeW, availH / treeH)),
      1.05
    );

    const newX = (clientWidth - treeW * newScale) / 2 - minX * newScale + (isMobile ? 40 : 90) * newScale;
    const newY = topReserve + (availH - treeH * newScale) / 2 - minY * newScale + (isMobile ? 35 : 90) * newScale;

    applyTransform(newScale, newX, newY);
  }, [nodePositions, applyTransform]);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!onPresenceContextChange) return;
    if (detailTarget) {
      onPresenceContextChange({
        activeHouseholdId: detailTarget.household?.id || detailTarget.person.household_id || '',
        activity: 'viewing',
        targetName: detailTarget.person.full_name,
      });
    } else if (compareSource) {
      onPresenceContextChange({
        activeHouseholdId: compareSource.household?.id || compareSource.person.household_id || '',
        activity: 'viewing',
        targetName: compareSource.person.full_name,
      });
    } else {
      onPresenceContextChange({
        activeHouseholdId: '',
        activity: 'viewing',
        targetName: '',
      });
    }
  }, [detailTarget, compareSource, onPresenceContextChange]);

  const panToNodePerson = useCallback(
    (targetPersonId: string): boolean => {
      const hId = personToHousehold.get(targetPersonId);
      const node = hId ? nodePositions.get(hId) : undefined;
      if (!node || !containerRef.current) return false;

      const memberIdx = node.members.findIndex((m) => m.id === targetPersonId);
      const centerOffsetX =
        memberIdx >= 0 ? (node.personCentersX[memberIdx] ?? node.width / 2) : node.width / 2;
      const personCenterX = node.x + centerOffsetX;
      const personCenterY = node.y + NODE_HEIGHT / 2;

      const { clientWidth, clientHeight } = containerRef.current;
      const minComfortScale = clientWidth < 640 ? 0.85 : 0.95;
      const targetScale = Math.min(2.2, Math.max(transformRef.current.scale, minComfortScale));

      applyTransform(
        targetScale,
        clientWidth / 2 - personCenterX * targetScale,
        clientHeight / 2 - personCenterY * targetScale
      );

      setHighlightedPersonId(targetPersonId);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = setTimeout(() => {
        setHighlightedPersonId((prev) => (prev === targetPersonId ? null : prev));
      }, 2400);

      return true;
    },
    [nodePositions, personToHousehold, applyTransform]
  );

  const focusOnPerson = useCallback(
    (targetPersonId: string) => {
      const hId = personToHousehold.get(targetPersonId);
      if (!hId) return;

      const ancestorsToExpand: string[] = [];
      const queue = [hId];
      const seen = new Set<string>([hId]);
      while (queue.length > 0) {
        const curr = queue.shift()!;
        const parents = parentHouseholdMap.get(curr);
        if (parents) {
          for (const pId of parents) {
            if (!seen.has(pId)) {
              seen.add(pId);
              ancestorsToExpand.push(pId);
              queue.push(pId);
            }
          }
        }
      }

      const needsUnfocus = focusedHouseholdId !== null;
      const needsExpand = ancestorsToExpand.some((id) => collapsedBranchIds.has(id));

      if (needsUnfocus || needsExpand) {
        pendingFocusPersonIdRef.current = targetPersonId;
        skipAutoFitUntilRef.current = Date.now() + 600;
        if (needsUnfocus) setFocusedHouseholdId(null);
        if (needsExpand) {
          setCollapsedBranchIds((prev) => {
            const next = new Set(prev);
            for (const id of ancestorsToExpand) next.delete(id);
            return next;
          });
        }
        return;
      }

      if (!panToNodePerson(targetPersonId)) {
        pendingFocusPersonIdRef.current = targetPersonId;
        skipAutoFitUntilRef.current = Date.now() + 600;
      }
    },
    [personToHousehold, parentHouseholdMap, focusedHouseholdId, collapsedBranchIds, panToNodePerson]
  );

  // Fulfill pending focus once nodePositions updates after branch expansion, or incoming directory request
  useEffect(() => {
    const incomingNonce = focusPersonRequest?.nonce;
    const incomingPersonId = focusPersonRequest?.personId;

    if (
      incomingNonce !== undefined &&
      incomingPersonId &&
      incomingNonce !== lastHandledFocusNonceRef.current
    ) {
      skipAutoFitUntilRef.current = Date.now() + 600;
      const raf = requestAnimationFrame(() => {
        lastHandledFocusNonceRef.current = incomingNonce;
        focusOnPerson(incomingPersonId);
      });
      return () => cancelAnimationFrame(raf);
    }

    if (pendingFocusPersonIdRef.current) {
      const pendingId = pendingFocusPersonIdRef.current;
      const raf = requestAnimationFrame(() => {
        if (panToNodePerson(pendingId)) {
          pendingFocusPersonIdRef.current = null;
          skipAutoFitUntilRef.current = Date.now() + 400;
        }
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [focusPersonRequest, nodePositions, focusOnPerson, panToNodePerson]);

  const filteredFindPersons = useMemo(() => {
    const q = findQuery.trim().toLowerCase();
    const sorted = [...persons].sort((a, b) => a.full_name.localeCompare(b.full_name));
    if (!q) return sorted.slice(0, 20);
    return sorted
      .filter(
        (p) =>
          p.full_name.toLowerCase().includes(q) ||
          (p.nickname_or_maiden && p.nickname_or_maiden.toLowerCase().includes(q))
      )
      .slice(0, 25);
  }, [persons, findQuery]);

  const householdNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const h of households) map.set(h.id, h.family_name);
    return map;
  }, [households]);

  // Spotlight lineage households when comparing or jumping to a relative
  const spotlightHouseholdIds = useMemo(() => {
    const targetPersonId = compareSource?.person.id || highlightedPersonId;
    if (!targetPersonId) return null;
    const startHId = personToHousehold.get(targetPersonId);
    if (!startHId) return null;

    const set = new Set<string>([startHId]);
    const upQ = [startHId];
    while (upQ.length > 0) {
      const curr = upQ.shift()!;
      for (const pId of parentHouseholdMap.get(curr) || []) {
        if (!set.has(pId)) {
          set.add(pId);
          upQ.push(pId);
        }
      }
    }
    const downQ = [startHId];
    while (downQ.length > 0) {
      const curr = downQ.shift()!;
      for (const cId of childrenHouseholdMap.get(curr) || []) {
        if (!set.has(cId)) {
          set.add(cId);
          downQ.push(cId);
        }
      }
    }
    return set;
  }, [
    compareSource,
    highlightedPersonId,
    personToHousehold,
    parentHouseholdMap,
    childrenHouseholdMap,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (
        pendingFocusPersonIdRef.current ||
        Date.now() < skipAutoFitUntilRef.current ||
        (focusPersonRequest && focusPersonRequest.nonce !== lastHandledFocusNonceRef.current)
      ) {
        return;
      }
      resetFit();
    }, 80);
    return () => clearTimeout(timer);
  }, [resetFit, focusPersonRequest]);

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.flowchart-node, .tree-hud, button, a')) return;
    didDragRef.current = false;
    pointerDownScreen.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - transformRef.current.x,
      y: e.clientY - transformRef.current.y,
    };
  };

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressStartRef.current = null;
  }, []);

  useEffect(() => clearLongPress, [clearLongPress]);

  const startPortraitLongPress = (
    e: React.PointerEvent,
    person: Person,
    household: Household
  ) => {
    if (e.isPrimary) {
      suppressNextPortraitClickRef.current = false;
    }
    if (e.pointerType === 'mouse' || !e.isPrimary || compareSource) return;
    clearLongPress();
    longPressStartRef.current = { x: e.clientX, y: e.clientY };
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      longPressStartRef.current = null;
      if (didDragRef.current || pinchRef.current) return;
      suppressNextPortraitClickRef.current = true;
      suppressClickUntilRef.current = Date.now() + 600;
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try {
          navigator.vibrate(18);
        } catch {
          // Ignore unsupported haptics
        }
      }
      setDetailTarget({ person, household, openAddRelativeSheet: true });
    }, 500);
  };

  const movePortraitLongPress = (e: React.PointerEvent) => {
    const start = longPressStartRef.current;
    if (!start) return;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) >= 8) {
      clearLongPress();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const moved = Math.hypot(
      e.clientX - pointerDownScreen.current.x,
      e.clientY - pointerDownScreen.current.y
    );
    if (moved > 6) {
      didDragRef.current = true;
      clearLongPress();
    }
    applyTransform(
      transformRef.current.scale,
      e.clientX - dragStart.current.x,
      e.clientY - dragStart.current.y
    );
  };

  const handleMouseUp = () => {
    clearLongPress();
    if (didDragRef.current) {
      suppressClickUntilRef.current = Date.now() + 100;
    }
    didDragRef.current = false;
    setIsDragging(false);
  };

  // Multi-touch pan & midpoint-anchored pinch-to-zoom handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.tree-hud')) return;

    if (e.touches.length === 1) {
      pinchRef.current = null;
      setIsPinching(false);
      didDragRef.current = false;
      pointerDownScreen.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      dragStart.current = {
        x: e.touches[0].clientX - transformRef.current.x,
        y: e.touches[0].clientY - transformRef.current.y,
      };
    } else if (e.touches.length === 2 && containerRef.current) {
      clearLongPress();
      setIsDragging(false);
      setIsPinching(true);
      didDragRef.current = true;
      const rect = containerRef.current.getBoundingClientRect();
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
      const midX = (t0.clientX + t1.clientX) / 2 - rect.left;
      const midY = (t0.clientY + t1.clientY) / 2 - rect.top;
      pinchRef.current = { dist, midX, midY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && !pinchRef.current) {
      if ((e.target as HTMLElement).closest('.tree-hud') && !isDragging) return;
      const t0 = e.touches[0];
      const moved = Math.hypot(
        t0.clientX - pointerDownScreen.current.x,
        t0.clientY - pointerDownScreen.current.y
      );
      if (moved >= 8) {
        clearLongPress();
        didDragRef.current = true;
        if (!isDragging) setIsDragging(true);
      }
      if (didDragRef.current) {
        applyTransform(
          transformRef.current.scale,
          t0.clientX - dragStart.current.x,
          t0.clientY - dragStart.current.y
        );
      }
    } else if (e.touches.length === 2 && containerRef.current) {
      clearLongPress();
      const rect = containerRef.current.getBoundingClientRect();
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
      const midX = (t0.clientX + t1.clientX) / 2 - rect.left;
      const midY = (t0.clientY + t1.clientY) / 2 - rect.top;

      if (pinchRef.current && pinchRef.current.dist > 0 && dist > 0) {
        const { scale: prevScale, x: prevX, y: prevY } = transformRef.current;
        const nextScale = Math.min(Math.max(0.2, prevScale * (dist / pinchRef.current.dist)), 2.2);
        const worldX = (pinchRef.current.midX - prevX) / prevScale;
        const worldY = (pinchRef.current.midY - prevY) / prevScale;
        applyTransform(nextScale, midX - worldX * nextScale, midY - worldY * nextScale);
      }
      pinchRef.current = { dist, midX, midY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    clearLongPress();
    if (e.touches.length === 1) {
      pinchRef.current = null;
      setIsPinching(false);
      const { x, y } = transformRef.current;
      dragStart.current = { x: e.touches[0].clientX - x, y: e.touches[0].clientY - y };
      pointerDownScreen.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      return;
    }
    if (didDragRef.current) {
      suppressClickUntilRef.current = Date.now() + 120;
    }
    didDragRef.current = false;
    pinchRef.current = null;
    setIsDragging(false);
    setIsPinching(false);
  };

  // Virtual rendering: only keep nodes & orthogonal connectors inside padded viewport
  const { visibleNodes, visibleLinks } = useMemo(() => {
    const allNodes = Array.from(nodePositions.values());
    if (containerSize.width <= 0 || containerSize.height <= 0) {
      return { visibleNodes: allNodes, visibleLinks: links };
    }

    const overscanWorld = 300 / scale;
    const viewLeft = -translate.x / scale - overscanWorld;
    const viewTop = -translate.y / scale - overscanWorld;
    const viewRight = (-translate.x + containerSize.width) / scale + overscanWorld;
    const viewBottom = (-translate.y + containerSize.height) / scale + overscanWorld;

    const nodesInView = allNodes.filter(
      (n) =>
        n.x <= viewRight &&
        n.x + n.width >= viewLeft &&
        n.y - 36 <= viewBottom &&
        n.y + n.height + 76 >= viewTop
    );

    const linksInView = links.filter((link) => {
      const busY = link.busY ?? link.targetY - VERTICAL_GAP * 0.48;
      const minX = Math.min(link.sourceX, link.targetX);
      const maxX = Math.max(link.sourceX, link.targetX);
      const minY = Math.min(link.sourceY, busY, link.targetY);
      const maxY = Math.max(link.sourceY, busY, link.targetY);
      return (
        maxX >= viewLeft &&
        minX <= viewRight &&
        maxY >= viewTop &&
        minY <= viewBottom
      );
    });

    return { visibleNodes: nodesInView, visibleLinks: linksInView };
  }, [
    nodePositions,
    links,
    containerSize.width,
    containerSize.height,
    translate.x,
    translate.y,
    scale,
  ]);

  const toggleCollapse = (hId: string) => {
    setCollapsedBranchIds((prev) => {
      const next = new Set(prev);
      if (next.has(hId)) next.delete(hId);
      else next.add(hId);
      return next;
    });
  };

  const handlePersonClick = (person: Person, household: Household) => {
    if (suppressNextPortraitClickRef.current) {
      suppressNextPortraitClickRef.current = false;
      return;
    }
    if (Date.now() < suppressClickUntilRef.current) return;
    if (compareSource) {
      const result = calculateKinship(compareSource.person.id, person.id, persons, relationships, t);
      setKinshipState({
        personA: compareSource.person,
        personB: person,
        result,
      });
      setCompareSource(null);
      return;
    }
    setDetailTarget({ person, household });
  };

  const formatYearSpan = (p: Person) => {
    if (!p.birth_year && !p.death_year) {
      return p.is_living ? t.living : t.deceased;
    }
    if (p.is_living) {
      return `${p.birth_year || '?'} – ${t.present}`;
    }
    return `${p.birth_year || '?'} – ${p.death_year || '?'}`;
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onClickCapture={(e) => {
        if (Date.now() < suppressClickUntilRef.current) {
          e.stopPropagation();
          e.preventDefault();
        }
      }}
      className={`relative w-full h-full overflow-hidden bg-slate-50/70 select-none touch-none ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      style={{
        touchAction: 'none',
        backgroundImage: `radial-gradient(#CBD5E1 1px, transparent 1px)`,
        backgroundSize: '26px 26px',
      }}
    >
      {/* Top-Left Tree Title & Drill-Down Bar */}
      <div className="tree-hud absolute top-3 left-3 right-3 sm:right-auto sm:top-4 sm:left-4 z-10 flex flex-col gap-2 max-w-full sm:max-w-sm pointer-events-none">
        <div className="bg-slate-900/95 backdrop-blur-xs text-white rounded-2xl px-3.5 py-2 sm:px-4 sm:py-3 shadow-lg flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3 pointer-events-auto">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Trees className="w-4 h-4 sm:w-5 sm:h-5 text-sky-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <h2 className="font-extrabold text-xs sm:text-sm tracking-tight truncate">{tree.name}</h2>
                {onRenameTree && (
                  <button
                    type="button"
                    onClick={onRenameTree}
                    title={t.renameTreeBtn}
                    aria-label={t.renameTreeBtn}
                    className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-white/15 transition-colors cursor-pointer shrink-0"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-300 font-medium">
                {persons.length} {t.membersCount} • {households.length} {t.statsHouseholds}
              </p>
            </div>
          </div>

          {households.length > 1 && (
            <div className="flex sm:hidden items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleExpandAll}
                title={t.expandAll}
                className="p-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-white cursor-pointer"
              >
                <ChevronsUpDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleParentsOnlyView}
                title={t.parentsOnlyView}
                className="p-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-white cursor-pointer"
              >
                <ChevronsDownUp className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Drill-Down Controls (Desktop / Focus Reset on Mobile) */}
        <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto">
          {households.length > 1 && (
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleExpandAll}
                className="px-2.5 py-1.5 bg-white/95 hover:bg-white border border-slate-200 rounded-xl shadow-xs text-[11px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <ChevronsUpDown className="w-3.5 h-3.5 text-slate-500" />
                <span>{t.expandAll}</span>
              </button>

              <button
                type="button"
                onClick={handleParentsOnlyView}
                className="px-2.5 py-1.5 bg-white/95 hover:bg-white border border-slate-200 rounded-xl shadow-xs text-[11px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <ChevronsDownUp className="w-3.5 h-3.5 text-slate-500" />
                <span>{t.parentsOnlyView}</span>
              </button>
            </div>
          )}

          {focusedHouseholdId && (
            <button
              type="button"
              onClick={() => setFocusedHouseholdId(null)}
              className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-sm text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>{t.showFullTree}</span>
            </button>
          )}
        </div>
      </div>

      {/* Compare Mode Banner (when selecting second profile) */}
      {compareSource ? (
        <div className="tree-hud absolute top-16 sm:top-4 left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-20 bg-indigo-600 text-white shadow-xl rounded-2xl sm:rounded-full px-4 py-2 text-xs font-bold flex items-center justify-between sm:justify-center gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <GitCompare className="w-4 h-4 shrink-0 animate-pulse" />
            <span className="truncate">
              {t.comparingFromHint.replace('{name}', compareSource.person.full_name)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setCompareSource(null)}
            className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-full text-[11px] font-bold cursor-pointer shrink-0"
          >
            {t.cancel}
          </button>
        </div>
      ) : (
        <div className="hidden md:flex absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-full px-4 py-1.5 text-[11px] text-slate-600 font-medium items-center gap-1.5 pointer-events-none">
          <span>{households.length <= 2 ? t.treeCanvasGuide : t.clickPersonHint}</span>
        </div>
      )}

      {/* Pan/Zoom Canvas Viewport */}
      <div
        className={`absolute top-0 left-0 w-full h-full transform-gpu origin-top-left ${
          isDragging || isPinching ? 'transition-none' : 'transition-transform duration-100'
        }`}
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
        }}
      >
        {/* SVG Orthogonal Stepped Connection Lines */}
        <svg className="absolute top-0 left-0 w-[12000px] h-[12000px] pointer-events-none overflow-visible">
          {visibleLinks.map((link, idx) => {
            // Compute clean orthogonal horizontal bus midway between outgoing parent point and child top
            const busY = link.busY ?? link.targetY - VERTICAL_GAP * 0.48;
            const pathData = `M ${link.sourceX} ${link.sourceY} V ${busY} H ${link.targetX} V ${link.targetY}`;
            const isSpotlightLink =
              !spotlightHouseholdIds ||
              (spotlightHouseholdIds.has(link.sourceHouseholdId) &&
                spotlightHouseholdIds.has(link.targetHouseholdId));
            return (
              <g
                key={`link-${link.sourceHouseholdId}-${link.targetHouseholdId}-${idx}`}
                className="transition-opacity duration-200"
                style={{ opacity: isSpotlightLink ? 1 : 0.25 }}
              >
                <path
                  d={pathData}
                  fill="none"
                  stroke={spotlightHouseholdIds && isSpotlightLink ? link.color || '#0F172A' : '#94A3B8'}
                  strokeWidth={spotlightHouseholdIds && isSpotlightLink ? '2.5' : '2'}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx={link.targetX} cy={link.targetY} r="3.5" fill={link.color || '#64748B'} />
              </g>
            );
          })}
        </svg>

        {/* Flowchart Nodes */}
        {visibleNodes.map((node) => {
          const h = node.household;
          const members = node.members;
          const isCollapsed = collapsedBranchIds.has(h.id);
          const branchColor = h.branch_color || '#0F172A';

          const isDimmed = Boolean(spotlightHouseholdIds && !spotlightHouseholdIds.has(h.id));
          const activeNodePeers = (presenceUsers || []).filter(
            (u) => u.deviceId !== deviceId && u.activeHouseholdId === h.id
          );

          return (
            <div
              key={h.id}
              style={{
                transform: `translate(${node.x}px, ${node.y}px)`,
                width: `${node.width}px`,
                opacity: isDimmed ? 0.35 : 1,
              }}
              className="flowchart-node group absolute top-0 left-0 transition-opacity duration-200"
            >
              {activeNodePeers.length > 0 && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex items-center gap-1 whitespace-nowrap">
                  {activeNodePeers.slice(0, 2).map((peer) => {
                    const isBusy = peer.activity === 'editing' || peer.activity === 'adding';
                    return (
                      <span
                        key={peer.deviceId}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold shadow-md border ${
                          isBusy
                            ? 'bg-amber-500 text-white border-amber-600'
                            : 'bg-emerald-600 text-white border-emerald-700'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
                        <span>
                          {peer.displayName.split(' ')[0]} •{' '}
                          {peer.activity === 'editing'
                            ? t.presenceEditingLabel
                            : peer.activity === 'adding'
                            ? t.presenceAddingLabel
                            : t.presenceViewingLabel}
                        </span>
                      </span>
                    );
                  })}
                </div>
              )}
              {/* Horizontal Spouse / Former-Spouse Connectors */}
              {node.pairConnectors.map((conn, cIdx) => (
                <React.Fragment key={`conn-${h.id}-${cIdx}`}>
                  <div
                    className={`absolute pointer-events-none ${
                      conn.isDivorced
                        ? 'border-t-2 border-dashed border-rose-300'
                        : 'h-[2px] bg-slate-300'
                    }`}
                    style={{
                      left: `${conn.leftX}px`,
                      width: `${conn.rightX - conn.leftX}px`,
                      top: `${AVATAR_SIZE / 2}px`,
                    }}
                  />
                  <div
                    className={`absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border shadow-xs flex items-center justify-center z-10 ${
                      conn.isDivorced ? 'border-rose-200' : 'border-slate-200'
                    }`}
                    style={{
                      left: `${conn.centerX}px`,
                      top: `${AVATAR_SIZE / 2}px`,
                    }}
                    title={conn.isDivorced ? t.divorcedStatusOption : t.marriedStatusOption}
                  >
                    {conn.isDivorced ? (
                      <HeartCrack className="w-3.5 h-3.5 text-rose-500" />
                    ) : (
                      <Heart
                        className="w-3.5 h-3.5"
                        style={{ color: branchColor, fill: branchColor }}
                      />
                    )}
                  </div>
                </React.Fragment>
              ))}

              {/* Person Portraits Row */}
              {members.length === 0 ? (
                <button
                  type="button"
                  onClick={() => onOpenMemberModal(undefined, h, 'edit_household')}
                  className="w-full py-4 px-3 bg-white border-2 border-dashed border-slate-300 rounded-2xl text-center hover:border-slate-500 transition-colors cursor-pointer"
                >
                  <p className="text-xs font-bold text-slate-700 truncate">{h.family_name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{t.editHousehold}</p>
                </button>
              ) : (
                <div
                  className="relative flex items-start justify-center"
                  style={{
                    gap: `${COUPLE_GAP}px`,
                  }}
                >
                  {members.map((person) => {
                    const isSelf = person.id === activePersonId;
                    const isClaimed = person.claimed_device_id === deviceId;

                    return (
                      <div
                        key={person.id}
                        style={{ width: `${PERSON_COL_WIDTH}px` }}
                        onPointerDown={(e) => startPortraitLongPress(e, person, h)}
                        onPointerMove={movePortraitLongPress}
                        onPointerUp={clearLongPress}
                        onPointerCancel={clearLongPress}
                        onPointerLeave={clearLongPress}
                        onContextMenu={(e) => {
                          if (window.matchMedia('(hover: none)').matches) {
                            e.preventDefault();
                          }
                        }}
                        className="tree-portrait-btn flex flex-col items-center text-center"
                      >
                        {/* Circular Portrait */}
                        <button
                          type="button"
                          onClick={() => handlePersonClick(person, h)}
                          className={`relative rounded-full bg-white shadow-md hover:shadow-xl hover:scale-105 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-900 ${
                            compareSource?.person.id === person.id
                              ? 'ring-4 ring-indigo-500 ring-offset-2'
                              : highlightedPersonId === person.id
                              ? 'ring-4 ring-sky-500 ring-offset-2 scale-105'
                              : ''
                          }`}
                          style={{
                            width: `${AVATAR_SIZE}px`,
                            height: `${AVATAR_SIZE}px`,
                            border: `3px solid ${branchColor}`,
                            padding: '2px',
                          }}
                          title={`${person.full_name} — ${t.clickPersonHint}`}
                        >
                          <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 flex items-center justify-center">
                            {person.avatar_b64 ? (
                              <img
                                src={person.avatar_b64}
                                alt={person.full_name}
                                draggable={false}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-lg font-extrabold text-slate-500">
                                {person.full_name.slice(0, 1).toUpperCase()}
                              </span>
                            )}
                          </div>

                          {/* Subtle You / Active Indicator */}
                          {(isSelf || isClaimed) && (
                            <span
                              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-xs"
                              title={t.claimedByYou}
                            />
                          )}
                        </button>

                        {/* Name & Year Span (clickable to open details) */}
                        <button
                          type="button"
                          onClick={() => handlePersonClick(person, h)}
                          className="mt-1.5 px-1 py-0.5 rounded-lg hover:bg-white/90 transition-colors cursor-pointer max-w-full"
                        >
                          <p className="text-[11px] font-extrabold text-slate-900 leading-tight line-clamp-2">
                            {person.full_name}
                          </p>
                          <p
                            className="text-[9.5px] font-semibold mt-0.5 truncate"
                            style={{ color: person.is_living ? branchColor : '#64748B' }}
                          >
                            {formatYearSpan(person)}
                          </p>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Drill-Down Collapse / Expand Toggle Button */}
              {node.hasChildren && (
                <button
                  type="button"
                  onClick={() => toggleCollapse(h.id)}
                  title={isCollapsed ? t.expandBranch : t.collapseBranch}
                  className={`absolute -translate-x-1/2 z-20 rounded-full flex items-center justify-center gap-1 font-bold text-[10px] shadow-sm transition-all cursor-pointer whitespace-nowrap ${
                    isCollapsed
                      ? 'px-2.5 py-0.5 bg-slate-900 text-white hover:bg-slate-800 scale-105'
                      : 'w-5 h-5 bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                  }`}
                  style={{
                    left: `${node.outgoingX - node.x}px`,
                    top: isCollapsed
                      ? `${NODE_HEIGHT + 2}px`
                      : node.isCouple
                      ? `${AVATAR_SIZE / 2 + 18}px`
                      : `${NODE_HEIGHT - 8}px`,
                  }}
                >
                  {isCollapsed ? (
                    <>
                      <Plus className="w-3 h-3" />
                      <span>
                        {node.directChildrenCount} {t.kidsCountLabel}
                        {node.hiddenGrandkidsCount > 0
                          ? ` • ${node.hiddenGrandkidsCount} ${t.grandkidsCountLabel}`
                          : ''}
                      </span>
                    </>
                  ) : (
                    <Minus className="w-3 h-3" />
                  )}
                </button>
              )}

              {/* Quick-Add Pill Bar (always visible on small trees <= 2 nodes, visible on hover otherwise) */}
              {members.length > 0 && (() => {
                const primaryMember =
                  members.find((m) => bloodlineChildIds.has(m.id)) ||
                  members[Math.floor(members.length / 2)] ||
                  members[0];
                return (
                <div
                  className={`quick-add-pills ${node.hasChildren && isCollapsed ? 'mt-7' : 'mt-2'} flex items-center justify-center gap-1 transition-opacity duration-150 ${
                    households.length <= 2
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                  }`}
                >
                  <div className="bg-white/95 backdrop-blur-xs border border-slate-200 rounded-2xl sm:rounded-full px-2 py-1 shadow-md flex flex-wrap sm:flex-nowrap items-center justify-center gap-1 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => onOpenMemberModal(primaryMember, h, 'add_ancestor')}
                      className="px-1.5 py-0.5 text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {t.addAncestorsAbove}
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => onOpenMemberModal(primaryMember, h, 'add_spouse')}
                      className="px-1.5 py-0.5 text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {t.addSpouse}
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => onOpenMemberModal(primaryMember, h, 'add_sibling')}
                      className="px-1.5 py-0.5 text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {t.addSibling}
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => onOpenMemberModal(primaryMember, h, 'add_child')}
                      className="px-1.5 py-0.5 bg-slate-900 text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {t.addChildHousehold}
                    </button>
                  </div>
                </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {/* Bottom-Left Quick Navigation Dock (Find Relative + Center on Me) */}
      <div className="tree-hud absolute bottom-[max(1rem,env(safe-area-inset-bottom,0px))] left-3 sm:bottom-6 sm:left-6 z-20">
        {findOpen && (
          <div className="absolute bottom-full left-0 mb-2 w-64 sm:w-72 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-2 border-b border-slate-100 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              <input
                type="text"
                autoFocus
                value={findQuery}
                onChange={(e) => setFindQuery(e.target.value)}
                placeholder={t.jumpToPersonPlaceholder}
                className="flex-1 text-xs font-medium text-slate-800 placeholder:text-slate-400 bg-transparent focus:outline-none py-1"
              />
              <button
                type="button"
                onClick={() => {
                  setFindOpen(false);
                  setFindQuery('');
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                aria-label={t.close}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
              {filteredFindPersons.length === 0 ? (
                <p className="px-3 py-4 text-center text-[11px] text-slate-400 font-medium">
                  {t.noMembersFound}
                </p>
              ) : (
                filteredFindPersons.map((p) => {
                  const hName = p.household_id ? householdNameMap.get(p.household_id) : '';
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setFindOpen(false);
                        setFindQuery('');
                        focusOnPerson(p.id);
                      }}
                      className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-slate-50 active:bg-slate-100 text-left transition-colors cursor-pointer"
                    >
                      <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 text-[11px] font-extrabold text-slate-600">
                        {p.avatar_b64 ? (
                          <img src={p.avatar_b64} alt="" className="w-full h-full object-cover" />
                        ) : (
                          p.full_name.slice(0, 1).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">{p.full_name}</p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {[hName, formatYearSpan(p)].filter(Boolean).join(' • ')}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-1 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl p-1 shadow-lg">
          <button
            type="button"
            onClick={() => setFindOpen((prev) => !prev)}
            className={`px-3 py-2 sm:py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              findOpen
                ? 'bg-slate-900 text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
            title={t.findOnTreeBtn}
          >
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span>{t.findOnTreeBtn}</span>
          </button>

          {activePersonId && (
            <>
              <div className="w-px h-5 bg-slate-200" />
              <button
                type="button"
                onClick={() => {
                  setFindOpen(false);
                  focusOnPerson(activePersonId);
                }}
                className="px-3 py-2 sm:py-1.5 rounded-xl text-xs font-bold text-emerald-700 hover:bg-emerald-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                title={t.centerOnMeBtn}
              >
                <LocateFixed className="w-3.5 h-3.5 shrink-0" />
                <span>{t.centerOnMeBtn}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Floating Canvas Zoom Controls */}
      <div className="tree-hud absolute bottom-[max(1rem,env(safe-area-inset-bottom,0px))] right-4 sm:bottom-6 sm:right-6 flex flex-col gap-1.5 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl p-1.5 shadow-lg z-10">
        <button
          type="button"
          onClick={() => zoomAtViewportCenter(1.18)}
          title={t.zoomIn}
          aria-label={t.zoomIn}
          className="min-w-11 min-h-11 sm:min-w-9 sm:min-h-9 p-2.5 sm:p-2 flex items-center justify-center text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => zoomAtViewportCenter(0.85)}
          title={t.zoomOut}
          aria-label={t.zoomOut}
          className="min-w-11 min-h-11 sm:min-w-9 sm:min-h-9 p-2.5 sm:p-2 flex items-center justify-center text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="border-t border-slate-100 my-0.5" />
        <button
          type="button"
          onClick={resetFit}
          title={t.resetView}
          aria-label={t.resetView}
          className="min-w-11 min-h-11 sm:min-w-9 sm:min-h-9 p-2.5 sm:p-2 flex items-center justify-center text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Person Detail Modal (Address, Telephone, Connections, Actions) */}
      <PersonDetailModal
        key={
          detailTarget
            ? `${detailTarget.person.id}-${detailTarget.openAddRelativeSheet ? 'sheet' : 'view'}`
            : 'closed'
        }
        person={detailTarget ? persons.find((p) => p.id === detailTarget.person.id) || detailTarget.person : null}
        household={detailTarget?.household ? households.find((h) => h.id === detailTarget.household?.id) || detailTarget.household : undefined}
        allPersons={persons}
        allHouseholds={households}
        relationships={relationships}
        t={t}
        deviceId={deviceId}
        activePersonId={activePersonId}
        userRole={userRole}
        openAddRelativeSheet={detailTarget?.openAddRelativeSheet}
        hasBranchChildren={
          detailTarget?.person.household_id
            ? (childrenHouseholdMap.get(detailTarget.person.household_id)?.size || 0) > 0
            : false
        }
        isBranchCollapsed={
          detailTarget?.person.household_id
            ? collapsedBranchIds.has(detailTarget.person.household_id)
            : false
        }
        onToggleBranchExpand={(hId) => toggleCollapse(hId)}
        onExpandToHousehold={(hId) => {
          setCollapsedBranchIds((prev) => {
            const next = new Set(prev);
            const queue = [hId];
            const seen = new Set<string>();
            while (queue.length > 0) {
              const curr = queue.shift()!;
              if (seen.has(curr)) continue;
              seen.add(curr);
              const parents = parentHouseholdMap.get(curr);
              if (parents) {
                for (const pId of parents) {
                  next.delete(pId);
                  queue.push(pId);
                }
              }
            }
            return next;
          });
        }}
        onClose={() => setDetailTarget(null)}
        onSelectPerson={(p, h) => setDetailTarget({ person: p, household: h })}
        onOpenMemberModal={onOpenMemberModal}
        onUpdatePersonAvatar={onUpdatePersonAvatar}
        onToggleSpouseStatus={onToggleSpouseStatus}
        onInviteBranchMember={onInviteBranchMember}
        onFocusBranch={(hId) => {
          setFocusedHouseholdId(hId);
          setCollapsedBranchIds(new Set());
        }}
        onStartCompare={(p, h) => setCompareSource({ person: p, household: h })}
        onPreviewPhoto={(url) => setPreviewPhoto(url)}
      />

      {/* Profile-to-Profile Kinship Comparison Result Modal */}
      <KinshipModal
        personA={kinshipState?.personA || null}
        personB={kinshipState?.personB || null}
        result={kinshipState?.result || null}
        households={households}
        t={t}
        onClose={() => setKinshipState(null)}
        onSwap={() => {
          if (!kinshipState) return;
          const swappedResult = calculateKinship(
            kinshipState.personB.id,
            kinshipState.personA.id,
            persons,
            relationships,
            t
          );
          setKinshipState({
            personA: kinshipState.personB,
            personB: kinshipState.personA,
            result: swappedResult,
          });
        }}
      />

      {/* Fullscreen Photo Preview Modal */}
      {previewPhoto && (
        <div
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="max-w-3xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl">
            <img src={previewPhoto} alt="Family Portrait" className="w-full h-auto max-h-[82vh] object-contain" />
            <div className="p-3 bg-white flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
