/**
 * All UI copy, grouped per feature. Vietnamese only for now; keeping strings in
 * plain objects makes it easy to add i18n later (swap the object by locale).
 * Other features: add a new key here (or a sibling `messages.<feature>.ts`).
 */
export const messages = {
  common: {
    appTagline: "Nền tảng quản lý học tập",
    networkError: "Không thể kết nối tới máy chủ. Vui lòng thử lại.",
    unknownError: "Đã có lỗi xảy ra. Vui lòng thử lại.",
    forbidden: "Bạn không có quyền thực hiện thao tác này.",
    notFound: "Không tìm thấy dữ liệu.",
    tooMany: "Bạn thao tác quá nhanh. Vui lòng thử lại sau.",
    serverError: "Máy chủ gặp sự cố. Vui lòng thử lại sau.",
    unavailable: "Hệ thống đang tạm thời không phản hồi. Vui lòng thử lại sau ít phút.",
    save: "Lưu",
    cancel: "Hủy",
    confirm: "Xác nhận",
    delete: "Xóa",
    edit: "Sửa",
    close: "Đóng",
    back: "Quay lại",
    search: "Tìm kiếm",
    loading: "Đang tải...",
    noData: "Chưa có dữ liệu",
    retry: "Thử lại",
    previous: "Trước",
    next: "Sau",
    page: "Trang",
    of: "trên",
    results: "kết quả",
    inDevelopment: "Đang phát triển",
    inDevelopmentHint: "Chức năng này sẽ sớm có mặt.",
    comingSoon: "Sắp có",
    required: "Trường này là bắt buộc",
    goHome: "Về trang chủ",
    theme: { light: "Sáng", dark: "Tối", system: "Theo hệ thống", toggle: "Đổi giao diện" },
    skipToContent: "Bỏ qua để tới nội dung",
  },
  landing: {
    heroTitle: "Học tập và quản lý đào tạo trên một nền tảng",
    heroSubtitle:
      "ERIPT giúp nhà trường quản lý người dùng, khóa học và kết quả học tập một cách rõ ràng, an toàn.",
    login: "Đăng nhập",
    register: "Đăng ký",
    toDashboard: "Vào trang quản trị",
    toApp: "Vào hệ thống",
    features: [
      { title: "Phân quyền chặt chẽ", text: "Vai trò và quyền hạn được kiểm soát tập trung." },
      { title: "Bảo mật phiên đăng nhập", text: "Mã truy cập không bao giờ lộ ra trình duyệt." },
      { title: "Giao diện thân thiện", text: "Sáng/tối, tối ưu cho cả máy tính lẫn điện thoại." },
    ],
  },
  auth: {
    brandTitle: "Chào mừng đến với hệ thống học tập",
    brandText: "Quản lý đào tạo, người dùng và phân quyền tập trung, an toàn và dễ sử dụng.",
    email: "Email",
    emailPlaceholder: "ban@example.com",
    password: "Mật khẩu",
    passwordConfirm: "Xác nhận mật khẩu",
    newPassword: "Mật khẩu mới",
    name: "Họ và tên",
    showPassword: "Hiện mật khẩu",
    hidePassword: "Ẩn mật khẩu",
    or: "hoặc",
    googleButton: "Tiếp tục với Google",
    invalidEmail: "Email không hợp lệ",
    passwordMin: "Mật khẩu tối thiểu 6 ký tự",
    passwordMismatch: "Xác nhận mật khẩu không khớp",
    nameRequired: "Vui lòng nhập họ và tên",
    login: {
      title: "Đăng nhập",
      subtitle: "Nhập thông tin tài khoản để tiếp tục.",
      submit: "Đăng nhập",
      forgot: "Quên mật khẩu?",
      noAccount: "Chưa có tài khoản?",
      register: "Đăng ký",
      invalid: "Email hoặc mật khẩu không đúng.",
      disabled: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.",
      unverifiedTitle: "Email chưa được xác nhận",
      unverified: "Vui lòng kiểm tra hộp thư và bấm vào liên kết xác nhận để kích hoạt tài khoản.",
      resend: "Gửi lại email xác nhận",
      resending: "Đang gửi...",
      resent: "Đã gửi lại email xác nhận. Vui lòng kiểm tra hộp thư.",
      retryIn: (s: number) => `Thử lại sau ${s} giây`,
      tooMany: "Bạn đã thử đăng nhập quá nhiều lần.",
      passwordReset: "Đặt lại mật khẩu thành công. Hãy đăng nhập bằng mật khẩu mới.",
    },
    register: {
      title: "Tạo tài khoản",
      subtitle: "Đăng ký để bắt đầu học tập.",
      submit: "Đăng ký",
      haveAccount: "Đã có tài khoản?",
      login: "Đăng nhập",
      doneTitle: "Kiểm tra email của bạn",
      done: (email: string) =>
        `Chúng tôi đã gửi liên kết xác nhận tới ${email}. Bấm vào liên kết trong email để kích hoạt tài khoản.`,
      resend: "Gửi lại email xác nhận",
      toLogin: "Về trang đăng nhập",
    },
    forgot: {
      title: "Quên mật khẩu",
      subtitle: "Nhập email, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.",
      submit: "Gửi liên kết",
      sent: "Nếu email tồn tại trong hệ thống, liên kết đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư.",
      back: "Quay lại đăng nhập",
    },
    reset: {
      title: "Đặt lại mật khẩu",
      subtitle: "Tạo mật khẩu mới cho tài khoản của bạn.",
      submit: "Đặt lại mật khẩu",
      invalidLink: "Liên kết đặt lại mật khẩu không hợp lệ hoặc thiếu thông tin.",
      requestNew: "Yêu cầu liên kết mới",
    },
    verify: {
      title: "Xác nhận email",
      loading: "Đang xác nhận email của bạn...",
      successTitle: "Xác nhận thành công",
      success: "Email của bạn đã được xác nhận. Bạn có thể đăng nhập ngay bây giờ.",
      failTitle: "Không thể xác nhận email",
      failFallback: "Liên kết xác nhận không hợp lệ hoặc đã hết hạn.",
      missing: "Liên kết xác nhận thiếu thông tin. Hãy mở lại liên kết trong email.",
      resendTitle: "Gửi lại liên kết mới",
      resend: "Gửi lại",
      resent: "Đã gửi lại email xác nhận. Vui lòng kiểm tra hộp thư.",
      toLogin: "Đăng nhập",
    },
    google: {
      title: "Đăng nhập bằng Google",
      loading: "Đang hoàn tất đăng nhập...",
      failTitle: "Đăng nhập Google không thành công",
      missing: "Không nhận được thông tin đăng nhập từ Google.",
      back: "Quay lại đăng nhập",
    },
    logout: "Đăng xuất",
  },
  admin: {
    nav: {
      groups: {
        overview: "Tổng quan",
        manage: "Quản lý",
        academic: "Học vụ",
        content: "Nội dung & đào tạo",
        system: "Hệ thống",
      },
      dashboard: "Tổng quan",
      users: "Người dùng",
      roles: "Phân quyền",
      settings: "Cài đặt hệ thống",
      courses: "Khóa học",
      exams: "Thi & kiểm tra",
      training: "Đào tạo",
      news: "Tin tức",
      partners: "Đối tác",
      programTypes: "Hệ đào tạo",
      programs: "Chương trình đào tạo",
      academicYears: "Năm học",
      terms: "Học kỳ",
      cohorts: "Khóa",
      classes: "Lớp hành chính",
      notifications: "Thông báo",
      home: "Trang chủ",
      openMenu: "Mở menu",
      closeMenu: "Đóng menu",
      breadcrumb: "Đường dẫn",
      main: "Điều hướng chính",
    },
    userMenu: { account: "Tài khoản", logout: "Đăng xuất", viewSite: "Xem trang chủ" },
    forbiddenTitle: "Không có quyền truy cập",
    forbiddenText: "Tài khoản của bạn không có quyền truy cập khu vực quản trị.",
    notFoundTitle: "Không tìm thấy trang",
    notFoundText: "Trang bạn tìm không tồn tại hoặc đã được di chuyển.",
    errorTitle: "Đã có lỗi xảy ra",
    errorText: "Không thể hiển thị trang này. Vui lòng thử lại.",
    pages: {
      dashboard: { title: "Tổng quan", description: "Số liệu chung của hệ thống." },
      users: { title: "Người dùng", description: "Quản lý tài khoản người dùng." },
      roles: { title: "Phân quyền", description: "Vai trò và quyền hạn." },
      settings: { title: "Cài đặt hệ thống", description: "Cấu hình chung của hệ thống." },
    },
  },
} as const;

