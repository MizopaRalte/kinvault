import { jsPDF } from 'jspdf';
import type { Household, Person, Relationship, Tree } from '../types/family';

interface NodeLayout {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  household: Household;
  members: Person[];
}

const MM_PER_PX = 0.264583;

// Convert Uint8Array to binary string safely for Base64 conversion
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Unlimited-width true bounding-box vector PDF export via jsPDF
 */
export async function exportTreeToPdf(
  tree: Tree,
  households: Household[],
  persons: Person[],
  relationships: Relationship[],
  nodeLayouts?: Map<string, { x: number; y: number; width: number; height: number }>
): Promise<void> {
  // 1. Group persons by household
  const householdMembersMap = new Map<string, Person[]>();
  for (const p of persons) {
    if (p.household_id) {
      const list = householdMembersMap.get(p.household_id) || [];
      list.push(p);
      householdMembersMap.set(p.household_id, list);
    }
  }

  // 2. Compute positions if not provided from canvas
  const CARD_WIDTH = 320;
  const CARD_BASE_HEIGHT = 160;

  const layouts: NodeLayout[] = [];

  if (nodeLayouts && nodeLayouts.size > 0) {
    for (const h of households) {
      const pos = nodeLayouts.get(h.id);
      const members = householdMembersMap.get(h.id) || [];
      if (pos) {
        layouts.push({
          id: h.id,
          x: pos.x,
          y: pos.y,
          width: pos.width || CARD_WIDTH,
          height: pos.height || CARD_BASE_HEIGHT,
          household: h,
          members,
        });
      }
    }
  }

  // Fallback layout if canvas nodes not passed
  if (layouts.length === 0) {
    let currentX = 50;
    let currentY = 50;
    const spacingX = 360;
    const spacingY = 240;
    let col = 0;
    const maxCols = 4;

    for (const h of households) {
      const members = householdMembersMap.get(h.id) || [];
      layouts.push({
        id: h.id,
        x: currentX + col * spacingX,
        y: currentY + Math.floor(layouts.length / maxCols) * spacingY,
        width: CARD_WIDTH,
        height: CARD_BASE_HEIGHT + members.length * 28,
        household: h,
        members,
      });
      col = (col + 1) % maxCols;
    }
  }

  // 3. Compute true bounding box
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const n of layouts) {
    if (n.x < minX) minX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.x + n.width > maxX) maxX = n.x + n.width;
    if (n.y + n.height > maxY) maxY = n.y + n.height;
  }

  if (!isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 800;
    maxY = 600;
  }

  const PADDING_PX = 100;
  const totalWidthPx = (maxX - minX) + PADDING_PX * 2;
  const totalHeightPx = (maxY - minY) + PADDING_PX * 2 + 80; // Extra for title banner

  const widthMm = Math.max(210, Math.ceil(totalWidthPx * MM_PER_PX));
  const heightMm = Math.max(297, Math.ceil(totalHeightPx * MM_PER_PX));

  // 4. Instantiate jsPDF with custom unlimited format
  const doc = new jsPDF({
    orientation: widthMm >= heightMm ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [widthMm, heightMm],
    compress: true,
  });

  // 5. Fetch and register NotoSans-Regular.ttf for universal glyphs
  try {
    const fontResponse = await fetch('/fonts/NotoSans-Regular.ttf');
    if (fontResponse.ok) {
      const fontBuffer = await fontResponse.arrayBuffer();
      const fontB64 = arrayBufferToBase64(fontBuffer);
      doc.addFileToVFS('NotoSans-Regular.ttf', fontB64);
      doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
      doc.setFont('NotoSans');
    }
  } catch (err) {
    console.warn('Could not load custom NotoSans font, using default helvetica:', err);
    doc.setFont('helvetica');
  }

  // 6. Draw Title Banner
  doc.setFillColor(15, 23, 42); // #0F172A
  doc.rect(0, 0, widthMm, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text(tree.name || 'KinVault Family Tree', 15, 14);

  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // #94A3B8
  const subtitle = `Invite Code: ${tree.invite_code}  •  Exported: ${new Date().toLocaleDateString()}`;
  doc.text(subtitle, 15, 20);

  // Offset transformation coordinates
  const offsetX = -minX + PADDING_PX;
  const offsetY = -minY + PADDING_PX + 80;

  // 7. Draw vector orthogonal connectors for parent_child relationships
  const householdByPersonMap = new Map<string, string>();
  for (const p of persons) {
    if (p.household_id) householdByPersonMap.set(p.id, p.household_id);
  }

  const layoutMap = new Map<string, NodeLayout>();
  for (const l of layouts) layoutMap.set(l.id, l);

  // Draw connections
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.6);

  for (const rel of relationships) {
    if (rel.rel_type === 'parent_child') {
      const parentHId = householdByPersonMap.get(rel.person_a_id);
      const childHId = householdByPersonMap.get(rel.person_b_id);

      if (parentHId && childHId && parentHId !== childHId) {
        const parentLayout = layoutMap.get(parentHId);
        const childLayout = layoutMap.get(childHId);

        if (parentLayout && childLayout) {
          const px = (parentLayout.x + parentLayout.width / 2 + offsetX) * MM_PER_PX;
          const py = (parentLayout.y + parentLayout.height + offsetY) * MM_PER_PX;
          const cx = (childLayout.x + childLayout.width / 2 + offsetX) * MM_PER_PX;
          const cy = (childLayout.y + offsetY) * MM_PER_PX;

          const midY = (py + cy) / 2;

          // Orthogonal stepped lines
          doc.line(px, py, px, midY);
          doc.line(px, midY, cx, midY);
          doc.line(cx, midY, cx, cy);
        }
      }
    }
  }

  // 8. Draw Household Cards
  for (const node of layouts) {
    const xMm = (node.x + offsetX) * MM_PER_PX;
    const yMm = (node.y + offsetY) * MM_PER_PX;
    const wMm = node.width * MM_PER_PX;
    const hMm = node.height * MM_PER_PX;

    // Card white background & border
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240); // #E2E8F0
    doc.setLineWidth(0.4);
    doc.roundedRect(xMm, yMm, wMm, hMm, 2.5, 2.5, 'FD');

    // Left accent border with branch_color
    const hex = node.household.branch_color || '#0F172A';
    const r = parseInt(hex.slice(1, 3) || '0F', 16);
    const g = parseInt(hex.slice(3, 5) || '17', 16);
    const b = parseInt(hex.slice(5, 7) || '2A', 16);

    doc.setFillColor(r, g, b);
    doc.roundedRect(xMm, yMm, 2.5, hMm, 1.2, 1.2, 'F');

    // Household header title
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(node.household.family_name || 'Family Household', xMm + 5, yMm + 7);

    // City / Country subtitle
    const locationParts = [node.household.city, node.household.country].filter(Boolean);
    if (locationParts.length > 0) {
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(locationParts.join(', '), xMm + 5, yMm + 12);
    }

    // Divider line
    doc.setDrawColor(241, 245, 249);
    doc.line(xMm + 5, yMm + 15, xMm + wMm - 4, yMm + 15);

    // Members list
    let memberY = yMm + 20;
    doc.setFontSize(8.5);

    for (const m of node.members) {
      doc.setTextColor(15, 23, 42);
      const name = m.full_name + (m.nickname_or_maiden ? ` (${m.nickname_or_maiden})` : '');
      doc.text(name, xMm + 5, memberY);

      // Status / Dates
      let info = '';
      if (m.birth_year || m.death_year) {
        info += `${m.birth_year || '?'}-${m.death_year || (m.is_living ? 'pres.' : '?')}`;
      }
      if (m.phone_e164) {
        info += (info ? ' • ' : '') + m.phone_e164;
      }

      if (info) {
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(info, xMm + 5, memberY + 4);
      }

      memberY += 9;
      doc.setFontSize(8.5);
    }
  }

  // 9. Trigger download
  const cleanName = (tree.name || 'family').toLowerCase().replace(/[^a-z0-9]/g, '-');
  doc.save(`${cleanName}-tree.pdf`);
}
