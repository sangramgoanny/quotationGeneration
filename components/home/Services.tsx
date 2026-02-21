'use client'

import { motion } from 'framer-motion'

const services = [
  'Brand Strategy',
  'Visual Identity',
  'Digital Experience',
  'Motion & Campaigns'
]

export default function Services() {
  return (
    <section className="section">
      <h2 className="section-title">Services</h2>

      <div className="services-grid">
        {services.map((service, i) => (
          <motion.div
            key={service}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15 }}
            className="service-card"
          >
            {service}
          </motion.div>
        ))}
      </div>
    </section>
  )
}
