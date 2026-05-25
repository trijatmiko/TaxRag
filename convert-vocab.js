const fs = require('fs');
const path = require('path');

const htmlPath = 'c:/tax-rag/vocabulary-lab.html';
const html = fs.readFileSync(htmlPath, 'utf8');

// Extract <style> tag
const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
const styles = styleMatch ? styleMatch[1] : '';

// Extract <body> content
const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
let bodyContent = bodyMatch ? bodyMatch[1] : '';

// Extract inline <script> tag
const scriptMatch = bodyContent.match(/<script>([\s\S]*?)<\/script>/);
let scriptContent = scriptMatch ? scriptMatch[1] : '';

// Remove script from body
bodyContent = bodyContent.replace(/<script>[\s\S]*?<\/script>/g, '');

// Adjust script endpoints and authentication
scriptContent = scriptContent
  .replace(
    /const WEBHOOK_BASE = '.*?';/,
    "const WEBHOOK_BASE = process.env.NEXT_PUBLIC_N8N_BASE_URL || 'http://localhost:5678/webhook';"
  )
  .replace(
    /const CURRENT_USER_ID = '.*?';/,
    "const CURRENT_USER_ID = getCurrentUserId() || '86b04bfc-e6b7-4265-bcc9-3ef949eba7c3';"
  );

// Convert HTML to JSX
let jsx = bodyContent
  .replace(/class=/g, 'className=')
  .replace(/for=/g, 'htmlFor=')
  .replace(/<img([^>]*?)>/g, (match, p1) => {
    if (p1.trim().endsWith('/')) return match;
    return '<img' + p1 + ' />';
  })
  .replace(/<input([^>]*?)>/g, (match, p1) => {
    if (p1.trim().endsWith('/')) return match;
    return '<input' + p1 + ' />';
  })
  .replace(/<br([^>]*?)>/g, (match, p1) => {
    if (p1.trim().endsWith('/')) return match;
    return '<br' + p1 + ' />';
  })
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/hidden=""/g, 'hidden')
  .replace(/disabled=""/g, 'disabled');

// Convert inline onclick="fn()" -> onClick={() => window.fn()}
const evAttrMap = {
  onclick: 'onClick',
  onchange: 'onChange',
  oninput: 'onInput',
  ondragover: 'onDragOver',
  ondragleave: 'onDragLeave',
  ondrop: 'onDrop',
  onerror: 'onError',
};

for (const [attr, prop] of Object.entries(evAttrMap)) {
  const regex = new RegExp(attr + '="([^"]*)"', 'gi');
  jsx = jsx.replace(regex, (match, code) => {
    // wrap in arrow fn forwarding event
    // replace this -> event.currentTarget
    code = code.replace(/\bthis\b/g, 'event.currentTarget');
    return prop + '={(event) => { ' + code + ' }}';
  });
}

// Inline style strings -> JSX style objects
jsx = jsx.replace(/style="([^"]*)"/g, (match, styleStr) => {
  const obj = {};
  styleStr.split(';').forEach(rule => {
    const colonIdx = rule.indexOf(':');
    if (colonIdx === -1) return;
    let key = rule.substring(0, colonIdx).trim();
    let value = rule.substring(colonIdx + 1).trim();
    if (!key) return;
    // camelCase
    key = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    obj[key] = value;
  });
  return 'style={' + JSON.stringify(obj) + '}';
});

// Escape backticks in styles for embedding
const safeStyles = styles.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${');

// Build the exposed window functions block
const exposeBlock = [
  'markMastered', 'openDetailModal', 'closeDetailModal',
  'openAddWordModal', 'closeAddWordModal', 'submitNewWord',
  'exportVocab', 'openEditModal', 'closeEditModal', 'submitEditWord',
  'confirmDelete', 'closeDeleteModal', 'executeDelete',
  'retryFetch', 'goPage', 'setViewMode',
  'openImportModal', 'closeImportModal',
  'handleAnkiDrop', 'handleAnkiFile', 'clearImport', 'startImport'
];

const exposeLines = exposeBlock.map(fn =>
  '      if (typeof ' + fn + ' !== "undefined") window.' + fn + ' = ' + fn + ';'
).join('\n');

const cleanupLines = exposeBlock.map(fn =>
  '      delete window.' + fn + ';'
).join('\n');

// Compose final page.tsx output
const output =
'// @ts-nocheck\n' +
"'use client';\n" +
"import { useEffect, useRef } from 'react';\n" +
"import { useRouter } from 'next/navigation';\n" +
"import { getCurrentUserId, useSession } from '@/hooks/useSession';\n" +
'\n' +
'export default function VocabularyPage() {\n' +
'  const router = useRouter();\n' +
'  const { clearSession } = useSession();\n' +
'  const hasMounted = useRef(false);\n' +
'\n' +
'  useEffect(() => {\n' +
'    if (hasMounted.current) return;\n' +
'    hasMounted.current = true;\n' +
'\n' +
'    if (!getCurrentUserId()) {\n' +
"      router.push('/login');\n" +
'    }\n' +
'\n' +
'    ' + scriptContent + '\n' +
'\n' +
'    // Expose vanilla-JS functions to window so inline JSX onClick can call them\n' +
exposeLines + '\n' +
'\n' +
'    // Attach logout link to Next.js router\n' +
"    const logoutBtns = Array.from(document.querySelectorAll('a')).filter(el => el.textContent.includes('Logout'));\n" +
'    logoutBtns.forEach(btn => {\n' +
'      btn.addEventListener("click", (e) => {\n' +
'        e.preventDefault();\n' +
'        clearSession();\n' +
"        router.push('/login');\n" +
'      });\n' +
'    });\n' +
'\n' +
'    return () => {\n' +
cleanupLines + '\n' +
'    };\n' +
'  }, [router, clearSession]);\n' +
'\n' +
'  return (\n' +
'    <>\n' +
'      <style dangerouslySetInnerHTML={{ __html: `' + safeStyles + '` }} />\n' +
jsx + '\n' +
'    </>\n' +
'  );\n' +
'}\n';

const targetDir = 'c:/tax-rag/speakup-frontend/app/dashboard/vocabulary';
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const targetPath = path.join(targetDir, 'page.tsx');
fs.writeFileSync(targetPath, output, 'utf8');
console.log('Conversion complete! File written to: ' + targetPath);
