import type { ReactNode, SVGProps } from "react";

/**
 * In-house icon set. One 24x24 grid, 1.75px stroke, round caps and joins, currentColor.
 * Decorative by default (aria-hidden); pass `title` to expose the icon as an image with a name.
 */
export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "children" | "title"> {
  /** Pixel size (width and height). Defaults to 16; a `size-*` class on className wins. */
  size?: number | string;
  /** Accessible name. Makes the icon `role="img"` instead of aria-hidden. */
  title?: string;
}

export type IconComponent = (props: IconProps) => ReactNode;

function createIcon(displayName: string, body: ReactNode): IconComponent {
  const Icon: IconComponent = ({ size = 16, title, className, ...rest }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ? `shrink-0 ${className}` : "shrink-0"}
      {...(title ? { role: "img", "aria-label": title } : { "aria-hidden": true, focusable: false })}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {body}
    </svg>
  );
  (Icon as { displayName?: string }).displayName = displayName;
  return Icon;
}

const dot = (cx: number) => <circle key={cx} cx={cx} cy={12} r={1.4} fill="currentColor" stroke="none" />;
const person = (
  <>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6" />
  </>
);
const eyeShape = (
  <>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </>
);

export const LogoIcon = createIcon("LogoIcon", (
  <>
    <path d="M2 9l10-5 10 5-10 5z" />
    <path d="M6 11.5V16c0 1.2 2.7 3 6 3s6-1.8 6-3v-4.5" />
    <path d="M22 9v6" />
  </>
));
export const DashboardIcon = createIcon("DashboardIcon", (
  <>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </>
));
export const HomeIcon = createIcon("HomeIcon", (
  <>
    <path d="M3.5 11L12 4l8.5 7" />
    <path d="M5.5 9.5V20h13V9.5" />
    <path d="M10 20v-5.5h4V20" />
  </>
));
export const UsersIcon = createIcon("UsersIcon", (
  <>
    {person}
    <path d="M16 5.2a3 3 0 0 1 0 5.6" />
    <path d="M18 14.3c2.2.7 3.5 2.6 3.5 5.2" />
  </>
));
export const UserIcon = createIcon("UserIcon", (
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 21c0-4 3.4-7 7.5-7s7.5 3 7.5 7" />
  </>
));
export const UserPlusIcon = createIcon("UserPlusIcon", (
  <>
    {person}
    <path d="M19 8v6M16 11h6" />
  </>
));
export const UserCheckIcon = createIcon("UserCheckIcon", (
  <>
    {person}
    <path d="M16 11l2 2 4-4" />
  </>
));
export const KeyIcon = createIcon("KeyIcon", (
  <>
    <circle cx="7.5" cy="15.5" r="4" />
    <path d="M10.5 12.5L21 2" />
    <path d="M17 6l3 3" />
  </>
));
export const ShieldIcon = createIcon("ShieldIcon", <path d="M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6z" />);
export const ShieldCheckIcon = createIcon("ShieldCheckIcon", (
  <>
    <path d="M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6z" />
    <path d="M8.5 12l2.5 2.5 4.5-5" />
  </>
));
export const SettingsIcon = createIcon("SettingsIcon", (
  <>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </>
));
export const BookIcon = createIcon("BookIcon", (
  <>
    <path d="M12 6.5C10.5 5 8 4.5 4 4.5v13c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-13c-4 0-6.5.5-8 2z" />
    <path d="M12 6.5v13" />
  </>
));
export const ClipboardIcon = createIcon("ClipboardIcon", (
  <>
    <rect x="5" y="4" width="14" height="17" rx="2" />
    <rect x="9" y="2.5" width="6" height="3" rx="1" />
    <path d="M9 11h6M9 15h4" />
  </>
));
export const ClipboardCheckIcon = createIcon("ClipboardCheckIcon", (
  <>
    <rect x="5" y="4" width="14" height="17" rx="2" />
    <rect x="9" y="2.5" width="6" height="3" rx="1" />
    <path d="M9 13.5l2 2 4-4.5" />
  </>
));
export const SchoolIcon = createIcon("SchoolIcon", (
  <>
    <path d="M3 21h18" />
    <path d="M5 21V10l7-5 7 5v11" />
    <path d="M10 21v-5h4v5" />
    <circle cx="12" cy="10" r="1" />
  </>
));
export const NewsIcon = createIcon("NewsIcon", (
  <>
    <path d="M4 5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v14.5a1.5 1.5 0 0 0 1.5 1.5H6a2 2 0 0 1-2-2z" />
    <path d="M18 9h2a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2" />
    <path d="M8 8h6M8 12h6M8 16h4" />
  </>
));
export const BellIcon = createIcon("BellIcon", (
  <>
    <path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z" />
    <path d="M10 21h4" />
  </>
));
export const SearchIcon = createIcon("SearchIcon", (
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </>
));
export const PlusIcon = createIcon("PlusIcon", <path d="M12 5v14M5 12h14" />);
export const MinusIcon = createIcon("MinusIcon", <path d="M5 12h14" />);
export const CheckIcon = createIcon("CheckIcon", <path d="M5 12.5l4.5 4.5L19 7.5" />);
export const XIcon = createIcon("XIcon", <path d="M6 6l12 12M18 6L6 18" />);
export const ChevronUpIcon = createIcon("ChevronUpIcon", <path d="M6 15l6-6 6 6" />);
export const ChevronDownIcon = createIcon("ChevronDownIcon", <path d="M6 9l6 6 6-6" />);
export const ChevronLeftIcon = createIcon("ChevronLeftIcon", <path d="M15 6l-6 6 6 6" />);
export const ChevronRightIcon = createIcon("ChevronRightIcon", <path d="M9 6l6 6-6 6" />);
export const ArrowLeftIcon = createIcon("ArrowLeftIcon", <path d="M19 12H5M11 6l-6 6 6 6" />);
export const ArrowRightIcon = createIcon("ArrowRightIcon", <path d="M5 12h14M13 6l6 6-6 6" />);
export const MoreHorizontalIcon = createIcon("MoreHorizontalIcon", [5, 12, 19].map(dot));
export const EyeIcon = createIcon("EyeIcon", eyeShape);
export const EyeOffIcon = createIcon("EyeOffIcon", (
  <>
    {eyeShape}
    <path d="M4 4l16 16" />
  </>
));
export const TrashIcon = createIcon("TrashIcon", (
  <>
    <path d="M4 7h16" />
    <path d="M9 7V4.5h6V7" />
    <path d="M6 7l1 13h10l1-13" />
    <path d="M10 11v6M14 11v6" />
  </>
));
export const EditIcon = createIcon("EditIcon", (
  <>
    <path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z" />
    <path d="M14 7l3 3" />
  </>
));
export const RefreshIcon = createIcon("RefreshIcon", (
  <>
    <path d="M20 11a8 8 0 0 0-14.3-4.3L4 8.5" />
    <path d="M4 4v4.5h4.5" />
    <path d="M4 13a8 8 0 0 0 14.3 4.3L20 15.5" />
    <path d="M20 20v-4.5h-4.5" />
  </>
));
export const ResetIcon = createIcon("ResetIcon", (
  <>
    <path d="M4 12a8 8 0 1 0 2.5-5.8L4 8.5" />
    <path d="M4 4v4.5h4.5" />
  </>
));
export const UploadIcon = createIcon("UploadIcon", (
  <>
    <path d="M12 16V4M7 9l5-5 5 5" />
    <path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
  </>
));
export const DownloadIcon = createIcon("DownloadIcon", (
  <>
    <path d="M12 4v12M7 11l5 5 5-5" />
    <path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
  </>
));
export const ImageIcon = createIcon("ImageIcon", (
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="10" r="1.5" />
    <path d="M3 17l5-5 4 4 3-3 6 6" />
  </>
));
export const LinkIcon = createIcon("LinkIcon", (
  <>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </>
));
export const MailIcon = createIcon("MailIcon", (
  <>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3.5 7l8.5 6 8.5-6" />
  </>
));
export const MailCheckIcon = createIcon("MailCheckIcon", (
  <>
    <path d="M21 11V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8" />
    <path d="M3.5 7L12 13l8.5-6" />
    <path d="M16 18l2 2 4-4" />
  </>
));
export const PhoneIcon = createIcon("PhoneIcon", <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />);
export const MapPinIcon = createIcon("MapPinIcon", (
  <>
    <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </>
));
export const LockIcon = createIcon("LockIcon", (
  <>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </>
));
export const UnlockIcon = createIcon("UnlockIcon", (
  <>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 7.7-1.5" />
  </>
));
export const LogoutIcon = createIcon("LogoutIcon", (
  <>
    <path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4" />
    <path d="M16 8l4 4-4 4M20 12H9" />
  </>
));
export const MenuIcon = createIcon("MenuIcon", <path d="M4 6h16M4 12h16M4 18h16" />);
export const FilterIcon = createIcon("FilterIcon", <path d="M4 5h16l-6 7.5V19l-4 2v-8.5z" />);
export const SortIcon = createIcon("SortIcon", (
  <>
    <path d="M8 20V4M4 16l4 4 4-4" />
    <path d="M16 4v16M12 8l4-4 4 4" />
  </>
));
export const CalendarIcon = createIcon("CalendarIcon", (
  <>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </>
));
export const ClockIcon = createIcon("ClockIcon", (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </>
));
export const AlertTriangleIcon = createIcon("AlertTriangleIcon", (
  <>
    <path d="M12 3.5L2.5 20h19z" />
    <path d="M12 10v4.5M12 17.5h.01" />
  </>
));
export const InfoIcon = createIcon("InfoIcon", (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 7.5h.01" />
  </>
));
export const CheckCircleIcon = createIcon("CheckCircleIcon", (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.5l3 3 5-6" />
  </>
));
export const XCircleIcon = createIcon("XCircleIcon", (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M9 9l6 6M15 9l-6 6" />
  </>
));
export const CopyIcon = createIcon("CopyIcon", (
  <>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" />
  </>
));
export const ExternalLinkIcon = createIcon("ExternalLinkIcon", (
  <>
    <path d="M14 4h6v6M20 4l-9 9" />
    <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
  </>
));
export const InboxIcon = createIcon("InboxIcon", (
  <>
    <path d="M3 13l3-8h12l3 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
    <path d="M3 13h5l1 3h6l1-3h5" />
  </>
));
export const PaletteIcon = createIcon("PaletteIcon", (
  <>
    <path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.9 2-2 0-.6-.3-1-.5-1.5s-.5-.9-.5-1.5c0-1 .8-2 2-2h2a4 4 0 0 0 4-4c0-4.4-4-7-9-7z" />
    <circle cx="7.5" cy="11" r="1" />
    <circle cx="10.5" cy="7" r="1" />
    <circle cx="15.5" cy="7.5" r="1" />
  </>
));
/** Open arc; spin it with `animate-spin` (transform only). */
export const SpinnerIcon = createIcon("SpinnerIcon", (
  <>
    <circle cx="12" cy="12" r="9" opacity=".2" />
    <path d="M12 3a9 9 0 0 1 9 9" />
  </>
));

