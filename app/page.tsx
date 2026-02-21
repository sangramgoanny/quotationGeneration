import Hero from '@/components/home/Hero'
import About from '@/components/home/About'
import Services from '@/components/home/Services'
import Philosophy from '@/components/home/Philosophy'
import Footer from '@/components/home/Footer'
import BottomMenu from '@/components/BottomMenu'
import QuotationPage from './quotation/page'
import ContractPage from './quotation/contract/page'

export default function Home() {
  return (
    <main className="bg-black text-white overflow-x-hidden">
   <ContractPage />
    </main>
  )
}
