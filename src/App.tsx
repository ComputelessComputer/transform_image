import { useState } from "react";
import ImageUpload from "./components/ImageUpload";
import ObjectDetection from "./components/ObjectDetection";
import PerspectiveTransform from "./components/PerspectiveTransform";

function App() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [mode, setMode] = useState<'object-detection' | 'perspective-transform'>('object-detection');

  const handleImageUpload = (file: File) => {
    setSelectedImage(file);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-3xl font-bold mb-4">Image Processing Demo</h1>

      {!selectedImage ? (
        <div className="w-full max-w-md">
          <ImageUpload onImageUpload={handleImageUpload} />
        </div>
      ) : (
        <div className="w-full max-w-4xl">
          <div className="flex gap-4 mb-4">
            <button
              className={`px-4 py-2 rounded ${mode === 'object-detection' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
              onClick={() => setMode('object-detection')}
            >
              Object Detection
            </button>
            <button
              className={`px-4 py-2 rounded ${mode === 'perspective-transform' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
              onClick={() => setMode('perspective-transform')}
            >
              Perspective Transform
            </button>
          </div>

          {mode === 'object-detection' ? (
            <ObjectDetection imageFile={selectedImage} />
          ) : (
            <PerspectiveTransform imageFile={selectedImage} />
          )}

          <button
            className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            onClick={() => setSelectedImage(null)}
          >
            Upload New Image
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
