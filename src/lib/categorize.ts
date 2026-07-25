import type { Category } from "@/lib/mock-data";

export function categorizeGmail(from: string, subject: string): Category {
  const s = `${from} ${subject}`.toLowerCase();
  if (/(otp|verification code|one[- ]time|passcode|\b\d{4,8}\b.*(code|otp))/.test(s)) return "otp";
  if (/(recharge|prepaid|airtel|jio|vodafone|vi |bsnl|plan activated|auto[- ]renew)/.test(s)) return "recharges";
  if (/(internship|intern at|internshala)/.test(s)) return "internships";
  if (/(job|hiring|career|linkedin.*job|indeed|naukri|interview|recruit)/.test(s)) return "jobs";
  if (/(invoice|receipt|payment|order|billing|subscription|stripe|razorpay|paypal|gst)/.test(s)) return "business";
  if (/(newsletter|deal|offer|sale|promo|% off|discount|unsubscribe)/.test(s)) return "promotions";
  if (/(security alert|password|sign[- ]in|account update|policy|terms)/.test(s)) return "updates";
  return "personal";
}