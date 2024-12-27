import { useState } from "react";
import { Stage, Layer, Rect, Text } from "react-konva";
import Konva from "konva";

const KonvaExample = () => {
  const [color, setColor] = useState("green");

  const handleClick = () => {
    setColor(Konva.Util.getRandomColor());
  };

  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <Text text="Try click on rect" />
        <Rect
          x={20}
          y={20}
          width={50}
          height={50}
          fill={color}
          shadowBlur={5}
          onClick={handleClick}
        />
      </Layer>
    </Stage>
  );
};

export default KonvaExample;
