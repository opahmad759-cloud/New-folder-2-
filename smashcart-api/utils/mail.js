// sends an email through Brevo (works on Render's free plan, it uses https)
async function sendMail({ to, subject, html }) {
    const key = process.env.BREVO_API_KEY;
    const from = process.env.MAIL_FROM;
    if (!key || !from) throw new Error("Email is not set up (BREVO_API_KEY or MAIL_FROM is missing)");

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
            sender: { name: "SmashCart", email: from },
            to: [{ email: to }],
            subject,
            htmlContent: html,
        }),
    });
    if (!res.ok) {
        throw new Error(`Brevo ${res.status}: ${await res.text()}`);
    }
}

module.exports = { sendMail };