import { createFileRoute, Outlet, redirect, useSearch } from "@tanstack/react-router";

import { Footer } from "@/components/Common/Footer";
import AppSidebar from "@/components/Sidebar/AppSidebar";
import { ShopSelector } from "@/components/Common/ShopSelector";
import { useState, useEffect } from "react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { isLoggedIn } from "@/hooks/useAuth";

export const Route = createFileRoute("/_layout")({
  component: Layout,
  beforeLoad: async () => {
    if (!isLoggedIn()) {
      throw redirect({
        to: "/login",
      });
    }
  },
});

function Layout() {
  const [selectedShopId, setSelectedShopId] = useState<string>("");
  
  // 从localStorage初始化店铺选择
  useEffect(() => {
    const savedShopId = localStorage.getItem('selectedShopId');
    if (savedShopId) {
      setSelectedShopId(savedShopId);
      // 同时更新URL参数
      const url = new URL(window.location.href);
      url.searchParams.set("shopId", savedShopId);
      window.history.replaceState({}, "", url.toString());
    }
  }, []);
  
  // 店铺变更处理 - 同时保存到localStorage和URL
  const handleShopChange = (shopId: string) => {
    setSelectedShopId(shopId);
    // 保存到localStorage实现全局持久化
    localStorage.setItem('selectedShopId', shopId);
    // 更新当前页面URL
    const url = new URL(window.location.href);
    url.searchParams.set("shopId", shopId);
    window.history.replaceState({}, "", url.toString());
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1 text-muted-foreground" />
          <ShopSelector
            selectedShopId={selectedShopId}
            onShopChange={handleShopChange}
          />
        </header>
        <main className="flex-1 p-6 md:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  );
}

export default Layout;
