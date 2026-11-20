const PDFDocument = require('pdfkit');
module.exports = (order, customer, res) => {
  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice-${order._id}.pdf`);
  doc.pipe(res);
  doc.fontSize(22).text('INVOICE', { align: 'right' });
  doc.fontSize(10).text(`Order: ${order._id}`, { align: 'right' })
    .text(`Date: ${order.createdAt.toDateString()}`, { align: 'right' })
    .text(`Payment: ${order.paymentStatus} (${order.paymentMode})`, { align: 'right' });
  doc.moveDown().fontSize(12).text('Billed to:').fontSize(10)
    .text(customer.name).text(customer.email)
    .text([order.address.line1, order.address.city, order.address.state, order.address.pincode].filter(Boolean).join(', '));
  doc.moveDown();
  let y = doc.y;
  doc.font('Helvetica-Bold').text('Item', 50, y).text('Qty', 330, y).text('Price', 380, y).text('Total', 460, y);
  doc.font('Helvetica'); y += 20;
  for (const i of order.items) {
    doc.text(i.name, 50, y, { width: 270 }).text(String(i.qty), 330, y)
      .text(i.price.toFixed(2), 380, y).text((i.price * i.qty).toFixed(2), 460, y);
    y += 20;
  }
  y += 10;
  doc.text(`Subtotal: ${order.subtotal.toFixed(2)}`, 380, y)
    .text(`Discount${order.coupon ? ` (${order.coupon})` : ''}: -${order.discount.toFixed(2)}`, 380, y + 15)
    .font('Helvetica-Bold').text(`Total: ${order.total.toFixed(2)}`, 380, y + 30);
  doc.end();
};
