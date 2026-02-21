'use client'

import { Canvas } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import CameraRig from './CameraRig'
import FloatingObject from './FloatingObject'

export default function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 40 }}
      gl={{ antialias: true }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />

      <CameraRig>
        <FloatingObject />
      </CameraRig>

      <Environment preset="studio" />
    </Canvas>
  )
}
