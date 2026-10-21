"use client";

import { Avatar } from "@/components/ui/avatar";
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { useSession } from "@/components/providers/session-provider";
import { messages } from "@/lib/messages";
import { ChevronDownIcon, ExternalLinkIcon, LogoutIcon } from "@/components/icons";

export function UserMenu() {
  const { user, logout } = useSession();
  const t = messages.admin.userMenu;
  return (
    <Dropdown>
      <DropdownTrigger className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-surface-muted" aria-label={`${t.account}: ${user.name}`}>
        <Avatar name={user.name} src={user.avatar} size="sm" />
        <span className="hidden max-w-36 truncate font-medium sm:block">{user.name}</span>
        <ChevronDownIcon className="size-4 text-muted" aria-hidden />
      </DropdownTrigger>
      <DropdownContent align="end" className="min-w-56">
        <div className="px-3 py-2">
          <p className="truncate font-medium">{user.name}</p>
          <p className="truncate text-sm text-muted">{user.email}</p>
        </div>
        <DropdownSeparator />
        <DropdownLabel>{t.account}</DropdownLabel>
        <DropdownItem href="/"><ExternalLinkIcon className="size-4" aria-hidden /> {t.viewSite}</DropdownItem>
        <DropdownItem danger onSelect={() => void logout()}><LogoutIcon className="size-4" aria-hidden /> {t.logout}</DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}