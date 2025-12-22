import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { ProductDetailsModal } from "@/components/Products/ProductDetailsModal";

export const Route = createFileRoute("/_layout/products")({
  component: ProductsPage,
});

function ProductsPage() {
  const { t } = useTranslation("products");
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [limit] = useState(10); // Products per page
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState(false);

  // 添加URL参数状态来触发重新加载
  const [urlShopId, setUrlShopId] = useState<string>("");

  // 监听全局店铺状态变化
  useEffect(() => {
    const checkShopId = () => {
      // 优先从URL读取，其次从localStorage
      const urlParams = new URLSearchParams(window.location.search);
      const urlShopId = urlParams.get("shopId") || "";
      const savedShopId = localStorage.getItem("selectedShopId");

      // 如果URL中有shopId，使用URL中的值
      if (urlShopId) {
        setUrlShopId(urlShopId);
        // 同步到localStorage
        localStorage.setItem("selectedShopId", urlShopId);
      } else if (savedShopId) {
        // 如果URL中没有但localStorage有，使用localStorage的值
        setUrlShopId(savedShopId);
        // 更新URL
        const url = new URL(window.location.href);
        url.searchParams.set("shopId", savedShopId);
        window.history.replaceState({}, "", url.toString());
      } else {
        // 都没有，设置为空
        setUrlShopId("");
      }
    };

    checkShopId();
    // 每秒检查一次状态变化
    const interval = setInterval(checkShopId, 1000);
    return () => clearInterval(interval);
  }, []);

  // 获取产品数据
  useEffect(() => {
    console.log("urlShopId:", urlShopId, "type:", typeof urlShopId);

    if (
      !urlShopId ||
      urlShopId.trim() === "" ||
      urlShopId === "undefined" ||
      urlShopId === "null"
    ) {
      console.log("No valid shop ID, showing shop selection prompt");
      setLoading(false);
      setError(null);
      return;
    }

    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        const offset = (currentPage - 1) * limit;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        // 使用 localStorage token
        try {
          const token =
            localStorage.getItem("access_token") ||
            localStorage.getItem("token");
          if (token) {
            headers["Authorization"] = `Bearer ${token}`;
            console.log("Using token from localStorage");
          } else {
            console.warn("No token found in localStorage");
          }
        } catch (e) {
          console.warn("Error getting token:", e);
        }

        const encodedShopId = encodeURIComponent(urlShopId);
        const url = `http://localhost:8000/api/v1/products/cached/${encodedShopId}?limit=${limit}&offset=${offset}`;

        console.log("Fetching products from:", url);
        console.log("Request headers:", headers);

        const response = await fetch(url, {
          method: "GET",
          headers,
          mode: "cors",
        }).catch((error) => {
          console.error("Fetch failed:", error);
          throw new Error(`Network error: ${error.message}`);
        });

        console.log("Response received!");
        console.log("Response status:", response.status, response.statusText);
        console.log(
          "Response headers:",
          Object.fromEntries(response.headers.entries())
        );

        if (!response.ok) {
          const text = await response.text();
          console.error("Response text:", text.substring(0, 200) + "...");
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log("JSON parsed successfully");
        console.log("Result structure:", {
          success: result.success,
          hasData: !!result.data,
          dataKeys: result.data ? Object.keys(result.data) : [],
          productsCount: result.data?.products?.length,
          total: result.data?.total,
          cached_count: result.data?.cached_count,
          cursor: result.data?.cursor,
        });
        console.log("Full backend response data:", result.data);

        if (result.success) {
          const data = result.data as any;
          console.log(
            "✅ API Success - Products found:",
            data.products?.length || 0
          );
          console.log("Total products available:", data.total);
          console.log("Setting products state...");

          // Backend now handles sorting by updatedAt, just set the products directly
          setProducts(data.products || []);

          // 设置总产品数 - 优先使用 cached_count，然后是 total，最后是当前产品数量
          const totalCount =
            data.cached_count ||
            data.total ||
            data.cursor?.total ||
            data.products?.length ||
            0;
          console.log("Setting totalProducts to:", totalCount, "from data:", {
            cached_count: data.cached_count,
            total: data.total,
            cursor_total: data.cursor?.total,
            products_length: data.products?.length,
          });
          setTotalProducts(totalCount);
          console.log("✅ State updated successfully");

          // 检查缓存状态并自动同步
          if (!data.products || data.products.length === 0) {
            console.log(
              "🔄 No cached products found, automatically syncing all products..."
            );
            setSyncStatus("🔄 首次加载，正在同步所有产品...");
            await triggerSync();
          } else if (
            data.total &&
            data.cached_count &&
            data.cached_count < data.total
          ) {
            console.log(
              `🔄 Only ${data.cached_count} of ${data.total} products are cached. Auto-syncing all products...`
            );
            setSyncStatus(
              `🔄 发现 ${data.total - data.cached_count} 个新产品，正在同步...`
            );
            await triggerSync();
          } else {
            console.log(
              `✅ All ${data.products.length} products are cached and up to date.`
            );
          }
        } else {
          console.error("API Error:", result);
          setError(result.message || "Failed to fetch products");
        }
      } catch (err) {
        console.error("Fetch Error:", err);
        setError(
          `Error fetching products: ${err instanceof Error ? err.message : String(err)}`
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [urlShopId, currentPage, limit]);

  // 触发产品同步
  const triggerSync = async () => {
    // 防止重复同步
    if (isSyncing) {
      console.log("⚠️ Sync already in progress, skipping...");
      return;
    }

    try {
      setIsSyncing(true);
      setSyncStatus("🔄 正在同步所有产品...");

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // 使用 localStorage token
      const token =
        localStorage.getItem("access_token") || localStorage.getItem("token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      console.log("🔄 Starting full product sync...");
      const response = await fetch(
        `http://localhost:8000/api/v1/products/sync/${urlShopId}`,
        {
          method: "POST",
          headers,
        }
      );

      const result = await response.json();

      if (result.success) {
        const syncedCount = result.data?.cached_count || 0;
        console.log("✅ Products synced successfully:", syncedCount);

        // Check for WB API limitation warning
        let statusMessage = `✅ 成功同步 ${syncedCount} 个产品`;
        if (result.warning) {
          statusMessage += ` (${result.warning})`;
        }
        setSyncStatus(statusMessage);

        // 重新获取产品数据
        const fetchProducts = async () => {
          const response = await fetch(
            `http://localhost:8000/api/v1/products/cached/${urlShopId}?limit=${limit}&offset=${(currentPage - 1) * limit}`,
            {
              method: "GET",
              headers,
            }
          );

          const result = await response.json();

          if (result.success) {
            const data = result.data as any;
            setProducts(data.products || []);
            setTotalProducts(data.total || data.products?.length || 0);
          }
        };

        await fetchProducts();
      } else {
        console.error("❌ Sync failed:", result.message);
        setSyncStatus(`❌ 同步失败: ${result.message}`);
      }
    } catch (error) {
      console.error("❌ Sync error:", error);
      setSyncStatus(
        `❌ 同步错误: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setIsSyncing(false);
      // 3秒后清除状态消息
      setTimeout(() => setSyncStatus(""), 3000);
    }
  };

  // 分页处理
  const totalPages = Math.ceil(totalProducts / limit);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // 如果没有选择店铺，显示提示
  if (
    (!urlShopId ||
      urlShopId.trim() === "" ||
      urlShopId === "undefined" ||
      urlShopId === "null") &&
    !loading
  ) {
    console.log("Showing shop selection prompt");
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">
            Product Management
          </h1>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-500">
            Please select a shop from the WB Tokens page to view products.
          </p>
        </div>
      </div>
    );
  }

  console.log("Render state:", {
    loading,
    error: !!error,
    productsLength: products.length,
    totalProducts,
    totalPages,
    currentPage,
    shouldShowTable: !loading && !error && products.length > 0,
    shouldShowPagination: totalPages > 1,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Product Management
          </h1>
          <p className="text-gray-600">Manage your Wildberries product cards</p>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={triggerSync}
            disabled={isSyncing}
            className={`px-4 py-2 text-white rounded-md transition-colors ${
              isSyncing
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {isSyncing ? "🔄 同步中..." : "🔄 Sync All Products"}
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            {t("addProduct")}
          </button>
        </div>
      </div>

      {/* Sync status */}
      {syncStatus && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <p className="text-blue-800">{syncStatus}</p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="text-center py-8">
          <p className="text-gray-500">Loading products...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="text-center py-8">
          <p className="text-red-500">Error: {error}</p>
        </div>
      )}

      {/* Products table */}
      {!loading && !error && products.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Image
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Brand
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Updated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.nmID} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex-shrink-0 h-16 w-16">
                      {product.photos && product.photos.length > 0 ? (
                        <img
                          className="h-16 w-16 rounded-lg object-cover"
                          src={product.photos[0].big}
                          alt={product.title}
                          onError={(e) => {
                            e.currentTarget.src =
                              product.photos[0].c516x688 ||
                              product.photos[0].c246x328 ||
                              "";
                          }}
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-lg bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-400 text-xs">
                            No Image
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {product.title}
                    </div>
                    <div className="text-sm text-gray-500">
                      {product.subjectName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.brand || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.vendorCode || product.nmID}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(product.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedProduct(product);
                        setShowDetailsModal(true);
                      }}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{" "}
                <span className="font-medium">
                  {(currentPage - 1) * limit + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {Math.min(currentPage * limit, totalProducts)}
                </span>{" "}
                of <span className="font-medium">{totalProducts}</span> results
              </p>
            </div>
            <div>
              <nav
                className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                aria-label="Pagination"
              >
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === currentPage
                          ? "z-10 bg-indigo-50 border-indigo-500 text-indigo-600"
                          : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Product Details Modal */}
      {showDetailsModal && selectedProduct && (
        <ProductDetailsModal
          product={selectedProduct}
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
        />
      )}
    </div>
  );
}
