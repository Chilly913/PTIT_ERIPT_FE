// End-to-end scenario: admin sets up the academic structure -> instructor builds a course and an exam ->
// the course is assigned to an administrative class -> a student learns, sits the exam and gets a certificate ->
// instructor, advisor and admin read the reports.
//
// Usage (API on :8080, web on :3001, Chrome installed):
//   node e2e/full-cycle.mjs                 run everything with three visible Chrome windows (3 profiles)
//   node e2e/full-cycle.mjs --headless      same, no windows
//   node e2e/full-cycle.mjs --from=P3       start at phase P3 (re-uses ids saved in e2e/out/state.json)
//   node e2e/full-cycle.mjs --fresh         ignore saved state and create new data
// Detailed script: PTIT_ERIPT_API/docs/KICH-BAN-TEST-VONG-DOI.md
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { OUT, WEB, openActor, sleep } from "./driver.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SAMPLES = resolve(here, "../../PTIT_ERIPT_API/docs/mau-nhap-cau-hoi");
const API = process.env.API_URL ?? "http://localhost:8080/api";
const PASSWORD = "Demo@1234";
const args = new Map(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")).map(([k, v]) => [k, v ?? true]));
const headed = !args.has("headless");

// ---- state kept between runs so a failed phase can be re-run without recreating everything ----
const statePath = join(OUT, "state.json");
let state = !args.has("fresh") && existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : {};
state.sfx ??= Date.now().toString(36).slice(-5).toUpperCase();
state.done ??= {};
const save = () => writeFileSync(statePath, JSON.stringify(state, null, 2));
save();
const S = state.sfx;
const names = {
  year: `NH-${S}`,
  term: `Học kỳ 1 NH-${S}`,
  termCode: `HK1-${S}`,
  cohort: `Khóa ${S}`,
  cohortCode: `K${S}`,
  classCode: `L${S}01`,
  className: `Lớp thử nghiệm ${S}`,
  teacher: `Giảng viên ${S}`,
  teacherEmail: `gv.${S.toLowerCase()}@eript.test`,
  student1: `Sinh viên ${S} A`,
  student1Email: `sv.${S.toLowerCase()}a@eript.test`,
  student2: `Sinh viên ${S} B`,
  student2Email: `sv.${S.toLowerCase()}b@eript.test`,
  course: `Môn thử nghiệm ${S}`,
  bank: `Ngân hàng ${S}`,
  exam: `Thi cuối môn ${S}`,
};

// ---- tiny assertion + API helpers ----
class Failure extends Error {}
const check = (cond, msg) => { if (!cond) throw new Failure(msg); };
const tokens = {};
async function apiAs(email, path, init = {}) {
  tokens[email] ??= (await (await fetch(`${API}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password: PASSWORD }) })).json()).access_token;
  const r = await fetch(API + path, { ...init, headers: { authorization: `Bearer ${tokens[email]}`, "content-type": "application/json", ...(init.headers ?? {}) } });
  const body = await r.json().catch(() => null);
  return { status: r.status, body };
}

const STEP_TEACHER = "Tạo tài khoản giảng viên (vai trò Giảng viên)";
const STEP_STUDENTS = "Tạo 2 tài khoản sinh viên";

// ---- the three people, each in its own Chrome profile ----
const actors = {};
async function actor(key) {
  if (actors[key]) return actors[key];
  const cfg = { admin: { port: 9441, x: 0, y: 0 }, teacher: { port: 9442, x: 40, y: 30 }, student: { port: 9443, x: 80, y: 60 } }[key];
  actors[key] = await openActor({ name: key, headed, ...cfg });
  // When a phase is re-run the window is new and signed out: sign the person in again (their account must exist by now).
  const email = { admin: "admin@eript.test", teacher: names.teacherEmail, student: names.student1Email }[key];
  const exists = key === "admin" || state.done?.[key === "teacher" ? STEP_TEACHER : STEP_STUDENTS];
  if (exists) await actors[key].login(email);
  return actors[key];
}

const phases = [];
function phase(id, title, steps) { phases.push({ id, title, steps }); }
const results = [];

// =====================================================================================================
phase("P1", "Quản trị viên dựng cấu trúc học vụ và tài khoản", [
  ["Đăng nhập quản trị viên bằng form", async () => {
    const A = await actor("admin");
    await A.login("admin@eript.test");
    check((await A.path()).startsWith("/admin"), "admin phải vào /admin, thực tế " + (await A.path()));
  }],
  ["Tạo năm học", async () => {
    const A = await actor("admin");
    await A.goto("/admin/academic/academic-years");
    await A.click("Thêm năm học", "button");
    await A.field("Tên năm học", names.year);
    await A.field("Ngày bắt đầu", "2027-09-01");
    await A.field("Ngày kết thúc", "2028-08-31");
    await A.click("Thêm năm học", "button", "dialog[open]");
    await A.waitText(names.year);
  }],
  ["Tạo học kỳ thuộc năm học đó", async () => {
    const A = await actor("admin");
    await A.goto("/admin/academic/terms");
    await A.click("Thêm học kỳ", "button");
    await A.field("Năm học", names.year);
    await A.field("Mã học kỳ", names.termCode);
    await A.field("Tên học kỳ", names.term);
    await A.field("Ngày bắt đầu", "2027-09-01");
    await A.field("Ngày kết thúc", "2028-01-15");
    await A.click("Thêm học kỳ", "button", "dialog[open]");
    await A.waitText(names.termCode);
  }],
  ["Tạo khóa (niên khóa) thuộc chương trình CNTT", async () => {
    const A = await actor("admin");
    await A.goto("/admin/academic/cohorts");
    await A.click("Thêm khóa", "button");
    await A.field("Chương trình đào tạo", "CNTT");
    await A.field("Mã khóa", names.cohortCode);
    await A.field("Tên khóa", names.cohort);
    await A.field("Năm vào học", "2027");
    await A.click("Thêm khóa", "button", "dialog[open]");
    await A.waitText(names.cohortCode);
  }],
  ["Tạo lớp hành chính, gán cố vấn học tập", async () => {
    const A = await actor("admin");
    await A.goto("/admin/academic/classes");
    await A.click("Thêm lớp", "button");
    await A.field("Chương trình đào tạo", "CNTT");
    await A.field("Khóa", names.cohortCode);
    await A.field("Cố vấn học tập", "Cố vấn học tập");
    await A.field("Mã lớp", names.classCode);
    await A.field("Tên lớp", names.className);
    await A.click("Thêm lớp", "button", "dialog[open]");
    await A.waitText(names.classCode);
    const r = await apiAs("admin@eript.test", `/classes?q=${names.classCode}`);
    check(r.body?.data?.length === 1, "lớp phải tồn tại qua API");
    state.classId = r.body.data[0].id;
    save();
  }],
  [STEP_TEACHER, async () => {
    const A = await actor("admin");
    await createUser(A, names.teacher, names.teacherEmail, ["Giảng viên"], ["Sinh viên"]);
    const r = await apiAs(names.teacherEmail, "/my-courses");
    check(r.status === 200, "giảng viên mới đăng nhập được và có quyền vào studio: " + r.status);
  }],
  [STEP_STUDENTS, async () => {
    const A = await actor("admin");
    await createUser(A, names.student1, names.student1Email, [], []);
    await createUser(A, names.student2, names.student2Email, [], []);
  }],
  ["Đưa sinh viên A vào lớp hành chính (Lớp quản lý)", async () => {
    const A = await actor("admin");
    await A.goto(`/studio/classes/${state.classId}`);
    await A.waitText(names.classCode);
    await A.click("Thêm sinh viên", "button");
    await A.field("Email hoặc mã sinh viên", names.student1Email);
    await A.click("Thêm sinh viên", "button", "dialog[open]");
    await A.waitText(names.student1);
    const r = await apiAs("admin@eript.test", `/classes/${state.classId}`);
    check(r.body.students.length === 1, "lớp phải có 1 sinh viên, có " + r.body.students.length);
  }],
  ["Tạo chương trình đào tạo của lớp và gắn kỳ 1 với học kỳ thực tế", async () => {
    const A = await actor("admin");
    await A.click("Chương trình và lộ trình", "button[role=tab]");
    await A.click("Tạo chương trình mới", "button");
    await A.field("Tên chương trình", `CTĐT ${names.classCode}`);
    await A.click("Tạo", "button", "dialog[open]");
    await A.waitText("Kỳ 1");
    await A.pick("Học kỳ thực tế Kỳ 1", names.term);
    await sleep(800);
    const r = await apiAs("admin@eript.test", `/classes/${state.classId}`);
    check(r.body.term_map.some((t) => t.term_number === 1), "kỳ 1 phải được gắn học kỳ");
  }],
]);

// =====================================================================================================
phase("P2", "Giảng viên tạo khóa học, ngân hàng câu hỏi và kỳ thi", [
  ["Giảng viên đăng nhập bằng form", async () => {
    const T = await actor("teacher");
    await T.login(names.teacherEmail);
    check((await T.path()).startsWith("/studio"), "giảng viên phải vào /studio, thực tế " + (await T.path()));
  }],
  ["Tạo khóa học (học tuần tự, có cấp chứng chỉ)", async () => {
    const T = await actor("teacher");
    await T.goto("/studio/courses/new");
    await T.field("Tên khóa học", names.course, "main");
    await T.field("Cách học", "Học tuần tự", "main");
    await T.click("Cấp chứng chỉ", "label", "main");
    await T.click("Tạo khóa học", "button[type=submit],button", "main");
    await T.waitFor("/^[/]studio[/]courses[/][0-9]+/.test(location.pathname)", 25000);
    state.courseId = Number((await T.path()).match(/courses\/(\d+)/)[1]);
    save();
    const r = await apiAs(names.teacherEmail, `/courses/${state.courseId}`);
    check(r.body.learning_mode === "sequential" && r.body.certificate_template_id, "khóa phải tuần tự và có chứng chỉ");
  }],
  ["Hoàn thiện thông tin khóa học (mô tả, danh mục) để đủ điều kiện xuất bản", async () => {
    const T = await actor("teacher");
    await T.goto(`/studio/courses/${state.courseId}`);
    await T.waitFor("[...document.querySelectorAll('label')].some(l=>l.innerText.startsWith('Danh mục'))", 20000);
    await T.field("Danh mục", "", "main"); // empty text = the first category in the list
    await T.typeInto("[contenteditable=true]", `Khóa học thử nghiệm ${S}: nền tảng của kinh tế số, thương mại điện tử và chuyển đổi số.`);
    await T.click("Lưu thay đổi", "button");
    await T.waitText("Đã lưu", 10000).catch(() => {});
    await sleep(800);
    const r = await apiAs(names.teacherEmail, `/courses/${state.courseId}`);
    check(r.body.category_id && (r.body.description ?? "").includes(S), "khóa phải có danh mục và mô tả");
  }],
  ["Thêm chương Chương 1 và 2 bài đọc", async () => {
    const T = await actor("teacher");
    await T.goto(`/studio/courses/${state.courseId}?tab=curriculum`);
    await T.click("Thêm chương", "button");
    await T.waitFor("document.querySelector('input[aria-label=\"Đổi tên\"]')", 8000);
    await T.eval(`document.querySelector('input[aria-label="Đổi tên"]').focus()`);
    await T.setValue('input[aria-label="Đổi tên"]', "Chương 1 - Nền tảng");
    await T.press("Enter");
    await T.waitText("Chương 1 - Nền tảng");
    for (const [i, title] of ["Bài 1 - Kinh tế số là gì", "Bài 2 - Thương mại điện tử"].entries()) {
      await T.click("Thêm bài học", "button");
      await T.waitFor("document.querySelector('dialog[open], [role=dialog]') && [...document.querySelectorAll('label')].some(l=>l.innerText.startsWith('Tên bài học'))", 10000);
      await T.field("Tên bài học", title, "[role=dialog],dialog[open]");
      await T.field("Loại bài học", "Bài đọc", "[role=dialog],dialog[open]");
      await T.typeInto("[role=dialog] [contenteditable=true], dialog[open] [contenteditable=true]", `Nội dung bài ${i + 1} của khóa ${S}. Học viên đọc rồi đánh dấu hoàn thành.`);
      await T.click("Lưu thay đổi", "button[type=submit]", "[role=dialog],dialog[open]");
      await T.waitText(title, 15000);
      await sleep(700);
    }
    const r = await apiAs(names.teacherEmail, `/courses/${state.courseId}/sections`);
    const lessons = (r.body?.sections ?? r.body?.data ?? []).flatMap((x) => x.lessons ?? []);
    check(lessons.length >= 2 && lessons.some((l) => l.title.startsWith("Bài 1")) && lessons.some((l) => l.title.startsWith("Bài 2")), "khóa phải có bài 1 và bài 2, có " + lessons.map((l) => l.title).join(" | "));
  }],
  ["Tạo ngân hàng câu hỏi", async () => {
    const T = await actor("teacher");
    await T.goto(`/studio/question-bank?course=${state.courseId}`);
    await T.click("Tạo ngân hàng", "button");
    await T.field("Tên ngân hàng", names.bank);
    await T.click("Lưu", "button", "[role=dialog],dialog[open]");
    await T.waitText(names.bank);
    const r = await apiAs(names.teacherEmail, `/courses/${state.courseId}/question-banks`);
    state.bankId = r.body.data.find((b) => b.name === names.bank).id;
    save();
  }],
  ["Nhập 10 câu hỏi từ file Excel mẫu (tự tạo nhóm câu hỏi)", async () => {
    const T = await actor("teacher");
    await T.goto(`/studio/question-bank/${state.courseId}/${state.bankId}`);
    await T.click("Nhập từ Excel/Word", "button");
    await T.setFiles("dialog[open] input[type=file], [role=dialog] input[type=file]", [join(SAMPLES, "mau-nhap-cau-hoi.xlsx").replace(/\//g, "\\")]);
    await T.click("Kiểm tra", "button", "[role=dialog],dialog[open]");
    await T.waitText("10/10", 15000).catch(() => T.waitText("hợp lệ", 5000));
    await T.click("Nhập vào ngân hàng", "button", "[role=dialog],dialog[open]");
    await sleep(2500);
    const r = await apiAs(names.teacherEmail, `/courses/${state.courseId}/question-banks/${state.bankId}?per_page=1`);
    check(r.body.questions.meta.total === 10, "ngân hàng phải có 10 câu, có " + r.body.questions.meta.total);
    check(r.body.groups.length === 2, "phải tự tạo 2 nhóm câu hỏi, có " + r.body.groups.length);
  }],
  ["Đổi tên một nhóm trên màn Nhóm câu hỏi", async () => {
    const T = await actor("teacher");
    await T.goto(`/studio/question-groups?course=${state.courseId}&bank=${state.bankId}`);
    await T.waitText("Chương 1 - Kinh tế số");
    await T.eval(`document.querySelector('[aria-label^="Sửa nhóm: Chương 1"]').click()`);
    await sleep(600);
    await T.field("Tên nhóm", "Chương 1 - Nền tảng kinh tế số", "[role=dialog],dialog[open]");
    await T.click("Lưu", "button", "[role=dialog],dialog[open]");
    await T.waitText("Chương 1 - Nền tảng kinh tế số");
  }],
  ["Tạo kỳ thi cuối khóa gắn với khóa học", async () => {
    const T = await actor("teacher");
    await T.goto("/studio/exams");
    await T.click("Tạo kỳ thi", "button");
    await T.field("Loại kỳ thi", "Thi cuối khóa");
    await T.field("Khóa học", names.course);
    await T.field("Tên kỳ thi", names.exam);
    await T.field("Thời gian làm bài", "15");
    await T.click("Tạo kỳ thi", "button", "[role=dialog],dialog[open]");
    await T.waitFor("/^[/]studio[/]exams[/][0-9]+/.test(location.pathname)", 25000);
    state.examId = Number((await T.path()).match(/exams\/(\d+)/)[1]);
    save();
  }],
  ["Đặt điểm đạt 50%", async () => {
    const T = await actor("teacher");
    await T.goto(`/studio/exams/${state.examId}`);
    await T.waitFor("[...document.querySelectorAll('label')].some(l=>l.innerText.startsWith('Điểm đạt'))", 20000);
    await T.field("Điểm đạt", "50", "main");
    await T.click("Lưu thay đổi", "button");
    await sleep(1500);
    const r = await apiAs(names.teacherEmail, `/exams/${state.examId}/detail`);
    check(Number(r.body.pass_score) === 50, "điểm đạt phải là 50, thực tế " + r.body.pass_score);
  }],
  ["Soạn đề: rút ngẫu nhiên 5 câu theo tỉ lệ 20% rất dễ / 60% dễ / 20% trung bình", async () => {
    const T = await actor("teacher");
    await T.goto(`/studio/exams/${state.examId}`);
    await T.click("Đề thi", "[role=tab],button");
    await T.waitText("Rút ngẫu nhiên từ ngân hàng", 15000);
    await T.click("Thêm quy tắc", "button");
    await T.field("Ngân hàng", names.bank, "[role=dialog],dialog[open]");
    await T.click("Theo tỉ lệ % độ khó", "button", "[role=dialog],dialog[open]");
    await T.field("Tổng số câu", "5", "[role=dialog],dialog[open]");
    for (const [label, v] of [["Rất dễ", "20"], ["Dễ", "60"], ["Trung bình", "20"], ["Khó", "0"], ["Rất khó", "0"]]) {
      await T.setValue(`input[aria-label="Tỉ lệ (%): ${label}"]`, v);
    }
    await T.waitText("Tổng tỉ lệ: 100%");
    await T.click("Thêm", "button", "[role=dialog],dialog[open]");
    await T.click("Lưu đề thi", "button").catch(async () => T.click("Lưu", "button"));
    await sleep(2000);
    const r = await apiAs(names.teacherEmail, `/exams/${state.examId}/detail`);
    const rules = r.body.quiz?.random_rules ?? [];
    check(rules.length === 3 && rules.reduce((a, x) => a + x.count, 0) === 5, "đề phải có 3 quy tắc, tổng 5 câu: " + JSON.stringify(rules));
  }],
  ["Mở kỳ thi", async () => {
    const T = await actor("teacher");
    await T.goto(`/studio/exams/${state.examId}`);
    await T.click("Mở kỳ thi", "button");
    await T.waitText("Đang mở", 15000);
  }],
  ["Gửi khóa học đi duyệt (đủ điều kiện xuất bản)", async () => {
    const T = await actor("teacher");
    await T.goto(`/studio/courses/${state.courseId}?tab=publish`);
    await T.waitText("Gửi duyệt", 45000);
    await T.click("Gửi duyệt", "button");
    await T.waitText("chờ quản trị viên duyệt", 30000);
  }],
]);

phase("P3", "Quản trị viên duyệt khóa, gán khóa cho lớp; giảng viên ghi danh thêm sinh viên", [
  ["Quản trị viên duyệt và xuất bản khóa học", async () => {
    const A = await actor("admin");
    await A.goto("/admin/courses");
    await A.waitText(names.course, 20000);
    const r0 = await apiAs("admin@eript.test", `/courses/${state.courseId}`);
    check(r0.body.status === "pending_review", "khóa phải ở trạng thái chờ duyệt, thực tế " + r0.body.status);
    await A.click(names.course, "li button");
    await A.click("Duyệt & xuất bản", "button");
    await sleep(1500);
    const done = await apiAs("admin@eript.test", `/courses/${state.courseId}`);
    check(done.body.status === "published", "khóa phải được xuất bản, trạng thái: " + done.body.status);
  }],
  ["Đưa khóa học vào kỳ 1 của chương trình lớp và gán cho cả lớp", async () => {
    const A = await actor("admin");
    await A.goto(`/studio/classes/${state.classId}`);
    await A.click("Chương trình và lộ trình", "button[role=tab]");
    await A.pick("Thêm môn vào kỳ này (Kỳ 1)", names.course);
    await A.waitText(names.course);
    await A.click("Gán cho cả lớp", "button");
    await A.click("Gán cho cả lớp", "button", "[role=dialog],dialog[open]");
    await sleep(1800);
    const r = await apiAs("admin@eript.test", `/classes/${state.classId}`);
    const c = r.body.courses.find((x) => x.course_id === state.courseId);
    check(c && c.term_number === 1 && c.enrolled === 1, "sinh viên A phải được ghi danh qua lớp: " + JSON.stringify(c));
    check(c.term && c.term.name === names.term, "ghi danh phải gắn đúng học kỳ của lớp");
  }],
  ["Giảng viên ghi danh thêm sinh viên B (ngoài lớp) bằng email", async () => {
    const T = await actor("teacher");
    await T.goto(`/studio/courses/${state.courseId}?tab=students`);
    await T.click("Thêm học viên", "button");
    await T.typeInto("[role=dialog] textarea, dialog[open] textarea", names.student2Email);
    await T.click("Thêm vào khóa học", "button", "[role=dialog],dialog[open]");
    await T.waitText(names.student2, 15000);
    const r = await apiAs(names.teacherEmail, `/courses/${state.courseId}/students?per_page=50`);
    check(r.body.data.length === 2, "khóa phải có 2 học viên, có " + r.body.data.length);
  }],
]);

// =====================================================================================================
phase("P4", "Sinh viên vào học, hoàn thành bài, thi thử và nhận chứng chỉ", [
  ["Sinh viên A đăng nhập, thấy khóa học và kỳ thi trên trang 'Việc học của tôi'", async () => {
    const V = await actor("student");
    await V.login(names.student1Email);
    await V.goto("/my", 2500);
    await V.waitText(names.course, 20000);
    await V.waitText(names.exam, 20000);
    const info = await apiAs(names.student1Email, `/courses/${state.courseId}`);
    state.slug = info.body.slug;
    save();
  }],
  ["Khóa học tuần tự: bài 2 bị khóa cho tới khi xong bài 1", async () => {
    const V = await actor("student");
    await V.goto(`/learn/${state.slug}`, 3000);
    await V.waitText("Bài 2 - Thương mại điện tử", 20000);
    check((await V.text()).includes("Hãy hoàn thành bài học"), "bài 2 phải hiển thị lý do bị khóa");
    state.lesson1Path = await V.path();
    state.lesson2Href = await V.eval("[...document.querySelectorAll('a')].find(a=>a.innerText.includes('Bài 2 - Thương mại điện tử')).getAttribute('href')");
    save();
  }],
  ["Hoàn thành bài 1 thì bài 2 mở khóa; hoàn thành bài 2", async () => {
    const V = await actor("student");
    await V.goto(state.lesson1Path, 2500);
    await V.click("Đánh dấu hoàn thành", "button");
    await V.waitText("Đã hoàn thành", 15000);
    await V.goto(state.lesson1Path, 2500);
    check(!(await V.text()).includes("Hãy hoàn thành bài học"), "sau bài 1, bài 2 phải mở khóa");
    await V.goto(state.lesson2Href, 2500);
    await V.click("Đánh dấu hoàn thành", "button");
    await V.waitText("Đã hoàn thành", 15000);
    const r = await apiAs(names.student1Email, `/courses/${state.courseId}/progress`);
    check(r.body.completed_lessons === r.body.total_lessons && r.body.total_lessons >= 2, "tiến độ phải 100%: " + JSON.stringify({ c: r.body.completed_lessons, t: r.body.total_lessons }));
  }],
  ["Làm bài thi: trả lời từng câu rồi nộp bài", async () => {
    const V = await actor("student");
    await V.goto(`/exams/${state.examId}`, 4000);
    await V.waitText("Nộp bài", 20000);
    const total = Number((await V.text()).match(/Câu 1\/(\d+)/)[1]);
    check(total === 5, "đề phải có 5 câu (rút theo tỉ lệ), có " + total);
    for (let q = 1; q <= total; q++) {
      await answerCurrentQuestion(V);
      if (q < total) await V.click("Câu sau", "button");
    }
    await V.click("Nộp bài", "button", "main");
    if (await V.eval("!!document.querySelector('[role=dialog],dialog[open],[role=alertdialog]')")) await V.click("Nộp bài", "button", "[role=dialog],dialog[open],[role=alertdialog]");
    await V.waitFor("/Điểm|điểm/.test(document.body.innerText) && !document.body.innerText.includes('Đánh dấu xem lại')", 25000);
    await V.shot("exam-result");
  }],
  ["Nhận chứng chỉ và mở trang chứng chỉ", async () => {
    const V = await actor("student");
    await V.goto("/my", 2500);
    await V.click("Nhận chứng chỉ", "button");
    await V.waitFor("location.pathname.startsWith('/certificates/')", 20000);
    await V.waitText(names.student1);
    await V.waitText(names.course);
    state.credential = (await V.path()).split("/").pop();
    save();
    await V.shot("certificate");
  }],
]);

phase("P5", "Báo cáo: giảng viên, cố vấn học tập, quản trị viên và kiểm tra chứng chỉ công khai", [
  ["Giảng viên xem báo cáo khóa: 2 học viên, bảng 'Theo lớp', kết quả thi và chứng chỉ", async () => {
    const T = await actor("teacher");
    await T.goto(`/studio/courses/${state.courseId}?tab=report`, 2500);
    await T.waitText("Theo lớp", 20000);
    const text = await T.text();
    check(text.includes(names.student1) && text.includes(names.student2), "báo cáo phải liệt kê cả 2 học viên");
    check(text.includes(names.classCode), "bảng 'Theo lớp' phải có lớp " + names.classCode);
    const r = await apiAs(names.teacherEmail, `/courses/${state.courseId}/report`);
    const a = r.body.students.find((x) => x.email === names.student1Email);
    check(a.percent === 100 && a.has_certificate && a.exam_best != null, "sinh viên A: 100%, có chứng chỉ, có điểm thi: " + JSON.stringify({ p: a.percent, c: a.has_certificate, e: a.exam_best }));
    const b = r.body.students.find((x) => x.email === names.student2Email);
    check(b.percent === 0 && b.exam_best == null && !b.class_id, "sinh viên B: chưa học, chưa thi, chưa có lớp");
  }],
  ["Lọc theo lớp (bộ chọn nhiều có ô tìm kiếm) rồi mở chi tiết sinh viên", async () => {
    const T = await actor("teacher");
    await T.pick("Lọc theo lớp", names.classCode);
    await T.press("Escape");
    await T.waitFor(`!document.body.innerText.includes(${JSON.stringify(names.student2)})`, 10000);
    const text = await T.text();
    check(text.includes(names.student1) && !text.includes(names.student2), "lọc lớp chỉ còn sinh viên A");
    await T.click(`Chi tiết ${names.student1}`, "button");
    await T.waitText("Bài học (2/2)", 15000);
    check((await T.text()).includes("Hoàn thành"), "chi tiết phải liệt kê bài học đã hoàn thành");
    await T.shot("report-detail");
  }],
  ["Lọc theo năm học: chỉ sinh viên được gán qua lớp có năm học", async () => {
    const T = await actor("teacher");
    const r = await apiAs(names.teacherEmail, `/courses/${state.courseId}/report`);
    const year = r.body.filters.years.find((y) => y.label === names.year);
    check(year && year.count === 1, "bộ lọc năm học phải có " + names.year + " với 1 học viên: " + JSON.stringify(r.body.filters.years));
    const f = await apiAs(names.teacherEmail, `/courses/${state.courseId}/report?year_id=${year.value}`);
    check(f.body.students.length === 1 && f.body.students[0].email === names.student1Email, "lọc năm học phải trả về sinh viên A");
  }],
  ["Cố vấn học tập thấy lớp của mình và báo cáo lớp, không mở được báo cáo khóa nói chung", async () => {
    const A = await actor("admin");
    await A.login("advisor@eript.test");
    check((await A.path()).startsWith("/studio/classes"), "cố vấn phải vào thẳng /studio/classes, thực tế " + (await A.path()));
    await A.goto(`/studio/classes/${state.classId}`, 2500);
    await A.click("Chương trình và lộ trình", "button[role=tab]");
    await A.waitText(names.course, 20000);
    await A.click("Báo cáo lớp", "button");
    await A.waitText(names.student1, 15000);
    check((await A.text()).includes("100%"), "báo cáo lớp phải hiện tiến độ 100%");
    await A.shot("advisor-class-report");
    const noFilter = await apiAs("advisor@eript.test", `/courses/${state.courseId}/report`);
    check(noFilter.status === 403, "cố vấn không có bộ lọc lớp phải bị 403, thực tế " + noFilter.status);
    const all = await apiAs("admin@eript.test", "/classes?per_page=100");
    const foreign = all.body.data.find((c) => !c.advisor || c.advisor.email !== "advisor@eript.test");
    check(foreign, "cần một lớp không do cố vấn này phụ trách để kiểm tra phân quyền");
    const otherClass = await apiAs("advisor@eript.test", `/courses/${state.courseId}/report?class_id=${foreign.id}`);
    check(otherClass.status === 403, "cố vấn xem lớp không phụ trách phải bị 403, thực tế " + otherClass.status);
  }],
  ["Quản trị viên thấy khóa đã xuất bản với 2 học viên", async () => {
    const A = await actor("admin");
    await A.login("admin@eript.test");
    const r = await apiAs("admin@eript.test", `/courses/${state.courseId}/students?per_page=50`);
    check(r.body.data.length === 2, "khóa phải có 2 học viên");
    await A.goto("/admin/courses", 2500);
    await A.waitText(names.course, 20000);
  }],
  ["Chứng chỉ kiểm tra được công khai, không cần đăng nhập", async () => {
    const res = await fetch(`${WEB}/certificates/${state.credential}`);
    const html = await res.text();
    check(res.status === 200 && html.includes(names.student1) && html.includes(state.credential), "trang chứng chỉ công khai phải có tên sinh viên và mã xác thực");
    // Next streams the page under loading.tsx, so an unknown code answers 200 but renders the "not found" screen instead of a certificate
    const bad = await (await fetch(`${WEB}/certificates/KHONG-TON-TAI`)).text();
    check(!bad.includes(names.student1) && !bad.includes("Mã xác thực") && bad.includes("Không tìm thấy"), "mã sai phải hiển thị trang không tìm thấy, không phải chứng chỉ");
  }],
]);

/** Answers whatever the current exam question asks for, using only the controls a student sees. */
async function answerCurrentQuestion(V) {
  await V.eval(`(()=>{
    const m=document.querySelector('main');
    const set=(e,v)=>{const P=e.tagName==='TEXTAREA'?HTMLTextAreaElement:HTMLInputElement;Object.getOwnPropertyDescriptor(P.prototype,'value').set.call(e,v);e.dispatchEvent(new Event('input',{bubbles:true}))};
    const radios=[...m.querySelectorAll('input[type=radio]')];
    const checks=[...m.querySelectorAll('input[type=checkbox]')];
    if(radios.length) radios[0].click();
    checks.slice(0,2).forEach(c=>c.click());
    [...m.querySelectorAll('select')].forEach(s=>{Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,s.options[s.options.length-1].value);s.dispatchEvent(new Event('change',{bubbles:true}))});
    [...m.querySelectorAll('textarea')].forEach(t=>set(t,'Dữ liệu là yếu tố sản xuất mới của kinh tế số.'));
    [...m.querySelectorAll('input')].filter(i=>!['radio','checkbox','file','hidden'].includes(i.type)&&i.offsetParent).forEach((i,k)=>set(i,k?'B2C':'50'));
  })()`);
  await sleep(500);
}

// =====================================================================================================
async function createUser(A, name, email, tickRoles, untickRoles) {
  await A.goto("/admin/users");
  await A.click("Thêm người dùng", "button");
  await A.field("Họ và tên", name);
  await A.field("Email", email);
  for (const r of untickRoles) await A.click(r, "label", "dialog[open]");
  for (const r of tickRoles) await A.click(r, "label", "dialog[open]");
  await A.field("Mật khẩu", PASSWORD);
  await A.click("Tạo người dùng", "button[type=submit]", "dialog[open]");
  await A.waitText(email, 20000);
}

async function main() {
  const from = args.get("from");
  let run = !from;
  let failed = 0;
  for (const p of phases) {
    if (from && p.id === from) run = true;
    if (!run) continue;
    console.log(`\n== ${p.id}: ${p.title}`);
    for (const [title, fn] of p.steps) {
      if (state.done[title] && !args.has("redo")) {
        console.log(`  · ${title} (đã làm ở lần chạy trước)`);
        results.push({ phase: p.id, title, ok: true, skipped: true });
        continue;
      }
      const t0 = Date.now();
      try {
        await fn();
        state.done[title] = true;
        save();
        for (const [k, act] of Object.entries(actors)) {
          for (const msg of act.problems.splice(0)) console.log(`      ⚠ [${k}] ${msg.split(String.fromCharCode(10))[0].slice(0, 200)}`);
        }
        console.log(`  ✔ ${title} (${Math.round((Date.now() - t0) / 100) / 10}s)`);
        results.push({ phase: p.id, title, ok: true });
      } catch (e) {
        failed++;
        console.log(`  ✘ ${title}\n      ${String(e.message ?? e).split("\n")[0]}`);
        results.push({ phase: p.id, title, ok: false, error: String(e.message ?? e) });
        for (const [k, a] of Object.entries(actors)) await a.shot(`FAIL-${p.id}-${k}`).catch(() => {});
        if (!args.has("keep-going")) {
          console.log(`\nDừng ở bước lỗi. Ảnh chụp màn hình: ${OUT}`);
          await finish(failed);
          return;
        }
      }
    }
  }
  await finish(failed);
}
async function finish(failed) {
  const ok = results.filter((r) => r.ok).length;
  console.log(`\nKết quả: ${ok}/${results.length} bước đạt${failed ? `, ${failed} lỗi` : ""}.`);
  for (const [k, a] of Object.entries(actors)) if (a.problems.length) console.log(`  [${k}] lỗi trình duyệt:`, a.problems.slice(0, 3));
  writeFileSync(join(OUT, "result.json"), JSON.stringify({ sfx: S, names, results }, null, 2));
  if (!args.has("keep-open")) await Promise.all(Object.values(actors).map((a) => a.close()));
  await sleep(600);
  process.exit(failed ? 1 : 0);
}
void sleep; void WEB; void SAMPLES; void PASSWORD;
main();