/** Known English strings returned by the Go API -> Vietnamese. */
const SERVER_MESSAGES: Record<string, string> = {
  "Invalid email or password": messages.auth.login.invalid,
  "Unauthenticated.": "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  "This action is unauthorized.": messages.common.forbidden,
  "Not Found": messages.common.notFound,
  "Too Many Attempts.": messages.common.tooMany,
  "Server Error": messages.common.serverError,
  "API unreachable": messages.common.unavailable,
  "The given data was invalid.": "Dữ liệu không hợp lệ.",
  "Invalid signature.": messages.auth.verify.failFallback,
  "We have emailed your password reset link.":
    "Chúng tôi đã gửi liên kết đặt lại mật khẩu tới email của bạn.",
  "Please wait before retrying.": "Vui lòng đợi một lúc trước khi thử lại.",
  "Your password has been reset.": "Đặt lại mật khẩu thành công.",
  "This password reset token is invalid.": "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.",
  "We can't find a user with that email address.": "Không tìm thấy tài khoản với email này.",
  "The request body is not valid JSON.": "Dữ liệu gửi lên không hợp lệ.",
  "The logo must be an image URL or a site path starting with /.": "Logo phải là URL ảnh hoặc đường dẫn bắt đầu bằng /.",
  "The website url must start with http:// or https://.": "Website phải bắt đầu bằng http:// hoặc https://.",
  "The published at field must be a valid date.": "Ngày đăng không hợp lệ.",
  "The selected status is invalid.": "Trạng thái không hợp lệ.",
  "The AI service is unavailable.": "Trợ lý đang tạm thời không phản hồi. Vui lòng thử lại sau ít phút.",
  "The AI service returned an error.": "Trợ lý chưa trả lời được lúc này. Vui lòng thử lại.",
  "The message must be between 1 and 2000 characters.": "Tin nhắn phải có từ 1 đến 2000 ký tự.",
};

