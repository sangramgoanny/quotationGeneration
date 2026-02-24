"use client";

import { useState } from "react";
import { jsPDF } from "jspdf";
import { useEffect } from "react";


{/* ------------------------------------------------------------- */ }

function NoteSection({ value, onChange }) {
  return (
    <div>
      <h3 className="font-semibold">Note</h3>
      <textarea
        className="border p-3 w-full rounded min-h-[120px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
{/* ------------------------------------------------------------- */ }
function AgreementHeader({
  clientName,
  onClientChange,
  date,
  onDateChange,
  agreementNumber,
  quotationNumber,
  onQuotationChange,
  quotationSerial
}) {
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const options = { day: "2-digit", month: "short", year: "numeric" };
    return new Date(dateString).toLocaleDateString("en-GB", options);
  };
  const generateQuotationNumber = (clientName, serial) => {
    const companyShort = "GO"; // Goanny short

    const clientShort = clientName
      ? clientName.replace(/[^A-Za-z]/g, "").substring(0, 2).toUpperCase()
      : "CL";

    const today = new Date();
    const datePart =
      String(today.getDate()).padStart(2, "0") +
      String(today.getMonth() + 1).padStart(2, "0") +
      today.getFullYear();

    const serialPart = serial
      ? String(serial).padStart(3, "0")
      : "000";

    return `${companyShort}${clientShort}${datePart}${serialPart}`;
  };

  return (
    <div className="border p-6 rounded bg-gray-50 space-y-4 shadow-sm">

      <h3 className="text-xl font-bold">Quotation Information</h3>

      <div className="grid grid-cols-2 gap-4">

        <div>
          <label className="font-medium">Quotation Serial No:</label>
          <input
            type="number"
            value={quotationSerial}
            onChange={(e) =>
              onQuotationChange(e.target.value.replace(/\D/g, ""))
            }
            className="border p-2 rounded w-full text-black"
            placeholder="Enter serial number"
          />
        </div>

        <div className="mt-6 font-semibold">
          Quotation No:{" "}
          {generateQuotationNumber(clientName, quotationSerial)}
        </div>

        <div>
          <label className="font-medium">Quotation Date:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="border p-2 rounded w-full text-black"
          />
        </div>

        <div>
          <label className="font-medium">Client / Company Name:</label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => onClientChange(e.target.value)}
            className="border p-2 rounded w-full text-black"
            placeholder="Enter Client Name"
          />
        </div>
      </div>
    </div>
  );
}

