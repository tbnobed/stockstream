import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: {
    name: string;
    address: string;
  };
}

class EmailService {
  private transporter: Transporter | null = null;
  private config: EmailConfig | null = null;

  constructor() {
    this.initializeConfig();
  }

  private initializeConfig(): void {
    // Check if all required environment variables are present
    const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      console.warn(`Email service disabled: Missing environment variables: ${missingVars.join(', ')}`);
      return;
    }

    this.config = {
      host: process.env.SMTP_HOST!,
      port: parseInt(process.env.SMTP_PORT!, 10),
      secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
      from: {
        name: process.env.SMTP_FROM_NAME || 'InventoryPro',
        address: process.env.SMTP_USER!,
      },
    };

    this.createTransporter();
  }

  private createTransporter(): void {
    if (!this.config) return;

    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth,
      tls: {
        rejectUnauthorized: false, // For development/testing
      },
    });
  }

  public isConfigured(): boolean {
    return this.transporter !== null && this.config !== null;
  }

  public async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      throw new Error('Email service is not configured');
    }

    try {
      await this.transporter.verify();
      console.log('✅ Email service connection verified');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error);
      return false;
    }
  }

  public async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter || !this.config) {
      console.warn('Email service not configured, skipping email send');
      return false;
    }

    const mailOptions = {
      from: `"${this.config.from.name}" <${this.config.from.address}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return false;
    }
  }

  public async sendReceiptEmail(
    recipientEmail: string, 
    orderNumber: string, 
    receiptUrl: string,
    customerName?: string
  ): Promise<boolean> {
    const subject = `Receipt for Order ${orderNumber} - InventoryPro`;
    
    const text = `
Thank you for your purchase!

Order Number: ${orderNumber}
${customerName ? `Customer: ${customerName}` : ''}

View your receipt: ${receiptUrl}

This receipt link will be available for 90 days.

Thank you for shopping with us!
InventoryPro
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Receipt - ${orderNumber}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
        }
        .header { 
            background: #f8f9fa; 
            padding: 20px; 
            border-radius: 8px; 
            margin-bottom: 20px; 
        }
        .receipt-info { 
            background: #e3f2fd; 
            padding: 15px; 
            border-radius: 6px; 
            margin: 20px 0; 
        }
        .cta-button { 
            display: inline-block; 
            background: #007bff; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 20px 0; 
        }
        .footer { 
            margin-top: 30px; 
            padding-top: 20px; 
            border-top: 1px solid #ddd; 
            font-size: 14px; 
            color: #666; 
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Thank you for your purchase!</h1>
        <p>Your order has been processed successfully.</p>
    </div>
    
    <div class="receipt-info">
        <h3>Order Details</h3>
        <p><strong>Order Number:</strong> ${orderNumber}</p>
        ${customerName ? `<p><strong>Customer:</strong> ${customerName}</p>` : ''}
    </div>
    
    <p>Click the button below to view your detailed receipt:</p>
    
    <a href="${receiptUrl}" class="cta-button">View Receipt</a>
    
    <p>Or copy this link: <a href="${receiptUrl}">${receiptUrl}</a></p>
    
    <div class="footer">
        <p><strong>Important:</strong> This receipt link will be available for 90 days.</p>
        <p>Thank you for shopping with InventoryPro!</p>
    </div>
</body>
</html>
    `;

    return this.sendEmail({
      to: recipientEmail,
      subject,
      text,
      html,
    });
  }

  public async sendLowStockAlert(
    adminEmail: string, 
    lowStockItems: Array<{ name: string; sku: string; stock: number; lowStockThreshold: number }>
  ): Promise<boolean> {
    const subject = `Low Stock Alert - ${lowStockItems.length} items need attention`;
    
    const itemsList = lowStockItems
      .map(item => `• ${item.name} (${item.sku}): ${item.stock} remaining (threshold: ${item.lowStockThreshold})`)
      .join('\n');

    const text = `
Low Stock Alert

The following items are running low on stock:

${itemsList}

Please review and restock as needed.

InventoryPro System
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Low Stock Alert</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .alert { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin-bottom: 20px; }
        .item { background: #f8f9fa; padding: 10px; margin: 10px 0; border-radius: 4px; }
        .stock-level { font-weight: bold; color: #dc3545; }
    </style>
</head>
<body>
    <div class="alert">
        <h2>⚠️ Low Stock Alert</h2>
        <p>The following items are running low on stock and need attention:</p>
    </div>
    
    ${lowStockItems.map(item => `
        <div class="item">
            <h4>${item.name}</h4>
            <p><strong>SKU:</strong> ${item.sku}</p>
            <p><strong>Current Stock:</strong> <span class="stock-level">${item.stock}</span></p>
            <p><strong>Threshold:</strong> ${item.lowStockThreshold}</p>
        </div>
    `).join('')}
    
    <p>Please review and restock these items as needed.</p>
    <p><em>InventoryPro System</em></p>
</body>
</html>
    `;

    return this.sendEmail({
      to: adminEmail,
      subject,
      text,
      html,
    });
  }
}

// Create singleton instance
export const emailService = new EmailService();
export { EmailService };