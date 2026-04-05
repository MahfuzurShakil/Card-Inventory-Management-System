const COMPANY = {
  name: 'Onestra Ltd.',
  address: 'Dhaka, Bangladesh',
  phone: '+880 1XXXXXXXXX',
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

function buildChallanHtml(challanData, items = []) {
  const totalQty = items.reduce((sum, sb) => sum + (sb.quantity || 0), 0);
  const itemName = challanData.item_name || 'Smart Blank Card';
  const itemDescription = challanData.item_description || '';
  const preparedBy = challanData.prepared_by || 'Production Staff';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Delivery Challan ${escapeHtml(challanData.challan_no)}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;background:#fff;padding:32px;}
  .challan{position:relative;max-width:780px;margin:0 auto;border:1.5px solid #d1d5db;border-radius:10px;overflow:hidden;background:#fff;}
  .header,.body,.footer{position:relative;z-index:1;background:transparent;}
  .header{display:flex;justify-content:space-between;align-items:flex-start;padding:26px 30px;border-bottom:1.5px solid #e5e7eb;}
  .co-name{font-size:24px;font-weight:800;letter-spacing:-0.5px;}
  .co-meta{font-size:10px;color:#6b7280;margin-top:10px;line-height:1.9;}
  .ch-badge{text-align:right;}
  .ch-label{font-size:11px;font-weight:700;color:#6b7280;letter-spacing:2.5px;text-transform:uppercase;}
  .ch-no{font-size:22px;font-weight:800;color:#111827;margin-top:3px;letter-spacing:-0.5px;}
  .ch-date,.ch-prepared{font-size:11px;color:#6b7280;margin-top:5px;}
  .body{padding:28px 30px;}
  .meta-strip{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:28px;}
  .meta-box{background:rgba(249,250,251,0.7);border:1px solid #d1d5db;border-radius:8px;padding:13px 16px;}
  .meta-label{font-size:9px;font-weight:700;color:#9ca3af;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:5px;}
  .meta-value{font-size:15px;font-weight:700;color:#111827;}
  .desc-box{background:rgba(249,250,251,0.72);border:1px solid #d1d5db;border-radius:8px;padding:12px 16px;margin-bottom:20px;}
  .desc-label{font-size:9px;font-weight:700;color:#4b5563;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;}
  .desc-text{font-size:12px;color:#1f2937;white-space:pre-wrap;word-break:break-word;}
  .footer{padding:18px 30px;border-top:1.5px solid #e5e7eb;display:flex;justify-content:space-between;align-items:flex-end;gap:16px;}
  .footer-note{font-size:10px;color:#9ca3af;line-height:1.6;}
  .sig-area{text-align:center;}
  .sig-line{border-top:1.5px solid #374151;padding-top:5px;font-size:10px;color:#6b7280;width:160px;}
  @media print{body{padding:0;}@page{margin:12mm;size:A4;}}
</style>
</head><body>
<div class="challan">
  <div class="header">
    <div>
      <div class="co-name">${escapeHtml(COMPANY.name)}</div>
      <div class="co-meta">
        ${escapeHtml(COMPANY.address)}<br/>
        ${escapeHtml(COMPANY.phone)}<br/>
        ${escapeHtml(COMPANY.email)}
      </div>
    </div>
    <div class="ch-badge">
      <div class="ch-label">Delivery Challan</div>
      <div class="ch-no">${escapeHtml(challanData.challan_no)}</div>
      <div class="ch-date">Date: ${escapeHtml(challanData.date)}</div>
      <div class="ch-prepared">Prepared By: ${escapeHtml(preparedBy)}</div>
    </div>
  </div>
  <div class="body">
    <div class="meta-strip">
      <div class="meta-box">
        <div class="meta-label">Item Name</div>
        <div class="meta-value">${escapeHtml(itemName)}</div>
      </div>
      <div class="meta-box">
        <div class="meta-label">Number of Box</div>
        <div class="meta-value">${items.length}</div>
      </div>
      <div class="meta-box">
        <div class="meta-label">Total Quantity</div>
        <div class="meta-value">${formatNumber(totalQty)} units</div>
      </div>
    </div>
    ${itemDescription ? `
    <div class="desc-box">
      <div class="desc-label">Item Description</div>
      <div class="desc-text">${escapeHtml(itemDescription)}</div>
    </div>` : ''}
  </div>
  <div class="footer">
    <div class="footer-note">
      This is a system-generated challan from Onestra ERP.<br/>
      Generated: ${escapeHtml(formatPrintedAt())}
    </div>
    <div class="sig-area">
      <div class="sig-line">Authorized Signature</div>
    </div>
  </div>
</div>
<script>window.onload=function(){setTimeout(function(){window.print();},600);};</script>
</body></html>`;
}

function openChallanPrint(challanData, items = []) {
  const html = buildChallanHtml(challanData, items);
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

export { COMPANY, generateChallanNo, openChallanPrint };