export default function ContractGenerator() {
  useEffect(() => {
    const generatedNumber = `AGR-${Date.now().toString().slice(-6)}`;
    setContract(prev => ({
      ...prev,
      agreementNumber: generatedNumber
    }));
  }, []);
  const [contract, setContract] = useState({
    clientName: "",
    quotationSerial: "",
    date: new Date().toISOString().split("T")[0],
    agreementNumber: "",
    quotationNumber: "",
    totalAmount: "",
    subject: "Proposal for Digital Marketing Services",
    introParagraph: "We sincerely thank you for giving us the opportunity to present our services. We are pleased to submit our quotation for your kind consideration. We look forward to building a strong and successful relationship with you.",
    scope: [
      {
        title: "Social Media Optimisation (SMO)",
        details: [
          "Content Strategy & Planning",
          "Monthly Content Calendar",
          "High-Quality Post Designs",
          "Reels & Video Editing",
          "SEO-Optimized Captions & Hashtags",
          "Community Management",
          "Competitor Analysis",
          "Profile Optimization",
        ]
      },
      {
        title: "Google My Business (GMB) Optimization",
        details: [
          "Complete GMB Profile Setup & Verification",
          "Business Information Optimization (NAP, Categories, Services)",
          "Keyword-Optimized Business Description",
          "Regular Post Updates & Offers",
          "Review Management & Response Strategy",
          "Local SEO Optimization",
          "Photo & Media Optimization",
          "Monthly Insights & Performance Reporting",
        ]
      },
      {
        title: "Performance Marketing (Paid Ads)",
        details: [
          "Performance Marketing (Paid Ads)",
          "Meta Ads (Facebook & Instagram)",
          "Google Ads & YouTube Ads",
          "Brand Awareness Campaigns",
          "Lead Generation Campaigns",
          "Website Traffic Campaigns",
          "WhatsApp Click Campaigns",
          "Conversion & Retargeting Campaigns",
          "ROI-Focused Optimization & Scaling",
          "Campaign setup",
          "Audience targeting",
          "Ad creative optimisation",
          "Performance tracking"
        ]
      },
      {
        title: "Search Engine Optimization (SEO)",
        details: [
          "Website SEO Audit & Competitor Analysis",
          "Keyword Research & Strategy",
          "On-Page SEO Optimization",
          "Technical SEO Improvements",
          "Content Optimization & Blogging Strategy",
          "Local SEO & Google Ranking Strategy",
          "High-Quality Backlink Building",
          "Monthly Ranking & Performance Reports",
        ]
      },

    ], // dynamic scope (title + bullet details)
    paymentTerms: [
      "50% advance payment before project commencement.",
      "50% balance payment after first month completion.",
      "5% weekly late charge if payment is delayed.",
      "All payments must be cleared within 7 working days."
    ],
    termsConditions: [
      "Client must provide all necessary access credentials before project initiation.",
      "Project timeline may vary depending on client response time and approvals.",
      "All payments are non-refundable once the service has commenced.",
      "Any additional services outside the agreed scope will be charged separately.",
      "Company reserves the right to pause services if payment is delayed."
    ],
    pricing: [
      {
        description: "Social Media Optimisation (SMO)",
        cost: "15,000"
      },
      {
        description: "GMB (Google My Business)",
        cost: "10,000"
      },
      {
        description: "GMB - Citations (10 Citations)",
        cost: "50,000"
      },
      {
        description: "Paid Marketing (Meta Ads)",
        cost: "12,000"
      }
    ],
    websiteCost: "",
    note:
      "Advertisement budgets are not included in this package - (₹700 – 1000 per day recommended budget).",
  });

  // =============================
  // GENERIC ARRAY HELPERS
  // =============================
  const generateQuotationNumber = (clientName, serial) => {
    const companyShort = "GO";

    const clientShort = clientName
      ? clientName.replace(/[^A-Za-z]/g, "").substring(0, 2).toUpperCase()
      : "CL";

    const today = new Date();
    const datePart =
      String(today.getDate()).padStart(2, "0") +
      String(today.getMonth() + 1).padStart(2, "0") +
      today.getFullYear();

    const serialPart = serial
      ? String(serial).padStart(3, "0")
      : "00";

    return `${companyShort}${clientShort}${datePart}${serialPart}`;
  };
  const addItem = (key, value) => {
    setContract({ ...contract, [key]: [...contract[key], value] });
  };
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const options = { day: "2-digit", month: "short", year: "numeric" };
    return new Date(dateString).toLocaleDateString("en-GB", options);
  };

  const updateItem = (key, index, value) => {
    const updated = [...contract[key]];
    updated[index] = value;
    setContract({ ...contract, [key]: updated });
  };

  const removeItem = (key, index) => {
    const updated = contract[key].filter((_, i) => i !== index);
    setContract({ ...contract, [key]: updated });
  };

  // =============================
  // SCOPE FUNCTIONS (Title + Bullets)
  // =============================

  const addScope = () => {
    addItem("scope", { title: "", details: [] });
  };

  const updateScopeTitle = (index, value) => {
    const updated = [...contract.scope];
    updated[index].title = value;
    setContract({ ...contract, scope: updated });
  };

  const addScopeDetail = (scopeIndex) => {
    const updated = [...contract.scope];
    updated[scopeIndex].details.push("");
    setContract({ ...contract, scope: updated });
  };

  const updateScopeDetail = (scopeIndex, detailIndex, value) => {
    const updated = [...contract.scope];
    updated[scopeIndex].details[detailIndex] = value;
    setContract({ ...contract, scope: updated });
  };

  const removeScopeDetail = (scopeIndex, detailIndex) => {
    const updated = [...contract.scope];
    updated[scopeIndex].details = updated[scopeIndex].details.filter(
      (_, i) => i !== detailIndex
    );
    setContract({ ...contract, scope: updated });
  };

  const removeScope = (index) => removeItem("scope", index);

  // =============================
  // PRICING FUNCTIONS
  // =============================

  const addPricingRow = () => {
    addItem("pricing", { description: "", cost: "" });
  };

  const updatePricing = (index, field, value) => {
    const updated = [...contract.pricing];
    updated[index][field] = value;
    setContract({ ...contract, pricing: updated });
  };

  const removePricingRow = (index) => removeItem("pricing", index);

  const cleanText = (text) =>
    text ? text.replace(/[^\x00-\x7F]/g, "").trim() : "";

  // =============================
  // PDF GENERATION
  // =============================

  const generatePDF = async () => {
    const doc = new jsPDF("p", "mm", "a4");

    const img = new Image();
    img.src = "/letterhead.jpg";
    await new Promise((res) => (img.onload = res));

    const LEFT = 20;
    const CONTENT_WIDTH = 170;
    const HEADER_HEIGHT = 48;
    const FOOTER_LIMIT = 270;

    const addBackground = () => {
      doc.addImage(img, "JPEG", 0, 0, 210, 297);
    };

    let y;

    const newPage = () => {
      doc.addPage();
      addBackground();
      y = HEADER_HEIGHT;
    };

    const checkPageBreak = (space = 7) => {
      if (y + space > FOOTER_LIMIT) newPage();
    };

    const addParagraph = (text, bold = false, indent = 0) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      const lines = doc.splitTextToSize(cleanText(text), CONTENT_WIDTH - indent);
      lines.forEach((line) => {
        checkPageBreak(7);
        doc.text(line, LEFT + indent, y);
        y += 7;
      });
    };

    addBackground();
    y = HEADER_HEIGHT;

    // ================= HEADER =================


    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("QUOTATION", 105, y, { align: "center" });

    y += 5;
     // LINE
     doc.setLineWidth(0.3);
     doc.line(20, y, 190, y);
     y += 7;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");

    doc.text(
      `Quotation No: ${generateQuotationNumber(
        contract.clientName,
        contract.quotationSerial
      )}`,
      20,
      y
    );

    doc.text(
      `Date: ${new Date(contract.date).toLocaleDateString("en-GB")}`,
      190,
      y,
      { align: "right" }
    );

    y += 8;

    doc.text(`To: ${contract.clientName}`, 20, y);

    y += 8;



    // =============================
    // 2. SUBJECT
    // =============================
    doc.setFont("helvetica", "bold");
    doc.text(`Subject: ${contract.subject}`, 20, y);

    y += 10;

    // INTRO PARAGRAPH
    doc.setFont("helvetica", "normal");

    const introText = doc.splitTextToSize(
      `Dear \n${contract.clientName},\n\n${contract.introParagraph}`,
      170
    );

    doc.text(introText, 20, y);

    y += introText.length * 6;


    // First part (normal)
    // addParagraph(
    //     `This Service Agreement is made on ${agreementDate} between `
    // );

    // Company Name (bold)
    // doc.setFontSize(11);

    // let startX = 20; // Left margin

    // // BOLD PART
    // doc.setFont("helvetica", "bold");

    // const boldText =
    //     "Goanny Technologies Pvt Ltd, 1St Floor, Inspiria Mall, Nigdi Pune - 411044, ";

    // doc.text(boldText, startX, y);

    // // Move cursor after bold text
    // startX += doc.getTextWidth(boldText);

    // // NORMAL PART
    // doc.setFont("helvetica", "normal");

    // const normalText = '("Service Provider")';

    // doc.text(normalText, startX, y);

    // y += 7; // Move to next line

    // // Continue normal text
    // addParagraph(
    //     ` and `
    // );

    // doc.setFontSize(11);

    // let startY = 20; // Left margin

    // // BOLD CLIENT NAME
    // doc.setFont("helvetica", "bold");

    // const boldClient = `${contract.clientName}, `;
    // doc.text(boldClient, startY, y);

    // // Move X position forward
    // startY += doc.getTextWidth(boldClient);

    // // NORMAL TEXT
    // doc.setFont("helvetica", "normal");

    // const normalClientText = '("Client").';
    // doc.text(normalClientText, startY, y);

    // y += 10; // Move to next line

    // // Keep second paragraph same
    // addParagraph(
    //     "The Service Provider agrees to provide the services outlined below, and the Client agrees to compensate the Service Provider as per the agreed terms."
    // );

    // y += 5;
    // =============================
    // 1. SCOPE OF WORK
    // =============================
    if (contract.scope.length) {
      doc.setFontSize(11);
      addParagraph("1. SCOPE OF WORK", true);
      y += 5;

      contract.scope.forEach((service, index) => {
        addParagraph(`1.${index + 1} ${service.title}`, true);

        service.details.forEach((detail) => {
          addParagraph(`• ${detail}`, false, 10);
        });

        y += 5;
      });

      y += 4;
    }
    // =============================
    // 2. COMMERCIAL OF SERVICES
    // =============================
    if (contract.pricing.length) {

      addParagraph("2. COMMERCIAL OF SERVICES", true);

      const DESC_WIDTH = 120;
      const COST_WIDTH = 50;

      // 🔹 TABLE HEADER (BOLD)
      doc.setFont("helvetica", "bold");

      doc.rect(LEFT, y, DESC_WIDTH, 8);
      doc.rect(LEFT + DESC_WIDTH, y, COST_WIDTH, 8);

      doc.text("Service Description", LEFT + 2, y + 5);
      doc.text("Total Cost", LEFT + DESC_WIDTH + 2, y + 5);

      y += 8;

      // 🔹 TABLE ROWS (NORMAL FONT)
      doc.setFont("helvetica", "normal");

      contract.pricing.forEach((row) => {

        checkPageBreak(10);

        doc.rect(LEFT, y, DESC_WIDTH, 8);
        doc.rect(LEFT + DESC_WIDTH, y, COST_WIDTH, 8);

        doc.text(cleanText(row.description), LEFT + 2, y + 5);
        doc.text(cleanText(row.cost), LEFT + DESC_WIDTH + 2, y + 5);

        y += 8;
      });

      y += 5;
    }

    // NOTE
    if (contract.note) {
      addParagraph(`Note: ${contract.note}`);
      y += 5;
    }
    if (contract.websiteCost) {
      addParagraph(contract.websiteCost);
      y += 10;
    }
    // =============================
    // 3. PAYMENT TERMS
    // =============================
    if (contract.paymentTerms.length) {
      addParagraph("3. PAYMENT TERMS", true);
      // y += 5;

      contract.paymentTerms.forEach((term, index) => {
        addParagraph(`3.${index + 1} ${term}`);
      });

      y += 5;
    }

    // =============================
    // 4. TERMS & CONDITIONS
    // =============================
    if (contract.termsConditions.length) {
      addParagraph("4. TERMS AND CONDITIONS", true);
      // y += 5;

      contract.termsConditions.forEach((term, index) => {
        addParagraph(`4.${index + 1} ${term}`);
      });

      y += 15;
    }



    // SIGNATURE
    doc.setFont("helvetica", "normal");

    doc.text("Authorized Signature: ____________________", 20, y);
    y += 10;

    // PAGE NUMBERS
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: "center" });
    }

    doc.save("Service-Contract.pdf");
  };

  // =============================
  // UI
  // =============================

  return (
    <div className="max-w-6xl mx-auto bg-white p-8 rounded shadow space-y-8">

      <h2 className="text-xl font-bold">Quotation Generator</h2>

      {/* <input
                placeholder="Client Company Name"
                className="border p-3 w-full rounded"
                onChange={(e) =>
                    setContract({ ...contract, clientName: e.target.value })
                }
            />

            <input
                placeholder="Total Contract Amount"
                className="border p-3 w-full rounded"
                onChange={(e) =>
                    setContract({ ...contract, totalAmount: e.target.value })
                }
            /> */}
      <AgreementHeader
        clientName={contract.clientName}
        onClientChange={(value) =>
          setContract({ ...contract, clientName: value })
        }
        date={contract.date}
        onDateChange={(value) =>
          setContract({ ...contract, date: value })
        }
        agreementNumber={contract.agreementNumber}
        quotationSerial={contract.quotationSerial}
        onQuotationChange={(value) =>
          setContract({ ...contract, quotationSerial: value })
        }
      />
      {/* SUBJECT SECTION */}

      <div>
        <h3 className="font-semibold text-lg">Subject</h3>
        <input
          type="text"
          value={contract.subject}
          onChange={(e) =>
            setContract({ ...contract, subject: e.target.value })
          }
          className="border p-3 w-full rounded"
        />
      </div>

      {/* INTRO PARAGRAPH */}

      <div>
        <h3 className="font-semibold text-lg">
          Introduction / Thank You Paragraph
        </h3>
        <textarea
          value={contract.introParagraph}
          onChange={(e) =>
            setContract({ ...contract, introParagraph: e.target.value })
          }
          className="border p-3 w-full rounded min-h-[120px]"
        />
      </div>

      {/* SCOPE SECTION */}
      <h3 className="font-semibold">Scope of Work</h3>
      {contract.scope.map((service, index) => (
        <div key={index} className="border p-4 rounded">
          <input
            placeholder="Service Title"
            value={service.title}
            onChange={(e) => updateScopeTitle(index, e.target.value)}
            className="border p-2 w-full mb-2 rounded"
          />

          {service.details.map((detail, dIndex) => (
            <div key={dIndex} className="flex gap-2 mb-2">
              <input
                placeholder="Detail"
                value={detail}
                onChange={(e) =>
                  updateScopeDetail(index, dIndex, e.target.value)
                }
                className="border p-2 flex-1 rounded"
              />
              <button
                onClick={() => removeScopeDetail(index, dIndex)}
                className="bg-red-500 text-white px-2 rounded"
              >
                X
              </button>
            </div>
          ))}

          <button
            onClick={() => addScopeDetail(index)}
            className="bg-blue-500 text-white px-3 py-1 rounded mr-2"
          >
            Add Detail
          </button>

          <button
            onClick={() => removeScope(index)}
            className="bg-red-600 text-white px-3 py-1 rounded"
          >
            Remove Service
          </button>
        </div>
      ))}

      <button
        onClick={addScope}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        Add Service
      </button>

      {/* PAYMENT TERMS */}
      <h3 className="font-semibold">Payment Terms</h3>
      {contract.paymentTerms.map((term, index) => (
        <div key={index} className="flex gap-2">
          <input
            value={term}
            onChange={(e) =>
              updateItem("paymentTerms", index, e.target.value)
            }
            className="border p-2 flex-1 rounded"
          />
          <button
            onClick={() => removeItem("paymentTerms", index)}
            className="bg-red-500 text-white px-2 rounded"
          >
            X
          </button>
        </div>
      ))}

      <button
        onClick={() => addItem("paymentTerms", "")}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Add Payment Term
      </button>

      {/* TERMS & CONDITIONS */}
      <h3 className="font-semibold">Terms & Conditions</h3>
      {contract.termsConditions.map((term, index) => (
        <div key={index} className="flex gap-2">
          <input
            value={term}
            onChange={(e) =>
              updateItem("termsConditions", index, e.target.value)
            }
            className="border p-2 flex-1 rounded"
          />
          <button
            onClick={() => removeItem("termsConditions", index)}
            className="bg-red-500 text-white px-2 rounded"
          >
            X
          </button>
        </div>
      ))}

      <button
        onClick={() => addItem("termsConditions", "")}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Add Condition
      </button>

      {/* PRICING */}
      <h3 className="font-semibold">Commercial of Services</h3>
      {contract.pricing.map((row, index) => (
        <div key={index} className="flex gap-2">
          <input
            placeholder="Service Description"
            value={row.description}
            onChange={(e) =>
              updatePricing(index, "description", e.target.value)
            }
            className="border p-2 flex-1 rounded"
          />
          <input
            placeholder="Cost"
            value={row.cost}
            onChange={(e) =>
              updatePricing(index, "cost", e.target.value)
            }
            className="border p-2 w-40 rounded"
          />
          <button
            onClick={() => removePricingRow(index)}
            className="bg-red-500 text-white px-2 rounded"
          >
            X
          </button>
        </div>
      ))}

      <button
        onClick={addPricingRow}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Add Pricing Row
      </button>
      {/* ------------------------------------------------------------- */}

      {/* NOTE */}
      <NoteSection
        value={contract.note}
        onChange={(value) =>
          setContract({ ...contract, note: value })
        }
      />
      {/* ------------------------------------------------------------- */}
      <h3 className="font-semibold">Other details if you want add</h3>
      <textarea
        className="border p-3 w-full rounded"
        onChange={(e) =>
          setContract({ ...contract, websiteCost: e.target.value })
        }
      />
      {/* ------------------------------------------------------------- */}

      <button
        onClick={generatePDF}
        className="bg-black text-white w-full py-3 rounded"
      >
        Generate Quotation PDF
      </button>
      {/* ------------------------------------------------------------- */}

    </div>
  );
}