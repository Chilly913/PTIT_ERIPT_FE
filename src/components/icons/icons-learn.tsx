import type { ReactNode } from "react";
import type { IconComponent, IconProps } from "./icons";

/**
 * Learner-side icons (same 24x24 grid, 1.75px stroke, round joins as icons.tsx).
 * Kept in their own file so parallel feature work never edits the same lines.
 */
function make(displayName: string, body: ReactNode): IconComponent {
  const Icon: IconComponent = ({ size = 16, title, className, ...rest }: IconProps) => (
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

export const PlayIcon = make("PlayIcon", <path d="M7 4.5v15l12-7.5z" />);
export const PlayCircleIcon = make("PlayCircleIcon", (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M10 8.5v7l6-3.5z" />
  </>
));
export const VideoIcon = make("VideoIcon", (
  <>
    <rect x="2.5" y="6" width="13" height="12" rx="2" />
    <path d="M15.5 10.5l6-3.5v10l-6-3.5z" />
  </>
));
export const FileTextIcon = make("FileTextIcon", (
  <>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M9 13h6M9 17h6" />
  </>
));
export const PackageIcon = make("PackageIcon", (
  <>
    <path d="M12 3l8.5 4.5v9L12 21l-8.5-4.5v-9z" />
    <path d="M3.5 7.5L12 12l8.5-4.5M12 12v9" />
  </>
));
export const HelpCircleIcon = make("HelpCircleIcon", (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01" />
  </>
));
export const StarIcon = make("StarIcon", <path d="M12 3.5l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6-4.5-4.2 6.1-.8z" />);
export const MessageSquareIcon = make("MessageSquareIcon", <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1z" />);
export const PaperclipIcon = make("PaperclipIcon", <path d="M20 11.5l-8.2 8.2a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8" />);
export const ThumbsUpIcon = make("ThumbsUpIcon", (
  <>
    <path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z" />
    <path d="M7 11l4-7a2 2 0 0 1 2 2v4h5.5a2 2 0 0 1 2 2.3l-1 6A2 2 0 0 1 17.5 20H7" />
  </>
));
export const ThumbsDownIcon = make("ThumbsDownIcon", (
  <>
    <path d="M17 13V4h3a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1z" />
    <path d="M17 13l-4 7a2 2 0 0 1-2-2v-4H5.5a2 2 0 0 1-2-2.3l1-6A2 2 0 0 1 6.5 4H17" />
  </>
));
export const AwardIcon = make("AwardIcon", (
  <>
    <circle cx="12" cy="9" r="6" />
    <path d="M8.5 14L7 21l5-3 5 3-1.5-7" />
  </>
));
export const ListIcon = make("ListIcon", <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />);
export const SendIcon = make("SendIcon", <path d="M21 3L10 14M21 3l-7 18-4-7-7-4z" />);
export const LayersIcon = make("LayersIcon", (
  <>
    <path d="M12 3l9 5-9 5-9-5z" />
    <path d="M3 13l9 5 9-5" />
  </>
));
export const BarChartIcon = make("BarChartIcon", <path d="M5 20V12M12 20V5M19 20v-5" />);
export const PanelLeftIcon = make("PanelLeftIcon", (
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M9 4v16" />
  </>
));
export const ReplyIcon = make("ReplyIcon", <path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 6 6v3" />);
export const GlobeIcon = make("GlobeIcon", (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z" />
  </>
));
export const HeadphonesIcon = make("HeadphonesIcon", (
  <>
    <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
    <rect x="3" y="14" width="4" height="6" rx="1.5" />
    <rect x="17" y="14" width="4" height="6" rx="1.5" />
  </>
));
export const KeyboardIcon = make("KeyboardIcon", (
  <>
    <rect x="2.5" y="6" width="19" height="12" rx="2" />
    <path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M7 14h10" />
  </>
));
export const FlagIcon = make("FlagIcon", <path d="M5 21V4M5 4h11l-2 4 2 4H5" />);
export const SchoolBoardIcon = make("SchoolBoardIcon", (
  <>
    <rect x="3" y="4" width="18" height="12" rx="1.5" />
    <path d="M8 20l4-4 4 4M7 8h6M7 11h4" />
  </>
));

export const LEARN_ICON_NAMES: { name: string; Icon: IconComponent }[] = [
  ["Play", PlayIcon], ["PlayCircle", PlayCircleIcon], ["Video", VideoIcon], ["FileText", FileTextIcon], ["Package", PackageIcon],
  ["HelpCircle", HelpCircleIcon], ["Star", StarIcon], ["MessageSquare", MessageSquareIcon], ["Paperclip", PaperclipIcon],
  ["ThumbsUp", ThumbsUpIcon], ["ThumbsDown", ThumbsDownIcon], ["Award", AwardIcon], ["List", ListIcon], ["Send", SendIcon],
  ["Layers", LayersIcon], ["BarChart", BarChartIcon], ["PanelLeft", PanelLeftIcon], ["Reply", ReplyIcon], ["Globe", GlobeIcon],
  ["Headphones", HeadphonesIcon], ["Keyboard", KeyboardIcon], ["Flag", FlagIcon], ["SchoolBoard", SchoolBoardIcon],
].map(([name, Icon]) => ({ name: name as string, Icon: Icon as IconComponent }));
