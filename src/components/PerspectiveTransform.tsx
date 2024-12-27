import React, { useEffect, useState, useRef } from "react";
import { Stage, Layer, Image as KonvaImage, Circle, Group } from "react-konva";
import useImage from 'use-image';
import Konva from "konva";

interface Point {
  x: number;
  y: number;
}

interface PerspectiveTransformProps {
  imageFile: File;
}

declare const cv: any;

const PADDING = 50; // Padding from edges

const PerspectiveTransform: React.FC<PerspectiveTransformProps> = ({
  imageFile,
}) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [image] = useImage(imageUrl);
  const [points, setPoints] = useState<Point[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [transformedImage, setTransformedImage] = useState<string | null>(null);
  const [transformedImageObj, setTransformedImageObj] = useState<HTMLImageElement | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImageUrl(url);

      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [imageFile]);

  useEffect(() => {
    if (image) {
      // Calculate aspect ratio to fit the image within the stage while maintaining padding
      const maxWidth = stageSize.width - (PADDING * 2);
      const maxHeight = stageSize.height - (PADDING * 2);
      const imageAspectRatio = image.width / image.height;
      
      let width, height;
      if (maxWidth / imageAspectRatio <= maxHeight) {
        // Width is the limiting factor
        width = maxWidth;
        height = width / imageAspectRatio;
      } else {
        // Height is the limiting factor
        height = maxHeight;
        width = height * imageAspectRatio;
      }

      // Calculate centered position
      const x = (stageSize.width - width) / 2;
      const y = (stageSize.height - height) / 2;

      // Initialize corner points with padding and centered
      setPoints([
        { x: x, y: y }, // top-left
        { x: x + width, y: y }, // top-right
        { x: x + width, y: y + height }, // bottom-right
        { x: x, y: y + height }, // bottom-left
      ]);

      // Set up canvas for OpenCV operations
      if (canvasRef.current && hiddenCanvasRef.current) {
        canvasRef.current.width = image.width;
        canvasRef.current.height = image.height;
        hiddenCanvasRef.current.width = image.width;
        hiddenCanvasRef.current.height = image.height;

        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.drawImage(image, 0, 0);
        }
      }
    }
  }, [image, stageSize.width, stageSize.height]);

  useEffect(() => {
    if (transformedImage) {
      const img = new window.Image();
      img.src = transformedImage;
      img.onload = () => {
        setTransformedImageObj(img);
      };
    }
  }, [transformedImage]);

  const warpPerspective = () => {
    if (!canvasRef.current || !hiddenCanvasRef.current || !image || points.length !== 4) return;

    try {
      // Read the source image from canvas
      const src = cv.imread(canvasRef.current);
      const dst = new cv.Mat();

      // Define source points (original image corners)
      const srcPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0, 0,
        image.width - 1, 0,
        image.width - 1, image.height - 1,
        0, image.height - 1
      ]);

      // Define target points (where corners should be moved to)
      const dstPoints = cv.matFromArray(4, 1, cv.CV_32FC2, 
        points.flatMap(p => [p.x, p.y])
      );

      // Calculate perspective transform matrix
      const matrix = cv.getPerspectiveTransform(srcPoints, dstPoints);

      // Apply perspective transform
      cv.warpPerspective(
        src,
        dst,
        matrix,
        new cv.Size(stageSize.width, stageSize.height)
      );

      // Display result on hidden canvas and convert to data URL
      cv.imshow(hiddenCanvasRef.current, dst);
      setTransformedImage(hiddenCanvasRef.current.toDataURL());

      // Clean up OpenCV resources
      src.delete();
      dst.delete();
      matrix.delete();
      srcPoints.delete();
      dstPoints.delete();

    } catch (error) {
      console.error("Error in warpPerspective:", error);
    }
  };

  const handleDragMove = (index: number) => (e: Konva.KonvaEventObject<DragEvent>) => {
    const newPoints = [...points];
    newPoints[index] = { x: e.target.x(), y: e.target.y() };
    setPoints(newPoints);
    warpPerspective();
  };

  return (
    <div style={{ border: '1px solid #ccc', display: 'inline-block' }}>
      <Stage width={stageSize.width} height={stageSize.height}>
        <Layer>
          <Group>
            {(transformedImageObj || image) && (() => {
              const img = transformedImageObj || image;
              if (!img) return null;
              
              const maxWidth = stageSize.width - (PADDING * 2);
              const maxHeight = stageSize.height - (PADDING * 2);
              const imgAspectRatio = img.width / img.height;
              
              let width, height;
              if (maxWidth / imgAspectRatio <= maxHeight) {
                // Width is the limiting factor
                width = maxWidth;
                height = width / imgAspectRatio;
              } else {
                // Height is the limiting factor
                height = maxHeight;
                width = height * imgAspectRatio;
              }

              // Center the image within the padded area
              const x = PADDING + (maxWidth - width) / 2;
              const y = PADDING + (maxHeight - height) / 2;

              return (
                <KonvaImage
                  image={img}
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                />
              );
            })()}
            {points.map((point, i) => (
              <Circle
                key={i}
                x={point.x}
                y={point.y}
                radius={8}
                fill={selectedPoint === i ? "#ff0000" : "#00ff00"}
                draggable
                onDragMove={handleDragMove(i)}
                onMouseEnter={(e) => {
                  const container = e.target.getStage()?.container();
                  if (container) {
                    container.style.cursor = "pointer";
                  }
                }}
                onMouseLeave={(e) => {
                  const container = e.target.getStage()?.container();
                  if (container) {
                    container.style.cursor = "default";
                  }
                }}
                onDragStart={() => setSelectedPoint(i)}
                onDragEnd={() => setSelectedPoint(null)}
              />
            ))}
          </Group>
        </Layer>
      </Stage>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <canvas ref={hiddenCanvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default PerspectiveTransform;
