import type { IOptions } from "sanitize-html";

/** Allow-list for instructor-authored rich text (course description, text lessons). */
export const sanitizeOptions: IOptions = {
  allowedTags: [
    "p", "br", "hr", "div", "span", "strong", "b", "em", "i", "u", "s", "sub", "sup", "mark", "small",
    "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "blockquote", "pre", "code",
    "a", "img", "figure", "figcaption", "table", "thead", "tbody", "tr", "th", "td", "iframe",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    iframe: ["src", "title", "width", "height", "allowfullscreen", "allow", "frameborder"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
    ol: ["start"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https"], iframe: ["https"] },
  allowedIframeHostnames: ["www.youtube-nocookie.com", "www.youtube.com", "player.vimeo.com"],
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, rel: "noopener noreferrer nofollow", target: "_blank" },
    }),
    h1: "h2",
  },
};

/** Typography for sanitised HTML (the global stylesheet has no prose plugin). */
export const richClass =
  "text-[1rem] leading-7 break-words [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-border-strong [&_blockquote]:pl-4 [&_blockquote]:text-muted " +
  "[&_code]:rounded [&_code]:bg-surface-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.9em] [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold " +
  "[&_h4]:mt-4 [&_h4]:mb-1 [&_h4]:font-semibold [&_iframe]:aspect-video [&_iframe]:h-auto [&_iframe]:w-full [&_iframe]:rounded-lg [&_img]:my-3 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg " +
  "[&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-surface-muted [&_pre]:p-3 " +
  "[&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:bg-surface-muted [&_th]:p-2 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&>*:first-child]:mt-0";
