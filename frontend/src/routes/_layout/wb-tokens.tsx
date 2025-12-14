import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/wb-tokens")({
  component: WBTokensPage,
});

function WBTokensPage() {
  return (
    <div className="container max-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">WB Token 管理</h1>
      <p>这里将显示 Wildberries Token 列表</p>
    </div>
  );
}
