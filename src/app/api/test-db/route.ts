import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Invoice from '@/models/Invoice';
import User from '@/models/User';
import { auth } from '@/auth';

export async function GET() {
    // Senior Security Engineer: Prevent information disclosure in production
    if (process.env.NODE_ENV === 'production') {
        return new NextResponse(null, { status: 404 });
    }

    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const invoice = await Invoice.findOne({ userId: session.user.id });
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    
    const user = await User.findById(invoice.userId);
    return NextResponse.json({
        invoiceUserId: invoice.userId,
        userFound: !!user,
        businessName: user?.businessName,
        logoUrl: user?.logoUrl
    });
}
