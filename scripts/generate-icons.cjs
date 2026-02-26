/**
 * Reads Lance App Icons CSV and generates src/components/icons.tsx
 * Run: node scripts/generate-icons.js
 * CSV path: same folder as this script or pass as first arg.
 */

const fs = require('fs');
const path = require('path');

const CSV_PATH = process.argv[2] || path.join(__dirname, '../Lance App Icons - Sheet1.csv');
const OUT_PATH = path.join(__dirname, '../src/components/icons.tsx');

// All icon names the app uses (from lucide-react)
const APP_ICON_NAMES = [
  'AlertCircle', 'AlertTriangle', 'ArrowLeft', 'ArrowRight', 'BarChart3', 'Bell', 'BookOpen', 'Briefcase',
  'Building2', 'Calendar', 'CalendarIcon', 'Camera', 'Check', 'CheckCircle', 'CheckCircle2', 'CheckCheck',
  'ChevronDown', 'ChevronLeft', 'ChevronRight', 'ChevronUp', 'Circle', 'Code2', 'Copy', 'Crown',
  'DollarSign', 'Dot', 'Download', 'Edit', 'ExternalLink', 'Eye', 'EyeOff', 'FileText', 'Filter',
  'Folder', 'FolderKanban', 'FolderOpen', 'FolderPlus', 'GripVertical', 'Grid', 'HardDrive', 'HelpCircle',
  'Image', 'LayoutDashboard', 'LayoutGrid', 'Lightbulb', 'List', 'ListTodo', 'Loader2', 'LogOut',
  'Mail', 'Megaphone', 'Menu', 'MessageCircle', 'MessageSquare', 'MoreHorizontal', 'MoreVertical',
  'PanelLeft', 'Paperclip', 'Pencil', 'Phone', 'Play', 'Plus', 'Printer', 'RotateCcw', 'Save', 'Search',
  'Send', 'Settings', 'Settings2', 'ShieldCheck', 'Sparkles', 'Square', 'Trash2', 'Upload', 'User', 'Users',
  'Wallet', 'X', 'XCircle', 'ZoomIn', 'ZoomOut', 'CreditCard', 'Globe', 'Palette', 'Timer',
  'CheckSquare', 'PlayCircle'
];

function parseCSV(raw) {
  const rows = [];
  const lines = raw.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const m = line.match(/^([A-Za-z0-9_]+),(.*)$/);
    if (!m) { i++; continue; }
    const name = m[1];
    let val = m[2];
    if (val.startsWith('"')) {
      val = val.slice(1);
      while (i < lines.length && !val.replace(/""/g, '\x00').endsWith('"')) {
        i++;
        if (i < lines.length) val += '\n' + lines[i];
      }
      val = val.replace(/"$/, '').replace(/""/g, '"').trim();
    }
    rows.push({ name, value: val });
    i++;
  }
  return rows;
}

function isKeep(value) {
  if (!value || value.trim().startsWith('<svg')) return false;
  return /keep|use current|use same|Use same|same as|^Edit$/i.test(value);
}

function extractInnerSVG(svgString) {
  const match = svgString.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
  if (!match) return svgString;
  return match[1]
    .replace(/fill="#000000"/gi, 'fill="currentColor"')
    .replace(/fill-rule=/g, 'fillRule=')
    .replace(/clip-rule=/g, 'clipRule=')
    .replace(/stroke-width=/g, 'strokeWidth=');
}

function main() {
  let raw;
  try {
    raw = fs.readFileSync(CSV_PATH, 'utf8');
  } catch (e) {
    console.error('CSV not found at', CSV_PATH);
    console.error('Run: node scripts/generate-icons.js "/path/to/Lance App Icons - Sheet1.csv"');
    process.exit(1);
  }

  const rows = parseCSV(raw);
  const byName = {};
  rows.forEach(r => { byName[r.name] = r; });

  const keepFromLucide = new Set();
  const customSVG = {};

  APP_ICON_NAMES.forEach(name => {
    if (name === 'CalendarIcon') {
      keepFromLucide.add(name);
      return;
    }
    if (name === 'PlayCircle') {
      keepFromLucide.add(name);
      return;
    }
    if (name === 'CheckSquare') {
      keepFromLucide.add(name);
      return;
    }
    const row = byName[name];
    if (!row) {
      keepFromLucide.add(name);
      return;
    }
    if (isKeep(row.value)) {
      keepFromLucide.add(name);
      return;
    }
    const valTrim = row.value.replace(/^"+/, '').trim();
    if (valTrim.startsWith('<svg') || row.value.includes('<svg')) {
      customSVG[name] = extractInnerSVG(row.value.replace(/^"+/, ''));
    } else {
      keepFromLucide.add(name);
    }
  });

  // CalendarIcon: use same as Calendar
  if (customSVG['Calendar']) customSVG['CalendarIcon'] = customSVG['Calendar'];
  else keepFromLucide.add('CalendarIcon');

  let lucideExports = APP_ICON_NAMES.filter(n => keepFromLucide.has(n) && !customSVG[n]);
  const customNames = Object.keys(customSVG);
  // Ensure every app icon is either custom or re-exported from lucide
  const missing = APP_ICON_NAMES.filter(n => !customSVG[n] && !lucideExports.includes(n));
  if (missing.length) {
    lucideExports = [...new Set([...lucideExports, ...missing])];
  }

  let out = `/**
 * Central icon barrel. Custom Streamline icons + re-exports from lucide-react.
 * To revert to Lucide only: change all "from '@/components/icons'" back to "from 'lucide-react'".
 */
import * as React from 'react';
import {
  ${lucideExports.join(',\n  ')}
} from 'lucide-react';\n\n`;

  customNames.forEach(name => {
    const inner = customSVG[name];
    const escaped = JSON.stringify(inner);
    out += `const ${name}Inner = ${escaped};\n`;
    out += `export function ${name}({ className, ...props }: React.SVGAttributes<SVGSVGElement>) {\n`;
    out += `  return (\n`;
    out += `    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14" className={className} {...props} dangerouslySetInnerHTML={{ __html: ${name}Inner }} />\n`;
    out += `  );\n}\n\n`;
  });

  out += `export {\n  ${lucideExports.join(',\n  ')}\n};\n`;

  fs.writeFileSync(OUT_PATH, out, 'utf8');
  console.log('Wrote', OUT_PATH);
  console.log('Custom icons:', customNames.length);
  console.log('From lucide:', lucideExports.length);
}

main();
