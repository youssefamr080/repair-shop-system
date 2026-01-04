import React from 'react';
import Barcode from 'react-barcode';


export interface ReceiptData {
    ticketNumber: string;
    customerName: string;
    customerPhone: string;
    deviceModel: string;
    deviceColor?: string;
    serialNumber?: string; // IMEI/Serial
    problemDescription: string;
    notes?: string;
    receivedDate: string;
    expectedDate?: string;
    technicianName?: string;
    estimatedCost?: number;
    companyName: string;
    companyPhone: string;
    companyAddress?: string;
    terms?: string[];
}

interface Props {
    data: ReceiptData;
}

export const PrintableRepairReceipt = React.forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
    return (
        <div ref={ref} className="receipt-container" dir="rtl">
            <style type="text/css" media="print">{`
                @page {
                    size: 80mm auto;
                    margin: 0;
                }
                body {
                    margin: 0;
                    padding: 0;
                    -webkit-print-color-adjust: exact;
                }
                .receipt-container {
                    width: 79mm; /* Slightly less than 80 to prevent spill */
                    padding: 2mm 5mm;
                    font-family: 'Courier New', Courier, monospace; /* Monospace is best for thermal */
                    font-size: 12px;
                    line-height: 1.4;
                    color: black;
                    background: white;
                }
                .header {
                    text-align: center;
                    border-bottom: 2px dashed #000;
                    padding-bottom: 10px;
                    margin-bottom: 10px;
                }
                .title {
                    font-size: 16px;
                    font-weight: bold;
                    margin: 5px 0;
                    text-transform: uppercase;
                }
                .section {
                    margin-bottom: 10px;
                    border-bottom: 1px dashed #ccc;
                    padding-bottom: 5px;
                }
                .row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 3px;
                }
                .label {
                    font-weight: bold;
                }
                .barcode-container {
                    display: flex;
                    justify-content: center;
                    margin: 10px 0;
                }
                .footer {
                    text-align: center;
                    font-size: 10px;
                    margin-top: 15px;
                }
                .terms {
                    font-size: 9px;
                    text-align: justify;
                    margin-top: 5px;
                }
                /* Hide screen-only icons in print if needed, but here we keep text simple */
            `}</style>

            {/* --- Screen Preview Styles (Optional) --- */}
            <style type="text/css">{`
                 .receipt-container {
                    background: white;
                    width: 80mm;
                    margin: 0 auto;
                    padding: 15px;
                    box-shadow: 0 0 10px rgba(0,0,0,0.1);
                    font-family: 'Courier New', monospace;
                 }
            `}</style>

            {/* Header */}
            <div className="header">
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{data.companyName}</div>
                <div>{data.companyAddress}</div>
                <div>{data.companyPhone}</div>
                <div className="title" style={{ marginTop: '10px' }}>وصل استلام صيانة</div>
                <div>#{data.ticketNumber}</div>
            </div>

            {/* Customer Info */}
            <div className="section">
                <div className="row">
                    <span className="label">العميل:</span>
                    <span>{data.customerName}</span>
                </div>
                <div className="row">
                    <span className="label">الهاتف:</span>
                    <span dir="ltr">{data.customerPhone}</span>
                </div>
                <div className="row">
                    <span className="label">التاريخ:</span>
                    <span>{new Date(data.receivedDate).toLocaleDateString()}</span>
                </div>
            </div>

            {/* Device Info */}
            <div className="section">
                <div className="row">
                    <span className="label">الجهاز:</span>
                    <span style={{ fontWeight: 'bold' }}>{data.deviceModel}</span>
                </div>
                {data.serialNumber && (
                    <div className="row">
                        <span className="label">S/N:</span>
                        <span style={{ fontSize: '10px' }}>{data.serialNumber}</span>
                    </div>
                )}
                {/* Visual Check for Pattern/Pass - To be filled manually or from data */}
                <div className="row" style={{ marginTop: '5px' }}>
                    <span className="label">المشكلة:</span>
                </div>
                <div style={{ paddingRight: '10px', fontSize: '13px' }}>
                    {data.problemDescription}
                </div>
            </div>

            {/* Barcode */}
            <div className="barcode-container">
                <Barcode
                    value={data.ticketNumber}
                    width={1.5}
                    height={40}
                    fontSize={12}
                    margin={0}
                    displayValue={false}
                />
            </div>
            <div style={{ textAlign: 'center', fontSize: '10px', marginBottom: '10px' }}>
                {data.ticketNumber}
            </div>

            {/* Footer & Terms */}
            <div className="footer">
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>شكراً لاختياركم {data.companyName}</div>
                <div className="terms">
                    <strong>شروط الصيانة:</strong>
                    <ul style={{ paddingRight: '15px', margin: '5px 0' }}>
                        {data.terms?.map((term, i) => (
                            <li key={i}>{term}</li>
                        )) || (
                                <>
                                    <li>المحل غير مسؤول عن فقدان البيانات.</li>
                                    <li>الجهاز يخرج من الضمان في حال العبث به.</li>
                                    <li>مدة الضمان 14 يوماً على قطع الغيار فقط.</li>
                                    <li>الاستلام خلال 30 يوماً وإلا يباع لاستيفاء الرسوم.</li>
                                </>
                            )}
                    </ul>
                </div>
            </div>
        </div>
    );
});

PrintableRepairReceipt.displayName = 'PrintableRepairReceipt';
