import nodemailer from "nodemailer";

// Retrieve SMTP credentials from environment variables safely
const SMTP_EMAIL = process.env.SMTP_EMAIL;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL || SMTP_EMAIL;

// Lazy initialization of the mail transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    if (SMTP_EMAIL && SMTP_PASSWORD && SMTP_HOST) {
      console.log("CollabDocs Mailer: Initializing secure production SMTP transport node.");
      transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: {
          user: SMTP_EMAIL,
          pass: SMTP_PASSWORD
        }
      });
    } else {
      console.warn("CollabDocs Mailer: SMTP credentials missing in env. Falling back to mock email transporter.");
      // Standard local loopback simulation transporter
      transporter = nodemailer.createTransport({
        jsonTransport: true
      });
    }
  }
  return transporter;
}

export function isSmtpConfigured() {
  return !!(SMTP_EMAIL && SMTP_PASSWORD && SMTP_HOST);
}

export async function verifySmtpConnection() {
  const client = getTransporter();
  await client.verify();
  return true;
}

// System dispatch helper
export async function sendMail(to: string, subject: string, htmlContent: string) {
  try {
    const client = getTransporter();
    const mailOptions = {
      from: `"CollabDocs Support" <${SMTP_FROM_EMAIL || "support@collabdocs.veltora.com"}>`,
      to,
      subject,
      html: htmlContent
    };

    const info = await client.sendMail(mailOptions);

    if (!SMTP_EMAIL || !SMTP_PASSWORD) {
      // In mock mode, log a premium diagnostic preview
      console.log("\n========================================================");
      console.log(`✉️  SIMULATED EMAIL DISPATCHED SUCCESSFULLY`);
      console.log(`TO: ${to}`);
      console.log(`SUBJECT: ${subject}`);
      console.log(`CONTENT PREVIEW: ${htmlContent.replace(/<[^>]*>/g, "").substring(0, 200)}...`);
      console.log("========================================================\n");
    } else {
      console.log(`CollabDocs Mailer: Transactional email successfully routed to <${to}>. MessageID: ${info.messageId}`);
    }
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("CollabDocs Mailer Error during SMTP routing:", error);
    return { success: false, error: error.message };
  }
}

// 1. Welcome Email
export async function sendWelcomeEmail(email: string, name: string) {
  const subject = "Welcome to CollabDocs - Let's Start Collaborating!";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #4f46e5;">Welcome to CollabDocs, ${name}!</h2>
      <p>Thank you for choosing CollabDocs by Veltora IT Solution. You have successfully created your workspace.</p>
      <p>Start drafting engineering specs, marketing campaigns, and design notes with your team in real time.</p>
      <div style="margin: 20px 0; padding: 15px; bg-color: #f8fafc; border-left: 4px solid #4f46e5;">
        <strong>Your Active Tier:</strong> Free Plan (Includes 2 Collaborators & 2 Collaboration Sessions/mo)
      </div>
      <p>Looking for unlimited storage, cross-device sync, and Google AI credits? Upgrade to Pro at any time!</p>
      <p>Best regards,<br/>The CollabDocs Architect Team</p>
    </div>
  `;
  return sendMail(email, subject, html);
}

// 2. Verify Email
export async function sendVerifyEmail(email: string, token: string) {
  const subject = "Verify Your CollabDocs Email Profile";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #4f46e5;">Verify Your Email Address</h2>
      <p>Please confirm your account registration by clicking the verification link below:</p>
      <p style="margin: 30px 0; text-align: center;">
        <a href="https://collabdocs.veltora.com/verify?token=${token}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Verify Email Profile</a>
      </p>
      <p>If you did not request this registration, please ignore this email.</p>
    </div>
  `;
  return sendMail(email, subject, html);
}

// 3. Password Reset
export async function sendPasswordReset(email: string, token: string) {
  const subject = "Reset Your CollabDocs Account Password";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #dc2626;">Reset Your Password</h2>
      <p>We received a request to reset your password. Click the link below to set a new password:</p>
      <p style="margin: 30px 0; text-align: center;">
        <a href="https://collabdocs.veltora.com/reset-password?token=${token}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Account Password</a>
      </p>
      <p>This security request token will expire in 1 hour.</p>
    </div>
  `;
  return sendMail(email, subject, html);
}

export async function sendPasswordResetLink(email: string, resetLink: string) {
  const subject = "Reset Your CollabDocs Account Password";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #dc2626;">Reset Your Password</h2>
      <p>We received a request to reset your CollabDocs password. Click the button below to set a new password:</p>
      <p style="margin: 30px 0; text-align: center;">
        <a href="${resetLink}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Account Password</a>
      </p>
      <p>This Firebase security link can only be used once. If you did not request this reset, you can ignore this email.</p>
    </div>
  `;
  return sendMail(email, subject, html);
}

