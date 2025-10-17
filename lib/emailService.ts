import emailjs from "@emailjs/browser";

// ✅ EmailJS configuration
const EMAILJS_SERVICE_ID =
  process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "service_gzpjfl2";
const EMAILJS_TEMPLATE_ID =
  process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "your_template_id";
const EMAILJS_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "your_public_key";

export interface EmailData {
  to_email: string;
  to_name: string;
  otp_code: string;
  company_name?: string;
}

/**
 * Send OTP Email using EmailJS
 */
export const sendOTPEmail = async (emailData: EmailData): Promise<boolean> => {
  try {
    // Initialize EmailJS only on client side
    if (typeof window !== "undefined") {
      emailjs.init(EMAILJS_PUBLIC_KEY);
    }

    const templateParams = {
      to_email: emailData.to_email,
      to_name: emailData.to_name,
      otp_code: emailData.otp_code,
      company_name: emailData.company_name || "Your Company",
      message: `Your OTP for office check-in is: ${emailData.otp_code}. This code is valid for today only.`,
    };

    const result = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );

    return result.status === 200;
  } catch (error) {
    console.error("❌ Error sending email:", error);
    return false;
  }
};

/**
 * Simulate OTP Email Sending (for development/testing)
 */
export const simulateEmailSend = async (
  emailData: EmailData
): Promise<boolean> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log("📧 Simulated OTP Email:");
      console.log(`   To: ${emailData.to_email}`);
      console.log(`   Name: ${emailData.to_name}`);
      console.log(`   OTP: ${emailData.otp_code}`);
      console.log(`   Company: ${emailData.company_name || "Your Company"}`);
      resolve(true);
    }, 1000);
  });
};
