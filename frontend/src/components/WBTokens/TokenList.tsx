import { useTranslation } from "react-i18next";
import { WbTokensService } from "../../client";

interface WBToken {
  id: string;
  name: string;
  environment: string;
  is_active: boolean;
  seller_name?: string;
  seller_id?: string;
  trade_mark?: string;
  last_validated_at?: string;
  total_requests: number;
  failed_requests: number;
  created_at: string;
}

interface TokenListProps {
  tokens: WBToken[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onAddToken: () => void;
  onDelete: (tokenId: string) => void;
  onEdit: (token: WBToken) => void;
}

export function TokenList({
  tokens,
  loading,
  error,
  onRefresh,
  onAddToken,
  onDelete,
  onEdit,
}: TokenListProps) {
  const { t } = useTranslation("wbTokens");
  const { t: tCommon } = useTranslation("common");

  const handleDeleteToken = async (tokenId: string) => {
    if (!window.confirm(t("deleteConfirm"))) {
      return;
    }

    try {
      await WbTokensService.deleteWbToken({ tokenId });
      onDelete(tokenId);
    } catch (error) {
      console.error("Failed to delete token:", error);
      alert("Failed to delete token. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p>{tCommon("loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <p>{error}</p>
        <button
          onClick={onRefresh}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          {tCommon("retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">
          {t("title")} ({tokens.length})
        </h2>
        <div className="flex gap-2">
          <button
            onClick={onAddToken}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            {t("addToken")}
          </button>
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {tCommon("refresh")}
          </button>
        </div>
      </div>

      {tokens.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">No tokens found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tokens.map((token) => (
            <TokenCard
              key={token.id}
              token={token}
              onDelete={handleDeleteToken}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TokenCard({
  token,
  onDelete,
  onEdit,
}: {
  token: WBToken;
  onDelete: (tokenId: string) => void;
  onEdit: (token: WBToken) => void;
}) {
  const { t } = useTranslation("wbTokens");
  const { t: tCommon } = useTranslation("common");

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium text-lg">{token.name}</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
        <div>
          {token.seller_name && (
            <p>
              <strong>{t("sellerName")}:</strong> {token.seller_name}
            </p>
          )}
          {token.trade_mark && (
            <p>
              <strong>{t("tradeMark")}:</strong> {token.trade_mark}
            </p>
          )}
        </div>
        <div>
          <p>
            <strong>{t("totalRequests")}:</strong> {token.total_requests}
          </p>
          <p>
            <strong>{t("failedRequests")}:</strong> {token.failed_requests}
          </p>
          <p>
            <strong>{tCommon("createdAt")}:</strong>{" "}
            {new Date(token.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
          onClick={() => onEdit(token)}
        >
          {tCommon("edit")}
        </button>
        <button
          className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
          onClick={() => onDelete(token.id)}
        >
          {tCommon("delete")}
        </button>
      </div>
    </div>
  );
}
