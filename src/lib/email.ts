import { Resend } from "resend";
import { db } from "./db";

const resend = new Resend(process.env.RESEND_API_KEY);

interface RenderEmailInput {
  subject: string;
  bodyHtml: string;
  bodyText: string;
  variables: Record<string, string>;
  includeFooter?: boolean;
  senderEmail: string;
  senderName: string;
  leadEmail: string;
}

interface RenderedEmail {
  subject: string;
  bodyHtml: string;
  bodyText: string;
}

export function renderEmail(input: RenderEmailInput): RenderedEmail {
  const {
    subject,
    bodyHtml,
    bodyText,
    variables,
    includeFooter = true,
    senderEmail,
    senderName,
    leadEmail,
  } = input;

  // Replace variables in content
  const replaceVariables = (text: string): string => {
    let result = text;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      result = result.replace(regex, value || "");
    });
    // Handle any remaining unmatched variables with empty string
    result = result.replace(/{{[^}]+}}/g, "");
    return result;
  };

  const renderedSubject = replaceVariables(subject);
  let renderedHtml = replaceVariables(bodyHtml);
  let renderedText = replaceVariables(bodyText);

  // Add compliance footer
  if (includeFooter) {
    const unsubscribeUrl = `${process.env.NEXT_PUBLIC_URL}/unsubscribe?email=${encodeURIComponent(leadEmail)}`;

    const htmlFooter = `
      <br><br>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
      <p style="font-size: 12px; color: #6b7280; line-height: 1.5;">
        ${senderName}<br>
        ${senderEmail}<br>
        <a href="${unsubscribeUrl}" style="color: #6b7280;">Unsubscribe</a>
      </p>
    `;

    const textFooter = `

---
${senderName}
${senderEmail}
Unsubscribe: ${unsubscribeUrl}`;

    renderedHtml += htmlFooter;
    renderedText += textFooter;
  }

  return {
    subject: renderedSubject,
    bodyHtml: renderedHtml,
    bodyText: renderedText,
  };
}

interface SendEmailInput {
  to: string;
  from: string;
  fromName: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

interface SendEmailResult {
  success: boolean;
  resendId?: string;
  error?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  try {
    // Check if email is unsubscribed
    const unsubscribed = await db.unsubscribe.findUnique({
      where: { email: input.to },
    });

    if (unsubscribed) {
      return {
        success: false,
        error: "Email address is unsubscribed",
      };
    }

    const result = await resend.emails.send({
      from: `${input.fromName} <${input.from}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
    });

    if (result.error) {
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      resendId: result.data?.id,
    };
  } catch (error) {
    console.error("Send email error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

export async function unsubscribeEmail(email: string, reason?: string) {
  try {
    await db.unsubscribe.upsert({
      where: { email },
      update: {
        reason,
        unsubscribedAt: new Date(),
      },
      create: {
        email,
        reason,
      },
    });
    return { success: true };
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return { success: false, error: "Failed to unsubscribe" };
  }
}

export async function isEmailUnsubscribed(email: string): Promise<boolean> {
  const record = await db.unsubscribe.findUnique({
    where: { email },
  });
  return !!record;
}

// Utility to convert HTML to plain text
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
