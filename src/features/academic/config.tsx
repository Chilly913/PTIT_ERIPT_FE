import { Badge } from "@/components/ui";

export interface Opt { value: string; label: string }

export interface FieldCfg {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "switch" | "textarea";
  required?: boolean;
  hint?: string;
  /** Static options for a select. */
  options?: Opt[];
  /** Options loaded from /admin/academic/options/<name>. */
  optionsFrom?: string;
  /** Reload options when this form field changes (sent as ?<key>=<value>), and clear this field when it changes. */
  dependsOn?: string;
  wide?: boolean;
  placeholder?: string;
}

export interface ColumnCfg {
  key: string;
  header: string;
  sort?: string;
  align?: "left" | "right" | "center";
  cell?: (row: Row) => React.ReactNode;
}

export interface FilterCfg {
  param: string;
  label: string;
  options?: Opt[];
  optionsFrom?: string;
}

export type Row = { id: number } & Record<string, unknown>;

export interface ResourceCfg {
  path: string;
  title: string;
  singular: string;
  description: string;
  searchPlaceholder: string;
  columns: ColumnCfg[];
  fields: FieldCfg[];
  filters: FilterCfg[];
  defaults: Record<string, unknown>;
  csv: { headers: string[]; example: string[]; hint?: string };
  fileName: string;
}

const yes = (v: unknown) => (v ? <Badge tone="success">Có</Badge> : <Badge>Không</Badge>);
const text = (v: unknown) => (v === null || v === undefined || v === "" ? <span className="text-muted">—</span> : String(v));
const dateVN = (v: unknown) => (typeof v === "string" && v ? v.split("-").reverse().join("/") : "—");
type StatusMap = Record<string, [string, "success" | "neutral" | "warning" | "info" | "danger"]>;
function renderStatus(labels: StatusMap, v: unknown) {
  const [label, tone] = labels[String(v)] ?? [String(v ?? "—"), "neutral" as const];
  return <Badge tone={tone}>{label}</Badge>;
}

const activeFilter: FilterCfg = { param: "is_active", label: "Trạng thái", options: [{ value: "true", label: "Đang dùng" }, { value: "false", label: "Ngừng dùng" }] };

const yearStatus: Opt[] = [
  { value: "planned", label: "Dự kiến" },
  { value: "active", label: "Đang diễn ra" },
  { value: "inactive", label: "Tạm dừng" },
  { value: "completed", label: "Đã kết thúc" },
];
const termStatus: Opt[] = [
  { value: "planned", label: "Dự kiến" },
  { value: "upcoming", label: "Sắp diễn ra" },
  { value: "ongoing", label: "Đang diễn ra" },
  { value: "active", label: "Đang hoạt động" },
  { value: "completed", label: "Đã kết thúc" },
];
const cohortStatus: Opt[] = [
  { value: "active", label: "Đang học" },
  { value: "inactive", label: "Tạm dừng" },
  { value: "graduated", label: "Đã tốt nghiệp" },
];
const classStatus: Opt[] = [
  { value: "active", label: "Đang học" },
  { value: "graduated", label: "Đã tốt nghiệp" },
  { value: "suspended", label: "Tạm dừng" },
];
const yearStatusMap: StatusMap = ({ planned: ["Dự kiến", "info"], active: ["Đang diễn ra", "success"], inactive: ["Tạm dừng", "warning"], completed: ["Đã kết thúc", "neutral"] });
const termStatusMap: StatusMap = ({ planned: ["Dự kiến", "info"], upcoming: ["Sắp diễn ra", "info"], ongoing: ["Đang diễn ra", "success"], active: ["Đang hoạt động", "success"], completed: ["Đã kết thúc", "neutral"] });
const cohortStatusMap: StatusMap = ({ active: ["Đang học", "success"], inactive: ["Tạm dừng", "warning"], graduated: ["Đã tốt nghiệp", "neutral"] });
const classStatusMap: StatusMap = ({ active: ["Đang học", "success"], graduated: ["Đã tốt nghiệp", "neutral"], suspended: ["Tạm dừng", "warning"] });

