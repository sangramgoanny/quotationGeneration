'use client'

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

export default function FloatingObject() {
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    const { mouse, clock } = state

    meshRef.current.rotation.x = THREE.MathUtils.lerp(
      meshRef.current.rotation.x,
      mouse.y * 0.6,
      0.08
    )

    meshRef.current.rotation.y = THREE.MathUtils.lerp(
      meshRef.current.rotation.y,
      mouse.x * 0.6,
      0.08
    )

    // Floating animation
    meshRef.current.position.y =
      Math.sin(clock.elapsedTime) * 0.2
  })

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[2, 2, 0.4]} />
      <meshStandardMaterial
        color="#c8a46e"
        roughness={0.2}
        metalness={0.9}
      />
    </mesh>
  )
}
