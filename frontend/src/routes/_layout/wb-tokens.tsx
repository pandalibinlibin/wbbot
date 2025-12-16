import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { WbTokensService } from "../../client";
import { TokenList } from "../../components/WBTokens/TokenList";
import { AddTokenDialog } from "../../components/WBTokens/AddTokenDialog";
import { EditTokenDialog } from "@/components/WBTokens/EditTokenDialog";

export const Route = createFileRoute("/_layout/wb-tokens")({
  component: WBTokenPage,
});

function WBTokenPage() {
  const { t } = useTranslation("wbTokens");

  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingToken, setEditingToken] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const fetchTokens = async () => {
    try {
      setLoading(true);
      const response = await WbTokensService.readWbTokens();
      setTokens(response.data || []);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to load tokens");
      console.error("Error fetching tokens:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteToken = (tokenId: string) => {
    // Remove tokenf rom local state immediately for better UX
    setTokens((prevTokens) =>
      prevTokens.filter((token) => token.id !== tokenId)
    );
    // Refresh the list to ensure consistency
    fetchTokens();
  };

  const handleEditToken = (token: any) => {
    setEditingToken(token);
    setIsEditDialogOpen(true);
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{t("title")}</h1>
      <p className="text-gray-600 mb-8">{t("description")}</p>

      <TokenList
        tokens={tokens}
        loading={loading}
        error={error}
        onRefresh={fetchTokens}
        onAddToken={() => setIsAddDialogOpen(true)}
        onDelete={handleDeleteToken}
        onEdit={handleEditToken}
      />
      <AddTokenDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={fetchTokens}
      />
      <EditTokenDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        token={editingToken}
        onSuccess={fetchTokens}
      />
    </div>
  );
}
