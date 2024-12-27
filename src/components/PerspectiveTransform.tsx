import React, { useEffect, useRef, useState } from 'react';

interface Point {
  x: number;
  y: number;
}

interface PerspectiveTransformProps {
  imageFile: File;
}

declare const cv: any;

const PerspectiveTransform: React.FC<PerspectiveTransformProps> = ({ imageFile }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const processImage = async () => {
      if (!canvasRef.current || !imageFile) return;

      setIsProcessing(true);
      setError(null);

      try {
        const img = new Image();
        const imageUrl = URL.createObjectURL(imageFile);

        img.onload = () => {
          const canvas = canvasRef.current!;
          canvas.width = img.width;
          canvas.height = img.height;

          // Initialize corner points
          setPoints([
            { x: 0, y: 0 },
            { x: img.width - 1, y: 0 },
            { x: img.width - 1, y: img.height - 1 },
            { x: 0, y: img.height - 1 }
          ]);

          drawImage(img);
          setImageLoaded(true);
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

  const drawImage = (img: HTMLImageElement) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;

    // Draw the original image
    ctx.drawImage(img, 0, 0);
  };

  const warpPerspective = () => {
    if (!canvasRef.current || points.length !== 4) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;

    // Create source and target points
    const srcPoints = new cv.Mat(4, 1, cv.CV_32FC2);
    srcPoints.data32F.set([
      0, 0,
      canvas.width - 1, 0,
      canvas.width - 1, canvas.height - 1,
      0, canvas.height - 1
    ]);

    const dstPoints = new cv.Mat(4, 1, cv.CV_32FC2);
    const flatPoints = points.flatMap(p => [p.x, p.y]);
    dstPoints.data32F.set(flatPoints);

    // Get the perspective transform matrix
    const matrix = cv.getPerspectiveTransform(srcPoints, dstPoints);

    // Create source and destination Mats
    const src = cv.imread(canvas);
    const dst = new cv.Mat();

    // Apply perspective transform
    cv.warpPerspective(
      src,
      dst,
      matrix,
      new cv.Size(canvas.width, canvas.height)
    );

    // Show result on canvas
    cv.imshow(canvas, dst);

    // Clean up
    src.delete();
    dst.delete();
    matrix.delete();
    srcPoints.delete();
    dstPoints.delete();
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
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
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (selectedPoint === null || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newPoints = [...points];
    newPoints[selectedPoint] = { x, y };
    setPoints(newPoints);

    // Redraw
    const img = new Image();
    img.onload = () => {
      drawImage(img);
      warpPerspective();
    };
    img.src = URL.createObjectURL(imageFile);
  };

  const handleMouseUp = () => {
    setSelectedPoint(null);
  };

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
      {error && (
        <div className="mt-2 text-red-500">
          {error}
        </div>
      )}
    </div>
  );
};

export default PerspectiveTransform;
