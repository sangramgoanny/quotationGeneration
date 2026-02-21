"use client";

import { useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const modulePrices = {
  CRM: 15000,
  Inventory: 20000,
  HR: 18000,
  Accounting: 25000,
  AI: 30000
};

export default function QuotationGenerator() {
  const [form, setForm] = useState({
    companyName: "",
    contactPerson: "",
    email: "",
    modules: [],
    users: 1,
    discount: 0
  });

  const quotationNumber = `QTN-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000)}`;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleModuleChange = (module) => {
    if (form.modules.includes(module)) {
      setForm({ ...form, modules: form.modules.filter((m) => m !== module) });
    } else {
      setForm({ ...form, modules: [...form.modules, module] });
    }
  };

  const calculatePrice = () => {
    let base = 0;
    form.modules.forEach((m) => (base += modulePrices[m] || 0));
    const userCost = form.users * 1000;
    const subtotal = base + userCost;
    const gst = subtotal * 0.18;
    const total = subtotal + gst - Number(form.discount || 0);
    return { subtotal, gst, total };
  };

  const generatePDF = () => {
    const { subtotal, gst, total } = calculatePrice();
    const doc = new jsPDF();

    doc.text("GoSmartea Pvt Ltd", 14, 20);
    doc.text(`Quotation No: ${quotationNumber}`, 14, 30);

    autoTable(doc, {
      startY: 40,
      head: [["Module", "Price"]],
      body: form.modules.map((m) => [m, modulePrices[m]])
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.text(`Subtotal: ₹${subtotal}`, 14, finalY);
    doc.text(`GST: ₹${gst}`, 14, finalY + 10);
    doc.text(`Total: ₹${total}`, 14, finalY + 20);

    doc.save(`Quotation-${quotationNumber}.pdf`);
  };

  const { subtotal, gst, total } = calculatePrice();

  return (
    <div className="w-full max-w-3xl bg-[#111827] border border-[#1f2937] rounded-2xl p-8 shadow-2xl">

      <h2 className="text-2xl font-semibold text-white mb-6">
        Generate Quotation
      </h2>

      <div className="space-y-4">

        <input
          name="companyName"
          placeholder="Company Name"
          onChange={handleChange}
          className="dark-input"
        />

        <input
          name="contactPerson"
          placeholder="Contact Person"
          onChange={handleChange}
          className="dark-input"
        />

        <input
          name="email"
          placeholder="Email"
          onChange={handleChange}
          className="dark-input"
        />

        <div>
          <p className="text-gray-400 mb-2">Select Modules</p>
          {Object.keys(modulePrices).map((mod) => (
            <label key={mod} className="flex items-center gap-2 text-gray-300">
              <input type="checkbox" onChange={() => handleModuleChange(mod)} />
              {mod} (₹{modulePrices[mod]})
            </label>
          ))}
        </div>

        <input
          type="number"
          name="users"
          placeholder="Number of Users"
          onChange={handleChange}
          className="dark-input"
        />


        <input
          type="number"
          name="discount"
          placeholder="Discount"
          onChange={handleChange}
          className="dark-input"
        />

        <div className="bg-[#0f172a] p-4 rounded-xl border border-[#1f2937] text-gray-300">
          <p>Subtotal: ₹{subtotal}</p>
          <p>GST: ₹{gst}</p>
          <p className="text-lg font-semibold text-white">Total: ₹{total}</p>
        </div>

        <button
          onClick={generatePDF}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-all text-white font-medium"
        >
          Generate Quotation
        </button>

      </div>
    </div>
  );
}