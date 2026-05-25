const fs = require('fs');
const html = fs.readFileSync('c:/tax-rag/index.html', 'utf8');

const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
const styles = styleMatch ? styleMatch[1] : '';

const bodyMatch = html.match(/<body>([\s\S]*?)<\/body>/);
let bodyContent = bodyMatch ? bodyMatch[1] : '';

const scriptMatch = bodyContent.match(/<script>([\s\S]*?)<\/script>/);
let scriptContent = scriptMatch ? scriptMatch[1] : '';

// Remove script from body
bodyContent = bodyContent.replace(/<script>[\s\S]*?<\/script>/, '');

// Convert HTML to JSX
let jsx = bodyContent
  .replace(/class=/g, 'className=')
  .replace(/for=/g, 'htmlFor=')
  .replace(/style=\"(.*?)\"/g, (match, p1) => {
    const styleObj = {};
    p1.split(';').forEach(rule => {
      const parts = rule.split(':');
      if (parts.length === 2) {
        let key = parts[0].trim();
        const value = parts[1].trim();
        key = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        styleObj[key] = value;
      }
    });
    return 'style={' + JSON.stringify(styleObj) + '}';
  })
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/<img([^>]*?)>/g, (match, p1) => {
    if (p1.endsWith('/')) return match;
    return `<img${p1} />`;
  })
  .replace(/<input([^>]*?)>/g, (match, p1) => {
    if (p1.endsWith('/')) return match;
    return `<input${p1} />`;
  })
  .replace(/<br([^>]*?)>/g, (match, p1) => {
    if (p1.endsWith('/')) return match;
    return `<br${p1} />`;
  })
  .replace(/hidden=\"\"/g, 'hidden')
  .replace(/disabled=\"\"/g, 'disabled');

// Adjust script URLs and identifiers
scriptContent = scriptContent
  .replace(/const DUMMY_USER_ID = '.*';/, "const DUMMY_USER_ID = getCurrentUserId() || '86b04bfc-e6b7-4265-bcc9-3ef949eba7c3';")
  .replace(/const N8N_BASE_URL = .*?;/, "const N8N_BASE_URL = process.env.NEXT_PUBLIC_N8N_BASE_URL || 'http://localhost:5678/webhook';")
  .replace(/const VOCAB_DASHBOARD_SYNC_URL = .*?;/, "const VOCAB_DASHBOARD_SYNC_URL = `${N8N_BASE_URL}/vocab/sync-dashboard`;")
  .replace(/const VOCAB_DASHBOARD_PULL_URL = .*?;/, "const VOCAB_DASHBOARD_PULL_URL = `${N8N_BASE_URL}/vocab/pull-dashboard`;")
  .replace(/const USER_PROFILE_URL = .*?;/, "const USER_PROFILE_URL = `${N8N_BASE_URL}/user/profile`;")
  .replace(/\.\/frontend\/public\/sounds/g, "/sounds");

const output = `'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUserId, useSession } from '@/hooks/useSession';

export default function LessonPage() {
  const router = useRouter();
  const { clearSession } = useSession();
  const hasMounted = useRef(false);

  useEffect(() => {
    if (hasMounted.current) return;
    hasMounted.current = true;

    if (!getCurrentUserId()) {
      router.push('/login');
      // return; // Keep running if we want to preview without login, but Next.js router.push might take a bit.
    }

    ${scriptContent}

    // Attach external logout to Next.js router
    const logoutBtn = Array.from(document.querySelectorAll('.profile-menu-item')).find(el => el.textContent.includes('Logout'));
    if (logoutBtn) {
       logoutBtn.addEventListener('click', (e) => {
           e.preventDefault();
           clearSession();
           router.push('/login');
       });
    }

  }, [router, clearSession]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: \`${styles.replace(/`/g, '\\`')}\` }} />
      ${jsx}
    </>
  );
}
`;

fs.writeFileSync('c:/tax-rag/speakup-frontend/app/dashboard/lesson/page.tsx', output, 'utf8');
console.log('Conversion complete!');
