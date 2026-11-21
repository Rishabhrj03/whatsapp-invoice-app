import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface PdfInvoiceItem {
    name: string;
    price: number;
    quantity: number;
    description?: string;
}

export interface PdfInvoiceCustomer {
    name?: string;
    phoneNumber?: string;
    address?: string;
}

export interface GenerateInvoicePdfData {
    _id: string;
    items: PdfInvoiceItem[];
    totalAmount: number;
    discountAmount?: number;
    couponCode?: string;
    paymentType?: string;
    comment?: string;
    date: string | Date;
    status?: string;
    isEdited?: boolean;
    editedAt?: string | Date;
    customer?: PdfInvoiceCustomer | null;
}

export interface GenerateInvoicePdfOptions {
    invoice: GenerateInvoicePdfData;
    business?: {
        name?: string;
        logoBase64?: string;
        phone?: string;
        address?: string;
    };
}

/**
 * Standardized, high-precision PDF Generator for POS Invoices.
 * 
 * Guarantees:
 * 1. Strict column width constraints & horizontal alignments (no misaligned data).
 * 2. Right-aligned currency totals aligning with the table's right border (X=196mm).
 * 3. ASCII safe currency representation ('Rs.') avoiding standard jsPDF Helvetica glyph corruption.
 * 4. High-visibility 'CANCELLED' watermark and status banner when invoice.status === 'Cancelled'.
 * 5. Runs identically on server (Node.js) and browser (Client).
 */
