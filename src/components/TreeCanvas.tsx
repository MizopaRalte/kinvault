import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import * as d3 from 'd3-hierarchy';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Plus,
  Minus,
  Heart,
  Sparkles,
  Trees,
  ChevronsDownUp,
  ChevronsUpDown,
  X,
  GitCompare,
} from 'lucide-react';
import type { Household, Person, Relationship, Tree, Role } from '../types/family';
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
  onOpenMemberModal: (person?: Person, household?: Household, initialMode?: string) => void;
  onLayoutCalculated?: (layouts: Map<string, { x: number; y: number; width: number; height: number }>) => void;
}

interface HouseholdNodeData {
  id: string;
  household: Household;
  members: Person[];
  children?: HouseholdNodeData[];
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
  hiddenDescendantsCount: number;
  hasChildren: boolean;
}

const AVATAR_SIZE = 76;
const PERSON_COL_WIDTH = 122;
const COUPLE_GAP = 46;
const SINGLE_NODE_WIDTH = 156;
const NODE_HEIGHT = 138;
const HORIZONTAL_GAP = 48;
const VERTICAL_GAP = 92;

export const TreeCanvas: React.FC<TreeCanvasProps> = ({
  tree,
  households,
  persons,
  relationships,
  t,
  activePersonId,
  userRole: _userRole,
  deviceId,
  onOpenMemberModal,
  onLayoutCalculated,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Transform state: pan & zoom
  const [scale, setScale] = useState(0.9);
  const [translate, setTranslate] = useState({ x: 200, y: 120 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const touchDistance = useRef<number | null>(null);

  // Drill-down state: collapsed branch IDs & optional focused branch
  const [collapsedBranchIds, setCollapsedBranchIds] = useState<Set<string>>(new Set());
  const [focusedHouseholdId, setFocusedHouseholdId] = useState<string | null>(null);
  const didAutoCollapseRef = useRef(false);

  // Detail, comparison & photo inspection state
  const [detailTarget, setDetailTarget] = useState<{ person: Person; household?: Household } | null>(null);
  const [compareSource, setCompareSource] = useState<{ person: Person; household?: Household } | null>(null);
  const [kinshipState, setKinshipState] = useState<{
    personA: Person;
    personB: Person;
    result: KinshipResult;
  } | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

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
    const calculatedLinks: Array<{ sourceX: number; sourceY: number; targetX: number; targetY: number; color: string }> = [];

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

    const getNodeGeometry = (h: Household, members: Person[]) => {
      const count = members.length;
      if (count <= 1) {
        const width = SINGLE_NODE_WIDTH;
        const centerX = width / 2;
        return {
          width,
          height: NODE_HEIGHT,
          isCouple: false,
          heartX: centerX,
          heartY: AVATAR_SIZE / 2,
          incomingOffsetX: centerX,
          outgoingOffsetX: centerX,
          outgoingOffsetY: NODE_HEIGHT,
          personCentersX: count === 1 ? [centerX] : [],
        };
      }

      if (count === 2) {
        const width = PERSON_COL_WIDTH * 2 + COUPLE_GAP;
        const leftCenter = PERSON_COL_WIDTH / 2;
        const rightCenter = PERSON_COL_WIDTH + COUPLE_GAP + PERSON_COL_WIDTH / 2;
        const heartX = width / 2;
        const heartY = AVATAR_SIZE / 2;

        // Drop parent line onto whichever spouse is the bloodline child
        const isRightBloodline = !bloodlineChildIds.has(members[0].id) && bloodlineChildIds.has(members[1].id);
        const incomingOffsetX = isRightBloodline ? rightCenter : leftCenter;

        return {
          width,
          height: NODE_HEIGHT,
          isCouple: true,
          heartX,
          heartY,
          incomingOffsetX,
          outgoingOffsetX: heartX,
          outgoingOffsetY: heartY + 14,
          personCentersX: [leftCenter, rightCenter],
        };
      }

      // 3+ members in same household
      const gap = 28;
      const width = count * PERSON_COL_WIDTH + (count - 1) * gap;
      const centers: number[] = [];
      for (let i = 0; i < count; i++) {
        centers.push(i * (PERSON_COL_WIDTH + gap) + PERSON_COL_WIDTH / 2);
      }
      const bloodlineIdx = members.findIndex((m) => bloodlineChildIds.has(m.id));
      const incomingOffsetX = bloodlineIdx >= 0 ? centers[bloodlineIdx] : centers[0];
      const heartX = (centers[0] + centers[1]) / 2;
      const heartY = AVATAR_SIZE / 2;

      return {
        width,
        height: NODE_HEIGHT,
        isCouple: true,
        heartX,
        heartY,
        incomingOffsetX,
        outgoingOffsetX: heartX,
        outgoingOffsetY: NODE_HEIGHT,
        personCentersX: centers,
      };
    };

    let globalXOffset = 0;
    const maxPossibleNodeWidth = 290;
    const siblingGap = 36;

    for (const rootId of activeRoots) {
      const rootData = buildTree(rootId);
      if (!rootData) continue;

      const d3Root = d3.hierarchy<HouseholdNodeData>(rootData);
      const treeLayout = d3
        .tree<HouseholdNodeData>()
        .nodeSize([maxPossibleNodeWidth + siblingGap, NODE_HEIGHT + VERTICAL_GAP]);

      treeLayout(d3Root);

      let localMinX = Infinity;
      let localMaxX = -Infinity;
      d3Root.each((d) => {
        const x = d.x ?? 0;
        if (x < localMinX) localMinX = x;
        if (x > localMaxX) localMaxX = x;
      });

      const shiftX = globalXOffset - localMinX;

      d3Root.each((d) => {
        const h = d.data.household;
        const members = d.data.members;
        const geom = getNodeGeometry(h, members);
        // Center node around d.x
        const posX = (d.x ?? 0) + shiftX + (maxPossibleNodeWidth - geom.width) / 2;
        const posY = d.y ?? 0;

        const childrenCount = childrenHouseholdMap.get(h.id)?.size || 0;

        positions.set(h.id, {
          x: posX,
          y: posY,
          width: geom.width,
          height: geom.height,
          household: h,
          members,
          isCouple: geom.isCouple,
          heartX: posX + geom.heartX,
          heartY: posY + geom.heartY,
          incomingX: posX + geom.incomingOffsetX,
          outgoingX: posX + geom.outgoingOffsetX,
          outgoingY: posY + geom.outgoingOffsetY,
          personCentersX: geom.personCentersX,
          hiddenDescendantsCount: descendantCountMap.get(h.id) || 0,
          hasChildren: childrenCount > 0,
        });
      });

      d3Root.links().forEach((link) => {
        const sourcePos = positions.get(link.source.data.id);
        const targetPos = positions.get(link.target.data.id);
        if (sourcePos && targetPos) {
          calculatedLinks.push({
            sourceX: sourcePos.outgoingX,
            sourceY: sourcePos.outgoingY,
            targetX: targetPos.incomingX,
            targetY: targetPos.y,
            color: targetPos.household.branch_color || '#94A3B8',
          });
        }
      });

      globalXOffset += (localMaxX - localMinX) + maxPossibleNodeWidth + HORIZONTAL_GAP * 2;
    }

    // Disconnected fallback (skip nodes intentionally hidden under collapsed parent branches)
    let disconnectedX = globalXOffset;
    for (const h of householdMap.values()) {
      if (!positions.has(h.id) && !hiddenByCollapse.has(h.id)) {
        const members = householdMembers.get(h.id) || [];
        const geom = getNodeGeometry(h, members);
        const childrenCount = childrenHouseholdMap.get(h.id)?.size || 0;
        positions.set(h.id, {
          x: disconnectedX,
          y: 0,
          width: geom.width,
          height: geom.height,
          household: h,
          members,
          isCouple: geom.isCouple,
          heartX: disconnectedX + geom.heartX,
          heartY: geom.heartY,
          incomingX: disconnectedX + geom.incomingOffsetX,
          outgoingX: disconnectedX + geom.outgoingOffsetX,
          outgoingY: geom.outgoingOffsetY,
          personCentersX: geom.personCentersX,
          hiddenDescendantsCount: descendantCountMap.get(h.id) || 0,
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
      Math.max(0.35, Math.min(clientWidth / treeW, availH / treeH)),
      1.05
    );

    const newX = (clientWidth - treeW * newScale) / 2 - minX * newScale + (isMobile ? 40 : 90) * newScale;
    const newY = topReserve + (availH - treeH * newScale) / 2 - minY * newScale + (isMobile ? 35 : 90) * newScale;

    setScale(newScale);
    setTranslate({ x: newX, y: newY });
  }, [nodePositions]);

  useEffect(() => {
    const timer = setTimeout(() => {
      resetFit();
    }, 80);
    return () => clearTimeout(timer);
  }, [resetFit]);

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.flowchart-node, button, a')) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - translate.x, y: e.clientY - translate.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setTranslate({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.92 : 1.08;
    const newScale = Math.min(Math.max(0.2, scale * zoomFactor), 2.2);
    setScale(newScale);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      if ((e.target as HTMLElement).closest('.flowchart-node, button, a')) return;
      setIsDragging(true);
      dragStart.current = {
        x: e.touches[0].clientX - translate.x,
        y: e.touches[0].clientY - translate.y,
      };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchDistance.current = Math.sqrt(dx * dx + dy * dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      setTranslate({
        x: e.touches[0].clientX - dragStart.current.x,
        y: e.touches[0].clientY - dragStart.current.y,
      });
    } else if (e.touches.length === 2 && touchDistance.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.sqrt(dx * dx + dy * dy);
      const ratio = newDist / touchDistance.current;
      const newScale = Math.min(Math.max(0.2, scale * ratio), 2.2);
      setScale(newScale);
      touchDistance.current = newDist;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchDistance.current = null;
  };

  const toggleCollapse = (hId: string) => {
    setCollapsedBranchIds((prev) => {
      const next = new Set(prev);
      if (next.has(hId)) next.delete(hId);
      else next.add(hId);
      return next;
    });
  };

  const handlePersonClick = (person: Person, household: Household) => {
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
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
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
      <div className="absolute top-3 left-3 right-3 sm:right-auto sm:top-4 sm:left-4 z-10 flex flex-col gap-2 max-w-full sm:max-w-sm pointer-events-none">
        <div className="bg-slate-900/95 backdrop-blur-xs text-white rounded-2xl px-3.5 py-2 sm:px-4 sm:py-3 shadow-lg flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3 pointer-events-auto">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Trees className="w-4 h-4 sm:w-5 sm:h-5 text-sky-300" />
            </div>
            <div className="min-w-0">
              <h2 className="font-extrabold text-xs sm:text-sm tracking-tight truncate">{tree.name}</h2>
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
        <div className="absolute top-16 sm:top-4 left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-20 bg-indigo-600 text-white shadow-xl rounded-2xl sm:rounded-full px-4 py-2 text-xs font-bold flex items-center justify-between sm:justify-center gap-3">
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
          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>{households.length <= 2 ? t.treeCanvasGuide : t.clickPersonHint}</span>
        </div>
      )}

      {/* Pan/Zoom Canvas Viewport */}
      <div
        className="absolute top-0 left-0 w-full h-full transform-gpu origin-top-left transition-transform duration-75"
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
        }}
      >
        {/* SVG Orthogonal Stepped Connection Lines */}
        <svg className="absolute top-0 left-0 w-[12000px] h-[12000px] pointer-events-none overflow-visible">
          {links.map((link, idx) => {
            // Compute clean orthogonal horizontal bus midway between outgoing parent point and child top
            const busY = link.targetY - VERTICAL_GAP * 0.48;
            const pathData = `M ${link.sourceX} ${link.sourceY} V ${busY} H ${link.targetX} V ${link.targetY}`;
            return (
              <g key={`link-${idx}`}>
                <path
                  d={pathData}
                  fill="none"
                  stroke="#94A3B8"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx={link.targetX} cy={link.targetY} r="3.5" fill={link.color || '#64748B'} />
              </g>
            );
          })}
        </svg>

        {/* Flowchart Nodes */}
        {Array.from(nodePositions.values()).map((node) => {
          const h = node.household;
          const members = node.members;
          const isCollapsed = collapsedBranchIds.has(h.id);
          const branchColor = h.branch_color || '#0F172A';

          return (
            <div
              key={h.id}
              style={{
                transform: `translate(${node.x}px, ${node.y}px)`,
                width: `${node.width}px`,
              }}
              className="flowchart-node group absolute top-0 left-0"
            >
              {/* Horizontal Spouse Heart Connector (when 2+ members) */}
              {node.isCouple && members.length >= 2 && (
                <>
                  <div
                    className="absolute h-[2px] bg-slate-300 pointer-events-none"
                    style={{
                      left: `${node.personCentersX[0]}px`,
                      width: `${node.personCentersX[1] - node.personCentersX[0]}px`,
                      top: `${AVATAR_SIZE / 2}px`,
                    }}
                  />
                  <div
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center z-10"
                    style={{
                      left: `${node.heartX - node.x}px`,
                      top: `${AVATAR_SIZE / 2}px`,
                    }}
                  >
                    <Heart
                      className="w-3.5 h-3.5"
                      style={{ color: branchColor, fill: branchColor }}
                    />
                  </div>
                </>
              )}

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
                    gap: node.isCouple && members.length === 2 ? `${COUPLE_GAP}px` : '28px',
                  }}
                >
                  {members.map((person) => {
                    const isSelf = person.id === activePersonId;
                    const isClaimed = person.claimed_device_id === deviceId;

                    return (
                      <div
                        key={person.id}
                        style={{ width: `${PERSON_COL_WIDTH}px` }}
                        className="flex flex-col items-center text-center"
                      >
                        {/* Circular Portrait */}
                        <button
                          type="button"
                          onClick={() => handlePersonClick(person, h)}
                          className={`relative rounded-full bg-white shadow-md hover:shadow-xl hover:scale-105 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-900 ${
                            compareSource?.person.id === person.id ? 'ring-4 ring-indigo-500 ring-offset-2' : ''
                          }`}
                          style={{
                            width: `${AVATAR_SIZE}px`,
                            height: `${AVATAR_SIZE}px`,
                            border: `3.5px solid ${branchColor}`,
                            padding: '2px',
                          }}
                          title={`${person.full_name} — ${t.clickPersonHint}`}
                        >
                          <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 flex items-center justify-center">
                            {person.avatar_b64 ? (
                              <img
                                src={person.avatar_b64}
                                alt={person.full_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xl font-extrabold text-slate-500">
                                {person.full_name.slice(0, 1).toUpperCase()}
                              </span>
                            )}
                          </div>

                          {/* Subtle You / Active Indicator */}
                          {(isSelf || isClaimed) && (
                            <span
                              className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-xs"
                              title={t.claimedByYou}
                            />
                          )}
                        </button>

                        {/* Name & Year Span (clickable to open details) */}
                        <button
                          type="button"
                          onClick={() => handlePersonClick(person, h)}
                          className="mt-2 px-1.5 py-0.5 rounded-lg hover:bg-white/90 transition-colors cursor-pointer max-w-full"
                        >
                          <p className="text-xs font-extrabold text-slate-900 leading-tight line-clamp-2">
                            {person.full_name}
                          </p>
                          <p
                            className="text-[10px] font-semibold mt-0.5 truncate"
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
                      ? `${AVATAR_SIZE / 2 + 22}px`
                      : `${NODE_HEIGHT - 8}px`,
                  }}
                >
                  {isCollapsed ? (
                    <>
                      <Plus className="w-3 h-3" />
                      <span>{node.hiddenDescendantsCount} {t.kidsCountLabel}</span>
                    </>
                  ) : (
                    <Minus className="w-3 h-3" />
                  )}
                </button>
              )}

              {/* Quick-Add Pill Bar (always visible on small trees <= 2 nodes, visible on hover otherwise) */}
              {members.length > 0 && (
                <div
                  className={`${node.hasChildren && isCollapsed ? 'mt-7' : 'mt-2'} flex items-center justify-center gap-1 transition-opacity duration-150 ${
                    households.length <= 2
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                  }`}
                >
                  <div className="bg-white/95 backdrop-blur-xs border border-slate-200 rounded-2xl sm:rounded-full px-2 py-1 shadow-md flex flex-wrap sm:flex-nowrap items-center justify-center gap-1 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => onOpenMemberModal(members[0], h, 'add_ancestor')}
                      className="px-1.5 py-0.5 text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {t.addAncestorsAbove}
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => onOpenMemberModal(members[0], h, 'add_spouse')}
                      className="px-1.5 py-0.5 text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {t.addSpouse}
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => onOpenMemberModal(members[0], h, 'add_sibling')}
                      className="px-1.5 py-0.5 text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {t.addSibling}
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => onOpenMemberModal(members[0], h, 'add_child')}
                      className="px-1.5 py-0.5 bg-slate-900 text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {t.addChildHousehold}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Canvas Zoom Controls */}
      <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 flex flex-col gap-1.5 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl p-1.5 shadow-lg z-10">
        <button
          type="button"
          onClick={() => setScale((s) => Math.min(2.2, s * 1.15))}
          title={t.zoomIn}
          className="p-2.5 sm:p-2 text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setScale((s) => Math.max(0.2, s * 0.85))}
          title={t.zoomOut}
          className="p-2.5 sm:p-2 text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="border-t border-slate-100 my-0.5" />
        <button
          type="button"
          onClick={resetFit}
          title={t.resetView}
          className="p-2.5 sm:p-2 text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Person Detail Modal (Address, Telephone, Connections, Actions) */}
      <PersonDetailModal
        person={detailTarget?.person || null}
        household={detailTarget?.household}
        allPersons={persons}
        allHouseholds={households}
        relationships={relationships}
        t={t}
        deviceId={deviceId}
        activePersonId={activePersonId}
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
