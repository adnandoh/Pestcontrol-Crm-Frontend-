


/**
 * Utility to generate WhatsApp links based on templates
 */

export const openWhatsApp = (mobile: string, message: string) => {
  // Ensure mobile has 91 prefix if it's 10 digits
  const cleanMobile = mobile.replace(/\D/g, '');
  const phone = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;
  const encodedMsg = encodeURIComponent(message);
  window.open(`https://wa.me/${phone}?text=${encodedMsg}`, '_blank');
};

const TC_LINK = "https://www.pestcontrol99.com/terms-and-conditions/";

export const whatsAppTemplates = {
  // 1. Booking Confirmation (to Client)
  bookingConfirmation: (data: {
    clientName: string;
    bookingId: string;
    serviceType: string;
    area: string;
    date: string;
    time: string;
    amount: string;
    address: string;
  }) => {
    return `Dear ${data.clientName},

Your service booking has been successfully confirmed.

Booking ID: ${data.bookingId}

Service Details:
• Selected Service Type: ${data.serviceType}
• Selected Area: ${data.area}
• Service Date: ${data.date}
• Service Time: ${data.time}
• Service Amount: ₹${data.amount.includes('+ GST') ? data.amount : `${data.amount} + GST`}
• Service Address: ${data.address}

Our technician will contact you before arrival.

Terms & Conditions Apply:
${TC_LINK}

For support or rescheduling:
📞 8080748282

Regards,
PestControl99 Team`;
  },

  // 2. Technician Assigned Confirmation (to Client)
  technicianAssigned: (data: {
    clientName: string;
    bookingId: string;
    techName: string;
    techContact: string;
    serviceType: string;
    area: string;
    dateTime: string;
    amount: string;
  }) => {
    return `Dear ${data.clientName},

Your technician has been assigned for the scheduled pest control service.

Booking ID: ${data.bookingId}

Technician Details:
• Technician Name: ${data.techName}
• Contact Number: ${data.techContact}

Service Details:
• Selected Service Type: ${data.serviceType}
• Selected Area: ${data.area}
• Visit Date & Time: ${data.dateTime}
• Service Amount: ₹${data.amount.includes('+ GST') ? data.amount : `${data.amount} + GST`}

Terms & Conditions Apply:
${TC_LINK}

Thank you,
PestControl99 Team`;
  },

  // 3. Customer Inquiry Message (to Client)
  customerInquiry: (name: string) => {
    return `Dear ${name},

Thank you for contacting us. Please find our service details below:

🪳 Cockroach / Ant Control

✔️ AMC Plan (Recommended)
• 1 Year Protection
• 3 Services (Gel + Spray)

1RK – ₹1,800 + GST
1BHK – ₹2,200 + GST
2BHK – ₹2,500 + GST
3BHK – ₹3,000 + GST
4BHK – ₹3,500 + GST

✔️ One-Time Service

1RK – ₹1,000 + GST
1BHK – ₹1,200 + GST
2BHK – ₹1,500 + GST
3BHK – ₹1,800 + GST
4BHK – ₹2,000 + GST

🛏️ Bed Bugs Treatment
(2 Services) ₹2,200 – ₹4,000 + GST

🪵 Termite Treatment
(2 Years Warranty) ₹2,500 – ₹4,000 + GST

All rates are base service prices + GST.

✔️ Safe & No-Smell Treatment
✔️ Professional & Trained Technicians
✔️ Same Day / Next Day Service Available

Terms & Conditions: ${TC_LINK}
📞 7710032627

Please confirm your preferred date & time for booking.

Regards,
PestControl99 Team`;
  },

  // 4. Technician Message (to Technician)
  technicianJobDetails: (data: {
    techName: string;
    bookingId: string;
    clientName: string;
    clientMobile: string;
    serviceType: string;
    area: string;
    amount: string;
    address: string;
    dateTime: string;
    instructions: string;
  }) => {
    const greeting = data.techName.trim()
      ? `Dear ${data.techName.trim()},\n\n`
      : '';
    return `${greeting}New Service Assigned

Booking ID: ${data.bookingId}

Client Details:
• Client Name: ${data.clientName}
• Mobile Number: ${data.clientMobile}

Service Details:
• Selected Service Type: ${data.serviceType}
• Selected Area: ${data.area}
• Service Amount: ₹${data.amount.includes('+ GST') ? data.amount : `${data.amount} + GST`}
• Service Address: ${data.address}
• Booking Date & Time: ${data.dateTime}

Special Instructions:
${data.instructions || 'N/A'}

Terms & Conditions: ${TC_LINK}

Please contact the client before reaching the location.

Regards,
PestControl99 Operations Team`;
  }
};
