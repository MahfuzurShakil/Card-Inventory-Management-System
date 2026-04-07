const COMPANY = {
  name: 'Onestra Ltd.',
  address: 'Dilara Tower (8th Floor), 77 Bir Uttam, C.R. Dutta Road (New), 340 Free School Street (Old), Sonargaon Road, Dhaka-1205',
  email: 'info@onestra.com',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function formatPrintedAt() {
  return new Date().toLocaleString();
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function buildChallanHtml(challanData, items = [], assets = {}, options = {}) {
  const totalQty = items.reduce((sum, sb) => sum + (sb.quantity || 0), 0);
  const itemName = challanData.item_name || 'Smart Blank Card';
  const itemDescription = challanData.item_description || '';
  const preparedBy = challanData.prepared_by || 'Production Staff';
  const receiverName = challanData.receiver_name || '-';
  const receiverAddress = challanData.receiver_address || '-';
  const logoUrl = assets.logo || '';
  const watermarkUrl = assets.watermark || '';
  const autoPrint = options.autoPrint !== false;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Delivery Challan ${escapeHtml(challanData.challan_no)}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#111827;background:#fff;padding:14px;}
  .challan{position:relative;max-width:790px;margin:0 auto;background:#fff;border:1px solid #d1d5db;overflow:hidden;}
  .header{padding:12px 16px 10px;border-bottom:1px solid #cbd5e1;}
  .header-row{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;}
  .brand{display:flex;gap:10px;align-items:flex-start;min-width:0;flex:1;}
  .brand-logo{width:68px;height:auto;object-fit:contain;flex-shrink:0;}
  .brand-text{min-width:0;}
  .co-name{font-size:25px;font-weight:800;letter-spacing:-.4px;line-height:1.1;}
  .co-address{margin-top:4px;font-size:12px;line-height:1.42;color:#374151;}
  .co-email{margin-top:3px;font-size:12px;color:#4b5563;}
  .doc-meta{min-width:280px;text-align:right;font-size:12px;color:#374151;line-height:1.45;}
  .doc-title{font-size:13px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:#f97316;}
  .doc-line{margin-top:3px;white-space:nowrap;}
  .doc-line strong{color:#111827;font-weight:800;}
  .body{padding:16px 18px 18px;}
  .body-stack{position:relative;}
  .body-watermark{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:0;}
  .body-watermark img{width:250px;max-width:42%;opacity:.075;object-fit:contain;}
  .body-content{position:relative;z-index:1;}
  .info-block{border:1px solid #dbe4ee;background:transparent;padding:14px 16px;}
  .info-section + .info-section{margin-top:14px;padding-top:14px;border-top:1px solid #e2e8f0;}
  .section-title{font-size:13px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:#475569;margin-bottom:10px;}
  .info-row{display:flex;align-items:flex-start;gap:12px;padding:5px 0;}
  .info-label{width:150px;flex-shrink:0;font-size:13px;font-weight:700;color:#475569;}
  .info-value{flex:1;min-width:0;font-size:15px;line-height:1.45;color:#111827;word-break:break-word;white-space:pre-wrap;}
  .info-value.strong{font-weight:700;}
  .footer{padding:8px 16px 10px;border-top:1px solid #cbd5e1;display:flex;justify-content:space-between;align-items:flex-end;gap:14px;font-size:10px;color:#64748b;}
  .footer-note{line-height:1.4;}
  .signature-wrap{display:flex;gap:24px;align-items:flex-end;}
  .signature{min-width:120px;text-align:center;padding-top:28px;}
  .signature-line{border-top:1px solid #475569;padding-top:7px;color:#475569;font-size:10px;}
  @media print{
    body{padding:0;}
    .challan{border:none;max-width:none;}
    @page{size:A4 portrait;margin:7mm;}
  }
</style>
</head><body>
<div class="challan">
  <div class="header">
    <div class="header-row">
      <div class="brand">
        ${logoUrl ? `<img class="brand-logo" src="${escapeHtml(logoUrl)}" alt="Onestra logo"/>` : ''}
        <div class="brand-text">
          <div class="co-name">${escapeHtml(COMPANY.name)}</div>
          <div class="co-address">${escapeHtml(COMPANY.address)}</div>
          <div class="co-email">${escapeHtml(COMPANY.email)}</div>
        </div>
      </div>
      <div class="doc-meta">
        <div class="doc-title">Delivery Challan</div>
        <div class="doc-line"><strong>Challan No:</strong> ${escapeHtml(challanData.challan_no)}</div>
        <div class="doc-line"><strong>Date:</strong> ${escapeHtml(formatDate(challanData.date))}</div>
        <div class="doc-line"><strong>Prepared By:</strong> ${escapeHtml(preparedBy)}</div>
      </div>
    </div>
  </div>
  <div class="body">
    <div class="body-stack">
      <div class="body-watermark">${watermarkUrl ? `<img src="${escapeHtml(watermarkUrl)}" alt="Onestra watermark"/>` : ''}</div>
      <div class="body-content">
        <div class="info-block">
          <div class="info-section">
            <div class="section-title">Receiver Information</div>
            <div class="info-row">
              <div class="info-label">Receiver Name</div>
              <div class="info-value strong">${escapeHtml(receiverName)}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Address</div>
              <div class="info-value">${escapeHtml(receiverAddress)}</div>
            </div>
          </div>
          <div class="info-section">
            <div class="section-title">Item Information</div>
            <div class="info-row">
              <div class="info-label">Item Name</div>
              <div class="info-value strong">${escapeHtml(itemName)}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Number of Boxes</div>
              <div class="info-value strong">${escapeHtml(formatNumber(items.length))}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Quantity</div>
              <div class="info-value strong">${escapeHtml(formatNumber(totalQty))}</div>
            </div>
            ${itemDescription ? `
            <div class="info-row">
              <div class="info-label">Item Description</div>
              <div class="info-value">${escapeHtml(itemDescription)}</div>
            </div>` : ''}
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="footer">
    <div class="footer-note">
      This is a system-generated challan from Onestra ERP.<br/>
      Generated: ${escapeHtml(formatPrintedAt())}
    </div>
    <div class="signature-wrap">
      <div class="signature">
        <div class="signature-line">Received By</div>
      </div>
      <div class="signature">
        <div class="signature-line">Authorized Signature</div>
      </div>
    </div>
  </div>
</div>
${autoPrint ? '<script>window.onload=function(){setTimeout(function(){window.print();},400);};</script>' : ''}
</body></html>`;
}

function getChallanDocumentHtml(challanData, items = [], options = {}) {
  return buildChallanHtml(challanData, items, {
    logo: new URL('/onestra-logo.png', window.location.origin).href,
    watermark: new URL('/onestra-challan-watermark.png', window.location.origin).href,
  }, options);
}

function openChallanPrint(challanData, items = []) {
  const html = getChallanDocumentHtml(challanData, items, { autoPrint: true });
  const printWindow = window.open('', '_blank', 'width=900,height=800');

  if (!printWindow) return;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

function generateChallanNo() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `CH-${y}${m}-${rand}`;
}

export { COMPANY, generateChallanNo, getChallanDocumentHtml, openChallanPrint };
