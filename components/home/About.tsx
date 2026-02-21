'use client'

import { motion } from 'framer-motion'

export default function About() {
  return (
    <section className="section">
      <motion.p
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="about-text"
      >
        We are a branding agency that designs perception,
        builds trust, and creates timeless brand systems.
      </motion.p>
    </section>
  )
}
