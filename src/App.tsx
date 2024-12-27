import { useState } from "react";
import ImageUpload from "./components/ImageUpload";
import PerspectiveTransform from "./components/PerspectiveTransform";

function App() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const handleImageUpload = (file: File) => {
    setSelectedImage(file);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-3xl font-bold mb-4">Image Perspective Transform</h1>

      {!selectedImage ? (
        <div className="w-full max-w-md">
          <ImageUpload onImageUpload={handleImageUpload} />
        </div>
      ) : (
        <div className="w-full max-w-4xl flex flex-col items-center">
          <PerspectiveTransform imageFile={selectedImage} />

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
