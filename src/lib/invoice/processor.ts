import { Env } from '@/types/env';
import { FreshBooksClient } from '@/lib/freshbooks';
import { FreshBooksInvoice, FreshBooksInvoiceLine } from '@/types/freshbooks';
import { VendorInfo } from '@/types';

/**
 * Processes an invoice for Kforce by:
 * 1. Fetching the invoice details
 * 2. Generating a CSV file
 * 3. Uploading the CSV as an attachment
 * 4. Sending an email with the CSV
 * 
 * @param invoiceId The ID of the invoice to process
 * @param client The authenticated FreshBooks client
 * @param env Environment variables
 * @returns Processing result
 */
export async function processInvoice(
  invoiceId: string,
  client: FreshBooksClient,
  env: Env
): Promise<{ status: string; invoiceId: string; message?: string }> {
  try {
    // Fetch complete invoice details
    const invoice = await client.getInvoice(invoiceId);
    
    // Check if this invoice is for the Kforce client
    if (invoice.customerid !== env.KFORCE_CUSTOMER_ID) {
      return { 
        status: 'ignored', 
        invoiceId,
        message: 'Not for Kforce client' 
      };
    }
    
    // Parse vendor info from environment variables
    const vendorInfo = parseVendorInfo(env);
    
    // Generate CSV for Kforce
    const csvData = generateKforceCSV(invoice, vendorInfo);
    
    // Create a File object from CSV data
    const csvFile = new File(
      [csvData], 
      `kforce-invoice-${invoiceId}.csv`, 
      { type: 'text/csv' }
    );
    
    // Upload CSV as attachment
    const attachment = await client.uploadAttachment(csvFile);
    
    // Update invoice with attachment
    await client.updateInvoice(invoiceId, {
      attachments: [
        {
          jwt: attachment.jwt,
          media_type: attachment.media_type
        }
      ]
    });
    
    // Send email with CSV
    await sendEmailWithAttachment(invoice, csvFile, env);
    
    return { 
      status: 'processed', 
      invoiceId 
    };
  } catch (error) {
    console.error('Error processing invoice:', error);
    return { 
      status: 'error', 
      invoiceId,
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Generates a CSV file in Kforce's required format
 * 
 * @param invoice The FreshBooks invoice
 * @param vendorInfo Vendor information
 * @returns CSV data as a string
 */
export function generateKforceCSV(invoice: FreshBooksInvoice, vendorInfo: VendorInfo): string {
  // Extract invoice data
  const { id, total_amount, lines } = invoice;
  
  // Calculate week start (Monday) and end (Sunday) dates
  const invoiceDate = new Date(invoice.create_date);
  const weekStart = getMonday(invoiceDate);
  const weekEnd = getSunday(invoiceDate);
  
  // Calculate total hours and rate
  const hours = calculateTotalHours(lines);
  const rate = calculateAverageRate(lines);
  
  // Create CSV row
  const csvRow = [
    vendorInfo.vendorId,
    vendorInfo.vendorName,
    vendorInfo.address,
    vendorInfo.city,
    vendorInfo.state,
    vendorInfo.zip,
    id,
    vendorInfo.consultantId,
    vendorInfo.consultantName,
    formatDateForKforce(weekStart),
    formatDateForKforce(weekEnd),
    hours.toFixed(2),
    rate.toFixed(2),
    total_amount.toFixed(2),
    vendorInfo.contactName,
    vendorInfo.phone,
    vendorInfo.email
  ].join(',');
  
  // Add header row
  const header = "Vendor ID,Vendor Name,Vendor Address 1,Vendor City,Vendor State,Vendor Zip,Invoice ID,Consultant ID,Consultant Name,W/E Start Date,W/E EndDate,Hours,Rate,Total Due,Vendor Contact Name,Vendor Phone,Vendor Email";
  
  return `${header}\n${csvRow}`;
}

/**
 * Calculates the total hours from invoice line items
 */
function calculateTotalHours(lines: FreshBooksInvoiceLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

/**
 * Calculates the average rate from invoice line items
 */
function calculateAverageRate(lines: FreshBooksInvoiceLine[]): number {
  const totalAmount = lines.reduce((sum, line) => sum + line.amount, 0);
  const totalHours = calculateTotalHours(lines);
  return totalAmount / totalHours;
}

/**
 * Gets the Monday of the week containing the given date
 */
function getMonday(date: Date): Date {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  return new Date(date.setDate(diff));
}

/**
 * Gets the Sunday of the week containing the given date
 */
function getSunday(date: Date): Date {
  const monday = getMonday(date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday;
}

/**
 * Formats a date in the format required by Kforce
 */
function formatDateForKforce(date: Date): string {
  // Format as MM/DD/YYYY
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

/**
 * Parses vendor information from environment variables
 */
function parseVendorInfo(env: Env): VendorInfo {
  return {
    vendorId: env.VENDOR_INFO_VENDOR_ID,
    vendorName: env.VENDOR_INFO_VENDOR_NAME,
    address: env.VENDOR_INFO_ADDRESS,
    city: env.VENDOR_INFO_CITY,
    state: env.VENDOR_INFO_STATE,
    zip: env.VENDOR_INFO_ZIP,
    consultantId: env.VENDOR_INFO_CONSULTANT_ID,
    consultantName: env.VENDOR_INFO_CONSULTANT_NAME,
    contactName: env.VENDOR_INFO_CONTACT_NAME,
    phone: env.VENDOR_INFO_PHONE,
    email: env.VENDOR_INFO_EMAIL
  };
}

/**
 * Sends an email with the CSV file attached
 */
async function sendEmailWithAttachment(
  invoice: FreshBooksInvoice, 
  csvFile: File, 
  env: Env
): Promise<void> {
  // For now, we'll just log that we would send an email
  // In a real implementation, you would use a service like SendGrid, Mailgun, etc.
  console.log(`Would send email to ${env.CLIENT_EMAIL} with attachment ${csvFile.name}`);
  
  // TODO: Implement actual email sending using your preferred service
  // Example with SendGrid:
  // const emailService = new SendGridService(env.SENDGRID_API_KEY);
  // await emailService.send({
  //   to: env.CLIENT_EMAIL,
  //   from: env.SENDER_EMAIL,
  //   subject: `Invoice ${invoice.id} - CSV for Kforce`,
  //   text: `Please find attached the CSV file for invoice ${invoice.id}.`,
  //   attachments: [
  //     {
  //       content: await csvFile.arrayBuffer(),
  //       filename: csvFile.name,
  //       type: 'text/csv',
  //       disposition: 'attachment'
  //     }
  //   ]
  // });
}
