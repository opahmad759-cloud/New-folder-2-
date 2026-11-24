// used if the settings cannot be read, so the shop never breaks
const DEFAULTS = {
    deliveryFee: 300,
    freeDeliveryFrom: 10000,
    tier1MinItems: 2,
    tier1Percent: 5,
    tier2MinItems: 5,
    tier2Percent: 10,
};

// gift rule for returning customers (not the first order)
const GIFT_FROM = 20000; // order value (after discount) needed
const GIFT_MIN_PRICE = 3000; // the customer picks a shuttle priced between these
const GIFT_MAX_PRICE = 8000;

// discount on the whole order, by the total number of items
function getDiscountRate(totalItems, s = DEFAULTS) {
    if (totalItems >= s.tier2MinItems) return s.tier2Percent / 100;
    if (totalItems >= s.tier1MinItems) return s.tier1Percent / 100;
    return 0;
}

// bigger discount for the customer's very first order
function getFirstOrderRate(totalItems) {
    if (totalItems >= 4) return 0.6;
    if (totalItems === 3) return 0.4;
    return 0.3;
}

// lines: [{ price, qty }]
function calculateTotals(lines, settings = DEFAULTS, isFirstOrder = false) {
    const totalItems = lines.reduce((sum, l) => sum + l.qty, 0);
    const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);

    const discountRate = isFirstOrder ? getFirstOrderRate(totalItems) : getDiscountRate(totalItems, settings);
    const discount = Math.round(subtotal * discountRate);
    const afterDiscount = subtotal - discount;

    const delivery = afterDiscount >= settings.freeDeliveryFrom ? 0 : settings.deliveryFee;
    const total = afterDiscount + delivery;

    // a free gift is earned on later orders only
    const giftEarned = !isFirstOrder && afterDiscount >= GIFT_FROM;

    return { subtotal, discountRate, discount, delivery, total, giftEarned };
}

module.exports = { calculateTotals, GIFT_FROM, GIFT_MIN_PRICE, GIFT_MAX_PRICE };