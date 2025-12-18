import { Home, Users, Key, Package } from "lucide-react";

import { SidebarAppearance } from "@/components/Common/Appearance";
import { LanguageSwitcher } from "@/components/Common/LanguageSwitcher";
import { Logo } from "@/components/Common/Logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import useAuth from "@/hooks/useAuth";
import { type Item, Main } from "./Main";
import { User } from "./User";
import { useTranslation } from "react-i18next";

export function AppSidebar() {
  const { user: currentUser } = useAuth();
  const { t } = useTranslation("common");

  const baseItems: Item[] = [
    { icon: Home, title: t("dashboard"), path: "/" },
    { icon: Package, title: t("products"), path: "/products" },
    { icon: Key, title: t("wbTokens"), path: "/wb-tokens" },
  ];

  const items = currentUser?.is_superuser
    ? [...baseItems, { icon: Users, title: t("admin"), path: "/admin" }]
    : baseItems;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-6 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center">
        <Logo variant="responsive" />
      </SidebarHeader>
      <SidebarContent>
        <Main items={items} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarAppearance />
        <LanguageSwitcher />
        <User user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  );
}

export default AppSidebar;
