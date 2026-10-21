// Dev helper: screenshot a page (full height). Usage: node e2e/shot.mjs <path> <name> [email]
import { openActor, sleep } from "./driver.mjs";
const [path, name, email] = process.argv.slice(2);
const A = await openActor({ name: "shot", port: 9446, headed: false, width: 1440, height: 900 });
try {
  if (email) await A.login(email);
  await A.goto(path, 3500);
  const h = await A.eval("Math.min(document.documentElement.scrollHeight, 6000)");
  await A.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: h, deviceScaleFactor: 1, mobile: false });
  await sleep(1200);
  console.log(await A.shot(name));
} finally { await A.close(); setTimeout(() => process.exit(0), 300); }
