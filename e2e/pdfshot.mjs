// Dev helper: screenshot a PDF page in Chrome's viewer. Usage: node e2e/pdfshot.mjs <file.pdf> <page> <name>
import { openActor, sleep } from "./driver.mjs";
const [file, page, name] = process.argv.slice(2);
const A = await openActor({ name: "pdf", port: 9443, headed: false, width: 1100, height: 1400 });
try {
  await A.send("Page.navigate", { url: "file:///" + file.split(String.fromCharCode(92)).join("/") + "#page=" + page + "&zoom=page-fit&toolbar=0" });
  await sleep(3500);
  await sleep(1500);
  console.log(await A.shot(name));
} finally { await A.close(); setTimeout(() => process.exit(0), 300); }
