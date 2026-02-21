'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import Link from 'next/link'

export default function BottomMenu() {
  const [isServicesActive, setIsServicesActive] = useState(false)

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="
          flex items-center gap-10
          rounded-full
          bg-black/60 backdrop-blur-xl
          px-10 py-4
          border border-white/10
        "
      >
        {/* Home – square icon only */}
        <Link href="/" className="home-square" aria-label="Home" />

        {/* Services → Portfolio (Text only) */}
        <AnimatePresence mode="wait">
          {!isServicesActive ? (
            <motion.button
              key="services"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              onClick={() => setIsServicesActive(true)}
              className="menu-text"
            >
              Services
            </motion.button>
          ) : (
            <motion.div
              key="portfolio"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              <Link href="/portfolio" className="menu-text">
                Portfolio
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* About – text only */}
        <Link href="/about" className="menu-text">
          About Us
        </Link>

        {/* Quotation – text only */}
        <Link href="/quotation" className="menu-text">
          Quotation
        </Link>
      </motion.div>
    </div>
  )
}
