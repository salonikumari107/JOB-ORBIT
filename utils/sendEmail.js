import nodemailer from 'nodemailer';

/**
 * SendEmail Utility - Handles both Application Updates and Password Reset Links
 * supports:
 * 1. sendEmail({ email, subject, message }) -> For Password Reset
 * 2. sendEmail(email, name, jobTitle, status) -> For Job Application Updates
 */
const sendEmail = async (options, nameOrStatus, jobTitle, status) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail', // Gmail service automatically sets host/port
      auth: {
        user: process.env.SMTP_EMAIL || process.env.EMAIL_USER, 
        pass: process.env.SMTP_PASSWORD || process.env.EMAIL_PASS, 
      },
    });

    let mailOptions;

    // --- CASE 1: Password Reset (Options as Object) ---
    if (typeof options === 'object' && options.subject) {
      mailOptions = {
        from: `"${process.env.FROM_NAME || 'Orbit Nodes'}" <${process.env.SMTP_EMAIL || process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #2563eb;">Orbit Nodes Security</h2>
            <p>Hello,</p>
            <p>${options.message.replace(/\n/g, '<br>')}</p>
            <br />
            <p>Best Regards,<br />Team Orbit Nodes</p>
          </div>
        `
      };
    } 
    // --- CASE 2: Job Application Update (Positional Arguments) ---
    else {
      const email = options;
      const name = nameOrStatus;
      mailOptions = {
        from: `"Job Orbit" <${process.env.EMAIL_USER || process.env.SMTP_EMAIL}>`,
        to: email,
        subject: `Update on your application for ${jobTitle}`,
        text: `Hi ${name},\n\nYour application for the position of "${jobTitle}" has been ${status.toUpperCase()}.\n\nThank you for choosing Job Orbit.\n\nBest Regards,\nTeam Orbit Nodes`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #2563eb;">Job Orbit Update</h2>
            <p>Hi <b>${name}</b>,</p>
            <p>We have an update regarding your application for the <b>${jobTitle}</b> position.</p>
            <p>Status: <span style="text-transform: uppercase; font-weight: bold; color: ${status === 'accepted' ? '#10b981' : '#f43f5e'};">${status}</span></p>
            <br />
            <p>Best Regards,<br />Team Orbit Nodes</p>
          </div>
        `
      };
    }

    const info = await transporter.sendMail(mailOptions);
    console.log("✉️ Email sent successfully: " + info.response);
    return info;

  } catch (error) {
    console.error("❌ Nodemailer Error:", error.message);
    throw new Error("Email sending failed: " + error.message);
  }
};

export default sendEmail;