// Captures the screenshots used by the user guides (docs/huong-dan/img) from the running app and the demo data.
// Usage: node e2e/screenshots.mjs [role]   (role = chung | sinh-vien | giang-vien | co-van | giao-vu | quan-tri; default all)
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { openActor, sleep } from "./driver.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, "../../PTIT_ERIPT_API/docs/huong-dan/img");
mkdirSync(OUT, { recursive: true });
const BANK = process.env.DEMO_BANK ?? "31";
const EXAM = process.env.DEMO_EXAM ?? "10";
const CERT = process.env.DEMO_CERT ?? "ERIPT-78F82DA22997";

// [file, path, options]. options: click = [text, selector?] pressed after load; full = capture the whole page height
const plan = {
  chung: { email: null, shots: [
    ["dang-nhap", "/login"],
    ["dang-ky", "/register"],
    ["quen-mat-khau", "/forgot-password"],
    ["trang-chu", "/", { full: 2400 }],
    ["danh-muc-khoa-hoc", "/courses"],
    ["chi-tiet-khoa-hoc", "/courses/nhap-mon-kinh-te-so"],
    ["tin-tuc", "/news"],
  ] },
  "sinh-vien": { email: "student@eript.test", shots: [
    ["viec-hoc-cua-toi", "/my", { full: 1500 }],
    ["trang-hoc", "/learn/nhap-mon-kinh-te-so"],
    ["chung-chi", `/certificates/${CERT}`],
    ["diem-danh-qr", "/check-in"],
  ] },
  "giang-vien": { email: "instructor@eript.test", shots: [
    ["tong-quan", "/studio"],
    ["danh-sach-khoa-hoc", "/studio/courses"],
    ["tao-khoa-hoc", "/studio/courses/new"],
    ["khoa-hoc-thong-tin", "/studio/courses/1", { full: 1900 }],
    ["khoa-hoc-chuong-trinh", "/studio/courses/1?tab=curriculum"],
    ["khoa-hoc-hoc-vien", "/studio/courses/1?tab=students"],
    ["khoa-hoc-bao-cao", "/studio/courses/1?tab=report", { full: 1500 }],
    ["khoa-hoc-xuat-ban", "/studio/courses/1?tab=publish"],
    ["ngan-hang-cau-hoi", "/studio/question-bank?course=1"],
    ["ngan-hang-chi-tiet", `/studio/question-bank/1/${BANK}`],
    ["ngan-hang-menu-mau", `/studio/question-bank/1/${BANK}`, { click: ["Tải file mẫu", "button"] }],
    ["nhom-cau-hoi", `/studio/question-groups?course=1&bank=${BANK}`],
    ["ky-thi-danh-sach", "/studio/exams?scope=1"],
    ["ky-thi-cai-dat", `/studio/exams/${EXAM}`, { full: 1700 }],
    ["ky-thi-de-thi", `/studio/exams/${EXAM}`, { click: ["Đề thi", "[role=tab],button"] }],
    ["ky-thi-quy-tac-phan-tram", `/studio/exams/${EXAM}`, { click: ["Đề thi", "[role=tab],button"], then: ["Thêm quy tắc", "button"], pick: true }],
    ["cham-bai", "/studio/grading"],
    ["diem-so", "/studio/grades"],
    ["diem-danh", "/studio/attendance"],
    ["bai-tap", "/studio/courses/1/assignments"],
    ["lop-quan-ly", "/studio/classes"],
  ] },
  "co-van": { email: "advisor@eript.test", shots: [
    ["danh-sach-lop", "/studio/classes"],
    ["lop-sinh-vien", "/studio/classes/4"],
    ["lop-chuong-trinh", "/studio/classes/4", { click: ["Chương trình và lộ trình", "button[role=tab]"], full: 1500 }],
    ["lop-bao-cao", "/studio/classes/4", { click: ["Chương trình và lộ trình", "button[role=tab]"], then: ["Báo cáo lớp", "button"] }],
  ] },
  "giao-vu": { email: "academic@eript.test", shots: [
    ["nam-hoc", "/admin/academic/academic-years"],
    ["hoc-ky", "/admin/academic/terms"],
    ["khoa", "/admin/academic/cohorts"],
    ["lop-hanh-chinh", "/admin/academic/classes"],
    ["lop-hanh-chinh-them", "/admin/academic/classes", { click: ["Thêm lớp", "button"] }],
    ["chuong-trinh-dao-tao", "/admin/academic/programs"],
  ] },
  "quan-tri": { email: "admin@eript.test", shots: [
    ["tong-quan", "/admin", { full: 1500 }],
    ["nguoi-dung", "/admin/users"],
    ["nguoi-dung-them", "/admin/users", { click: ["Thêm người dùng", "button"] }],
    ["vai-tro", "/admin/roles"],
    ["khoa-hoc-duyet", "/admin/courses"],
    ["tin-tuc", "/admin/news"],
    ["doi-tac", "/admin/partners"],
    ["cai-dat", "/admin/settings", { full: 1800 }],
  ] },
};

const only = process.argv[2];
let n = 0;
for (const [role, cfg] of Object.entries(plan)) {
  if (only && only !== role) continue;
  const A = await openActor({ name: "docs", port: 9445, headed: false, width: 1440, height: 900 });
  try {
    if (cfg.email) await A.login(cfg.email);
    for (const [file, path, o = {}] of cfg.shots) {
      try {
        await A.send("Emulation.clearDeviceMetricsOverride");
        await A.goto(path, 3500);
        if (o.click) { await A.click(o.click[0], o.click[1] ?? "button,a,[role=tab]"); await sleep(1200); }
        if (o.then) { await A.click(o.then[0], o.then[1]); await sleep(1500); }
        if (o.pick) {
          await A.field("Ngân hàng", "Ngân hàng", "[role=dialog],dialog[open]").catch(() => {});
          await A.click("Theo tỉ lệ % độ khó", "button", "[role=dialog],dialog[open]").catch(() => {});
          await sleep(700);
        }
        if (o.full) {
          const h = await A.eval(`Math.min(document.documentElement.scrollHeight, ${o.full})`);
          await A.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: h, deviceScaleFactor: 1, mobile: false });
          await sleep(900);
        }
        const r = await A.send("Page.captureScreenshot", { format: "png" });
        writeFileSync(join(OUT, `${role}-${file}.png`), Buffer.from(r.data, "base64"));
        n++;
        console.log("ok  ", role, file);
      } catch (e) {
        console.log("FAIL", role, file, String(e.message).split("\n")[0]);
      }
    }
  } finally {
    await A.close();
  }
}
console.log(`${n} ảnh -> ${OUT}`);
setTimeout(() => process.exit(0), 400);
