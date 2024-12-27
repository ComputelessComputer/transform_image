import React, { useEffect, useRef, useState } from 'react';

interface ObjectDetectionProps {
  imageFile: File;
}

declare const cv: any;

const ObjectDetection: React.FC<ObjectDetectionProps> = ({ imageFile }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processImage = async () => {
      if (!canvasRef.current || !imageFile) return;

      setIsProcessing(true);
      setError(null);

      try {
        // Create image element
        const img = new Image();
        const imageUrl = URL.createObjectURL(imageFile);
        
        img.onload = () => {
          // Get canvas context
          const canvas = canvasRef.current!;
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d')!;
          
          // Draw original image
          ctx.drawImage(img, 0, 0);
          
          // Convert image to Mat
          const src = cv.imread(canvas);
          const dst = new cv.Mat();
          
          // Convert to grayscale
          cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
          
          // Apply Gaussian blur
          cv.GaussianBlur(dst, dst, new cv.Size(5, 5), 0);
          
          // Apply Canny edge detection
          cv.Canny(dst, dst, 50, 150);
          
          // Find contours
          const contours = new cv.MatVector();
          const hierarchy = new cv.Mat();
          cv.findContours(dst, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
          
          // Draw original image again
          ctx.drawImage(img, 0, 0);
          
          // Draw contours
          const contoursColor = new cv.Scalar(0, 255, 0, 255);
          for (let i = 0; i < contours.size(); i++) {
            cv.drawContours(src, contours, i, contoursColor, 2);
          }
          
          // Show result
          cv.imshow(canvas, src);
          
          // Clean up
          src.delete();
          dst.delete();
          contours.delete();
          hierarchy.delete();
          URL.revokeObjectURL(imageUrl);
          setIsProcessing(false);
        };

        img.onerror = () => {
          setError('Failed to load image');
          setIsProcessing(false);
        };

        img.src = imageUrl;
      } catch (err) {
        setError('Error processing image: ' + (err instanceof Error ? err.message : String(err)));
        setIsProcessing(false);
      }
    };

    processImage();
  }, [imageFile]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="max-w-full h-auto border border-gray-300 rounded-lg"
      />
      {isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white">
          Processing...
        </div>
      )}
      {error && (
        <div className="mt-2 text-red-500">
          {error}
        </div>
      )}
    </div>
  );
};

export default ObjectDetection;