const PATTERNS: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [/^The route .* could not be found/i, () => "Chức năng này chưa sẵn sàng. Vui lòng quay lại sau."],
  [/has already been taken/i, () => "Giá trị này đã được sử dụng."],
  [/field is required|is required/i, () => messages.common.required],
  [/must be a valid email/i, () => messages.auth.invalidEmail],
  [/must be at least (\d+) characters/i, (m) => `Tối thiểu ${m[1]} ký tự.`],
  [/must not be greater than (\d+) characters/i, (m) => `Tối đa ${m[1]} ký tự.`],
  [/confirmation does not match|must match|do not match/i, () => messages.auth.passwordMismatch],
];

/** Translate a Go message/validation text when we know it; otherwise return it unchanged. */
export function translateServerMessage(msg: string | undefined, status = 0): string {
  if (status === 502 || status === 503 || status === 504) return messages.common.unavailable;
  if (msg) {
    if (SERVER_MESSAGES[msg]) return SERVER_MESSAGES[msg];
    for (const [re, fn] of PATTERNS) {
      const m = msg.match(re);
      if (m) return fn(m);
    }
    // Never show raw technical text from a failing server to users.
    if (status >= 500) return messages.common.serverError;
    return msg;
  }
  if (status === 429) return messages.common.tooMany;
  if (status === 403) return messages.common.forbidden;
  if (status === 404) return messages.common.notFound;
  if (status >= 500) return messages.common.serverError;
  return messages.common.unknownError;
}