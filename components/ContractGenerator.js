"use client";

import { useState } from "react";
import { jsPDF } from "jspdf";



{/* ------------------------------------------------------------- */}

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
{/* ------------------------------------------------------------- */}


export default function ContractGenerator() {
    const [contract, setContract] = useState({
        clientName: "",
        totalAmount: "",

        scope: [
            {
              title: "Social Media Optimisation (SMO)",
              details: [
                "Profile setup & optimisation",
                "Content calendar planning",
                "Monthly analytics reporting",
                "Engagement & comment management"
              ]
            },
            {
              title: "Google My Business (GMB)",
              details: [
                "Business profile optimisation",
                "Weekly updates & offers posting",
                "Review monitoring & response",
                "10 citation submissions"
              ]
            },
            {
              title: "Paid Marketing (Meta Ads)",
              details: [
                "Campaign setup",
                "Audience targeting",
                "Ad creative optimisation",
                "Performance tracking"
              ]
            }
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
              cost: "₹25,000"
            },
            {
              description: "GMB (Google My Business)",
              cost: "₹10,000"
            },
            {
              description: "GMB - Citations (10 Citations)",
              cost: "₹5,000"
            },
            {
              description: "Paid Marketing (Meta Ads)",
              cost: "₹14,000"
            }
          ],
        note: "",
        websiteCost: "",
        note:
            "Advertisement budgets are not included in this package (₹700–₹1000 per day recommended budget).",
    });

    // =============================
    // GENERIC ARRAY HELPERS
    // =============================

    const addItem = (key, value) => {
        setContract({ ...contract, [key]: [...contract[key], value] });
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
        const HEADER_HEIGHT = 65;
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

        // HEADER
        doc.setFontSize(14);
        addParagraph("SERVICE AGREEMENT", true);
        y += 10;

        doc.setFontSize(11);
        addParagraph(`Client: ${contract.clientName}`);
        addParagraph(`Total Contract Value: ₹${contract.totalAmount}`);
        y += 10;

        // =============================
        // 1. SCOPE OF WORK
        // =============================
        if (contract.scope.length) {
            doc.setFontSize(12);
            addParagraph("1. SCOPE OF WORK", true);
            y += 5;

            contract.scope.forEach((service, index) => {
                addParagraph(`1.${index + 1} ${service.title}`, true);

                service.details.forEach((detail) => {
                    addParagraph(`• ${detail}`, false, 10);
                });

                y += 5;
            });

            y += 5;
        }

        // =============================
        // 2. PAYMENT TERMS
        // =============================
        if (contract.paymentTerms.length) {
            addParagraph("2. PAYMENT TERMS", true);
            y += 5;

            contract.paymentTerms.forEach((term, index) => {
                addParagraph(`2.${index + 1} ${term}`);
            });

            y += 10;
        }

        // =============================
        // 3. TERMS & CONDITIONS
        // =============================
        if (contract.termsConditions.length) {
            addParagraph("3. TERMS AND CONDITIONS", true);
            y += 5;

            contract.termsConditions.forEach((term, index) => {
                addParagraph(`3.${index + 1} ${term}`);
            });

            y += 10;
        }

        // =============================
        // 6. COMMERCIAL OF SERVICES
        // =============================
        if (contract.pricing.length) {
            addParagraph("6. COMMERCIAL OF SERVICES", true);
            y += 5;

            const DESC_WIDTH = 120;
            const COST_WIDTH = 50;

            doc.rect(LEFT, y, DESC_WIDTH, 8);
            doc.rect(LEFT + DESC_WIDTH, y, COST_WIDTH, 8);
            doc.text("Service Description", LEFT + 2, y + 5);
            doc.text("Total Cost", LEFT + DESC_WIDTH + 2, y + 5);
            y += 8;

            contract.pricing.forEach((row) => {
                checkPageBreak(10);

                doc.rect(LEFT, y, DESC_WIDTH, 8);
                doc.rect(LEFT + DESC_WIDTH, y, COST_WIDTH, 8);

                doc.text(cleanText(row.description), LEFT + 2, y + 5);
                doc.text(cleanText(row.cost), LEFT + DESC_WIDTH + 2, y + 5);

                y += 8;
            });

            y += 10;
        }

        // NOTE
        if (contract.note) {
            addParagraph("Note:", true);
            addParagraph(contract.note);
            y += 5;
        }

        if (contract.websiteCost) {
            addParagraph(contract.websiteCost);
            y += 10;
        }

        // SIGNATURE
        addParagraph("Client Signature: ____________________");
        addParagraph("Service Provider Signature: ____________________");

        // PAGE NUMBERS
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(9);
            doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: "center" });
        }

        doc.save("Dynamic-Contract.pdf");
    };

    // =============================
    // UI
    // =============================

    return (
        <div className="max-w-6xl mx-auto bg-white p-8 rounded shadow space-y-8">

            <h2 className="text-xl font-bold">Dynamic Contract Generator</h2>

            <input
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
            />

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
                Generate Full Dynamic Contract PDF
            </button>
{/* ------------------------------------------------------------- */}

        </div>
    );
}