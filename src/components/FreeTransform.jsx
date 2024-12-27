import React, { useEffect, useState, useRef } from "react";
import { Image, Line, Circle } from "react-konva";
import { useRecoilState } from "recoil";

import {
  rectState,
  productImageCoord,
  bgImageCoord,
  maskState,
  flipHoriState,
  flipVertiState,
  imageLoadedState,
} from "@/recoil/control/file";
import { debounce } from "lodash";

export const BlobImageFreeTransform = ({
  rect,
  setSelectedId,
  setSelectedURL,
  handleDragEnd,
  setIsCropping,
  setCrop,
  setCropBG,
  stageRef,
}) => {
  const [image, setImage] = useState(null);
  const imageNode = useRef();
  const canvasRef = useRef(document.createElement("canvas"));
  const [maskImage, setMaskImage] = useState(null);
  const maskImageNode = useRef();
  const [rectangles, setRectangles] = useRecoilState(rectState);
  const [maskUrl, setMaskUrl] = useRecoilState(maskState);
  const [isImageLoaded, setIsImageLoaded] = useRecoilState(imageLoadedState);

  const [prodCoord, setProdCoord] = useRecoilState(productImageCoord);
  const [bgCoord, setBGCoord] = useRecoilState(bgImageCoord);

  const [flipHori, setFlipHori] = useRecoilState(flipHoriState);
  const [flipVerti, setFlipVerti] = useRecoilState(flipVertiState);

  const [tempBlobUrl, setBlobUrl] = useState(null);
  const [anchors, setAnchors] = useState(null);

  // Perspective transformation logic
  const perspectiveTransform = (ctx, image, points) => {
    const canvas = ctx.canvas;
    canvas.width = rect.width;
    canvas.height = rect.height;
    ctx.clearRect(0, 0, rect.width, rect.height);

    const ow = image.width;
    const oh = image.height;
    const step = 2;
    const cover_step = step * 5;

    const srcCtx = document.createElement("canvas").getContext("2d");
    srcCtx.canvas.width = ow;
    srcCtx.canvas.height = oh;
    srcCtx.drawImage(image, 0, 0, ow, oh);

    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");
    tempCanvas.width = rect.width;
    tempCanvas.height = rect.height;
    tempCtx.clearRect(0, 0, rect.width, rect.height);

    const [d0x, d0y] = points[0];
    const [d1x, d1y] = points[1];
    const [d2x, d2y] = points[2];
    const [d3x, d3y] = points[3];

    // Simplified perspective transform logic
    for (let y = 0; y < oh; y += step) {
      const r = y / oh;
      const sx = d0x + (d3x - d0x) * r;
      const sy = d0y + (d3y - d0y) * r;
      const ex = d1x + (d2x - d1x) * r;
      const ey = d1y + (d2y - d1y) * r;

      const ag = Math.atan((ey - sy) / (ex - sx));
      const sc = Math.sqrt(Math.pow(ex - sx, 2) + Math.pow(ey - sy, 2)) / ow;

      tempCtx.save();
      tempCtx.translate(sx, sy);
      tempCtx.rotate(ag);
      tempCtx.scale(sc, sc);
      tempCtx.drawImage(srcCtx.canvas, 0, -y);
      tempCtx.restore();
    }

    // Clipping
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(d0x, d0y);
    ctx.lineTo(d1x, d1y);
    ctx.lineTo(d2x, d2y);
    ctx.lineTo(d3x, d3y);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.restore();
  };

  useEffect(() => {
    if (rect.src) {
      setIsImageLoaded(false);
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.translate(
          rect.flipHori ? img.width : 0,
          rect.flipVerti ? img.height : 0
        );
        ctx.scale(rect.flipHori ? -1 : 1, rect.flipVerti ? -1 : 1);

        ctx.drawImage(img, 0, 0);

        canvas.toBlob((blob) => {
          const blobURL = URL.createObjectURL(blob);

          const flippedImage = new window.Image();
          flippedImage.src = blobURL;
          flippedImage.onload = () => {
            setImage(flippedImage);

            // Initialize anchors based on image dimensions
            setAnchors({
              leftTop: { x: 0, y: 0 },
              rightTop: { x: rect.width, y: 0 },
              rightBottom: { x: rect.width, y: rect.height },
              leftBottom: { x: 0, y: rect.height },
            });

            setIsImageLoaded(true);
          };
        }, "image/png");
      };
      img.src = rect.src;
    }
  }, [rect.src, rect.flipHori, rect.flipVerti]);

  useEffect(() => {
    if (image && anchors) {
      const ctx = canvasRef.current.getContext("2d");
      const points = [
        [anchors.leftTop.x, anchors.leftTop.y],
        [anchors.rightTop.x, anchors.rightTop.y],
        [anchors.rightBottom.x, anchors.rightBottom.y],
        [anchors.leftBottom.x, anchors.leftBottom.y],
      ];
      perspectiveTransform(ctx, image, points);
    }
  }, [anchors, image]);

  const handleAnchorDrag = (corner, x, y) => {
    setAnchors((prev) => ({
      ...prev,
      [corner]: { x, y },
    }));
  };

  const onTransform = debounce(() => {
    const node = imageNode.current;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    node.width(node.width() * scaleX);
    node.height(node.height() * scaleY);

    if (rect.id === "prod") {
      setProdCoord({
        x: node.x(),
        y: node.y(),
        w: node.width(),
        h: node.height(),
      });
      setCrop({
        x: node.x(),
        y: node.y(),
        w: node.width(),
        h: node.height(),
      });
    } else {
      setBGCoord({
        x: node.x(),
        y: node.y(),
        w: node.width(),
        h: node.height(),
      });
      setCropBG({
        x: node.x(),
        y: node.y(),
        w: node.width(),
        h: node.height(),
      });
    }
    const newRect = {
      ...rect,
      x: node.x(),
      y: node.y(),
      width: node.width(),
      height: node.height(),
      oriWidth: node.width(),
      oriHeight: node.height(),
      rotation: node.rotation(),
    };

    const newRectangles = rectangles.slice();
    newRectangles.splice(rectangles.indexOf(rect), 1, newRect);
    setRectangles(newRectangles);
  }, 100);

  return (
    <>
      {image && rect.src && anchors && (
        <>
          <Image
            image={canvasRef.current}
            ref={imageNode}
            id={rect.id}
            x={rect.x}
            y={rect.y}
            rotation={rect.rotation}
            width={isImageLoaded ? rect.width : 0}
            height={isImageLoaded ? rect.height : 0}
            draggable
            src={rect.src}
            onClick={() => {
              setSelectedId(rect.id);
              setSelectedURL(rect.image);
              setIsCropping(false);
            }}
            onTransformEnd={onTransform}
            onTransform={onTransform}
            onDragMove={handleDragEnd}
            onDragEnd={handleDragEnd}
          />
          {Object.entries(anchors).map(([corner, { x, y }]) => (
            <Circle
              key={corner}
              x={rect.x + x}
              y={rect.y + y}
              radius={5}
              fill="white"
              stroke="blue"
              draggable
              onDragMove={(e) =>
                handleAnchorDrag(
                  corner,
                  e.target.x() - rect.x,
                  e.target.y() - rect.y
                )
              }
            />
          ))}
          <Line
            points={[
              rect.x + anchors.leftTop.x,
              rect.y + anchors.leftTop.y,
              rect.x + anchors.rightTop.x,
              rect.y + anchors.rightTop.y,
              rect.x + anchors.rightBottom.x,
              rect.y + anchors.rightBottom.y,
              rect.x + anchors.leftBottom.x,
              rect.y + anchors.leftBottom.y,
              rect.x + anchors.leftTop.x,
              rect.y + anchors.leftTop.y,
            ]}
            stroke="blue"
            dash={[10, 5]}
          />
        </>
      )}
      {rect.id === "prod" && maskUrl !== null && maskUrl !== undefined && (
        <Image
          image={maskImage}
          ref={maskImageNode}
          id={"layer_mask"}
          x={rectangles.find((r) => r.id === "prod").x}
          y={rectangles.find((r) => r.id === "prod").y}
          rotation={rectangles.find((r) => r.id === "prod").rotation}
          width={rectangles.find((r) => r.id === "prod").width}
          height={rectangles.find((r) => r.id === "prod").height}
          src={maskUrl}
          listening={false}
        />
      )}
    </>
  );
};
