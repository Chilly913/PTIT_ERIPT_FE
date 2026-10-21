// Dev helper: check a page for horizontal overflow at phone width. Usage: node e2e/mobile.mjs <path>
import { openActor, sleep } from "./driver.mjs";
const A = await openActor({ name: "mobile", port: 9444, headed: false, width: 390, height: 800 });
try {
  await A.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 800, deviceScaleFactor: 1, mobile: true });
  await A.goto(process.argv[2] ?? "/", 3500);
  console.log(await A.eval("JSON.stringify({scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth})"));
  await A.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 2600, deviceScaleFactor: 1, mobile: true });
  await sleep(800);
  console.log(await A.shot("mobile-home"));
} finally { await A.close(); setTimeout(() => process.exit(0), 300); }
