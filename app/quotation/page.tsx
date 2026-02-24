import QuotationGenerator from "@/components/QuotationGenerator";


export default function QuotationPage() {
  return (
    <div className="max-w-6xl mx-auto bg-white text-black p-8 rounded shadow space-y-8">
      {/* <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-xl"> */}
        {/* <h1 className="text-3xl font-bold mb-6 text-center">
          Enterprise Quotation Generator
        </h1> */}
        <QuotationGenerator />
      {/* </div> */}
    </div>
  );
}
