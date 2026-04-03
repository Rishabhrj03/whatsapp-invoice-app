import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Invoice from '@/models/Invoice';
import User from '@/models/User';

export async function GET() {
    await dbConnect();
    const invoice = await Invoice.findById('69cd51397c0ba64a397a614b');
    if (!invoice) return NextResponse.json({ error: "Invoice not found locally" });
    
    const user = await User.findById(invoice.userId);
    return NextResponse.json({
        invoiceUserId: invoice.userId,
        userFound: !!user,
        businessName: user?.businessName,
        logoUrl: user?.logoUrl
    });
}
