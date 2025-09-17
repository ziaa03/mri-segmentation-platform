import { useState, useCallback, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import * as THREE from "three";

function ObjModel({ url }) {
  const [object, setObject] = useState(null);

  useEffect(() => {
    if (!url) return;
    const loader = new OBJLoader();
    loader.load(
      url,
      (obj) => {
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = new THREE.MeshStandardMaterial({ color: "#888" });
          }
        });
        setObject(obj);
      },
      undefined,
      (err) => console.error("Error loading OBJ:", err)
    );
  }, [url]);

  return object ? <primitive object={object} /> : null;
}

export default function ObjViewer() {
  const [modelUrl, setModelUrl] = useState(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.toLowerCase().endsWith(".obj")) {
      setModelUrl(URL.createObjectURL(file));
    }
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file && file.name.toLowerCase().endsWith(".obj")) {
      setModelUrl(URL.createObjectURL(file));
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-gray-100">
      <div
        className={`w-3/4 h-2/4 border-2 rounded-2xl flex items-center justify-center mb-4 transition 
          ${dragging ? "border-blue-500 bg-blue-50" : "border-dashed border-gray-400"}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        {!modelUrl ? (
          <div className="text-gray-600 text-center">
            <p className="mb-2">Drag & drop a <strong>.obj</strong> file here</p>
            <p className="mb-2">or</p>
            <label className="px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600">
              Browse
              <input
                type="file"
                accept=".obj"
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>
          </div>
        ) : (
          <Canvas camera={{ position: [0, 0, 5] }}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 5, 5]} />
            <OrbitControls />
            <ObjModel url={modelUrl} />
          </Canvas>
        )}
      </div>
    </div>
  );
}
