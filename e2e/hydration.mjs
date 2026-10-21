// Dev helper: load pages as a user and print browser errors (hydration mismatches etc.). Usage: node e2e/hydration.mjs <email> <path> [<path>...]
import { openActor, sleep } from "./driver.mjs";
const [email, ...paths] = process.argv.slice(2);
const A = await openActor({ name: "hyd", port: 9448, headed: false });
try {
  await A.login(email);
  console.log('after login at', await A.path(), '->', A.problems.length ? A.problems.map((x) => x.slice(0, 1200)).join(' || ') : 'ok');
  for (const p of paths) {
    A.problems.length = 0;
    await A.goto(p, 3500);
    console.log(p, "->", A.problems.length ? A.problems.map((x) => x.slice(0, 600)).join(" || ") : "ok");
  }
} finally { await A.close(); setTimeout(() => process.exit(0), 300); }
