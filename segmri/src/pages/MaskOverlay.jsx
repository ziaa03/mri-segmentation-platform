import React, { useRef, useEffect } from 'react';

const MaskOverlayCanvas = ({ imageSrc }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const image = new Image();
    image.src = imageSrc;

    image.onload = () => {
      canvas.width = image.width;
      canvas.height = image.height;

      // Draw original image
      ctx.drawImage(image, 0, 0);

      // Set global alpha for mask transparency
      ctx.globalAlpha = 0.5;

      // Draw a red circle as a test mask
      ctx.fillStyle = 'red';
      ctx.beginPath();
      ctx.arc(150, 150, 50, 0, 2 * Math.PI);
      ctx.fill();
    };
  }, [imageSrc]);

  return <canvas ref={canvasRef} />;
};

export default MaskOverlayCanvas;
