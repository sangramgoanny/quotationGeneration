'use client'

import { motion } from 'framer-motion'

export default function Philosophy() {
  return (
    <section className="section philosophy">
      <motion.h2
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="philosophy-text"
      >
        Design is not decoration.  
        It is direction.
      </motion.h2>
    </section>
  )
}
