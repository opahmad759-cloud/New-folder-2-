// used if the settings cannot be read, so the shop never breaks
const DEFAULTS = {
    deliveryFee: 300,
    freeDeliveryFrom: 10000,
    tier1MinItems: 2,
    tier1Percent: 5,
    tier2MinItems: 5,
    tier2Percent: 10,
};

// discount on the whole order, by the total number of items
function getDiscountRate(totalItems, s = DEFAULTS) {
    if (totalItems >= s.tier2MinItems) return s.tier2Percent / 100;
    if (totalItems >= s.tier1MinItems) return s.tier1Percent / 100;
    return 0;
}

// lines: [{ price, qty }]
function calculateTotals(lines, settings = DEFAULTS) {
    const totalItems = lines.reduce((sum, l) => sum + l.qty, 0);
    const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);

    const discountRate = getDiscountRate(totalItems, settings);
    const discount = Math.round(subtotal * discountRate);
    const afterDiscount = subtotal - discount;

    const delivery = afterDiscount >= settings.freeDeliveryFrom ? 0 : settings.deliveryFee;
    const total = afterDiscount + delivery;

    return { subtotal, discountRate, discount, delivery, total };
}

module.exports = { calculateTotals };