export function buildInvoicePdfDoc(options: GenerateInvoicePdfOptions): jsPDF {
    const { invoice, business } = options;
    const isCancelled = invoice.status?.toLowerCase() === 'cancelled';

    // A4 dimensions: 210mm x 297mm. Left margin = 14mm, Right border = 196mm (Width = 182mm).
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
    });

    const bizName = business?.name || "Primebake";
    const billId = invoice._id ? invoice._id.toString().slice(-6).toUpperCase() : "DRAFT";
    const invoiceDate = invoice.date ? new Date(invoice.date) : new Date();

    const formattedDate = invoiceDate.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
    });

    const formattedTime = invoiceDate.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
    });

    // ── 1. WATERMARK (If Cancelled) ───────────────────────────────────────────
    if (isCancelled) {
        doc.saveGraphicsState();
        doc.setFontSize(54);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(254, 202, 202); // Light red/rose-200
        // Centered watermark rotated across page
        doc.text("CANCELLED", 105, 150, {
            align: "center",
            angle: 45,
        });
        doc.restoreGraphicsState();
    }

    // ── 2. HEADER & BRANDING ──────────────────────────────────────────────────
    let textX = 14;
    if (business?.logoBase64) {
        try {
            const format = business.logoBase64.includes("png") ? "PNG" : "JPEG";
            doc.addImage(business.logoBase64, format, 14, 12, 16, 16);
            textX = 34; // Indent text past logo
        } catch (e) {
            console.error("Failed adding logo to PDF:", e);
        }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text(bizName, textX, 19);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text(`${bizName.toUpperCase()} • OFFICIAL TAX INVOICE`, textX, 24);

    // Cancelled Banner or Status Tag top right
    if (isCancelled) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(225, 29, 72); // Rose-600
        doc.text("STATUS: CANCELLED (VOID)", 196, 20, { align: "right" });
    } else if (invoice.isEdited) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(126, 34, 206); // Purple-700
        doc.text("REVISED / EDITED INVOICE", 196, 20, { align: "right" });
    } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(37, 99, 235); // Blue-600
        doc.text("ORIGINAL FOR RECIPIENT", 196, 20, { align: "right" });
    }

    // Divider Line
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.5);
    doc.line(14, 32, 196, 32);

    // ── 3. CUSTOMER & METADATA SECTION ────────────────────────────────────────
    // Left Column: Customer Details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text("BILLED TO", 14, 40);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42); // Slate-900
    const customerName = invoice.customer?.name || "Guest Customer";
    doc.text(customerName, 14, 46);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105); // Slate-600
    let nextCustomerY = 51;
    if (invoice.customer?.phoneNumber) {
        doc.text(`Ph: ${invoice.customer.phoneNumber}`, 14, nextCustomerY);
        nextCustomerY += 5;
    }
    if (invoice.customer?.address) {
        const addressLines = doc.splitTextToSize(invoice.customer.address, 90);
        doc.text(addressLines, 14, nextCustomerY);
        nextCustomerY += addressLines.length * 4.5;
    }

    // Right Column: Invoice Details (all right-aligned at X=196)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("INVOICE DETAILS", 196, 40, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`Invoice #${billId}${invoice.isEdited ? " (Edited)" : ""}`, 196, 46, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Date: ${formattedDate} at ${formattedTime}`, 196, 51, { align: "right" });
    doc.text(`Mode: ${invoice.paymentType || "Cash"}`, 196, 56, { align: "right" });

    let nextRightY = 61;
    if (isCancelled) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(225, 29, 72);
        doc.text("Payment: Voided / Cancelled", 196, nextRightY, { align: "right" });
        nextRightY += 5;
    } else if (invoice.isEdited) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(126, 34, 206); // Purple-700
        const editDate = invoice.editedAt ? new Date(invoice.editedAt) : null;
        const formattedEditDate = editDate
            ? editDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })
            : formattedDate;
        doc.text(`Status: Revised (Edited ${formattedEditDate})`, 196, nextRightY, { align: "right" });
        nextRightY += 5;
    }

    // ── 4. ITEMS TABLE (jspdf-autotable) ───────────────────────────────────────
    // Calculate startY safely below whichever header column is taller
    const tableStartY = Math.max(nextCustomerY + 4, nextRightY + 2, 68);

    const tableRows = (invoice.items || []).map((item, index) => {
        const itemText = item.description
            ? `${item.name}\n${item.description}`
            : item.name;
        const unitPriceStr = `Rs. ${Number(item.price || 0).toFixed(2)}`;
        const qtyStr = `${item.quantity}`;
        const totalStr = `Rs. ${(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)}`;

        return [index + 1, itemText, unitPriceStr, qtyStr, totalStr];
    });

    autoTable(doc, {
        startY: tableStartY,
        head: [["#", "Item Description", "Unit Price", "Qty", "Total"]],
        body: tableRows,
        margin: { left: 14, right: 14 },
        theme: "striped",
        headStyles: {
            fillColor: isCancelled ? [100, 116, 139] : [37, 99, 235], // Slate-500 if cancelled, Blue-600 if active
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 9,
            cellPadding: 3,
        },
        bodyStyles: {
            fontSize: 9,
            textColor: [30, 41, 59],
            cellPadding: 3,
        },
        columnStyles: {
            0: { halign: "center", cellWidth: 12 },    // #
            1: { halign: "left" },                     // Item Description (takes remainder)
            2: { halign: "right", cellWidth: 28 },     // Unit Price
            3: { halign: "center", cellWidth: 18 },    // Qty
            4: { halign: "right", cellWidth: 32 },     // Total (aligned perfectly to right border)
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252], // Slate-50
        },
    });

    // ── 5. TOTALS & NOTES SECTION ─────────────────────────────────────────────
    const autoTableFinalY = (doc as any).lastAutoTable?.finalY || tableStartY + 40;
    const totalsStartY = autoTableFinalY + 8;

    // Subtotal calculation
    const rawSubtotal = (invoice.items || []).reduce(
        (sum, it) => sum + Number(it.price || 0) * Number(it.quantity || 1),
        0
    );
    const subtotal = rawSubtotal;
    const discount = Number(invoice.discountAmount || 0);
    const grandTotal = Number(invoice.totalAmount || (subtotal - discount));

    // Left Box: Notes / Comments
    if (invoice.comment && invoice.comment.trim()) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text("NOTES / SPECIAL INSTRUCTIONS:", 14, totalsStartY);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        const splitComment = doc.splitTextToSize(invoice.comment.trim(), 100);
        doc.text(splitComment, 14, totalsStartY + 5);
    }

    // Right Box: Totals (Labels at X=135, Values right-aligned at X=196)
    let currentTotalsY = totalsStartY;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Subtotal:", 135, currentTotalsY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(`Rs. ${subtotal.toFixed(2)}`, 196, currentTotalsY, { align: "right" });

    if (discount > 0) {
        currentTotalsY += 6;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(220, 38, 38); // Red
        const discountLabel = invoice.couponCode
            ? `Discount (${invoice.couponCode}):`
            : "Discount:";
        doc.text(discountLabel, 135, currentTotalsY);
        doc.setFont("helvetica", "bold");
        doc.text(`-Rs. ${discount.toFixed(2)}`, 196, currentTotalsY, { align: "right" });
    }

    // Divider Line for Grand Total
    currentTotalsY += 3;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(135, currentTotalsY, 196, currentTotalsY);

    // Grand Total Row
    currentTotalsY += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);

    if (isCancelled) {
        doc.setTextColor(225, 29, 72);
        doc.text("Net Total (Cancelled):", 135, currentTotalsY);
        doc.text(`Rs. ${grandTotal.toFixed(2)}`, 196, currentTotalsY, { align: "right" });
        // Strikethrough line on cancelled total
        doc.setDrawColor(225, 29, 72);
        doc.setLineWidth(0.8);
        doc.line(135, currentTotalsY - 1.5, 196, currentTotalsY - 1.5);
    } else {
        doc.setTextColor(15, 23, 42);
        doc.text("Grand Total:", 135, currentTotalsY);
        doc.setTextColor(37, 99, 235); // Blue-600
        doc.text(`Rs. ${grandTotal.toFixed(2)}`, 196, currentTotalsY, { align: "right" });
    }

    // ── 6. FOOTER ─────────────────────────────────────────────────────────────
    const footerY = 282;
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.4);
    doc.line(14, footerY - 5, 196, footerY - 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
        isCancelled
            ? "THIS INVOICE HAS BEEN CANCELLED AND RECORDED IN THE AUDIT LOG."
            : "Thank you for your business! Please visit again.",
        105,
        footerY,
        { align: "center" }
    );
    doc.text(
        `Generated by ${bizName} POS • Powered by Cloud Invoice`,
        105,
        footerY + 4.5,
        { align: "center" }
    );

    return doc;
}

/**
 * Generate PDF as Node Buffer (for S3 upload on server).
 */
export function generateInvoicePdfBuffer(options: GenerateInvoicePdfOptions): Buffer {
    const doc = buildInvoicePdfDoc(options);
    const arrayBuffer = doc.output("arraybuffer");
    return Buffer.from(arrayBuffer);
}

/**
 * Generate PDF as base64 string (data:application/pdf;base64,...).
 */
export function generateInvoicePdfBase64(options: GenerateInvoicePdfOptions): string {
    const doc = buildInvoicePdfDoc(options);
    return doc.output("datauristring");
}
