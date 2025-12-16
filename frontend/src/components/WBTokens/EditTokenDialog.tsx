import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WbTokensService } from "../../client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

interface EditTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: WBToken | null;
  onSuccess?: () => void;
}

export function EditTokenDialog({
  open,
  onOpenChange,
  token,
  onSuccess,
}: EditTokenDialogProps) {
  const { t } = useTranslation("wbTokens");
  const { t: tCommon } = useTranslation("common");

  // Form state management
  const [name, setName] = useState(token?.name || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<{
    name?: string;
  }>({});

  // Form validation
  const validateForm = () => {
    const newErrors: { name?: string } = {};

    if (!name.trim()) {
      newErrors.name = t("tokenNameRequired");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !token) return;

    setIsSubmitting(true);

    try {
      const response = await WbTokensService.updateWbToken({
        tokenId: token.id,
        requestBody: {
          name: name.trim(),
        },
      });

      console.log("Token updated successfully", response);
      // Reset form
      setErrors({});
      // Close dialog and refresh list
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Failed to update token:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update form when token changes
  React.useEffect(() => {
    if (token) {
      setName(token.name);
      setErrors({});
    }
  }, [token]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("editToken")}</DialogTitle>
          <DialogDescription>{t("editTokenDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-token-name">{t("tokenName")}</Label>
            <Input
              id="edit-token-name"
              placeholder={t("tokenNamePlaceholder")}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) {
                  setErrors((prev) => ({ ...prev, name: undefined }));
                }
              }}
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {tCommon("cancel")}
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? tCommon("loading") : tCommon("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
