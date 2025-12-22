import { useState } from "react";
import { VideoPlayer } from "./VideoPlayer";

interface ProductDetailsModalProps {
  product: any;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductDetailsModal({
  product,
  isOpen,
  onClose,
}: ProductDetailsModalProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isVideoDownloading, setIsVideoDownloading] = useState(false);

  if (!isOpen || !product) return null;

  // 批量下载所有图片
  const handleBatchDownload = async () => {
    if (!product.photos || product.photos.length === 0) return;
    
    setIsDownloading(true);
    
    try {
      // 创建一个临时的下载容器
      const downloadPromises = product.photos.map(async (photo: any, index: number) => {
        const imageUrl = photo.big || photo.c516x688 || photo.c246x328;
        if (!imageUrl) return;

        try {
          // 获取图片数据
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          
          // 创建下载链接
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          
          // 生成文件名
          const fileExtension = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
          link.download = `${product.title}_image_${index + 1}.${fileExtension}`;
          
          // 触发下载
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // 清理URL对象
          window.URL.revokeObjectURL(url);
          
          // 添加小延迟避免浏览器阻止多个下载
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Failed to download image ${index + 1}:`, error);
        }
      });

      await Promise.all(downloadPromises);
      console.log('✅ All images downloaded successfully');
    } catch (error) {
      console.error('❌ Batch download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  // 下载视频
  const handleVideoDownload = async (videoUrl: string, productTitle: string) => {
    if (!videoUrl) return;
    
    setIsVideoDownloading(true);
    
    try {
      // 对于 HLS 视频 (.m3u8)，我们需要特殊处理
      if (videoUrl.includes('.m3u8')) {
        // 对于 HLS 流，我们直接打开链接让用户手动下载
        // 因为 HLS 需要专门的下载工具
        const link = document.createElement('a');
        link.href = videoUrl;
        link.target = '_blank';
        link.download = `${productTitle}_video.m3u8`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('✅ Video link opened for download');
      } else {
        // 对于普通视频文件，直接下载
        const response = await fetch(videoUrl);
        const blob = await response.blob();
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // 生成文件名
        const fileExtension = videoUrl.split('.').pop()?.split('?')[0] || 'mp4';
        link.download = `${productTitle}_video.${fileExtension}`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        window.URL.revokeObjectURL(url);
        console.log('✅ Video downloaded successfully');
      }
    } catch (error) {
      console.error('❌ Video download failed:', error);
      // 如果下载失败，至少打开链接
      window.open(videoUrl, '_blank');
    } finally {
      setIsVideoDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              Product Details
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Complete product information
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-50 rounded-full transition-colors"
          >
            <svg
              className="w-6 h-6 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex flex-col lg:flex-row h-full max-h-[calc(90vh-140px)] overflow-hidden">
          {/* Left Column - Images */}
          <div className="lg:w-1/2 p-6 border-r border-gray-200 overflow-y-auto">
            <div className="space-y-4">
              {/* Image Carousel */}
              {product.photos && product.photos.length > 0 ? (
                <div className="relative">
                  {/* Main Image */}
                  <div className="w-full h-96 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden">
                    <img
                      key={selectedImageIndex} // Force re-render when index changes
                      src={
                        product.photos[selectedImageIndex].big ||
                        product.photos[selectedImageIndex].c516x688 ||
                        product.photos[selectedImageIndex].c246x328
                      }
                      alt={`${product.title} - Image ${selectedImageIndex + 1}`}
                      className="max-w-full max-h-full object-contain"
                      style={{
                        display: "block",
                      }}
                      onLoad={() => {
                        console.log(
                          `✅ Image ${selectedImageIndex + 1} loaded successfully`
                        );
                      }}
                      onError={(e) => {
                        console.log(
                          `❌ Image ${selectedImageIndex + 1} failed to load`
                        );
                        const img = e.target as HTMLImageElement;
                        const currentPhoto = product.photos[selectedImageIndex];
                        // Try smaller sizes
                        if (img.src.includes("big")) {
                          img.src =
                            currentPhoto.c516x688 || currentPhoto.c246x328;
                        } else if (img.src.includes("c516x688")) {
                          img.src = currentPhoto.c246x328;
                        } else {
                          // Show text fallback
                          img.style.display = "none";
                          const parent = img.parentElement;
                          if (parent) {
                            parent.innerHTML = `
                              <div class="w-full h-full flex items-center justify-center bg-gray-200">
                                <div class="text-center p-4">
                                  <p class="text-gray-600 mb-2">Image ${selectedImageIndex + 1} not available</p>
                                </div>
                              </div>
                            `;
                          }
                        }
                      }}
                    />
                  </div>

                  {/* Navigation Arrows */}
                  {product.photos.length > 1 && (
                    <>
                      {/* Previous Button */}
                      <button
                        onClick={() =>
                          setSelectedImageIndex(
                            selectedImageIndex > 0
                              ? selectedImageIndex - 1
                              : product.photos.length - 1
                          )
                        }
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full p-2 transition-all"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                          />
                        </svg>
                      </button>

                      {/* Next Button */}
                      <button
                        onClick={() =>
                          setSelectedImageIndex(
                            selectedImageIndex < product.photos.length - 1
                              ? selectedImageIndex + 1
                              : 0
                          )
                        }
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full p-2 transition-all"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                    </>
                  )}

                  {/* Image Counter */}
                  {product.photos.length > 1 && (
                    <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                      {selectedImageIndex + 1} / {product.photos.length}
                    </div>
                  )}

                  {/* Batch Download Button */}
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={handleBatchDownload}
                      disabled={isDownloading}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                        isDownloading 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-green-600 hover:bg-green-700'
                      } text-white`}
                    >
                      {isDownloading ? (
                        <>
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Downloading...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>Download All Images ({product.photos.length})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full h-96 rounded-xl bg-gray-200 flex items-center justify-center">
                  <div className="text-center">
                    <svg
                      className="w-16 h-16 text-gray-400 mx-auto mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-gray-500 text-sm">No images available</p>
                  </div>
                </div>
              )}

              {/* Video Section */}
              {product.video && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3 text-gray-800">Product Video</h3>
                  <VideoPlayer
                    videoUrl={product.video}
                    title={product.title}
                    onDownload={() => handleVideoDownload(product.video, product.title)}
                  />
                  {isVideoDownloading && (
                    <div className="mt-2 text-center">
                      <span className="text-sm text-blue-600">正在准备视频下载...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Product Info */}
          <div className="lg:w-1/2 p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Product Title */}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {product.title}
                </h1>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                    {product.subjectName}
                  </span>
                  {product.brand && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                      {product.brand}
                    </span>
                  )}
                </div>
              </div>

              {/* Basic Information */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">
                  Basic Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Vendor Code:</span>
                    <span className="font-medium">
                      {product.vendorCode || product.nmID}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">NM ID:</span>
                    <span className="font-medium">{product.nmID}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created:</span>
                    <span className="font-medium">
                      {new Date(product.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Updated:</span>
                    <span className="font-medium">
                      {new Date(product.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Product Description */}
              {product.description && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    Product Description
                  </h4>
                  <div className="text-gray-700 leading-relaxed whitespace-pre-line max-h-48 overflow-y-auto">
                    {product.description}
                  </div>
                </div>
              )}

              {/* Dimensions */}
              {product.dimensions && (
                <div className="bg-amber-50 rounded-xl p-4">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    Dimensions
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-600">
                        {product.dimensions.length}
                      </div>
                      <div className="text-sm text-gray-600">Length (cm)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-600">
                        {product.dimensions.width}
                      </div>
                      <div className="text-sm text-gray-600">Width (cm)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-600">
                        {product.dimensions.height}
                      </div>
                      <div className="text-sm text-gray-600">Height (cm)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-600">
                        {product.dimensions.weightBrutto}
                      </div>
                      <div className="text-sm text-gray-600">Weight (kg)</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Characteristics */}
              {product.characteristics &&
                product.characteristics.length > 0 && (
                  <div className="bg-purple-50 rounded-xl p-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">
                      Characteristics
                    </h4>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {product.characteristics.map(
                        (char: any, index: number) => (
                          <div
                            key={index}
                            className="bg-white rounded-lg p-4 border border-purple-100"
                          >
                            <div className="flex flex-col space-y-2">
                              <div className="font-medium text-gray-900 text-sm">
                                {char.name}
                              </div>
                              {(() => {
                                const value = Array.isArray(char.value) ? char.value.join(', ') : char.value;
                                const isEmpty = !value || value.toString().trim() === '';
                                
                                return (
                                  <div className={`px-3 py-2 rounded-lg text-sm leading-relaxed ${
                                    isEmpty 
                                      ? 'bg-red-50 border border-red-200 text-red-600' 
                                      : 'text-gray-700 bg-gray-50'
                                  }`}>
                                    {isEmpty ? (
                                      <div className="flex items-center space-x-2">
                                        <span className="text-red-500">⚠️</span>
                                        <span className="italic">未填写 - 需要运营人员补充</span>
                                      </div>
                                    ) : (
                                      value
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

              {/* Competitor Analysis */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">
                  Competitor Analysis
                </h4>
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">Amazon</span>
                      <span className="text-blue-600 text-sm">
                        Not configured
                      </span>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">
                        AliExpress
                      </span>
                      <span className="text-blue-600 text-sm">
                        Not configured
                      </span>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">Ozon</span>
                      <span className="text-blue-600 text-sm">
                        Not configured
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end items-center p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors mr-3"
          >
            Close
          </button>
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Edit Product
          </button>
        </div>
      </div>
    </div>
  );
}
