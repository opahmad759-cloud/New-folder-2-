const FREE_DELIVERY_OVER = 10000;
const DELIVERY_FEE = 300;

// discount on the whole order, by the total number of items
function getDiscountRate(totalItems) {
    if (totalItems >= 5) return 0.1; // 5 or more items: 10%
    if (totalItems >= 2) return 0.05; // 2 to 4 items: 5%
    return 0; // less than 2 items: no discount
}

// lines: [{ price, qty }]
function calculateTotals(lines) {
    const totalItems = lines.reduce((sum, l) => sum + l.qty, 0);
    const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);

    const discountRate = getDiscountRate(totalItems);
    const discount = Math.round(subtotal * discountRate);
    const afterDiscount = subtotal - discount;

    const delivery = afterDiscount >= FREE_DELIVERY_OVER ? 0 : DELIVERY_FEE;
    const total = afterDiscount + delivery;

    return { subtotal, discountRate, discount, delivery, total };
}

module.exports = { calculateTotals };