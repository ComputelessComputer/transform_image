import React, { useEffect, useRef, useState, useCallback } from "react";

interface Point {
  x: number;
  y: number;
}

interface PerspectiveTransformProps {
  imageFile: File;
}

declare const cv: any;

const PerspectiveTransform: React.FC<PerspectiveTransformProps> = ({
  imageFile,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageUrlRef = useRef<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [_, setImageLoaded] = useState(false);

  // Cleanup function for URL.createObjectURL
  useEffect(() => {
    return () => {
      if (imageUrlRef.current) {
        URL.revokeObjectURL(imageUrlRef.current);
      }
    };
  }, []);

  const drawImage = useCallback((img: HTMLImageElement) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  }, []);

  const warpPerspective = useCallback(() => {
    if (!canvasRef.current || points.length !== 4) return;

    const canvas = canvasRef.current;

    try {
      // Create source and target points
      const srcPoints = new cv.Mat(4, 1, cv.CV_32FC2);
      const dstPoints = new cv.Mat(4, 1, cv.CV_32FC2);
      const src = cv.imread(canvas);
      const dst = new cv.Mat();
      const matrix = cv.getPerspectiveTransform(srcPoints, dstPoints);

      try {
        srcPoints.data32F.set([
          0,
          0,
          canvas.width - 1,
          0,
          canvas.width - 1,
          canvas.height - 1,
          0,
          canvas.height - 1,
        ]);

        const flatPoints = points.flatMap((p) => [p.x, p.y]);
        dstPoints.data32F.set(flatPoints);

        // Apply perspective transform
        cv.warpPerspective(
          src,
          dst,
          matrix,
          new cv.Size(canvas.width, canvas.height)
        );

        // Show result on canvas
        cv.imshow(canvas, dst);
      } finally {
        // Clean up OpenCV resources
        src.delete();
        dst.delete();
        matrix.delete();
        srcPoints.delete();
        dstPoints.delete();
      }
    } catch (error) {
      console.error("Error in warpPerspective:", error);
    }
  }, [points]);

  useEffect(() => {
    const processImage = async () => {
      if (!canvasRef.current || !imageFile) return;

      setIsProcessing(true);
      setError(null);

      try {
        // Validate image file
        if (!imageFile.type.startsWith('image/')) {
          throw new Error('Invalid file type. Please select an image file.');
        }

        // Create and load image
        const img = new Image();
        
        // Clean up previous object URL
        if (imageUrlRef.current) {
          URL.revokeObjectURL(imageUrlRef.current);
        }
        
        // Create new object URL
        const objectUrl = URL.createObjectURL(imageFile);
        imageUrlRef.current = objectUrl;

        // Wrap image loading in a promise
        await new Promise((resolve, reject) => {
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Failed to load image. Please try again with a different image.'));
          img.src = objectUrl;
        });

        // Set canvas dimensions and initialize points
        const canvas = canvasRef.current!;
        canvas.width = img.width;
        canvas.height = img.height;

        setPoints([
          { x: 0, y: 0 },
          { x: img.width - 1, y: 0 },
          { x: img.width - 1, y: img.height - 1 },
          { x: 0, y: img.height - 1 },
        ]);

        drawImage(img);
        setImageLoaded(true);
        setError(null); // Explicitly clear any error state on successful load
      } catch (err) {
        console.error('Image processing error:', err);
        setImageLoaded(false);
        setError(err instanceof Error ? err.message : 'Failed to process image');
      } finally {
        setIsProcessing(false);
      }
    };

    processImage();
  }, [imageFile, drawImage]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Check if click is close to a point
      points.forEach((point, index) => {
        if (Math.abs(x - point.x) < 20 && Math.abs(y - point.y) < 20) {
          setSelectedPoint(index);
        }
      });
    },
    [points]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (selectedPoint === null || !canvasRef.current || !imageUrlRef.current)
        return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setPoints((prevPoints) => {
        const newPoints = [...prevPoints];
        newPoints[selectedPoint] = { x, y };
        return newPoints;
      });

      // Use the cached image URL for redrawing
      const img = new Image();
      img.onload = () => {
        drawImage(img);
        warpPerspective();
      };
      img.src = imageUrlRef.current;
    },
    [selectedPoint, drawImage, warpPerspective]
  );

  const handleMouseUp = useCallback(() => {
    setSelectedPoint(null);
  }, []);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="max-w-full h-auto border border-gray-300 rounded-lg"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      {isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white">
          Processing...
        </div>
      )}
      {error && <div className="mt-2 text-red-500">{error}</div>}
    </div>
  );
};

export default PerspectiveTransform;
