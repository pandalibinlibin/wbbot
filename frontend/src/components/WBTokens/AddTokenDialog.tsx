import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WbTokensService } from "../../client";
import { Label } from "@/components/ui/label";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AddTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddTokenDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddTokenDialogProps) {
  const { t } = useTranslation("wbTokens");
  const { t: tCommon } = useTranslation("common");

  // Form state management
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<{
    name?: string;
    token?: string;
  }>({});

  // Form validation
  const validateForm = () => {
    const newErrors: { name?: string; token?: string } = {};

    if (!name.trim()) {
      newErrors.name = t("tokenNameRequired");
    }

    if (!token.trim()) {
      newErrors.token = t("tokenValueRequired");
    } else if (token.trim().length < 10) {
      newErrors.token = t("tokenValueTooShort");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const response = await WbTokensService.createWbToken({
        requestBody: {
          name: name.trim(),
          token: token.trim(),
          environment: "production",
          is_active: true,
        },
      });

      console.log("Token created successfully", response);
      // Reset form
      setName("");
      setToken("");
      setErrors({});

      // Close dialog and refresh list
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Failed to create token:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      if (error.body) {
        console.error("Error body:", error.body);
      }
      
      // Show user-friendly error message
      let errorMessage = "创建Token失败，请稍后重试";
      if (error.body?.detail) {
        if (error.body.detail.includes("timeout")) {
          errorMessage = "网络请求超时，请检查网络连接后重试";
        } else if (error.body.detail.includes("Invalid token")) {
          errorMessage = "Token无效，请检查Token是否正确";
        } else {
          errorMessage = error.body.detail;
        }
      }
      
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("addToken")}</DialogTitle>
          <DialogDescription>{t("addTokenDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token-name">{t("tokenName")}</Label>
            <Input
              id="token-name"
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

          <div className="space-y-2">
            <Label htmlFor="token-value">{t("tokenValue")}</Label>
            <textarea
              id="token-value"
              placeholder={t("tokenValuePlaceholder")}
              className={`min-h-[100px] resize-none flex w-full rounded-md border px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                errors.token ? "border-red-500" : "border-input"
              } bg-background`}
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                if (errors.token) {
                  setErrors((prev) => ({ ...prev, token: undefined }));
                }
              }}
            />
            {errors.token && (
              <p className="text-sm text-red-500 mt-1">{errors.token}</p>
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
            {isSubmitting ? tCommon("loading") : t("createToken")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
