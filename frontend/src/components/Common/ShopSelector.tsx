import { useState, useEffect } from "react";
import { ChevronDown, Store } from "lucide-react";
import { useTranslation } from "react-i18next";
import { WbTokensService } from "@/client";

// 定义Token的数据结构
interface WBToken {
  id: string;
  name: string;
  seller_name?: string | null;
  trade_mark?: string | null;
  is_active?: boolean;
}

// 定义组件接收的参数
interface ShopSelectorProps {
  selectedShopId?: string;
  onShopChange: (shopId: string) => void;
}

export function ShopSelector({
  selectedShopId,
  onShopChange,
}: ShopSelectorProps) {
  const { t } = useTranslation("common");

  // 组件内部状态
  const [tokens, setTokens] = useState<WBToken[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // 更新URL参数的辅助函数
  const updateUrlWithShopId = (shopId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("shopId", shopId);
    window.history.replaceState({}, "", url.toString());
  };

  // 获取可用的店铺列表
  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const response = await WbTokensService.readWbTokens();
        const activeTokens = (response.data || []).filter(
          (token: WBToken) => token.is_active
        );
        setTokens(activeTokens);

        // ShopSelector现在只负责UI显示，不处理URL逻辑
        // 全局状态管理由Layout组件负责
      } catch (error) {
        console.error("Failed to fetch tokens:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTokens();
  }, [selectedShopId, onShopChange]);

  // 找到当前选中的店铺
  const selectedToken = tokens.find((token) => token.id === selectedShopId);

  // 格式化店铺名称显示
  const formatShopName = (token: WBToken) => {
    if (token.seller_name && token.trade_mark) {
      return `${token.seller_name} - ${token.trade_mark}`;
    }
    return token.name;
  };

  // 加载状态
  if (loading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-500">
        <Store className="h-4 w-4" />
        <span>{t("loading")}</span>
      </div>
    );
  }

  // 没有可用店铺
  if (tokens.length === 0) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-500">
        <Store className="h-4 w-4" />
        <span>{t("noShopsAvailable")}</span>
      </div>
    );
  }

  // 正常的下拉选择器
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-3 py-2 text-sm bg-white hover:bg-gray-50 border border-gray-200 rounded-md transition-colors min-w-48"
      >
        <div className="flex items-center space-x-2 min-w-0">
          <Store className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">
            {selectedToken ? formatShopName(selectedToken) : t("selectShop")}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
          {tokens.map((token) => (
            <button
              key={token.id}
              onClick={() => {
                onShopChange(token.id);
                setIsOpen(false);
                // 使用TanStack Router更新URL参数
                updateUrlWithShopId(token.id);
              }}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                selectedShopId === token.id ? "bg-blue-50 text-blue-700" : ""
              }`}
            >
              <div className="truncate">{formatShopName(token)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
