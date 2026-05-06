"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { useGLTF, OrbitControls, Center, Bounds, useProgress } from "@react-three/drei";

interface Props {
  model:        string;
  rimColor?:    string;     // accepted for backward compat, unused
  vehicleType?: string;     // accepted for backward compat, unused
}

function Model({ model }: { model: string }) {
  const { scene } = useGLTF(model);
  // Clone so each viewer gets its own instance (avoids parent-conflict if the
  // same GLB is rendered in two places).
  const clone = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={clone} />;
}

function Loader() {
  const { active } = useProgress();
  if (!active) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div
        className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#C9A84C] animate-spin"
        style={{ animationDuration: "1.1s" }}
      />
    </div>
  );
}

export default function Car3DViewer({ model }: Props) {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl h-[260px] sm:h-[320px]">
      <Canvas
        key={model}
        dpr={[1, 1.5]}
        camera={{ position: [4, 1.5, 5], fov: 32 }}
        gl={{ alpha: true, antialias: true }}
      >
        {/* Simple, even lighting */}
        <ambientLight intensity={0.9} />
        <directionalLight position={[5, 10, 5]} intensity={1.2} />
        <directionalLight position={[-5, 5, -5]} intensity={0.6} />

        <Suspense fallback={null}>
          {/* Bounds auto-fits the camera so the car fills the canvas (big).
              Center auto-centres the geometry at world origin.
              margin < 1 = tighter fit (bigger car). */}
          <Bounds fit clip observe margin={0.85}>
            <Center>
              <Model model={model} />
            </Center>
          </Bounds>
        </Suspense>

        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom={false}
          autoRotate
          autoRotateSpeed={0.6}
          enableDamping
          dampingFactor={0.06}
        />
      </Canvas>

      <Loader />
    </div>
  );
}

useGLTF.preload("/models/porsche.glb");
useGLTF.preload("/models/mercedes.glb");
useGLTF.preload("/models/bmw.glb");
useGLTF.preload("/models/skoda.glb");
useGLTF.preload("/models/suv.glb");
