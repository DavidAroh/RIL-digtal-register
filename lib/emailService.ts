import emailjs from "@emailjs/browser";

// ✅ EmailJS configuration
const EMAILJS_SERVICE_ID =
  process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "service_gzpjfl2";
const EMAILJS_TEMPLATE_ID =
  process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "template_1kdjkf9";
const EMAILJS_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "XntREf5lSNP0gajP5";

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
    console.log('📧 Attempting to send email via EmailJS...');
    console.log('Service ID:', EMAILJS_SERVICE_ID);
    console.log('Template ID:', EMAILJS_TEMPLATE_ID);
    console.log('To:', emailData.to_email);

    // Check if we're on the client side
    if (typeof window === "undefined") {
      console.error("❌ EmailJS can only be used on the client side");
      return false;
    }

    // Initialize EmailJS
    emailjs.init(EMAILJS_PUBLIC_KEY);

    const templateParams = {
      to_email: emailData.to_email,
      user_email: emailData.to_email, // Alternative variable name
      to_name: emailData.to_name,
      user_name: emailData.to_name, // Alternative variable name
      otp_code: emailData.otp_code,
      company_name: emailData.company_name || "RIL Innovation Lab",
      message: `Your OTP code is: ${emailData.otp_code}. This code is valid for 10 minutes.`,
    };

    console.log('📤 Sending email with params:', templateParams);

    const result = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );

    console.log('✅ Email sent successfully:', result);
    return result.status === 200;
  } catch (error: any) {
    console.error("❌ Error sending email:", error);
    console.error("Error details:", {
      message: error.message,
      text: error.text,
      status: error.status
    });
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
      console.log(`   Company: ${emailData.company_name || "RIL Innovation Lab"}`);
      resolve(true);
    }, 1000);
  });
};
