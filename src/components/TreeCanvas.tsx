import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import * as d3 from 'd3-hierarchy';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Plus,
  Users,
  MapPin,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Edit2,
  Camera,
} from 'lucide-react';
import type { Household, Person, Relationship, Tree, Role } from '../types/family';
import type { TranslationDictionary } from '../locales/translations';

interface TreeCanvasProps {
  tree: Tree;
  households: Household[];
  persons: Person[];
  relationships: Relationship[];
  t: TranslationDictionary;
  activePersonId?: string;
  userRole?: Role;
  onOpenMemberModal: (person?: Person, household?: Household, initialMode?: string) => void;
  onLayoutCalculated?: (layouts: Map<string, { x: number; y: number; width: number; height: number }>) => void;
}

interface HouseholdNodeData {
  id: string;
  household: Household;
  members: Person[];
  children?: HouseholdNodeData[];
}

export const TreeCanvas: React.FC<TreeCanvasProps> = ({
  tree: _tree,
  households,
  persons,
  relationships,
  t,
  activePersonId,
  userRole: _userRole,
  onOpenMemberModal,
  onLayoutCalculated,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Transform state: pan & zoom
  const [scale, setScale] = useState(0.85);
  const [translate, setTranslate] = useState({ x: 200, y: 120 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Touch pinch-to-zoom state
  const touchDistance = useRef<number | null>(null);

  // Collapsed branches state: set of household IDs whose children are hidden
  const [collapsedBranchIds, setCollapsedBranchIds] = useState<Set<string>>(new Set());

  // Quick photo preview modal
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

  // Build hierarchy of households using parent_child relationships
  const { nodePositions, links } = useMemo(() => {
    const householdMap = new Map<string, Household>();
    for (const h of households) {
      householdMap.set(h.id, h);
    }

    // Determine parent households -> child households
    const childrenHouseholdMap = new Map<string, Set<string>>();
    const parentHouseholdMap = new Map<string, Set<string>>();

    for (const rel of relationships) {
      if (rel.rel_type === 'parent_child') {
        const parentH = personToHousehold.get(rel.person_a_id);
        const childH = personToHousehold.get(rel.person_b_id);
        if (parentH && childH && parentH !== childH) {
          const children = childrenHouseholdMap.get(parentH) || new Set();
          children.add(childH);
          childrenHouseholdMap.set(parentH, children);

          const parents = parentHouseholdMap.get(childH) || new Set();
          parents.add(parentH);
          parentHouseholdMap.set(childH, parents);
        }
      }
    }

    // Root households are those with no parent household in the tree
    const rootHouseholdIds: string[] = [];
    for (const h of households) {
      const parents = parentHouseholdMap.get(h.id);
      if (!parents || parents.size === 0) {
        rootHouseholdIds.push(h.id);
      }
    }

    // If there are cycles or all have parents (rare), fallback to first household
    if (rootHouseholdIds.length === 0 && households.length > 0) {
      rootHouseholdIds.push(households[0].id);
    }

    const positions = new Map<
      string,
      { x: number; y: number; width: number; height: number; household: Household; members: Person[] }
    >();
    const calculatedLinks: Array<{ sourceX: number; sourceY: number; targetX: number; targetY: number }> = [];

    const CARD_WIDTH = 340;
    const CARD_HEADER_HEIGHT = 80;
    const MEMBER_ROW_HEIGHT = 48;
    const HORIZONTAL_GAP = 70;
    const VERTICAL_GAP = 120;

    // Helper to build recursive node data
    const visited = new Set<string>();
    function buildTree(hId: string): HouseholdNodeData | null {
      if (visited.has(hId)) return null;
      visited.add(hId);

      const h = householdMap.get(hId);
      if (!h) return null;

      const members = householdMembers.get(hId) || [];
      const isCollapsed = collapsedBranchIds.has(hId);

      const childIds = isCollapsed ? [] : Array.from(childrenHouseholdMap.get(hId) || []);
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

    // Lay out trees side by side for each root
    let globalXOffset = 0;

    for (const rootId of rootHouseholdIds) {
      const rootData = buildTree(rootId);
      if (!rootData) continue;

      const d3Root = d3.hierarchy<HouseholdNodeData>(rootData);
      const treeLayout = d3
        .tree<HouseholdNodeData>()
        .nodeSize([CARD_WIDTH + HORIZONTAL_GAP, 240 + VERTICAL_GAP]);

      treeLayout(d3Root);

      // Find local minX to normalize
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
        const cardHeight = CARD_HEADER_HEIGHT + members.length * MEMBER_ROW_HEIGHT + 40;
        const posX = (d.x ?? 0) + shiftX;
        const posY = d.y ?? 0;

        positions.set(h.id, {
          x: posX,
          y: posY,
          width: CARD_WIDTH,
          height: cardHeight,
          household: h,
          members,
        });
      });

      // Compute connection links
      d3Root.links().forEach((link) => {
        const sourcePos = positions.get(link.source.data.id);
        const targetPos = positions.get(link.target.data.id);
        if (sourcePos && targetPos) {
          calculatedLinks.push({
            sourceX: sourcePos.x + sourcePos.width / 2,
            sourceY: sourcePos.y + sourcePos.height,
            targetX: targetPos.x + targetPos.width / 2,
            targetY: targetPos.y,
          });
        }
      });

      globalXOffset += (localMaxX - localMinX) + CARD_WIDTH + HORIZONTAL_GAP * 2;
    }

    // Also include any households that were not visited (disconnected singletons)
    let disconnectedX = globalXOffset;
    for (const h of households) {
      if (!positions.has(h.id)) {
        const members = householdMembers.get(h.id) || [];
        const cardHeight = CARD_HEADER_HEIGHT + members.length * MEMBER_ROW_HEIGHT + 40;
        positions.set(h.id, {
          x: disconnectedX,
          y: 0,
          width: CARD_WIDTH,
          height: cardHeight,
          household: h,
          members,
        });
        disconnectedX += CARD_WIDTH + HORIZONTAL_GAP;
      }
    }

    return { nodePositions: positions, links: calculatedLinks };
  }, [households, relationships, personToHousehold, householdMembers, collapsedBranchIds]);

  // Report layout back to parent for PDF exporter
  useEffect(() => {
    if (onLayoutCalculated) {
      const simplified = new Map<string, { x: number; y: number; width: number; height: number }>();
      nodePositions.forEach((val, key) => {
        simplified.set(key, { x: val.x, y: val.y, width: val.width, height: val.height });
      });
      onLayoutCalculated(simplified);
    }
  }, [nodePositions, onLayoutCalculated]);

  // Reset view to fit all cards cleanly
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

    const treeW = maxX - minX + 160;
    const treeH = maxY - minY + 160;

    const newScale = Math.min(
      Math.max(0.35, Math.min(clientWidth / treeW, clientHeight / treeH)),
      1.1
    );

    const newX = (clientWidth - treeW * newScale) / 2 - minX * newScale + 80 * newScale;
    const newY = (clientHeight - treeH * newScale) / 2 - minY * newScale + 80 * newScale;

    setScale(newScale);
    setTranslate({ x: newX, y: newY });
  }, [nodePositions]);

  // Initial fit on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      resetFit();
    }, 100);
    return () => clearTimeout(timer);
  }, [resetFit]);

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag on canvas background
    if ((e.target as HTMLElement).closest('.household-card')) return;
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

  // Wheel zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.min(Math.max(0.2, scale * zoomFactor), 2.5);

    // Zoom towards mouse position
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newTranslateX = mouseX - (mouseX - translate.x) * (newScale / scale);
      const newTranslateY = mouseY - (mouseY - translate.y) * (newScale / scale);

      setScale(newScale);
      setTranslate({ x: newTranslateX, y: newTranslateY });
    }
  };

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.household-card')) return;
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStart.current = {
        x: e.touches[0].clientX - translate.x,
        y: e.touches[0].clientY - translate.y,
      };
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchDistance.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      setTranslate({
        x: e.touches[0].clientX - dragStart.current.x,
        y: e.touches[0].clientY - dragStart.current.y,
      });
    } else if (e.touches.length === 2 && touchDistance.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = dist / touchDistance.current;
      touchDistance.current = dist;
      setScale((prev) => Math.min(Math.max(0.25, prev * delta), 2.5));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchDistance.current = null;
  };

  const toggleCollapse = (hId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedBranchIds((prev) => {
      const next = new Set(prev);
      if (next.has(hId)) next.delete(hId);
      else next.add(hId);
      return next;
    });
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
      className={`relative w-full h-[calc(100vh-64px)] overflow-hidden bg-slate-100/70 select-none ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      style={{
        backgroundImage: `radial-gradient(#CBD5E1 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
      }}
    >
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
            const midY = (link.sourceY + link.targetY) / 2;
            const pathData = `M ${link.sourceX} ${link.sourceY} V ${midY} H ${link.targetX} V ${link.targetY}`;
            return (
              <g key={`link-${idx}`}>
                <path
                  d={pathData}
                  fill="none"
                  stroke="#94A3B8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx={link.targetX} cy={link.targetY} r="4" fill="#64748B" />
              </g>
            );
          })}
        </svg>

        {/* Household Cards */}
        {Array.from(nodePositions.values()).map((node) => {
          const h = node.household;
          const members = node.members;
          const isCollapsed = collapsedBranchIds.has(h.id);

          return (
            <div
              key={h.id}
              className="household-card absolute bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow group flex flex-col cursor-default"
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                width: `${node.width}px`,
                borderLeft: `5px solid ${h.branch_color || '#0F172A'}`,
              }}
            >
              {/* Card Header */}
              <div className="p-3.5 pb-2 border-b border-slate-100 flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: h.branch_color || '#0F172A' }}
                    />
                    <h3 className="font-bold text-slate-900 text-sm truncate tracking-tight">
                      {h.family_name}
                    </h3>
                  </div>

                  {(h.city || h.country) && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium mt-1 truncate">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{[h.city, h.country].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {h.family_photo_b64 && (
                    <button
                      type="button"
                      onClick={() => setPreviewPhoto(h.family_photo_b64 || null)}
                      title="View Family Photo"
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onOpenMemberModal(undefined, h, 'edit_household')}
                    title={t.editHousehold}
                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => toggleCollapse(h.id, e)}
                    title={isCollapsed ? t.expandBranch : t.collapseBranch}
                    className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-sky-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Members List */}
              <div className="p-3 divide-y divide-slate-100 flex-1">
                {members.length === 0 ? (
                  <div className="py-2 text-center text-xs text-slate-400 italic">
                    No members in household
                  </div>
                ) : (
                  members.map((person) => {
                    const isSelf = person.id === activePersonId;
                    const isSuperAdmin = person.role === 'super_admin';
                    const isBranchAdmin = person.role === 'branch_admin';

                    return (
                      <div
                        key={person.id}
                        onClick={() => onOpenMemberModal(person, h, 'edit_person')}
                        className="py-2 first:pt-1 last:pb-1 flex items-center justify-between gap-2.5 rounded-lg px-2 -mx-1 hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Avatar */}
                          <div className="relative w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center overflow-hidden shrink-0">
                            {person.avatar_b64 ? (
                              <img
                                src={person.avatar_b64}
                                alt={person.full_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs font-bold text-slate-600">
                                {person.full_name.slice(0, 1).toUpperCase()}
                              </span>
                            )}
                            {/* Living / Deceased indicator dot */}
                            <span
                              className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white ${
                                person.is_living ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                              title={person.is_living ? t.living : t.deceased}
                            />
                          </div>

                          {/* Names & Dates */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 leading-tight">
                              <span className="text-xs font-semibold text-slate-900 truncate">
                                {person.full_name}
                              </span>
                              {person.nickname_or_maiden && (
                                <span className="text-[11px] text-slate-400 truncate">
                                  ({person.nickname_or_maiden})
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                              {(person.birth_year || person.death_year) && (
                                <span>
                                  {person.birth_year ? `b. ${person.birth_year}` : ''}
                                  {person.death_year ? ` • d. ${person.death_year}` : ''}
                                </span>
                              )}
                              {person.phone_e164 && (
                                <span className="text-slate-400 truncate max-w-[100px]">
                                  {person.phone_e164}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="flex items-center gap-1 shrink-0">
                          {isSelf && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[9px] font-bold">
                              <UserCheck className="w-2.5 h-2.5" />
                              {t.claimedByYou}
                            </span>
                          )}
                          {isSuperAdmin && (
                            <span
                              title={t.superAdminBadge}
                              className="p-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-md"
                            >
                              <ShieldAlert className="w-3 h-3" />
                            </span>
                          )}
                          {isBranchAdmin && (
                            <span
                              title={t.branchAdminBadge}
                              className="p-1 bg-sky-50 text-sky-700 border border-sky-200 rounded-md"
                            >
                              <ShieldCheck className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick Actions Footer */}
              <div className="p-2 bg-slate-50/70 border-t border-slate-100 rounded-b-2xl flex items-center justify-between text-[11px] gap-1 font-medium">
                <button
                  type="button"
                  onClick={() => onOpenMemberModal(members[0], h, 'add_ancestor')}
                  className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors flex items-center gap-1"
                  title="Add parents / ancestors above this household"
                >
                  <Plus className="w-3 h-3 text-slate-500" />
                  {t.addAncestorsAbove}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onOpenMemberModal(undefined, h, 'add_spouse')}
                    className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors flex items-center gap-1"
                  >
                    {t.addSpouse}
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenMemberModal(members[0], h, 'add_child')}
                    className="px-2 py-1 bg-slate-900 text-white hover:bg-slate-800 rounded transition-colors flex items-center gap-1 font-semibold"
                  >
                    <Plus className="w-3 h-3" />
                    {t.addChildHousehold}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Canvas Controls */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-1.5 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl p-1.5 shadow-lg z-10">
        <button
          type="button"
          onClick={() => setScale((s) => Math.min(s * 1.2, 2.5))}
          title={t.zoomIn}
          className="p-2.5 text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => setScale((s) => Math.max(s * 0.8, 0.2))}
          title={t.zoomOut}
          className="p-2.5 text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <div className="h-px bg-slate-200 my-0.5" />
        <button
          type="button"
          onClick={resetFit}
          title={t.resetView}
          className="p-2.5 text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Empty State Help Overlay if no households */}
      {households.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-md max-w-sm text-center">
            <Users className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h4 className="font-bold text-slate-800 text-sm">No Households Yet</h4>
            <p className="text-xs text-slate-500 mt-1">
              Start by creating or adding members to build your family tree.
            </p>
          </div>
        </div>
      )}

      {/* Full Photo Modal Preview */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-black rounded-2xl overflow-hidden shadow-2xl">
            <img
              src={previewPhoto}
              alt="Family Group Photo"
              className="w-full h-full object-contain max-h-[85vh]"
            />
          </div>
        </div>
      )}
    </div>
  );
};
