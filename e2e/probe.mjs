// Dev helper: open a page as a user and print the controls of the first dialog (or the page). Usage: node e2e/probe.mjs <email> <path> [clickText]
import { openActor, sleep } from "./driver.mjs";
const [email, path, click] = process.argv.slice(2);
const A = await openActor({ name: "probe", port: 9449, headed: false });
try {
  await A.login(email);
  await A.goto(path, 2500);
  if (click) { await A.click(click); await sleep(1000); }
  const info = await A.eval(`(()=>{const NL=String.fromCharCode(10);const sc=document.querySelector('dialog[open]')||document.querySelector('main')||document;return [...sc.querySelectorAll('label,input,textarea,select,button,[role=checkbox],[role=switch]')].filter(e=>e.offsetParent!==null).map(e=>e.tagName.toLowerCase()+(e.type?'['+e.type+']':'')+(e.id?'#'+e.id.slice(-6):'')+(e.htmlFor?' for='+e.htmlFor.slice(-6):'')+' '+((e.innerText||e.placeholder||e.getAttribute('aria-label')||'')+'').slice(0,50).split(NL).join(' ')).join(NL)})()`);
  console.log(info);
} finally { await A.close(); setTimeout(() => process.exit(0), 300); }
