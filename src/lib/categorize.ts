import type { Category } from "@/lib/mock-data";

// Ordered rules — the first match wins, so put the most specific first.
const RULES: { category: Category; re: RegExp }[] = [
  { category: "otp", re: /(\botp\b|verification code|one[- ]time (code|password|pin)|passcode|security code|\b\d{4,8}\b\s*(is your|code))/ },
  { category: "security", re: /(security alert|suspicious (sign|login|activity)|password (reset|changed)|new (sign[- ]in|device)|two[- ]factor|2fa|account (locked|compromised)|breach|unusual activity)/ },
  { category: "banking", re: /(bank|hdfc|icici|sbi|axis|kotak|paytm bank|debited|credited|account statement|imps|neft|upi|balance|atm|net ?banking)/ },
  { category: "bills", re: /(electricity|water bill|gas bill|utility|due date|bill (is )?(due|generated)|postpaid bill|broadband bill|rent (due|payment))/ },
  { category: "recharges", re: /(recharge|prepaid|airtel|\bjio\b|vodafone|\bvi\b|bsnl|plan activated|auto[- ]renew(al)? of your plan|talktime|data pack)/ },
  { category: "shipping", re: /(shipped|out for delivery|delivered|tracking (number|id)|courier|dispatch|delhivery|bluedart|fedex|dhl|\bups\b|shipment)/ },
  { category: "shopping", re: /(your order|order (confirmed|placed|#)|amazon|flipkart|myntra|ajio|meesho|cart|purchase confirmation)/ },
  { category: "payment", re: /(invoice|receipt|payment (received|successful|failed)|billing|transaction|stripe|razorpay|paypal|\bgst\b|refund)/ },
  { category: "subscriptions", re: /(subscription|your plan (renews|expires)|renewal|membership|free trial|upgrade your plan)/ },
  { category: "internships", re: /(internship|intern at|internshala)/ },
  { category: "jobs", re: /(\bjob\b|hiring|career|vacancy|opening|interview|recruit|naukri|indeed|glassdoor|offer letter|application (status|received))/ },
  { category: "education", re: /(course|class|exam|semester|university|college|assignment|lecture|coursera|udemy|edx|nptel|certificate|admission|scholarship)/ },
  { category: "travel", re: /(flight|booking|itinerary|\bpnr\b|boarding pass|hotel|check[- ]in|irctc|train|makemytrip|goibibo|airbnb|uber|ola|cab|trip)/ },
  { category: "food", re: /(swiggy|zomato|dominos|food order|restaurant|dineout|zepto|blinkit|instamart|grocery)/ },
  { category: "health", re: /(appointment|doctor|clinic|hospital|prescription|lab report|pharmacy|apollo|practo|medical|health checkup|vaccination)/ },
  { category: "insurance", re: /(insurance|policy (number|renewal)|premium due|lic |claim (status|settled)|mediclaim)/ },
  { category: "government", re: /(income tax|\bitr\b|aadhaar|\bpan\b card|passport|govt|government|municipal|epfo|provident fund|gov\.in)/ },
  { category: "events", re: /(webinar|conference|meetup|invitation to|rsvp|register now for|summit|workshop|calendar invite|event on)/ },
  { category: "social", re: /(instagram|facebook|twitter|\bx\.com\b|linkedin|whatsapp|snapchat|reddit|discord|tagged you|mentioned you|friend request|new follower|commented on)/ },
  { category: "entertainment", re: /(netflix|prime video|spotify|hotstar|youtube|jiocinema|sonyliv|episode|now streaming|playlist|game|steam)/ },
  { category: "support", re: /(ticket #|support (request|team)|case (number|id)|helpdesk|we('| ha)ve received your (request|complaint)|customer care|resolved your)/ },
  { category: "newsletters", re: /(newsletter|digest|weekly (roundup|update)|daily brief|substack|medium daily)/ },
  { category: "promotions", re: /(deal|offer|sale|promo|% off|discount|coupon|flash sale|limited time|unsubscribe|save big|voucher)/ },
  { category: "updates", re: /(update|policy|terms of service|maintenance|release notes|changelog|announcement|notification|reminder)/ },
];

export function categorizeGmail(from: string, subject: string): Category {
  const s = `${from} ${subject}`.toLowerCase();
  for (const r of RULES) if (r.re.test(s)) return r.category;
  return "personal";
}