export const RESOURCES: Record<string, ResourceCfg> = {
  "program-types": {
    path: "program-types",
    title: "Hệ đào tạo",
    singular: "hệ đào tạo",
    description: "Các hệ đào tạo của Viện (chính quy, từ xa, vừa làm vừa học, ngắn hạn...).",
    searchPlaceholder: "Tìm theo mã, tên hoặc mô tả...",
    fileName: "he-dao-tao",
    columns: [
      { key: "code", header: "Mã", sort: "code" },
      { key: "name", header: "Tên hệ đào tạo", sort: "name" },
      { key: "description", header: "Mô tả", cell: (r) => text(r.description) },
      { key: "programs_count", header: "Số chương trình", sort: "programs_count", align: "right", cell: (r) => String(r.programs_count ?? 0) },
      { key: "is_active", header: "Đang dùng", cell: (r) => yes(r.is_active) },
    ],
    fields: [
      { key: "code", label: "Mã", type: "text", required: true, placeholder: "VD: DHCQ" },
      { key: "name", label: "Tên hệ đào tạo", type: "text", required: true },
      { key: "description", label: "Mô tả", type: "textarea", wide: true },
      { key: "is_active", label: "Đang sử dụng", type: "switch" },
    ],
    filters: [activeFilter],
    defaults: { code: "", name: "", description: "", is_active: true },
    csv: { headers: ["code", "name", "description", "is_active"], example: ["DHCQ", "Đại học chính quy", "Hệ đào tạo tập trung", "true"] },
  },
  programs: {
    path: "programs",
    title: "Chương trình đào tạo",
    singular: "chương trình",
    description: "Ngành và chương trình đào tạo thuộc từng hệ.",
    searchPlaceholder: "Tìm theo mã, tên chương trình hoặc hệ đào tạo...",
    fileName: "chuong-trinh-dao-tao",
    columns: [
      { key: "code", header: "Mã", sort: "code" },
      { key: "name", header: "Tên chương trình", sort: "name" },
      { key: "program_type_name", header: "Hệ đào tạo", sort: "program_type_name" },
      { key: "duration_months", header: "Thời gian (tháng)", sort: "duration_months", align: "right", cell: (r) => text(r.duration_months) },
      { key: "is_active", header: "Đang dùng", cell: (r) => yes(r.is_active) },
    ],
    fields: [
      { key: "program_type_id", label: "Hệ đào tạo", type: "select", required: true, optionsFrom: "program-types" },
      { key: "code", label: "Mã", type: "text", required: true, placeholder: "VD: QTKD" },
      { key: "name", label: "Tên chương trình", type: "text", required: true, wide: true },
      { key: "duration_months", label: "Thời gian đào tạo (tháng)", type: "number" },
      { key: "is_active", label: "Đang sử dụng", type: "switch" },
    ],
    filters: [{ param: "program_type_id", label: "Hệ đào tạo", optionsFrom: "program-types" }, activeFilter],
    defaults: { program_type_id: "", code: "", name: "", duration_months: "", is_active: true },
    csv: { headers: ["program_type_code", "code", "name", "duration_months", "is_active"], example: ["DHCQ", "QTKD", "Quản trị kinh doanh", "48", "true"], hint: "program_type_code là mã của hệ đào tạo đã có." },
  },
  "academic-years": {
    path: "academic-years",
    title: "Năm học",
    singular: "năm học",
    description: "Các năm học; chỉ một năm học được đặt là hiện tại.",
    searchPlaceholder: "Tìm theo tên năm học...",
    fileName: "nam-hoc",
    columns: [
      { key: "name", header: "Năm học", sort: "name" },
      { key: "start_date", header: "Bắt đầu", sort: "start_date", cell: (r) => dateVN(r.start_date) },
      { key: "end_date", header: "Kết thúc", sort: "end_date", cell: (r) => dateVN(r.end_date) },
      { key: "status", header: "Trạng thái", sort: "status", cell: (r) => renderStatus(yearStatusMap, r.status) },
      { key: "is_current", header: "Hiện tại", cell: (r) => yes(r.is_current) },
    ],
    fields: [
      { key: "name", label: "Tên năm học", type: "text", required: true, placeholder: "VD: 2026-2027", wide: true },
      { key: "start_date", label: "Ngày bắt đầu", type: "date", required: true },
      { key: "end_date", label: "Ngày kết thúc", type: "date", required: true },
      { key: "status", label: "Trạng thái", type: "select", required: true, options: yearStatus },
      { key: "is_current", label: "Đặt là năm học hiện tại", type: "switch", hint: "Năm học hiện tại cũ sẽ được bỏ đánh dấu." },
    ],
    filters: [{ param: "status", label: "Trạng thái", options: yearStatus }, { param: "is_current", label: "Hiện tại", options: [{ value: "true", label: "Là năm hiện tại" }, { value: "false", label: "Không phải" }] }],
    defaults: { name: "", start_date: "", end_date: "", status: "planned", is_current: false },
    csv: { headers: ["name", "start_date", "end_date", "status", "is_current"], example: ["2026-2027", "2026-09-01", "2027-08-31", "planned", "false"], hint: "Ngày theo định dạng YYYY-MM-DD; status: planned, active, inactive, completed." },
  },
  terms: {
    path: "terms",
    title: "Học kỳ",
    singular: "học kỳ",
    description: "Học kỳ thuộc từng năm học.",
    searchPlaceholder: "Tìm theo mã, tên học kỳ hoặc năm học...",
    fileName: "hoc-ky",
    columns: [
      { key: "code", header: "Mã", sort: "code" },
      { key: "name", header: "Tên học kỳ", sort: "name" },
      { key: "academic_year", header: "Năm học", sort: "academic_year" },
      { key: "start_date", header: "Bắt đầu", sort: "start_date", cell: (r) => dateVN(r.start_date) },
      { key: "end_date", header: "Kết thúc", sort: "end_date", cell: (r) => dateVN(r.end_date) },
      { key: "status", header: "Trạng thái", sort: "status", cell: (r) => renderStatus(termStatusMap, r.status) },
      { key: "is_current", header: "Hiện tại", cell: (r) => yes(r.is_current) },
    ],
    fields: [
      { key: "academic_year_id", label: "Năm học", type: "select", required: true, optionsFrom: "academic-years" },
      { key: "code", label: "Mã học kỳ", type: "text", required: true, placeholder: "VD: HK1-2627" },
      { key: "name", label: "Tên học kỳ", type: "text", required: true, wide: true },
      { key: "start_date", label: "Ngày bắt đầu", type: "date", required: true },
      { key: "end_date", label: "Ngày kết thúc", type: "date", required: true },
      { key: "status", label: "Trạng thái", type: "select", required: true, options: termStatus },
      { key: "is_current", label: "Đặt là học kỳ hiện tại của năm học", type: "switch" },
    ],
    filters: [{ param: "academic_year_id", label: "Năm học", optionsFrom: "academic-years" }, { param: "status", label: "Trạng thái", options: termStatus }],
    defaults: { academic_year_id: "", code: "", name: "", start_date: "", end_date: "", status: "planned", is_current: false },
    csv: { headers: ["academic_year", "code", "name", "start_date", "end_date", "status", "is_current"], example: ["2026-2027", "HK1-2627", "Học kỳ 1 năm học 2026-2027", "2026-09-01", "2027-01-15", "planned", "false"], hint: "academic_year là tên năm học đã có (VD: 2026-2027)." },
  },
  cohorts: {
    path: "cohorts",
    title: "Khóa",
    singular: "khóa",
    description: "Các khóa tuyển sinh theo chương trình đào tạo.",
    searchPlaceholder: "Tìm theo mã, tên khóa hoặc chương trình...",
    fileName: "khoa",
    columns: [
      { key: "code", header: "Mã", sort: "code" },
      { key: "name", header: "Tên khóa", sort: "name" },
      { key: "program_name", header: "Chương trình", sort: "program_name" },
      { key: "start_year", header: "Năm vào", sort: "start_year", align: "right" },
      { key: "end_year", header: "Năm ra", sort: "end_year", align: "right", cell: (r) => text(r.end_year) },
      { key: "status", header: "Trạng thái", sort: "status", cell: (r) => renderStatus(cohortStatusMap, r.status) },
    ],
    fields: [
      { key: "program_id", label: "Chương trình đào tạo", type: "select", required: true, optionsFrom: "programs", wide: true },
      { key: "code", label: "Mã khóa", type: "text", required: true, placeholder: "VD: D23" },
      { key: "name", label: "Tên khóa", type: "text", required: true },
      { key: "start_year", label: "Năm vào học", type: "number", required: true },
      { key: "end_year", label: "Năm tốt nghiệp dự kiến", type: "number" },
      { key: "status", label: "Trạng thái", type: "select", required: true, options: cohortStatus },
    ],
    filters: [{ param: "program_id", label: "Chương trình", optionsFrom: "programs" }, { param: "status", label: "Trạng thái", options: cohortStatus }],
    defaults: { program_id: "", code: "", name: "", start_year: "", end_year: "", status: "active" },
    csv: { headers: ["program_code", "code", "name", "start_year", "end_year", "status"], example: ["QTKD", "D25", "Khóa 2025 – Quản trị kinh doanh", "2025", "2029", "active"], hint: "program_code là mã chương trình đã có." },
  },
  classes: {
    path: "classes",
    title: "Lớp hành chính",
    singular: "lớp hành chính",
    description: "Lớp sinh hoạt của sinh viên theo chương trình, khóa và cố vấn học tập.",
    searchPlaceholder: "Tìm theo mã, tên lớp, chương trình, khóa hoặc cố vấn...",
    fileName: "lop-hanh-chinh",
    columns: [
      { key: "code", header: "Mã lớp", sort: "code" },
      { key: "name", header: "Tên lớp", sort: "name" },
      { key: "program_name", header: "Chương trình", sort: "program_name" },
      { key: "cohort_name", header: "Khóa", sort: "cohort_name", cell: (r) => text(r.cohort_code) },
      { key: "advisor_name", header: "Cố vấn học tập", sort: "advisor_name", cell: (r) => text(r.advisor_name) },
      { key: "capacity", header: "Sĩ số", sort: "capacity", align: "right" },
      { key: "expected_graduation_year", header: "Dự kiến ra trường", sort: "expected_graduation_year", align: "right", cell: (r) => text(r.expected_graduation_year) },
      { key: "status", header: "Trạng thái", sort: "status", cell: (r) => renderStatus(classStatusMap, r.status) },
    ],
    fields: [
      { key: "program_id", label: "Chương trình đào tạo", type: "select", required: true, optionsFrom: "programs", wide: true },
      { key: "cohort_id", label: "Khóa", type: "select", optionsFrom: "cohorts", dependsOn: "program_id", hint: "Chọn chương trình trước để lọc khóa." },
      { key: "advisor_id", label: "Cố vấn học tập", type: "select", optionsFrom: "advisors", hint: "Giảng viên hoặc cán bộ có vai trò cố vấn." },
      { key: "code", label: "Mã lớp", type: "text", required: true, placeholder: "VD: D23QTKD01" },
      { key: "name", label: "Tên lớp", type: "text", required: true },
      { key: "capacity", label: "Sĩ số", type: "number" },
      { key: "expected_graduation_year", label: "Năm dự kiến ra trường", type: "number" },
      { key: "status", label: "Trạng thái", type: "select", required: true, options: classStatus },
      { key: "description", label: "Ghi chú", type: "textarea", wide: true },
    ],
    filters: [{ param: "program_id", label: "Chương trình", optionsFrom: "programs" }, { param: "cohort_id", label: "Khóa", optionsFrom: "cohorts" }, { param: "advisor_id", label: "Cố vấn", optionsFrom: "advisors" }, { param: "status", label: "Trạng thái", options: classStatus }],
    defaults: { program_id: "", cohort_id: "", advisor_id: "", code: "", name: "", capacity: "", expected_graduation_year: "", status: "active", description: "" },
    csv: { headers: ["program_code", "cohort_code", "advisor_email", "code", "name", "expected_graduation_year", "capacity", "status", "description"], example: ["QTKD", "D23", "advisor@eript.test", "D23QTKD02", "D23QTKD02", "2027", "60", "active", ""], hint: "program_code, cohort_code là mã đã có (khóa phải thuộc đúng chương trình); advisor_email là email cố vấn đã có, có thể để trống." },
  },
};

export const RESOURCE_ORDER = ["program-types", "programs", "academic-years", "terms", "cohorts", "classes"];
