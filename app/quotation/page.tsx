import QuotationGenerator from "@/components/QuotationGenerator";
import "./globals.css";

export default function QuotationPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-10">
      <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-xl p-8">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Enterprise Quotation Generator
        </h1>
        <QuotationGenerator />
      </div>
    </div>
  );
}
