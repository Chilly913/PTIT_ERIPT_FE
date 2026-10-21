"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { useSession } from "@/components/providers/session-provider";
import { ChevronDownIcon, ExternalLinkIcon, LogoutIcon, SchoolIcon, SettingsIcon } from "@/components/icons";
import { isAdmin } from "@/lib/auth-utils";
import { studioMessages } from "@/features/studio/messages";

export function StudioUserMenu() {
  const { user, logout } = useSession();
  const t = studioMessages.userMenu;
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
        <DropdownItem href="/my"><ExternalLinkIcon className="size-4" aria-hidden /> {t.toLearn}</DropdownItem>
        {isAdmin(user) && (
          <DropdownItem href="/admin"><SettingsIcon className="size-4" aria-hidden /> {t.toAdmin}</DropdownItem>
        )}
        <DropdownItem danger onSelect={() => void logout()}><LogoutIcon className="size-4" aria-hidden /> {t.logout}</DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}

export function LearnLink() {
  return (
    <Link
      href="/my"
      className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground sm:inline-flex"
    >
      <SchoolIcon className="size-4" aria-hidden /> {studioMessages.userMenu.toLearn}
    </Link>
  );
}
