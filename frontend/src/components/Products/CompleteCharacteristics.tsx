import { useState, useEffect } from "react";
import { OpenAPI } from "@/client";

interface Characteristic {
  id: number;
  name: string;
  required: boolean;
  unitName?: string;
  maxCount?: number;
  popular: boolean;
  charcType: number;
}

interface CompleteCharacteristicsProps {
  product: any;
  tokenId: string;
}

export function CompleteCharacteristics({
  product,
  tokenId,
}: CompleteCharacteristicsProps) {
  const [allCharacteristics, setAllCharacteristics] = useState<
    Characteristic[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (product?.subjectID) {
      fetchSubjectCharacteristics();
    }
  }, [product?.subjectID, tokenId]);

  const fetchSubjectCharacteristics = async () => {
    if (!product?.subjectID || !tokenId) {
      setError("Missing product subject ID or token ID");
      return;
    }

    // Validate and clean parameters
    const subjectID = String(product.subjectID).trim();
    const cleanTokenId = String(tokenId).trim();

    // Debug logging
    console.log("Debug - fetchSubjectCharacteristics:");
    console.log("  originalSubjectID:", product.subjectID);
    console.log("  cleanedSubjectID:", subjectID);
    console.log("  originalTokenId:", tokenId);
    console.log("  cleanedTokenId:", cleanTokenId);
    console.log("  subjectIDType:", typeof product.subjectID);
    console.log("  tokenIdType:", typeof tokenId);

    if (
      !subjectID ||
      !cleanTokenId ||
      subjectID === "undefined" ||
      cleanTokenId === "undefined"
    ) {
      setError(
        `Invalid parameters - Subject ID: "${subjectID}", Token ID: "${cleanTokenId}"`
      );
      return;
    }

    // Validate that subjectID is numeric
    if (isNaN(Number(subjectID))) {
      setError(`Subject ID must be numeric, got: "${subjectID}"`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `/api/v1/products/subject/${encodeURIComponent(subjectID)}/characteristics?token_id=${encodeURIComponent(cleanTokenId)}`;

      console.log("Debug - API call URL:", url);

      // Try without Authorization header first to isolate the issue
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Get token from localStorage instead of OpenAPI.TOKEN
      const token =
        localStorage.getItem("access_token") || localStorage.getItem("token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        console.log("Debug - Using localStorage token");
      } else {
        console.log("Debug - No token found in localStorage");
      }

      console.log("Debug - Final headers:", headers);

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      console.log("Debug - Response status:", response.status);
      console.log(
        "Debug - Response headers:",
        Object.fromEntries(response.headers.entries())
      );

      if (!response.ok) {
        const responseText = await response.text();
        console.log("Debug - Error response text:", responseText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();
      console.log(
        "Debug - Response text:",
        responseText.substring(0, 200) + "..."
      );

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Debug - JSON parse error:", parseError);
        throw new Error(
          `Invalid JSON response: ${responseText.substring(0, 100)}...`
        );
      }

      if (result.success && result.data && result.data.data) {
        setAllCharacteristics(result.data.data);
        console.log(
          "Debug - Successfully fetched characteristics:",
          result.data.data.length
        );
      } else {
        setError(result.message || "Failed to fetch subject characteristics");
      }
    } catch (err) {
      console.error("Debug - Fetch error:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Error fetching subject characteristics";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Create a map of existing product characteristics for quick lookup
  const productCharMap = new Map();
  if (product.characteristics) {
    product.characteristics.forEach((char: any) => {
      productCharMap.set(char.name, char.value);
    });
  }

  // Merge complete characteristics with product data
  const mergedCharacteristics = allCharacteristics.map((char) => {
    const productValue = productCharMap.get(char.name);
    const hasValue =
      productValue !== undefined &&
      productValue !== null &&
      (Array.isArray(productValue)
        ? productValue.length > 0
        : productValue.toString().trim() !== "");

    return {
      ...char,
      value: productValue,
      hasValue,
      isEmpty: !hasValue,
    };
  });

  // Sort characteristics: popular first, then required, then by name
  const sortedCharacteristics = mergedCharacteristics.sort((a, b) => {
    if (a.popular !== b.popular) return b.popular ? 1 : -1; // Popular first
    if (a.required !== b.required) return b.required ? 1 : -1; // Required second
    return a.name.localeCompare(b.name); // Alphabetical
  });

  if (loading) {
    return (
      <div className="bg-purple-50 rounded-xl p-4">
        <h4 className="text-lg font-semibold text-gray-900 mb-3">
          Complete Characteristics
        </h4>
        <div className="text-center py-4">
          <p className="text-gray-500">Loading complete characteristics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-purple-50 rounded-xl p-4">
        <h4 className="text-lg font-semibold text-gray-900 mb-3">
          Complete Characteristics
        </h4>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (sortedCharacteristics.length === 0) {
    return (
      <div className="bg-purple-50 rounded-xl p-4">
        <h4 className="text-lg font-semibold text-gray-900 mb-3">
          Complete Characteristics
        </h4>
        <p className="text-gray-500 text-sm">
          No characteristics available for this subject.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-purple-50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-lg font-semibold text-gray-900">
          Complete Characteristics
        </h4>
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-gray-600">Popular & Missing</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span className="text-gray-600">Required & Missing</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-gray-600">Optional & Missing</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {sortedCharacteristics.map((char, index) => {
          // Determine the styling based on priority and fill status
          let borderColor = "border-purple-100";
          let bgColor = "bg-white";
          let badgeColor = "bg-gray-100 text-gray-600";

          if (char.isEmpty) {
            if (char.popular) {
              borderColor = "border-red-300";
              bgColor = "bg-red-50";
              badgeColor = "bg-red-500 text-white";
            } else if (char.required) {
              borderColor = "border-orange-300";
              bgColor = "bg-orange-50";
              badgeColor = "bg-orange-500 text-white";
            } else {
              borderColor = "border-yellow-300";
              bgColor = "bg-yellow-50";
              badgeColor = "bg-yellow-500 text-white";
            }
          } else {
            bgColor = "bg-green-50";
            borderColor = "border-green-200";
            badgeColor = "bg-green-500 text-white";
          }

          return (
            <div
              key={index}
              className={`${bgColor} rounded-lg p-4 border-2 ${borderColor} transition-all duration-200`}
            >
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-900 text-sm flex items-center space-x-2">
                    <span>{char.name}</span>
                    {char.unitName && (
                      <span className="text-xs text-gray-500">
                        ({char.unitName})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {char.popular && (
                      <span className="px-2 py-1 text-xs font-medium bg-red-500 text-white rounded-full">
                        POPULAR
                      </span>
                    )}
                    {char.required && (
                      <span className="px-2 py-1 text-xs font-medium bg-orange-500 text-white rounded-full">
                        REQUIRED
                      </span>
                    )}
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${badgeColor}`}
                    >
                      {char.hasValue ? "FILLED" : "MISSING"}
                    </span>
                  </div>
                </div>

                <div
                  className={`px-3 py-2 rounded-lg text-sm leading-relaxed ${
                    char.isEmpty
                      ? `${bgColor} border-2 ${borderColor}`
                      : "text-gray-700 bg-gray-50"
                  }`}
                >
                  {char.isEmpty ? (
                    <div className="flex items-center space-x-2">
                      <span className="text-red-500">⚠️</span>
                      <span className="italic font-medium">
                        {char.popular
                          ? "热门字段未填写 - 强烈建议补充！"
                          : char.required
                            ? "必填字段未填写 - 需要运营人员补充"
                            : "可选字段未填写 - 建议补充完善"}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="text-green-500">✅</span>
                      <span>
                        {Array.isArray(char.value)
                          ? char.value.join(", ")
                          : char.value}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-2 text-sm text-blue-800">
          <span className="font-medium flex-shrink-0">💡 提示:</span>
          <span className="leading-relaxed">
            优先填写标记为 "POPULAR"
            的热门字段，这些字段对产品曝光和销售最重要！
          </span>
        </div>
      </div>
    </div>
  );
}