/* Studio / course authoring icons */
export const GripIcon = createIcon("GripIcon", (
  <>
    <circle cx="9" cy="6" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="15" cy="6" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="9" cy="18" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="15" cy="18" r="1.2" fill="currentColor" stroke="none" />
  </>
));
export const VideoIcon = createIcon("VideoIcon", (
  <>
    <rect x="3" y="5" width="13" height="14" rx="2" />
    <path d="M16 10l5-3v10l-5-3z" />
  </>
));
export const FileTextIcon = createIcon("FileTextIcon", (
  <>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M9 13h6M9 17h6" />
  </>
));
export const StarIcon = createIcon("StarIcon", (
  <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />
));
export const MessageIcon = createIcon("MessageIcon", (
  <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
));
export const BoldIcon = createIcon("BoldIcon", (
  <>
    <path d="M7 4h6a3.5 3.5 0 0 1 0 7H7z" />
    <path d="M7 11h7a3.5 3.5 0 0 1 0 7H7z" />
  </>
));
export const ItalicIcon = createIcon("ItalicIcon", <path d="M14 4h-4M14 20h-4M15 4l-6 16" />);
export const ListIcon = createIcon("ListIcon", (
  <>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none" />
    <circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none" />
  </>
));
export const ListOrderedIcon = createIcon("ListOrderedIcon", (
  <>
    <path d="M10 6h10M10 12h10M10 18h10" />
    <path d="M4 5l1.5-1v5M4 14.5c0-1 2.5-1 2.5.3 0 1-2.5 2-2.5 3.2h2.7" />
  </>
));
export const QuoteIcon = createIcon("QuoteIcon", (
  <>
    <path d="M5 17v-4a4 4 0 0 1 4-4M5 17h4v-4H5" />
    <path d="M14 17v-4a4 4 0 0 1 4-4M14 17h4v-4h-4" />
  </>
));
export const UndoIcon = createIcon("UndoIcon", (
  <>
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
  </>
));
export const RedoIcon = createIcon("RedoIcon", (
  <>
    <path d="M15 14l5-5-5-5" />
    <path d="M20 9H10a6 6 0 0 0 0 12h3" />
  </>
));
export const SendIcon = createIcon("SendIcon", (
  <>
    <path d="M21 3L3 10.5l7 3 3 7z" />
    <path d="M21 3l-11 10.5" />
  </>
));
export const BarChartIcon = createIcon("BarChartIcon", (
  <>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </>
));
export const BoxIcon = createIcon("BoxIcon", (
  <>
    <path d="M12 3l8 4v10l-8 4-8-4V7z" />
    <path d="M4 7l8 4 8-4M12 11v10" />
  </>
));
export const PaperclipIcon = createIcon("PaperclipIcon", (
  <path d="M20 11.5l-8.3 8.3a5 5 0 0 1-7-7L13 4.5a3.3 3.3 0 0 1 4.7 4.7l-8.4 8.3a1.7 1.7 0 0 1-2.3-2.4l7.7-7.6" />
));
export const LayersIcon = createIcon("LayersIcon", (
  <>
    <path d="M12 3l9 5-9 5-9-5z" />
    <path d="M3 13l9 5 9-5" />
  </>
));
export const HeadingIcon = createIcon("HeadingIcon", <path d="M6 4v16M18 4v16M6 12h12" />);
export const MonitorIcon = createIcon("MonitorIcon", (
  <>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" />
  </>
));
