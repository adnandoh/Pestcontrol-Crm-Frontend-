/**
 * Soft-fail WhatsApp Cloud API sends for PC99 Meta templates via WhatsFlow.
 * Never throws to callers — booking/inquiry workflows must not break.
 */
import {
  isValidWhatsAppPhone,
  normalizeWhatsAppPhone,
} from '../config/whatsappEcard';
import {
  PC99_TEMPLATES,
  PC99_WA_LANGUAGE,
  paramsAfterServiceGuidelines,
  paramsBookingCancelled,
  paramsBookingConfirmation,
  paramsFeedbackRequest,
  paramsInquiryReceived,
  paramsTechAssignedCustomer,
  paramsTechCustomerDetails,
  phoneForCustomer,
  phoneForTechnician,
  type JobWhatsAppSource,
} from '../config/whatsappPc99Templates';
import type { Technician } from '../types';
import { getErrorMessage } from '../utils/errors';
import { notify } from '../utils/notify';
import {
  isWhatsAppApiKeyConfigured,
  whatsappInboxApi,
} from './whatsappInboxApi';

type SendOpts = {
  /** Show success toast (default false for background automation). */
  notifySuccess?: boolean;
  /** Show error toast (default true). */
  notifyError?: boolean;
  customerName?: string;
  externalId?: string;
};

async function sendTemplate(args: {
  phone: string;
  templateName: string;
  bodyParams: string[];
  label: string;
  opts?: SendOpts;
}): Promise<boolean> {
  const opts = args.opts || {};
  const notifyError = opts.notifyError !== false;

  if (!isWhatsAppApiKeyConfigured()) {
    if (notifyError) {
      notify.warning(
        'WhatsApp API is not configured. Use the manual WhatsApp button if needed.',
      );
    }
    return false;
  }

  const phone = normalizeWhatsAppPhone(args.phone);
  if (!isValidWhatsAppPhone(phone)) {
    if (notifyError) {
      notify.warning(`Invalid WhatsApp number for ${args.label}.`);
    }
    return false;
  }

  try {
    await whatsappInboxApi.sendTemplateByPhone({
      phone,
      template_name: args.templateName,
      language: PC99_WA_LANGUAGE,
      body_params: args.bodyParams,
      customer_name: opts.customerName,
      external_id: opts.externalId,
    });
    if (opts.notifySuccess) {
      notify.success(`${args.label} sent on WhatsApp.`);
    }
    return true;
  } catch (err) {
    console.error(`[PC99 WhatsApp] ${args.templateName} failed:`, err);
    if (notifyError) {
      notify.error(
        getErrorMessage(err) ||
          `${args.label} failed. Use the manual WhatsApp button.`,
      );
    }
    return false;
  }
}

/** Fire-and-forget wrapper so callers never await-block the UI. */
export function fireAndForget(task: Promise<unknown>): void {
  void task.catch((err) => console.error('[PC99 WhatsApp] background error:', err));
}

export async function sendBookingConfirmationApi(
  job: JobWhatsAppSource,
  opts?: SendOpts,
): Promise<boolean> {
  return sendTemplate({
    phone: phoneForCustomer(job),
    templateName: PC99_TEMPLATES.bookingConfirmation.name,
    bodyParams: paramsBookingConfirmation(job),
    label: PC99_TEMPLATES.bookingConfirmation.label,
    opts: {
      ...opts,
      customerName: job.client_name || undefined,
      externalId: opts?.externalId || `booking-confirm:${job.id}`,
    },
  });
}

export async function sendTechAssignedPairApi(
  job: JobWhatsAppSource,
  tech?: Pick<Technician, 'name' | 'mobile' | 'phone'> | null,
  opts?: SendOpts,
): Promise<{ customer: boolean; technician: boolean }> {
  const customer = await sendTemplate({
    phone: phoneForCustomer(job),
    templateName: PC99_TEMPLATES.techAssignedCustomer.name,
    bodyParams: paramsTechAssignedCustomer(job, tech),
    label: PC99_TEMPLATES.techAssignedCustomer.label,
    opts: {
      ...opts,
      customerName: job.client_name || undefined,
      externalId: opts?.externalId || `tech-assigned-customer:${job.id}`,
    },
  });

  const techPhone = phoneForTechnician(job, tech);
  const technician = techPhone
    ? await sendTemplate({
        phone: techPhone,
        templateName: PC99_TEMPLATES.techCustomerDetails.name,
        bodyParams: paramsTechCustomerDetails(job, tech),
        label: PC99_TEMPLATES.techCustomerDetails.label,
        opts: {
          ...opts,
          customerName: tech?.name || job.technician_name || undefined,
          externalId: `tech-job-details:${job.id}`,
        },
      })
    : false;

  return { customer, technician };
}

export async function sendBookingDonePairApi(
  job: JobWhatsAppSource,
  opts?: SendOpts,
): Promise<{ feedback: boolean; guidelines: boolean }> {
  const feedback = await sendTemplate({
    phone: phoneForCustomer(job),
    templateName: PC99_TEMPLATES.feedbackRequest.name,
    bodyParams: paramsFeedbackRequest(job),
    label: PC99_TEMPLATES.feedbackRequest.label,
    opts: {
      ...opts,
      customerName: job.client_name || undefined,
      externalId: `feedback:${job.id}`,
    },
  });
  const guidelines = await sendTemplate({
    phone: phoneForCustomer(job),
    templateName: PC99_TEMPLATES.afterServiceGuidelines.name,
    bodyParams: paramsAfterServiceGuidelines(job),
    label: PC99_TEMPLATES.afterServiceGuidelines.label,
    opts: {
      ...opts,
      customerName: job.client_name || undefined,
      externalId: `guidelines:${job.id}`,
    },
  });
  return { feedback, guidelines };
}

export async function sendInquiryReceivedApi(
  mobile: string,
  inquiry: Parameters<typeof paramsInquiryReceived>[0],
  opts?: SendOpts,
): Promise<boolean> {
  return sendTemplate({
    phone: mobile,
    templateName: PC99_TEMPLATES.inquiryReceived.name,
    bodyParams: paramsInquiryReceived(inquiry),
    label: PC99_TEMPLATES.inquiryReceived.label,
    opts: {
      ...opts,
      customerName: inquiry.name || undefined,
    },
  });
}

export async function sendBookingCancelledApi(
  job: JobWhatsAppSource,
  opts?: SendOpts,
): Promise<boolean> {
  return sendTemplate({
    phone: phoneForCustomer(job),
    templateName: PC99_TEMPLATES.bookingCancelled.name,
    bodyParams: paramsBookingCancelled(job),
    label: PC99_TEMPLATES.bookingCancelled.label,
    opts: {
      ...opts,
      customerName: job.client_name || undefined,
      externalId: `cancel:${job.id}`,
    },
  });
}
