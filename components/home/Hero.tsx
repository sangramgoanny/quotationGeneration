'use client'

import { motion } from 'framer-motion'
import Scene from '@/components/canvas/Scene'

export default function Hero() {
  return (
    <section className="relative h-screen w-screen">
      {/* 3D BACKGROUND */}
      <Scene />

      {/* TEXT */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="hero-title"
        >
          ARTERIAZ
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 0.6 }}
          className="hero-subtitle"
        >
          Branding • Strategy • Identity
        </motion.p>
      </div>
    </section>
  )
}
