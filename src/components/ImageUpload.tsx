import React, { useState, useRef, ChangeEvent } from 'react';

interface ImageUploadProps {
  onImageUpload: (file: File) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onImageUpload }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      onImageUpload(files[0]);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageUpload(e.target.files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`upload-container ${isDragging ? 'dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      style={{
        border: `2px dashed ${isDragging ? '#4a90e2' : '#ccc'}`,
        borderRadius: '8px',
        padding: '20px',
        textAlign: 'center',
        cursor: 'pointer',
        backgroundColor: isDragging ? 'rgba(74, 144, 226, 0.1)' : 'transparent',
        transition: 'all 0.3s ease'
      }}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInput}
        accept="image/*"
        style={{ display: 'none' }}
      />
      <p style={{ margin: 0 }}>
        {isDragging ? 'Drop image here' : 'Click or drag image here to upload'}
      </p>
    </div>
  );
};

export default ImageUpload;
