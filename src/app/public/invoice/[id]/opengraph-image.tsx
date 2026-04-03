import { ImageResponse } from 'next/og';
import dbConnect from "@/lib/mongoose";
import Invoice from "@/models/Invoice";
import User from "@/models/User";

export const alt = 'Invoice Preview';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';
export const runtime = 'nodejs';

export default async function Image({ params }: { params: { id: string } }) {
    await dbConnect();
    const invoice = await Invoice.findById(params.id).populate("customer").lean();
    if (!invoice) return new Response('Not Found', { status: 404 });

    const user = await User.findById((invoice as any).userId).lean();
    const customer = invoice.customer as any;
    
    const businessName = (user as any)?.businessName || 'WA Invoice App';
    const logoUrl = (user as any)?.logoUrl || '';

    return new ImageResponse(
        (
            <div
                style={{
                    background: 'linear-gradient(to bottom right, #f8fafc, #e2e8f0)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '80px',
                    fontFamily: 'sans-serif',
                }}
            >
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: 'white',
                    padding: '60px 80px',
                    borderRadius: '40px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                    border: '2px solid #f1f5f9'
                }}>
                    {logoUrl ? (
                        <img 
                            src={logoUrl} 
                            alt="Logo" 
                            style={{ maxWidth: '250px', maxHeight: '150px', objectFit: 'contain', marginBottom: '30px' }} 
                        />
                    ) : (
                        <div style={{ fontSize: '60px', marginBottom: '30px', display: 'flex' }}>📄</div>
                    )}
                    
                    <h1 style={{ fontSize: '64px', fontWeight: '900', color: '#0f172a', margin: '0 0 16px 0', textAlign: 'center', display: 'flex' }}>
                        {businessName}
                    </h1>
                    
                    <div style={{ display: 'flex', fontSize: '32px', color: '#64748b', marginBottom: '40px', fontWeight: 600 }}>
                        Invoice for {customer?.name || 'Customer'}
                    </div>
                    
                    <div style={{ 
                        display: 'flex',
                        background: '#eff6ff', 
                        padding: '24px 48px', 
                        borderRadius: '24px', 
                        fontSize: '48px',
                        fontWeight: 'bold',
                        color: '#2563eb',
                        border: '2px solid #bfdbfe'
                    }}>
                        Total: ₹{invoice.totalAmount.toLocaleString('en-IN')}
                    </div>
                </div>
            </div>
        ),
        {
            ...size,
        }
    );
}
