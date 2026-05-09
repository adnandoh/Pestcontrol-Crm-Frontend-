


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
• Service Amount: ₹${data.amount}
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
• Service Amount: ₹${data.amount}

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

1RK – ₹1800
1BHK – ₹2200
2BHK – ₹2500
3BHK – ₹3000
4BHK – ₹3500

✔️ One-Time Service

1RK – ₹1000
1BHK – ₹1200
2BHK – ₹1500
3BHK – ₹1800
4BHK – ₹2000

🛏️ Bed Bugs Treatment
(2 Services) ₹2200 – ₹4000

🪵 Termite Treatment
(2 Years Warranty) ₹2500 – ₹4000

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
    return `New Service Assigned

Booking ID: ${data.bookingId}

Client Details:
• Client Name: ${data.clientName}
• Mobile Number: ${data.clientMobile}

Service Details:
• Selected Service Type: ${data.serviceType}
• Selected Area: ${data.area}
• Service Amount: ₹${data.amount}
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