// 4. Subscription Activated
export async function sendSubscriptionActivated(email: string, name: string, plan: string, renewalDate: string) {
  const subject = "CollabDocs Premium Activated! 🚀";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #4f46e5;">Welcome to the Premium Club!</h2>
      <p>Hi ${name}, your upgrade request was approved. Your account is now active on <strong>${plan.toUpperCase()}</strong>.</p>
      <p>All premium restrictions have been lifted from your workspaces:</p>
      <ul>
        <li>Unlimited collaborators and real-time sessions</li>
        <li>Instant cloud sync and encrypted backups</li>
        <li>Unlimited versions and rollback histories</li>
        <li>Priority templates and Google Gemini AI Assistance credits</li>
      </ul>
      <div style="margin: 20px 0; padding: 15px; background-color: #f8fafc; border-left: 4px solid #10b981;">
        <strong>Next Renewal Date:</strong> ${new Date(renewalDate).toLocaleDateString()}
      </div>
      <p>Let's create some amazing specs!</p>
    </div>
  `;
  return sendMail(email, subject, html);
}

// 5. Subscription Expired
export async function sendSubscriptionExpired(email: string, name: string) {
  const subject = "Your CollabDocs Subscription Has Expired";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #dc2626;">Subscription Expired</h2>
      <p>Hi ${name}, your CollabDocs subscription has ended and your account has been safely transitioned back to the Free plan.</p>
      <p>Your documents are perfectly safe, but cloud storage synchronization is now locked. Renew today to regain full sync privileges.</p>
      <p style="margin: 30px 0; text-align: center;">
        <a href="https://collabdocs.veltora.com/pricing" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Renew Subscription</a>
      </p>
    </div>
  `;
  return sendMail(email, subject, html);
}

// 6. Payment Successful
export async function sendPaymentSuccessful(email: string, name: string, amount: number, invoiceId: string) {
  const subject = "Receipt for Your CollabDocs SaaS Payment";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #10b981;">Payment Received - Thank You!</h2>
      <p>Hi ${name}, we processed your payment of <strong>$${amount}</strong> successfully via Razorpay.</p>
      <p>Your invoice node <strong>${invoiceId}</strong> is registered on your client panel.</p>
      <p>Your SaaS status is marked active. Thank you for partnering with Veltora IT Solution!</p>
    </div>
  `;
  return sendMail(email, subject, html);
}

// 7. Payment Failed
export async function sendPaymentFailed(email: string, name: string, amount: number, error: string) {
  const subject = "Urgent: CollabDocs Premium Payment Failed";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #dc2626;">Payment Failed</h2>
      <p>Hi ${name}, we tried to process your renewal payment of <strong>$${amount}</strong> but the transaction declined.</p>
      <p><strong>Reason:</strong> ${error || "Insufficent card limits or Razorpay gateway timeout."}</p>
      <p>Please update your billing credentials on your client dashboard settings to avoid active service suspension.</p>
    </div>
  `;
  return sendMail(email, subject, html);
}

// 8. Invoice Email
export async function sendInvoiceEmail(email: string, name: string, invoiceNo: string, amount: number) {
  const subject = `Your CollabDocs Invoice ${invoiceNo}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #4f46e5;">New Invoice Generated</h2>
      <p>Hi ${name}, we have dispatched a new digital invoice for your subscription details:</p>
      <p><strong>Invoice Number:</strong> ${invoiceNo}</p>
      <p><strong>Total Amount:</strong> $${amount}</p>
      <p>A copy is attached in your local Account Settings workspace.</p>
    </div>
  `;
  return sendMail(email, subject, html);
}

// 9. Support Feedback
export async function sendSupportFeedback(email: string, message: string) {
  const subject = "New Support Feedback Received";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #4f46e5;">Support Feedback</h2>
      <p><strong>From:</strong> ${email}</p>
      <p><strong>Message:</strong></p>
      <p style="background-color: #f8fafc; padding: 15px; border-radius: 6px;">${message}</p>
    </div>
  `;
  return sendMail("veltoraitsolution2026@gmail.com", subject, html);
}

// 10. Automated Support Response
export async function sendSupportAutomatedResponse(email: string, name: string, type: string) {
  const subject = type === "Complaint" ? "We have received your complaint" : "Thank you for your feedback";
  const message = type === "Complaint" ? "Your query will be heard soon." : "Thank you.";
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #4f46e5;">Support Update</h2>
      <p>Hi ${name},</p>
      <p>${message}</p>
      <p>Best regards,<br/>The CollabDocs Support Team</p>
    </div>
  `;
  return sendMail(email, subject, html);
}

// 11. Workspace Invitation
export async function sendWorkspaceInviteEmail(email: string, workspaceName: string, inviterName: string) {
  const subject = `You have been invited to join ${workspaceName} on CollabDocs`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #4f46e5;">Workspace Invitation</h2>
      <p>Hi there,</p>
      <p><strong>${inviterName}</strong> has invited you to collaborate in the workspace <strong>${workspaceName}</strong> on CollabDocs.</p>
      <p style="margin: 30px 0; text-align: center;">
        <a href="https://collabdocs.veltora.com" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Join Workspace</a>
      </p>
      <p>Best regards,<br/>The CollabDocs Team</p>
    </div>
  `;
  return sendMail(email, subject, html);
}
